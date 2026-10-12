import 'package:flutter/cupertino.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../models/workout_tracking_models.dart';
import '../../services/workout_tracking_service.dart';
import '../../theme/app_colors.dart';
import '../../theme/app_theme.dart';
import '../../widgets/empty_state.dart';
import '../../widgets/fitness_text.dart';
import '../../widgets/glass_card.dart';
import '../../widgets/premium_background.dart';
import '../workouts/logic/recorded_work.dart';

final workoutSessionDetailProvider =
    FutureProvider.autoDispose.family<WorkoutSessionDetail, int>((ref, sessionId) async {
  return WorkoutTrackingService.instance.getSessionDetail(sessionId);
});

class WorkoutHistoryDetailScreen extends ConsumerWidget {
  const WorkoutHistoryDetailScreen({super.key, required this.sessionId});

  final int sessionId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final detail = ref.watch(workoutSessionDetailProvider(sessionId));
    return CupertinoPageScaffold(
      backgroundColor: AppColors.resolveBg(context),
      navigationBar: const CupertinoNavigationBar(middle: Text('Saved workout')),
      child: Stack(
        children: [
          const Positioned.fill(child: PremiumBackground()),
          SafeArea(
            child: detail.when(
              loading: () => const Center(child: CupertinoActivityIndicator()),
              error: (e, _) => ErrorStateView(
                message: e.toString(),
                onRetry: () => ref.refresh(workoutSessionDetailProvider(sessionId)),
              ),
              data: (data) => ListView(
                padding: const EdgeInsets.all(AppSpacing.lg),
                children: [
                  Text(data.session.planName ?? 'Workout', style: FitnessText.title(context)),
                  const SizedBox(height: AppSpacing.sm),
                  Text(
                    _summary(data),
                    style: FitnessText.body(context),
                  ),
                  const SizedBox(height: AppSpacing.lg),
                  for (final group in data.session.exercises) ...[
                    GlassCard(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(group.exerciseName, style: FitnessText.title(context)),
                          const SizedBox(height: AppSpacing.sm),
                          for (final set in group.sets)
                            Padding(
                              padding: const EdgeInsets.only(bottom: 6),
                              child: Text(
                                _setLine(set),
                                style: FitnessText.body(
                                  context,
                                  color: set.isCompleted
                                      ? AppColors.success
                                      : AppColors.resolveTextSecondary(context),
                                ),
                              ),
                            ),
                        ],
                      ),
                    ),
                    const SizedBox(height: AppSpacing.md),
                  ],
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  String _summary(WorkoutSessionDetail data) {
    final volume = RecordedWork.score(
      data.session.totalSets,
      [
        for (final group in data.session.exercises)
          for (final set in group.sets)
            if (set.isCompleted) PerformedSet(weight: set.actualWeight, reps: set.actualReps),
      ],
    );
    final partial = data.session.completedSets < data.session.totalSets;
    return [
      if (partial) 'Partial',
      '${data.completedExercises} exercises',
      '${data.session.completedSets}/${data.session.totalSets} sets',
      if (data.durationMinutes > 0) '${data.durationMinutes} min',
      recordedVolumeLabel(volume: volume.volume, volumeComplete: volume.volumeComplete),
    ].join(' · ');
  }

  String _setLine(TrackedWorkoutSet set) {
    if (!set.isCompleted) return 'Set ${set.setNumber} · not logged';
    final weight = set.actualWeight == null ? 'weight not recorded' : '${set.actualWeight} kg';
    final reps = set.actualReps == null ? 'reps not recorded' : '${set.actualReps} reps';
    return 'Set ${set.setNumber} · $reps · $weight';
  }
}
