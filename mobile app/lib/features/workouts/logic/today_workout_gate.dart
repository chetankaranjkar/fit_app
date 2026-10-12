import '../../../models/workout_tracking_models.dart';
import 'workout_day.dart';

enum TodayWorkoutAction {
  start,
  resume,
  viewCompleted,
  otherPlanInProgress,
  syncBeforeAnother,
}

class TodayWorkoutDecision {
  const TodayWorkoutDecision({
    required this.action,
    this.session,
    this.awaitingSync = false,
  });

  final TodayWorkoutAction action;
  final ActiveWorkoutSession? session;
  final bool awaitingSync;

  bool get isClosed =>
      action == TodayWorkoutAction.viewCompleted || action == TodayWorkoutAction.syncBeforeAnother;
}

/// Shared today-state for Home, Workouts, workout detail, and launchers.
class TodayWorkoutGate {
  TodayWorkoutGate._();

  static TodayWorkoutDecision decide({
    required int memberId,
    required int? workoutPlanId,
    ActiveWorkoutSession? localSession,
    ActiveWorkoutSession? serverActive,
    ActiveWorkoutSession? serverCompleted,
    required DateTime now,
    bool startAnother = false,
    bool serverReachable = true,
  }) {
    final local = _ownedToday(localSession, memberId, now) ? localSession : null;
    final localClosed = local != null && _isClosed(local);
    final localMatchesPlan = local != null && _matchesPlan(local, workoutPlanId);
    final completed = _ownedToday(serverCompleted, memberId, now) ? serverCompleted : null;
    final completedMatches = completed != null && _matchesPlan(completed, workoutPlanId);
    final active = serverActive != null &&
            serverActive.memberId == memberId &&
            !_isClosed(serverActive)
        ? serverActive
        : null;

    if (!startAnother && localClosed && localMatchesPlan) {
      return TodayWorkoutDecision(
        action: TodayWorkoutAction.viewCompleted,
        session: local,
        awaitingSync: local.pendingCompleteSync || local.isOffline,
      );
    }

    if (!startAnother && completedMatches) {
      return TodayWorkoutDecision(
        action: TodayWorkoutAction.viewCompleted,
        session: completed,
      );
    }

    if (active != null && workoutPlanId != null && !_matchesPlan(active, workoutPlanId)) {
      return TodayWorkoutDecision(
        action: TodayWorkoutAction.otherPlanInProgress,
        session: active,
      );
    }

    if (active != null && _matchesPlan(active, workoutPlanId)) {
      return TodayWorkoutDecision(action: TodayWorkoutAction.resume, session: active);
    }

    if (local != null && !_isClosed(local) && _matchesPlan(local, workoutPlanId)) {
      return TodayWorkoutDecision(action: TodayWorkoutAction.resume, session: local);
    }

    if (startAnother && localClosed && local.pendingCompleteSync && !serverReachable) {
      return TodayWorkoutDecision(
        action: TodayWorkoutAction.syncBeforeAnother,
        session: local,
        awaitingSync: true,
      );
    }

    return const TodayWorkoutDecision(action: TodayWorkoutAction.start);
  }

  static bool blocksAnotherUntilSynced(ActiveWorkoutSession? local, int memberId) {
    if (local == null || local.memberId != memberId) return false;
    return local.pendingCompleteSync;
  }

  static bool _ownedToday(ActiveWorkoutSession? session, int memberId, DateTime now) {
    if (session == null || session.memberId != memberId) return false;
    final stamp = session.workoutDate ?? session.startTimeUtc;
    if (stamp == null) return false;
    return WorkoutDay.sameLocalDay(stamp, now);
  }

  static bool _matchesPlan(ActiveWorkoutSession session, int? workoutPlanId) {
    if (workoutPlanId == null) return true;
    return session.workoutPlanId == null || session.workoutPlanId == workoutPlanId;
  }

  static bool _isClosed(ActiveWorkoutSession session) =>
      session.pendingCompleteSync || session.status.toLowerCase() == 'completed';
}

String todayWorkoutButtonLabel(TodayWorkoutAction action) {
  switch (action) {
    case TodayWorkoutAction.resume:
      return 'RESUME WORKOUT';
    case TodayWorkoutAction.viewCompleted:
    case TodayWorkoutAction.syncBeforeAnother:
      return 'VIEW COMPLETED WORKOUT';
    case TodayWorkoutAction.start:
    case TodayWorkoutAction.otherPlanInProgress:
      return 'START WORKOUT';
  }
}

/// Shares one in-flight future per key so repeated taps do not start twice.
class InFlightGate {
  final Map<String, Future<Object?>> _running = {};

  Future<T> run<T>(String key, Future<T> Function() body) {
    final existing = _running[key];
    if (existing != null) return existing as Future<T>;
    final future = body();
    _running[key] = future;
    future.whenComplete(() {
      if (identical(_running[key], future)) _running.remove(key);
    });
    return future;
  }
}
