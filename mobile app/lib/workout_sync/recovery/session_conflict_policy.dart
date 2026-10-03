import '../../models/workout_tracking_models.dart';
import '../models/local_workout_snapshot.dart';

/// Conflict rules for live workout recovery (not a CRDT).
///
/// * Same [ActiveWorkoutSession.sessionId] (or local id 0): **local last-write**
///   when local has more completed sets (unsent work).
/// * Different positive session ids: **server wins** (another device started a new session).
/// * Completed / pending-complete local sessions are **not live**; they stay queued for flush.
abstract final class SessionConflictPolicy {
  static bool isLiveResumable(LocalWorkoutSnapshot? snap, int memberId) {
    if (snap == null) return false;
    if (snap.session.memberId != memberId) return false;
    if (snap.session.pendingCompleteSync) return false;
    if (snap.session.status == 'Completed') return false;
    return snap.isInProgress;
  }

  static bool isPendingComplete(LocalWorkoutSnapshot? snap, int memberId) {
    if (snap == null) return false;
    if (snap.session.memberId != memberId) return false;
    return snap.session.pendingCompleteSync || snap.session.status == 'Completed';
  }

  static ActiveWorkoutSession mergeLive(
    ActiveWorkoutSession server,
    LocalWorkoutSnapshot? local,
    int memberId,
  ) {
    if (local == null || local.session.memberId != memberId) return server;
    if (local.session.pendingCompleteSync || local.session.status == 'Completed') {
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
