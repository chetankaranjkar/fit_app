import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../models/workout_tracking_models.dart';
import '../services/workout_tracking_repository.dart';
import '../services/workout_tracking_service.dart';

final memberIdProvider = FutureProvider.autoDispose<int>((ref) async {
  return WorkoutTrackingService.instance.resolveMemberId();
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
