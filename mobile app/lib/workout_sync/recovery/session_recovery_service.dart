import '../../core/api_exception.dart';
import '../../models/workout_tracking_models.dart';
import '../../services/workout_tracking_service.dart';
import '../models/local_workout_snapshot.dart';
import '../offline/offline_workout_repository.dart';
import '../sync/workout_sync_log.dart';

/// Restores in-progress workouts: **local first**, then server, never creates sessions.
class SessionRecoveryService {
  SessionRecoveryService._();
  static final SessionRecoveryService instance = SessionRecoveryService._();

  final _offline = OfflineWorkoutRepository.instance;
  final _api = WorkoutTrackingService.instance;

  /// Priority: (1) local active snapshot → (2) server active → (3) null.
  Future<LocalWorkoutSnapshot?> restoreWorkoutSession(int memberId) async {
    final local = await _offline.loadSnapshot();
    if (_isResumableLocal(local, memberId)) {
      WorkoutSyncLog.info('Recovery: restored local session ${local!.session.sessionId}');
      return local;
    }

    try {
      final server = await _api.getActive(memberId);
      if (server != null && server.status == 'InProgress') {
        final merged = await _mergeLocalAhead(server, memberId);
        final snap = LocalWorkoutSnapshot(
          session: merged,
          lastUpdatedAt: DateTime.now().toUtc(),
          lastSyncedAt: merged.lastSyncedAt ?? DateTime.now().toUtc(),
        );
        await _offline.saveSnapshot(snap);
        WorkoutSyncLog.info('Recovery: restored server session ${merged.sessionId}');
        return snap;
      }
    } on ApiException catch (e) {
      if (!e.isNetwork && e.statusCode != 503) rethrow;
      WorkoutSyncLog.warn('Recovery: server unreachable, no local session');
    }

    return null;
  }

  Future<ActiveWorkoutSession?> restoreActiveSession(int memberId) async {
    final snap = await restoreWorkoutSession(memberId);
    return snap?.session;
  }

  bool _isResumableLocal(LocalWorkoutSnapshot? snap, int memberId) {
    if (snap == null) return false;
    if (snap.session.memberId != memberId) return false;
    if (snap.session.pendingCompleteSync) return true;
    return snap.isInProgress;
  }

  Future<ActiveWorkoutSession> _mergeLocalAhead(
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
}
