import 'dart:math' as math;

import '../core/api_exception.dart';
import '../models/me_models.dart';
import '../models/workout_tracking_models.dart';
import 'workout_offline_store.dart';
import 'workout_template_cache.dart';
import 'workout_tracking_service.dart';

/// Online-first live workout tracking with SharedPreferences fallback.
class WorkoutTrackingRepository {
  WorkoutTrackingRepository._();
  static final WorkoutTrackingRepository instance = WorkoutTrackingRepository._();

  final _api = WorkoutTrackingService.instance;
  final _offline = WorkoutOfflineStore.instance;
  final _templates = WorkoutTemplateCache.instance;

  static bool _isOfflineError(Object e) =>
      e is ApiException && (e.isNetwork || e.statusCode == 503);

  /// Sync offline live session. Call on app open / pull-to-refresh (with legacy queue in MeService).
  Future<int> syncOfflineLiveSession() => _syncOfflineLiveSession();

  Future<bool> hasPendingOfflineWorkout() => _offline.hasPendingSession();

  Future<ActiveWorkoutSession> start({
    required int memberId,
    required int workoutPlanId,
  }) async {
    try {
      final session = await _api.start(
        memberId: memberId,
        workoutPlanId: workoutPlanId,
      );
      await _offline.clearSession();
      return session;
    } catch (e) {
      if (!_isOfflineError(e)) rethrow;
      return _startOffline(memberId: memberId, workoutPlanId: workoutPlanId);
    }
  }

  Future<ActiveWorkoutSession?> getActive(int memberId) async {
    try {
      final online = await _api.getActive(memberId);
      if (online != null) {
        await _offline.clearSession();
        return online;
      }
    } catch (e) {
      if (!_isOfflineError(e)) rethrow;
    }
    final local = await _offline.loadSession();
    if (local != null &&
        local.memberId == memberId &&
        local.status == 'InProgress' &&
        !local.pendingCompleteSync) {
      return local;
    }
    return null;
  }

  Future<TrackedWorkoutSet> logSet({
    required ActiveWorkoutSession session,
    required int workoutSessionExerciseId,
    int? actualReps,
    double? actualWeight,
    required bool isCompleted,
    String? notes,
  }) async {
    if (session.isOffline || session.sessionId <= 0) {
      return _logSetOffline(
        session: session,
        setId: workoutSessionExerciseId,
        actualReps: actualReps,
        actualWeight: actualWeight,
        isCompleted: isCompleted,
        notes: notes,
      );
    }
    try {
      final row = await _api.logSet(
        workoutSessionExerciseId: workoutSessionExerciseId,
        actualReps: actualReps,
        actualWeight: actualWeight,
        isCompleted: isCompleted,
        notes: notes,
      );
      await _offline.clearSession();
      return row;
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
      );
    }
  }

  Future<ActiveWorkoutSession> complete(ActiveWorkoutSession session) async {
    if (session.isOffline || session.sessionId <= 0) {
      final done = session.copyWith(
        status: 'Completed',
        pendingCompleteSync: true,
        isOffline: true,
      );
      final recalc = _recalculate(done);
      await _offline.saveSession(recalc);
      return recalc;
    }
    try {
      final result = await _api.complete(session.sessionId);
      await _offline.clearSession();
      return result;
    } catch (e) {
      if (!_isOfflineError(e)) rethrow;
      final done = session.copyWith(
        status: 'Completed',
        pendingCompleteSync: true,
        isOffline: true,
      );
      final recalc = _recalculate(done);
      await _offline.saveSession(recalc);
      return recalc;
    }
  }

  /// Reload session from API or local store after a set save.
  Future<ActiveWorkoutSession?> reloadSession(ActiveWorkoutSession current) async {
    if (current.isOffline || current.sessionId <= 0) {
      return _offline.loadSession();
    }
    try {
      return await _api.getActive(current.memberId);
    } catch (e) {
      if (_isOfflineError(e)) return _offline.loadSession();
      rethrow;
    }
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
    await _offline.saveSession(session);
    return session;
  }

  Future<TrackedWorkoutSet> _logSetOffline({
    required ActiveWorkoutSession session,
    required int setId,
    int? actualReps,
    double? actualWeight,
    required bool isCompleted,
    String? notes,
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
    await _offline.saveSession(recalc);
    return _findSet(recalc, setId)!;
  }

  Future<int> _syncOfflineLiveSession() async {
    final offline = await _offline.loadSession();
    if (offline == null) return 0;
    if (!offline.isOffline && !offline.pendingCompleteSync) {
      await _offline.clearSession();
      return 0;
    }

    try {
      var server = offline.sessionId > 0
          ? await _api.getActive(offline.memberId)
          : null;

      if (server == null && offline.workoutPlanId != null) {
        try {
          server = await _api.start(
            memberId: offline.memberId,
            workoutPlanId: offline.workoutPlanId!,
          );
        } on ApiException catch (e) {
          if (e.statusCode == 409) {
            server = await _api.getActive(offline.memberId);
          } else {
            rethrow;
          }
        }
      }

      if (server == null) return 0;

      final idMap = _mapSetIds(offline, server);

      for (final entry in idMap.entries) {
        final localSet = _findSet(offline, entry.key);
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

      if (offline.pendingCompleteSync || offline.status == 'Completed') {
        await _api.complete(server.sessionId);
      }

      await _offline.clearSession();
      return 1;
    } catch (_) {
      return 0;
    }
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
          sets.add(s.copyWith(
            actualReps: actualReps ?? s.actualReps,
            actualWeight: actualWeight ?? s.actualWeight,
            isCompleted: isCompleted,
            notes: notes ?? s.notes,
            setVolume: vol,
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
