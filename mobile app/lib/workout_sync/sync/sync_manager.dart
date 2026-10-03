import 'dart:async';

import 'package:uuid/uuid.dart';

import '../../core/api_exception.dart';
import '../../models/workout_tracking_models.dart';
import '../../services/me_service.dart';
import '../../services/workout_pending_queue.dart';
import '../../services/workout_tracking_service.dart';
import '../models/local_workout_snapshot.dart';
import '../models/pending_sync_action.dart';
import '../models/workout_sync_enums.dart';
import '../offline/offline_workout_repository.dart';
import 'connectivity_service.dart';
import 'workout_sync_bootstrap.dart';
import 'workout_sync_log.dart';

/// Remote mutations used by [SyncManager] (production API or tests).
abstract class WorkoutSyncRemote {
  Future<ActiveWorkoutSession?> getActive(int memberId);
  Future<ActiveWorkoutSession> start({required int memberId, required int workoutPlanId});
  Future<void> logSet({
    required int workoutSessionExerciseId,
    int? actualReps,
    double? actualWeight,
    required bool isCompleted,
    String? notes,
  });
  Future<void> complete(int sessionId);
}

class ApiWorkoutSyncRemote implements WorkoutSyncRemote {
  ApiWorkoutSyncRemote([WorkoutTrackingService? api]) : _api = api ?? WorkoutTrackingService.instance;

  final WorkoutTrackingService _api;

  @override
  Future<ActiveWorkoutSession?> getActive(int memberId) => _api.getActive(memberId);

  @override
  Future<ActiveWorkoutSession> start({required int memberId, required int workoutPlanId}) =>
      _api.start(memberId: memberId, workoutPlanId: workoutPlanId);

  @override
  Future<void> logSet({
    required int workoutSessionExerciseId,
    int? actualReps,
    double? actualWeight,
    required bool isCompleted,
    String? notes,
  }) async {
    await _api.logSet(
      workoutSessionExerciseId: workoutSessionExerciseId,
      actualReps: actualReps,
      actualWeight: actualWeight,
      isCompleted: isCompleted,
      notes: notes,
    );
  }

  @override
  Future<void> complete(int sessionId) => _api.complete(sessionId);
}

/// Processes offline queue, legacy batch queue, and live session replay.
class SyncManager {
  SyncManager({
    OfflineWorkoutRepository? offline,
    WorkoutSyncRemote? remote,
    ConnectivityService? connectivity,
    this.requireBootstrap = true,
    Future<int> Function(int memberId)? legacyDrain,
    Future<bool> Function()? isOnline,
    Future<bool> Function()? hasDeviceNetwork,
  })  : _offline = offline ?? OfflineWorkoutRepository.instance,
        _remote = remote ?? ApiWorkoutSyncRemote(),
        _connectivity = connectivity ?? ConnectivityService.instance,
        _legacyDrain = legacyDrain,
        _isOnlineFn = isOnline,
        _hasNetworkFn = hasDeviceNetwork;

  static final SyncManager instance = SyncManager();

  final OfflineWorkoutRepository _offline;
  final WorkoutSyncRemote _remote;
  final ConnectivityService _connectivity;
  final Future<int> Function(int memberId)? _legacyDrain;
  final bool requireBootstrap;
  final Future<bool> Function()? _isOnlineFn;
  final Future<bool> Function()? _hasNetworkFn;
  final _uuid = const Uuid();

  Timer? _periodicTimer;
  bool _syncing = false;
  int _generation = 0;
  int? _boundMemberId;

  static const _maxRetries = 8;
  static const _periodicInterval = Duration(seconds: 60);

  static const AppSyncSnapshot idleSnapshot = AppSyncSnapshot(
    displayState: WorkoutSyncDisplayState.synced,
    hasDeviceNetwork: true,
    serverReachable: true,
    pendingCount: 0,
    failedCount: 0,
    syncedCount: 0,
    isSyncing: false,
  );

  int? get boundMemberId => _boundMemberId;

  Future<void> bindMember(int memberId) async {
    _boundMemberId = memberId;
    await _offline.setBoundMember(memberId);
  }

  /// Logout / account switch: stop replay under this JWT. Data stays namespaced.
  Future<void> onAccountSignedOut() async {
    _generation++;
    _boundMemberId = null;
    await _offline.setBoundMember(null);
    WorkoutSyncLog.info('Sync unbound (signed out)');
  }

