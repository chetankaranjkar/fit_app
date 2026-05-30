import 'dart:math' as math;

import '../core/api_exception.dart';
import '../models/me_models.dart';
import '../models/workout_tracking_models.dart';
import '../workout_sync/models/local_workout_snapshot.dart';
import '../workout_sync/offline/offline_workout_repository.dart';
import '../workout_sync/sync/workout_sync_bootstrap.dart';
import '../workout_sync/recovery/session_recovery_service.dart';
import '../workout_sync/sync/session_autosave_service.dart';
import '../workout_sync/sync/sync_manager.dart';
import '../workout_sync/sync/workout_sync_log.dart';
import 'workout_pending_queue.dart';
import 'workout_template_cache.dart';
import 'workout_tracking_service.dart';

/// Live workout tracking: online API + Hive mirror + recovery + sync queue.
class WorkoutTrackingRepository {
  WorkoutTrackingRepository._();
  static final WorkoutTrackingRepository instance = WorkoutTrackingRepository._();

  final _api = WorkoutTrackingService.instance;
  final _offline = OfflineWorkoutRepository.instance;
  final _recovery = SessionRecoveryService.instance;
  final _sync = SyncManager.instance;
  final _templates = WorkoutTemplateCache.instance;

  Future<void> _ensureReady() async {
    await WorkoutSyncBootstrap.ensureStarted();
  }

  static bool _isOfflineError(Object e) =>
      e is ApiException && (e.isNetwork || e.statusCode == 503);

  Future<int> syncOfflineLiveSession() async {
    await _ensureReady();
    final result = await _sync.syncAll(reason: 'legacy-flush');
    return result.syncedCount;
  }

  Future<bool> hasPendingOfflineWorkout() async {
    await _ensureReady();
    return _offline.hasPendingSession();
  }

  Future<bool> hasPendingSync() async {
    await _ensureReady();
    if (await _offline.hasPendingSession()) return true;
    return (await WorkoutPendingQueue.instance.pendingCount()) > 0;
  }

  /// Recovery order: local → server → start (never if active exists).
  Future<ActiveWorkoutSession> resolveOrStart({
    required int memberId,
    required int workoutPlanId,
  }) async {
    await _ensureReady();
    final restored = await _recovery.restoreWorkoutSession(memberId);
    if (restored != null) return restored.session;

    try {
      return await start(memberId: memberId, workoutPlanId: workoutPlanId);
    } on ApiException catch (e) {
      if (e.statusCode == 409) {
        final active = await _recovery.restoreActiveSession(memberId);
        if (active != null) return active;
      }
      rethrow;
    }
  }

  Future<LocalWorkoutSnapshot?> restoreSnapshot(int memberId) async {
    await _ensureReady();
    return _recovery.restoreWorkoutSession(memberId);
  }

  Future<ActiveWorkoutSession> start({
    required int memberId,
    required int workoutPlanId,
  }) async {
    await _ensureReady();
    final existing = await _recovery.restoreActiveSession(memberId);
    if (existing != null) return existing;

    try {
      final session = await _api.start(
        memberId: memberId,
        workoutPlanId: workoutPlanId,
      );
      await _mirrorSnapshot(session);
      return session;
    } catch (e) {
      if (!_isOfflineError(e)) rethrow;
      return _startOffline(memberId: memberId, workoutPlanId: workoutPlanId);
    }
  }

  Future<ActiveWorkoutSession?> getActive(int memberId) async {
    await _ensureReady();
    final snap = await _recovery.restoreWorkoutSession(memberId);
    return snap?.session;
  }

  Future<TrackedWorkoutSet> logSet({
    required ActiveWorkoutSession session,
    required int workoutSessionExerciseId,
    int? actualReps,
    double? actualWeight,
    required bool isCompleted,
    String? notes,
  }) async {
    await _ensureReady();
    if (session.isOffline || session.sessionId <= 0) {
      return _logSetOffline(
        session: session,
        setId: workoutSessionExerciseId,
        actualReps: actualReps,
        actualWeight: actualWeight,
        isCompleted: isCompleted,
        notes: notes,
        enqueueSync: true,
      );
    }
    try {
      await _api.logSet(
        workoutSessionExerciseId: workoutSessionExerciseId,
        actualReps: actualReps,
        actualWeight: actualWeight,
        isCompleted: isCompleted,
        notes: notes,
      );
      final refreshed = await _api.getActive(session.memberId);
      if (refreshed != null) {
        await _mirrorSnapshot(refreshed);
        final row = _findSet(refreshed, workoutSessionExerciseId);
        if (row != null) return row;
      }
      final mirrored = await _offline.loadSession();
      if (mirrored != null) {
        final row = _findSet(mirrored, workoutSessionExerciseId);
        if (row != null) return row;
      }
      return TrackedWorkoutSet(
        id: workoutSessionExerciseId,
        exerciseId: 0,
        exerciseName: '',
        setNumber: 1,
        targetReps: actualReps ?? 0,
        isCompleted: isCompleted,
        actualReps: actualReps,
        actualWeight: actualWeight,
        notes: notes,
      );
    } catch (e) {
      if (!_isOfflineError(e)) rethrow;
      final base = (await _offline.loadSession()) ?? session;
      return _logSetOffline(
        session: base.copyWith(isOffline: true),
        setId: workoutSessionExerciseId,
        actualReps: actualReps,
        actualWeight: actualWeight,
        isCompleted: isCompleted,
        notes: notes,
        enqueueSync: true,
      );
    }
  }

