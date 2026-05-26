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

/// Processes offline queue, legacy batch queue, and live session replay.
class SyncManager {
  SyncManager._();
  static final SyncManager instance = SyncManager._();

  final _offline = OfflineWorkoutRepository.instance;
  final _api = WorkoutTrackingService.instance;
  final _connectivity = ConnectivityService.instance;
  final _uuid = const Uuid();

  Timer? _periodicTimer;
  bool _syncing = false;

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

  void startPeriodicSync() {
    _periodicTimer ??= Timer.periodic(_periodicInterval, (_) {
      unawaited(syncAll(reason: 'periodic'));
    });
  }

  void stopPeriodicSync() {
    _periodicTimer?.cancel();
    _periodicTimer = null;
  }

  Future<SyncRunResult> syncAll({String reason = 'manual'}) async {
    if (_syncing) {
      return SyncRunResult(skipped: true);
    }
    if (!await WorkoutSyncBootstrap.ensureStarted()) {
      return SyncRunResult(skipped: true);
    }
    _syncing = true;
    await _offline.markSyncAttempt();
    WorkoutSyncLog.info('Sync started ($reason)');

    try {
      if (!await _connectivity.isOnline()) {
        return SyncRunResult(offline: true);
      }

      var synced = 0;
      synced += await _syncLegacyQueue();
      synced += await _syncPendingActions();
      synced += await _syncLiveSnapshot();

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
      sessionId: session.sessionId > 0 ? session.sessionId : null,
    ));
  }

  Future<void> enqueueComplete(ActiveWorkoutSession session) async {
    await _offline.enqueueAction(PendingSyncAction(
      id: _uuid.v4(),
      type: PendingSyncActionType.completeWorkout,
      payload: {'sessionId': session.sessionId},
      createdAt: DateTime.now().toUtc(),
      memberId: session.memberId,
      sessionId: session.sessionId > 0 ? session.sessionId : null,
    ));
  }

  Future<AppSyncSnapshot> statusSnapshot() async {
    if (!WorkoutSyncBootstrap.isReady) {
      final ok = await WorkoutSyncBootstrap.ensureStarted();
      if (!ok) return idleSnapshot;
    }
    final stats = await _offline.queueStats();
    final hasNetwork = await _connectivity.hasDeviceNetwork();
    final online = hasNetwork && await _connectivity.isOnline();
    final snap = await _offline.loadSnapshot();
    final legacy = await WorkoutPendingQueue.instance.pendingCount();

    WorkoutSyncDisplayState display;
    if (!hasNetwork) {
      display = WorkoutSyncDisplayState.offline;
    } else if (!online) {
      display = WorkoutSyncDisplayState.failed;
    } else if (stats.failed > 0) {
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
    );
  }

  Future<int> _syncLegacyQueue() async {
    return WorkoutPendingQueue.instance.drain(
      (workoutPlanId, durationMinutes, sets) async {
        await MeService.instance.completeWorkoutSession(
          workoutPlanId: workoutPlanId,
          durationMinutes: durationMinutes,
          sets: sets,
        );
      },
    );
  }

  Future<int> _syncPendingActions() async {
    final queue = await _offline.loadQueue();
    if (queue.isEmpty) return 0;

    var synced = 0;
    final remaining = <PendingSyncAction>[];

    for (var action in queue) {
      if (action.type == PendingSyncActionType.updateExercise) {
        synced++;
        continue;
      }

      if (action.retryCount >= _maxRetries) {
        remaining.add(action.copyWith(syncStatus: PendingSyncStatus.failed));
        continue;
      }

      try {
        switch (action.type) {
          case PendingSyncActionType.logSet:
            await _api.logSet(
              workoutSessionExerciseId:
                  action.payload['workoutSessionExerciseId'] as int,
              actualReps: action.payload['actualReps'] as int?,
              actualWeight: (action.payload['actualWeight'] as num?)?.toDouble(),
              isCompleted: action.payload['isCompleted'] as bool? ?? false,
              notes: action.payload['notes'] as String?,
            );
          case PendingSyncActionType.completeWorkout:
            final sid = action.payload['sessionId'] as int? ?? action.sessionId;
            if (sid != null && sid > 0) {
              await _api.complete(sid);
            }
          case PendingSyncActionType.updateExercise:
            break;
        }
        synced++;
      } catch (e) {
        remaining.add(action.copyWith(
          retryCount: action.retryCount + 1,
          syncStatus: PendingSyncStatus.pending,
          lastError: e.toString(),
        ));
      }
    }

    await _offline.saveQueue(remaining);
    return synced;
  }

  Future<int> _syncLiveSnapshot() async {
    final snap = await _offline.loadSnapshot();
    if (snap == null) return 0;
    if (!snap.session.isOffline && !snap.session.pendingCompleteSync) return 0;

    final memberId = snap.session.memberId;
    var server = snap.session.sessionId > 0
        ? await _api.getActive(memberId)
        : null;

    if (server == null && snap.session.workoutPlanId != null) {
      try {
        server = await _api.start(
          memberId: memberId,
          workoutPlanId: snap.session.workoutPlanId!,
        );
      } on ApiException catch (e) {
        if (e.statusCode == 409) {
          server = await _api.getActive(memberId);
        } else {
          rethrow;
        }
      }
    }
    if (server == null) return 0;

    final idMap = _mapSetIds(snap.session, server);
    for (final entry in idMap.entries) {
      final localSet = _findSet(snap.session, entry.key);
      if (localSet == null) continue;
      if (!localSet.isCompleted &&
          localSet.actualReps == null &&
          localSet.actualWeight == null) {
        continue;
      }
      await _api.logSet(
        workoutSessionExerciseId: entry.value,
        actualReps: localSet.actualReps,
        actualWeight: localSet.actualWeight,
        isCompleted: localSet.isCompleted,
        notes: localSet.notes,
      );
    }

    if (snap.session.pendingCompleteSync || snap.session.status == 'Completed') {
      await _api.complete(server.sessionId);
      await _offline.clearSnapshot();
    } else {
      final refreshed = await _api.getActive(memberId) ?? server;
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
    }
    return 1;
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
  });

  final WorkoutSyncDisplayState displayState;
  final bool hasDeviceNetwork;
  final bool serverReachable;
  final int pendingCount;
  final int failedCount;
  final int syncedCount;
  final bool isSyncing;
}