  void startPeriodicSync() {
    _periodicTimer ??= Timer.periodic(_periodicInterval, (_) {
      unawaited(syncAll(reason: 'periodic'));
    });
  }

  void stopPeriodicSync() {
    _periodicTimer?.cancel();
    _periodicTimer = null;
  }

  Future<SyncRunResult> retryFailed({String reason = 'retry'}) async {
    final memberId = _boundMemberId ?? await _offline.boundMemberId();
    if (memberId == null) return const SyncRunResult(skipped: true);
    final queue = await _offline.loadQueue(memberId: memberId);
    final reset = [
      for (final a in queue)
        a.syncStatus == PendingSyncStatus.failed || a.retryCount >= _maxRetries
            ? a.copyWith(retryCount: 0, syncStatus: PendingSyncStatus.pending)
            : a,
    ];
    await _offline.saveQueue(reset, memberId: memberId);
    return syncAll(reason: reason);
  }

  Future<SyncRunResult> syncAll({String reason = 'manual'}) async {
    if (_syncing) {
      return const SyncRunResult(skipped: true);
    }
    if (requireBootstrap && !await WorkoutSyncBootstrap.ensureStarted()) {
      return const SyncRunResult(skipped: true);
    }
    final memberId = _boundMemberId ?? await _offline.boundMemberId();
    if (memberId == null || memberId <= 0) {
      return const SyncRunResult(skipped: true);
    }

    final gen = _generation;
    _syncing = true;
    await _offline.markSyncAttempt();
    WorkoutSyncLog.info('Sync started ($reason) member=$memberId');

    try {
      if (!await _isOnline()) {
        return const SyncRunResult(offline: true);
      }
      if (gen != _generation) return const SyncRunResult(skipped: true);

      var synced = 0;
      synced += await _syncLegacyQueue(memberId);
      if (gen != _generation) return const SyncRunResult(skipped: true);
      synced += await _syncPendingActions(memberId, gen);
      if (gen != _generation) return const SyncRunResult(skipped: true);
      synced += await _syncLiveSnapshot(memberId, gen);

      WorkoutSyncLog.info('Sync finished · uploaded=$synced');
      return SyncRunResult(syncedCount: synced);
    } catch (e, st) {
      WorkoutSyncLog.error('Sync failed', e, st);
      return SyncRunResult(failed: true, error: e.toString());
    } finally {
      _syncing = false;
    }
  }

  Future<void> enqueueLogSet({
    required ActiveWorkoutSession session,
    required int workoutSessionExerciseId,
    int? actualReps,
    double? actualWeight,
    required bool isCompleted,
    String? notes,
  }) async {
    final sessionId = session.sessionId > 0 ? session.sessionId : null;
    await _offline.enqueueAction(PendingSyncAction(
      id: _uuid.v4(),
      type: PendingSyncActionType.logSet,
      payload: {
        'workoutSessionExerciseId': workoutSessionExerciseId,
        if (actualReps != null) 'actualReps': actualReps,
        if (actualWeight != null) 'actualWeight': actualWeight,
        'isCompleted': isCompleted,
        if (notes != null) 'notes': notes,
      },
      createdAt: DateTime.now().toUtc(),
      memberId: session.memberId,
      sessionId: sessionId,
      idempotencyKey: PendingSyncAction.deriveKey(
        type: PendingSyncActionType.logSet,
        payload: {'workoutSessionExerciseId': workoutSessionExerciseId},
        sessionId: sessionId,
      ),
    ));
  }

  Future<void> enqueueComplete(ActiveWorkoutSession session) async {
    final sessionId = session.sessionId > 0 ? session.sessionId : null;
    await _offline.enqueueAction(PendingSyncAction(
      id: _uuid.v4(),
      type: PendingSyncActionType.completeWorkout,
      payload: {'sessionId': session.sessionId},
      createdAt: DateTime.now().toUtc(),
      memberId: session.memberId,
      sessionId: sessionId,
      idempotencyKey: PendingSyncAction.deriveKey(
        type: PendingSyncActionType.completeWorkout,
        payload: {'sessionId': session.sessionId},
        sessionId: sessionId,
      ),
    ));
  }

