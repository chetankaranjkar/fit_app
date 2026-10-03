import '../../core/api_exception.dart';
import '../../models/workout_tracking_models.dart';
import '../../services/workout_tracking_service.dart';
import '../models/local_workout_snapshot.dart';
import '../offline/offline_workout_repository.dart';
import '../sync/workout_sync_log.dart';
import 'session_conflict_policy.dart';

/// Restores in-progress workouts: **local first**, then server, never creates sessions.
class SessionRecoveryService {
  SessionRecoveryService._();
  static final SessionRecoveryService instance = SessionRecoveryService._();

  final _offline = OfflineWorkoutRepository.instance;
  final _api = WorkoutTrackingService.instance;

  /// Priority: (1) local **live** snapshot → (2) server active → (3) null.
  /// Completed / pending-complete sessions are not returned as live.
  Future<LocalWorkoutSnapshot?> restoreWorkoutSession(int memberId) async {
    final local = await _offline.loadSnapshot(memberId: memberId);
    if (SessionConflictPolicy.isLiveResumable(local, memberId)) {
      WorkoutSyncLog.info('Recovery: restored local session ${local!.session.sessionId}');
      return local;
    }

    try {
      final server = await _api.getActive(memberId);
      if (server != null && server.status == 'InProgress') {
        final merged = SessionConflictPolicy.mergeLive(server, local, memberId);
        final snap = LocalWorkoutSnapshot(
          session: merged,
          currentExerciseIndex: local?.currentExerciseIndex ?? 0,
          elapsedSeconds: local?.elapsedSeconds ?? 0,
          scrollOffset: local?.scrollOffset ?? 0,
          lastUpdatedAt: DateTime.now().toUtc(),
          lastSyncedAt: merged.lastSyncedAt ?? DateTime.now().toUtc(),
        );
        await _offline.saveSnapshot(snap);
        WorkoutSyncLog.info('Recovery: restored server session ${merged.sessionId}');
        return snap;
      }
    } on ApiException catch (e) {
      if (!e.isNetwork && e.statusCode != 503) rethrow;
      WorkoutSyncLog.warn('Recovery: server unreachable, no local live session');
    }

    return null;
  }

  Future<ActiveWorkoutSession?> restoreActiveSession(int memberId) async {
    final snap = await restoreWorkoutSession(memberId);
    return snap?.session;
  }
}