  Future<ActiveWorkoutSession> complete(ActiveWorkoutSession session) async {
    await _ensureReady();
    if (session.isOffline || session.sessionId <= 0) {
      final done = _recalculate(session.copyWith(
        status: 'Completed',
        pendingCompleteSync: true,
        isOffline: true,
      ));
      await _mirrorSnapshot(done);
      await _sync.enqueueComplete(done);
      return done;
    }
    try {
      final result = await _api.complete(session.sessionId);
      await _offline.clearSnapshot();
      return result;
    } catch (e) {
      if (!_isOfflineError(e)) rethrow;
      final done = _recalculate(session.copyWith(
        status: 'Completed',
        pendingCompleteSync: true,
        isOffline: true,
      ));
      await _mirrorSnapshot(done);
      await _sync.enqueueComplete(done);
      return done;
    }
  }

  Future<ActiveWorkoutSession?> reloadSession(ActiveWorkoutSession current) async {
    await _ensureReady();
    if (current.isOffline || current.sessionId <= 0) {
      return _offline.loadSession();
    }
    try {
      final online = await _api.getActive(current.memberId);
      if (online != null) {
        final merged = await _mergeWithLocalIfAhead(online, current.memberId);
        await _mirrorSnapshot(merged);
        return merged;
      }
      return _offline.loadSession();
    } catch (e) {
      if (_isOfflineError(e)) return _offline.loadSession();
      rethrow;
    }
  }

  Future<void> saveUiState({
    required ActiveWorkoutSession session,
    required int elapsedSeconds,
    required int currentExerciseIndex,
    double scrollOffset = 0,
  }) async {
    await _ensureReady();
    await SessionAutosaveService.instance.persist(
      session: session,
      elapsedSeconds: elapsedSeconds,
      currentExerciseIndex: currentExerciseIndex,
      scrollOffset: scrollOffset,
    );
  }

  Future<LocalWorkoutSnapshot?> loadLocalSnapshot() async {
    await _ensureReady();
    return _offline.loadSnapshot();
  }

  Future<void> _mirrorSnapshot(ActiveWorkoutSession session) async {
    if (session.status == 'Completed' && !session.pendingCompleteSync) {
      await _offline.clearSnapshot();
      return;
    }
    final existing = await _offline.loadSnapshot();
    await _offline.saveSnapshot(LocalWorkoutSnapshot(
      session: session.copyWith(isOffline: false),
      currentExerciseIndex: existing?.currentExerciseIndex ?? 0,
      elapsedSeconds: existing?.elapsedSeconds ?? 0,
      scrollOffset: existing?.scrollOffset ?? 0,
      lastUpdatedAt: DateTime.now().toUtc(),
      lastSyncedAt: session.lastSyncedAt ?? DateTime.now().toUtc(),
      pendingActions: existing?.pendingActions ?? const [],
    ));
  }

  Future<ActiveWorkoutSession> _mergeWithLocalIfAhead(
    ActiveWorkoutSession server,
    int memberId,
  ) async {
    final local = await _offline.loadSnapshot();
    if (local == null ||
        local.session.memberId != memberId ||
        local.session.pendingCompleteSync) {
      return server;
    }
    if (local.session.sessionId > 0 &&
        server.sessionId > 0 &&
        local.session.sessionId != server.sessionId) {
      return server;
    }
    if (local.session.completedSets > server.completedSets) {
      return local.session.copyWith(
        sessionId: server.sessionId > 0 ? server.sessionId : local.session.sessionId,
        isOffline: false,
        lastSyncedAt: server.lastSyncedAt,
        serverTimeUtc: server.serverTimeUtc,
      );
    }
    return server;
  }

  Future<ActiveWorkoutSession> _startOffline({
    required int memberId,
    required int workoutPlanId,
  }) async {
    final template = await _templates.load(workoutPlanId);
    if (template == null || template.isRestDay || template.exercises.isEmpty) {
      throw const ApiException(
        'Offline: open this workout once while online to cache today\'s exercises.',
      );
    }
    final session = _buildSessionFromTemplate(
      memberId: memberId,
      template: template,
      offline: true,
    );
    await _mirrorSnapshot(session);
    WorkoutSyncLog.info('Started offline session for plan $workoutPlanId');
    return session;
  }