  Future<AppSyncSnapshot> statusSnapshot() async {
    if (requireBootstrap && !WorkoutSyncBootstrap.isReady) {
      final ok = await WorkoutSyncBootstrap.ensureStarted();
      if (!ok) return idleSnapshot;
    }
    final memberId = _boundMemberId ?? await _offline.boundMemberId();
    final stats = await _offline.queueStats(memberId: memberId);
    final hasNetwork = await _hasNetwork();
    final online = hasNetwork && await _isOnline();
    final snap = await _offline.loadSnapshot(memberId: memberId);
    final legacy = memberId != null
        ? await WorkoutPendingQueue.instance.pendingCount(memberId: memberId)
        : 0;

    WorkoutSyncDisplayState display;
    if (!hasNetwork) {
      display = WorkoutSyncDisplayState.offline;
    } else if (stats.failed > 0) {
      display = WorkoutSyncDisplayState.failed;
    } else if (!online && (stats.pending > 0 || legacy > 0)) {
      display = WorkoutSyncDisplayState.offline;
    } else if (!online) {
      display = WorkoutSyncDisplayState.failed;
    } else if (stats.pending > 0 ||
        legacy > 0 ||
        (snap?.session.isOffline ?? false) ||
        (snap?.session.pendingCompleteSync ?? false)) {
      display = WorkoutSyncDisplayState.pending;
    } else {
      display = WorkoutSyncDisplayState.synced;
    }

    return AppSyncSnapshot(
      displayState: display,
      hasDeviceNetwork: hasNetwork,
      serverReachable: online,
      pendingCount: stats.pending + legacy,
      failedCount: stats.failed,
      syncedCount: stats.synced,
      isSyncing: _syncing,
      lastError: stats.lastError,
    );
  }

  Future<int> _syncLegacyQueue(int memberId) async {
    if (_legacyDrain != null) return _legacyDrain(memberId);
    return WorkoutPendingQueue.instance.drain(
      (workoutPlanId, durationMinutes, sets) async {
        await MeService.instance.completeWorkoutSession(
          workoutPlanId: workoutPlanId,
          durationMinutes: durationMinutes,
          sets: sets,
        );
      },
      memberId: memberId,
    );
  }

  Future<int> _syncPendingActions(int memberId, int gen) async {
    final queue = await _offline.loadQueue(memberId: memberId);
    if (queue.isEmpty) return 0;
    final processed = await _offline.loadProcessedKeys(memberId);

    var synced = 0;
    final remaining = <PendingSyncAction>[];
    final newlyProcessed = <String>[];

    for (var action in queue) {
      if (gen != _generation) {
        remaining.add(action);
        remaining.addAll(queue.skip(queue.indexOf(action) + 1));
        break;
      }
      if (action.memberId != null && action.memberId != memberId) {
        remaining.add(action);
        continue;
      }
      if (action.type == PendingSyncActionType.updateExercise) {
        newlyProcessed.add(action.effectiveKey);
        synced++;
        continue;
      }

      if (processed.contains(action.effectiveKey) || newlyProcessed.contains(action.effectiveKey)) {
        synced++;
        continue;
      }

      if (action.syncStatus == PendingSyncStatus.failed || action.retryCount >= _maxRetries) {
        remaining.add(action.copyWith(syncStatus: PendingSyncStatus.failed));
        continue;
      }

      if (action.type == PendingSyncActionType.logSet) {
        final setId = action.payload['workoutSessionExerciseId'] as int? ?? 0;
        if (setId <= 0) {
          remaining.add(action);
          continue;
        }
      }

      try {
        switch (action.type) {
          case PendingSyncActionType.logSet:
            await _remote.logSet(
              workoutSessionExerciseId: action.payload['workoutSessionExerciseId'] as int,
              actualReps: action.payload['actualReps'] as int?,
              actualWeight: (action.payload['actualWeight'] as num?)?.toDouble(),
              isCompleted: action.payload['isCompleted'] as bool? ?? false,
              notes: action.payload['notes'] as String?,
            );
          case PendingSyncActionType.completeWorkout:
            final sid = action.payload['sessionId'] as int? ?? action.sessionId;
            if (sid != null && sid > 0) {
              await _remote.complete(sid);
            }
          case PendingSyncActionType.updateExercise:
            break;
        }
        newlyProcessed.add(action.effectiveKey);
        synced++;
      } catch (e) {
        if (_isAlreadyApplied(e)) {
          newlyProcessed.add(action.effectiveKey);
          synced++;
          continue;
        }
        final next = action.retryCount + 1;
        remaining.add(action.copyWith(
          retryCount: next,
          syncStatus: next >= _maxRetries ? PendingSyncStatus.failed : PendingSyncStatus.pending,
          lastError: e.toString(),
        ));
      }
    }

    await _offline.addProcessedKeys(memberId, newlyProcessed);
    await _offline.saveQueue(remaining, memberId: memberId);
    return synced;
  }

