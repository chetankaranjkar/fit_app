import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../features/workouts/logic/today_workout_gate.dart';
import '../models/workout_tracking_models.dart';
import '../providers/me_providers.dart';
import '../services/workout_tracking_repository.dart';
import '../services/workout_tracking_service.dart';
import '../workout_sync/sync/sync_manager.dart';

final memberIdProvider = FutureProvider.autoDispose<int>((ref) async {
  final id = await WorkoutTrackingService.instance.resolveMemberId();
  await SyncManager.instance.bindMember(id);
  return id;
});

final workoutTrackingDashboardProvider =
    FutureProvider.autoDispose<WorkoutTrackingDashboard>((ref) async {
  final memberId = await ref.watch(memberIdProvider.future);
  return WorkoutTrackingService.instance.dashboard(memberId);
});

final activeWorkoutProvider = FutureProvider.autoDispose<ActiveWorkoutSession?>((ref) async {
  final memberId = await ref.watch(memberIdProvider.future);
  return WorkoutTrackingRepository.instance.getActive(memberId);
});

final todayWorkoutProvider = FutureProvider.autoDispose<TodayWorkoutDecision>((ref) async {
  final memberId = await ref.watch(memberIdProvider.future);
  return WorkoutTrackingRepository.instance.resolveToday(memberId: memberId);
});

final workoutSyncRefreshProvider = Provider<void>((ref) {
  final sub = SyncManager.instance.onSynced.listen((_) {
    ref.invalidate(workoutTrackingDashboardProvider);
    ref.invalidate(activeWorkoutProvider);
    ref.invalidate(todayWorkoutProvider);
    ref.invalidate(workoutSessionHistoryProvider);
    ref.invalidate(dashboardProvider);
  });
  ref.onDispose(sub.cancel);
});

final hasPendingWorkoutSyncProvider = FutureProvider.autoDispose<bool>((ref) async {
  return WorkoutTrackingRepository.instance.hasPendingOfflineWorkout();
});

final exerciseHistoryProvider = FutureProvider.autoDispose
    .family<WorkoutExerciseHistory, (int memberId, int exerciseId)>((ref, key) async {
  return WorkoutTrackingService.instance.exerciseHistory(
    memberId: key.$1,
    exerciseId: key.$2,
  );
});