  Future<TrackedWorkoutSet> _logSetOffline({
    required ActiveWorkoutSession session,
    required int setId,
    int? actualReps,
    double? actualWeight,
    required bool isCompleted,
    String? notes,
    bool enqueueSync = false,
  }) async {
    final updated = _updateSetInSession(
      session,
      setId,
      actualReps: actualReps,
      actualWeight: actualWeight,
      isCompleted: isCompleted,
      notes: notes,
    );
    final recalc = _recalculate(updated.copyWith(isOffline: true));
    await _mirrorSnapshot(recalc);
    if (enqueueSync) {
      await _sync.enqueueLogSet(
        session: recalc,
        workoutSessionExerciseId: setId,
        actualReps: actualReps,
        actualWeight: actualWeight,
        isCompleted: isCompleted,
        notes: notes,
      );
    }
    return _findSet(recalc, setId)!;
  }

  TrackedWorkoutSet? _findSet(ActiveWorkoutSession session, int setId) {
    for (final g in session.exercises) {
      for (final s in g.sets) {
        if (s.id == setId) return s;
      }
    }
    return null;
  }

  ActiveWorkoutSession _updateSetInSession(
    ActiveWorkoutSession session,
    int setId, {
    int? actualReps,
    double? actualWeight,
    required bool isCompleted,
    String? notes,
  }) {
    final groups = <WorkoutExerciseGroup>[];
    for (final g in session.exercises) {
      final sets = <TrackedWorkoutSet>[];
      for (final s in g.sets) {
        if (s.id == setId) {
          final reps = actualReps ?? s.actualReps;
          final weight = actualWeight ?? s.actualWeight;
          final vol = isCompleted && reps != null ? (weight ?? 0) * reps : null;
          final completedAt = isCompleted
              ? (s.completedAt ?? DateTime.now().toUtc())
              : null;
          sets.add(s.copyWith(
            actualReps: actualReps ?? s.actualReps,
            actualWeight: actualWeight ?? s.actualWeight,
            isCompleted: isCompleted,
            notes: notes ?? s.notes,
            setVolume: vol,
            completedAt: completedAt,
          ));
        } else {
          sets.add(s);
        }
      }
      groups.add(WorkoutExerciseGroup(
        exerciseId: g.exerciseId,
        exerciseName: g.exerciseName,
        sets: sets,
      ));
    }
    return session.copyWith(exercises: groups);
  }

  ActiveWorkoutSession _recalculate(ActiveWorkoutSession session) {
    var total = 0;
    var completed = 0;
    var volume = 0.0;
    for (final g in session.exercises) {
      for (final s in g.sets) {
        total++;
        if (s.isCompleted) {
          completed++;
          if (s.actualReps != null) {
            volume += (s.actualWeight ?? 0) * s.actualReps!;
          }
        }
      }
    }
    final pct = total == 0 ? 0.0 : 100.0 * completed / total;
    return session.copyWith(
      completionPercent: double.parse(pct.toStringAsFixed(1)),
      completedSets: completed,
      totalSets: total,
      totalVolume: volume,
    );
  }

  ActiveWorkoutSession _buildSessionFromTemplate({
    required int memberId,
    required MeWorkoutSessionTemplate template,
    required bool offline,
  }) {
    var nextLocalId = -1;
    final groups = <WorkoutExerciseGroup>[];

    for (final line in template.exercises) {
      final sets = <TrackedWorkoutSet>[];
      final setCount = math.max(1, line.targetSets);
      for (var n = 1; n <= setCount; n++) {
        sets.add(TrackedWorkoutSet(
          id: nextLocalId--,
          exerciseId: line.exerciseId,
          exerciseName: line.exerciseName,
          setNumber: n,
          targetReps: line.targetReps,
          targetWeight: line.suggestedWeight,
          restSeconds: line.restSeconds,
          isCompleted: false,
        ));
      }
      groups.add(WorkoutExerciseGroup(
        exerciseId: line.exerciseId,
        exerciseName: line.exerciseName,
        sets: sets,
      ));
    }

    final now = DateTime.now().toUtc();
    return _recalculate(ActiveWorkoutSession(
      sessionId: 0,
      memberId: memberId,
      workoutPlanId: template.plan.id,
      planName: template.plan.planName,
      status: 'InProgress',
      workoutDate: now,
      startTimeUtc: now,
      completionPercent: 0,
      completedSets: 0,
      totalSets: groups.fold(0, (a, g) => a + g.sets.length),
      totalVolume: 0,
      exercises: groups,
      isOffline: offline,
    ));
  }
}