  Future<int> _syncLiveSnapshot(int memberId, int gen) async {
    final snap = await _offline.loadSnapshot(memberId: memberId);
    if (snap == null) return 0;
    if (snap.session.memberId != memberId) return 0;
    if (!snap.session.isOffline && !snap.session.pendingCompleteSync) return 0;
    if (gen != _generation) return 0;

    final pendingComplete =
        snap.session.pendingCompleteSync || snap.session.status == 'Completed';

    if (pendingComplete && snap.session.sessionId > 0 && !snap.session.isOffline) {
      try {
        await _remote.complete(snap.session.sessionId);
      } catch (e) {
        if (!_isAlreadyApplied(e)) rethrow;
      }
      await _offline.addProcessedKeys(memberId, [
        PendingSyncAction.deriveKey(
          type: PendingSyncActionType.completeWorkout,
          payload: {'sessionId': snap.session.sessionId},
          sessionId: snap.session.sessionId,
        ),
      ]);
      await _offline.removeQueueWhere(
        memberId,
        (a) => a.type == PendingSyncActionType.completeWorkout &&
            (a.sessionId == snap.session.sessionId ||
                a.payload['sessionId'] == snap.session.sessionId),
      );
      await _offline.clearSnapshot(memberId: memberId);
      return 1;
    }

    var server = snap.session.sessionId > 0 ? await _remote.getActive(memberId) : null;

    if (server == null && snap.session.workoutPlanId != null && !pendingComplete) {
      try {
        server = await _remote.start(
          memberId: memberId,
          workoutPlanId: snap.session.workoutPlanId!,
        );
      } on ApiException catch (e) {
        if (e.statusCode == 409) {
          server = await _remote.getActive(memberId);
        } else {
          rethrow;
        }
      }
    }

    if (server == null && pendingComplete && snap.session.workoutPlanId != null) {
      try {
        server = await _remote.start(
          memberId: memberId,
          workoutPlanId: snap.session.workoutPlanId!,
        );
      } on ApiException catch (e) {
        if (e.statusCode == 409) {
          server = await _remote.getActive(memberId);
        } else if (_isAlreadyApplied(e)) {
          await _offline.clearSnapshot(memberId: memberId);
          return 1;
        } else {
          rethrow;
        }
      }
    }

    if (server == null) return 0;
    if (gen != _generation) return 0;

    final processed = await _offline.loadProcessedKeys(memberId);
    final newlyProcessed = <String>[];
    final idMap = _mapSetIds(snap.session, server);
    for (final entry in idMap.entries) {
      final localSet = _findSet(snap.session, entry.key);
      if (localSet == null) continue;
      if (!localSet.isCompleted &&
          localSet.actualReps == null &&
          localSet.actualWeight == null) {
        continue;
      }
      final serverSet = _findSet(server, entry.value);
      if (serverSet != null &&
          serverSet.isCompleted == localSet.isCompleted &&
          serverSet.actualReps == localSet.actualReps &&
          serverSet.actualWeight == localSet.actualWeight) {
        continue;
      }
      final localKey = PendingSyncAction.deriveKey(
        type: PendingSyncActionType.logSet,
        payload: {'workoutSessionExerciseId': entry.key},
        sessionId: snap.session.sessionId > 0 ? snap.session.sessionId : 0,
      );
      final serverKey = PendingSyncAction.deriveKey(
        type: PendingSyncActionType.logSet,
        payload: {'workoutSessionExerciseId': entry.value},
        sessionId: server.sessionId,
      );
      if (processed.contains(localKey) ||
          processed.contains(serverKey) ||
          newlyProcessed.contains(serverKey)) {
        continue;
      }
      await _remote.logSet(
        workoutSessionExerciseId: entry.value,
        actualReps: localSet.actualReps,
        actualWeight: localSet.actualWeight,
        isCompleted: localSet.isCompleted,
        notes: localSet.notes,
      );
      newlyProcessed.addAll([localKey, serverKey]);
    }

    await _offline.addProcessedKeys(memberId, newlyProcessed);

    if (pendingComplete) {
      try {
        await _remote.complete(server.sessionId);
      } catch (e) {
        if (!_isAlreadyApplied(e)) rethrow;
      }
      await _offline.addProcessedKeys(memberId, [
        PendingSyncAction.deriveKey(
          type: PendingSyncActionType.completeWorkout,
          payload: {'sessionId': server.sessionId},
          sessionId: server.sessionId,
        ),
      ]);
      await _offline.removeQueueWhere(
        memberId,
        (a) =>
            a.memberId == memberId &&
            (a.type == PendingSyncActionType.completeWorkout ||
                a.type == PendingSyncActionType.logSet),
      );
      await _offline.clearSnapshot(memberId: memberId);
    } else {
      final refreshed = await _remote.getActive(memberId) ?? server;
      await _offline.saveSnapshot(
        LocalWorkoutSnapshot(
          session: refreshed.copyWith(isOffline: false),
          currentExerciseIndex: snap.currentExerciseIndex,
          elapsedSeconds: snap.elapsedSeconds,
          scrollOffset: snap.scrollOffset,
          lastUpdatedAt: DateTime.now().toUtc(),
          lastSyncedAt: DateTime.now().toUtc(),
        ),
      );
      await _offline.removeQueueWhere(
        memberId,
        (a) =>
            a.type == PendingSyncActionType.logSet &&
            ((a.payload['workoutSessionExerciseId'] as int? ?? 1) <= 0),
      );
    }
    return 1;
  }

  Future<bool> _isOnline() {
    final fn = _isOnlineFn;
    return fn != null ? fn() : _connectivity.isOnline();
  }

  Future<bool> _hasNetwork() {
    final fn = _hasNetworkFn;
    return fn != null ? fn() : _connectivity.hasDeviceNetwork();
  }

  bool _isAlreadyApplied(Object e) {
    if (e is! ApiException) return false;
    if (e.statusCode == 409) return true;
    final m = e.message.toLowerCase();
    return m.contains('not in progress') || m.contains('already');
  }

  Map<int, int> _mapSetIds(ActiveWorkoutSession offline, ActiveWorkoutSession server) {
    final map = <int, int>{};
    for (final gOff in offline.exercises) {
      final gSrv = server.exercises.where((g) => g.exerciseId == gOff.exerciseId).toList();
      if (gSrv.isEmpty) continue;
      final gServer = gSrv.first;
      for (final sOff in gOff.sets) {
        final match = gServer.sets.where((s) => s.setNumber == sOff.setNumber).toList();
        if (match.isEmpty) continue;
        map[sOff.id] = match.first.id;
      }
    }
    return map;
  }

  TrackedWorkoutSet? _findSet(ActiveWorkoutSession session, int setId) {
    for (final g in session.exercises) {
      for (final s in g.sets) {
        if (s.id == setId) return s;
      }
    }
    return null;
  }
}

class SyncRunResult {
  const SyncRunResult({
    this.syncedCount = 0,
    this.offline = false,
    this.failed = false,
    this.skipped = false,
    this.error,
  });

  final int syncedCount;
  final bool offline;
  final bool failed;
  final bool skipped;
  final String? error;
}

class AppSyncSnapshot {
  const AppSyncSnapshot({
    required this.displayState,
    required this.hasDeviceNetwork,
    required this.serverReachable,
    required this.pendingCount,
    required this.failedCount,
    required this.syncedCount,
    required this.isSyncing,
    this.lastError,
  });

  final WorkoutSyncDisplayState displayState;
  final bool hasDeviceNetwork;
  final bool serverReachable;
  final int pendingCount;
  final int failedCount;
  final int syncedCount;
  final bool isSyncing;
  final String? lastError;

  bool get canRetry =>
      displayState == WorkoutSyncDisplayState.failed || failedCount > 0;
}
