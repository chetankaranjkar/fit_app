import 'package:flutter/cupertino.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../models/me_models.dart';
import '../../providers/me_providers.dart';
import '../../providers/workout_tracking_providers.dart';
import '../../services/me_service.dart';
import '../../theme/app_colors.dart';
import '../../theme/app_theme.dart';
import '../../theme/app_typography.dart';
import '../../widgets/empty_state.dart';
import '../../widgets/glass_card.dart';
import '../../widgets/premium_background.dart';
import '../../widgets/skeleton_shimmer.dart';
import '../home/home_today_actions.dart';
import '../shell/shell_layout_metrics.dart';

class WorkoutsScreen extends ConsumerWidget {
  const WorkoutsScreen({super.key});
  Future<void> _refresh(WidgetRef ref) async {
    await MeService.instance.flushPendingWorkoutSessions();
    ref.invalidate(dashboardProvider);
    ref.invalidate(workoutPlansProvider);
    ref.invalidate(workoutSessionTemplateProvider);
    ref.invalidate(activeWorkoutProvider);
    ref.invalidate(todayWorkoutProvider);
    ref.invalidate(workoutTrackingDashboardProvider);
    ref.invalidate(workoutSessionHistoryProvider);
    await ref.read(workoutPlansProvider.future);
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    ref.watch(workoutSyncRefreshProvider);
    final plans = ref.watch(workoutPlansProvider);
    return CupertinoPageScaffold(
      backgroundColor: AppColors.resolveBg(context),
      child: Stack(children: [
        const Positioned.fill(child: PremiumBackground()),
        SafeArea(
            bottom: false,
            child: CustomScrollView(
              physics: const BouncingScrollPhysics(
                  parent: AlwaysScrollableScrollPhysics()),
              slivers: [
                const CupertinoSliverNavigationBar(
                    largeTitle: Text('Workouts'), border: null),
                CupertinoSliverRefreshControl(onRefresh: () => _refresh(ref)),
                SliverPadding(
                  padding: ShellLayoutMetrics.scrollPadding(context),
                  sliver: SliverToBoxAdapter(
                      child: plans.when(
                    loading: () => const Column(children: [
                      SkeletonBlock(height: 170),
                      SizedBox(height: AppSpacing.lg),
                      SkeletonBlock(height: 200),
                    ]),
                    error: (e, _) => ErrorStateView(
                        message: e.toString(),
                        onRetry: () => ref.invalidate(workoutPlansProvider)),
                    data: (data) => _AssignedTraining(plans: data),
                  )),
                ),
              ],
            )),
      ]),
    );
  }
}

class _AssignedTraining extends ConsumerWidget {
  const _AssignedTraining({required this.plans});
  final List<MeWorkoutPlanSummary> plans;
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final action = ref.watch(todayWorkoutActionProvider);
    final featured = action?.plan;
    final others = plans.where((p) => p.id != featured?.id).toList();
    return Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
      Text('Your assigned training',
          style: AppType.subhead
              .copyWith(color: AppColors.resolveTextSecondary(context))),
      const SizedBox(height: AppSpacing.lg),
      const TodayWorkoutCard(),
      if (featured != null) ...[
        const SizedBox(height: AppSpacing.xxl),
        _TodayExercises(plan: featured),
      ],
      if (plans.isEmpty) ...[
        const SizedBox(height: AppSpacing.lg),
        const EmptyState(
            title: 'No workout assigned',
            message: 'Ask your trainer or front desk to assign a workout plan.',
            icon: CupertinoIcons.flame),
      ],
      if (others.isNotEmpty) ...[
        const SizedBox(height: AppSpacing.xxl),
        Text(featured == null ? 'Assigned plans' : 'Other assigned plans',
            style: AppType.headline
                .copyWith(color: AppColors.resolveText(context))),
        const SizedBox(height: AppSpacing.md),
        for (final plan in others)
          Padding(
            padding: const EdgeInsets.only(bottom: AppSpacing.md),
            child: CupertinoButton(
              padding: EdgeInsets.zero,
              onPressed: () =>
                  context.push('/workouts/${plan.id}', extra: plan),
              child: GlassCard(
                  child: Row(children: [
                const Icon(CupertinoIcons.flame, color: AppColors.accent),
                const SizedBox(width: AppSpacing.md),
                Expanded(
                    child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                      Text(plan.planName,
                          style: AppType.headline
                              .copyWith(color: AppColors.resolveText(context))),
                      const SizedBox(height: 4),
                      Text(
                          '${plan.exerciseCount} exercises${plan.durationMinutes != null ? ' · ${plan.durationMinutes} min' : ''}',
                          style: AppType.footnote.copyWith(
                              color: AppColors.resolveTextSecondary(context))),
                      const SizedBox(height: 4),
                      const Text('View plan',
                          style:
                              TextStyle(fontSize: 14, color: AppColors.accent)),
                    ])),
                Icon(CupertinoIcons.chevron_right,
                    size: 16, color: AppColors.resolveTextSecondary(context)),
              ])),
            ),
          ),
      ],
    ]);
  }
}

class _TodayExercises extends ConsumerWidget {
  const _TodayExercises({required this.plan});
  final MeWorkoutPlanSummary plan;
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final template = ref.watch(workoutSessionTemplateProvider(plan.id));
    return template.when(
      loading: () => const SkeletonBlock(height: 160),
      error: (_, __) => CupertinoButton(
          padding: EdgeInsets.zero,
          onPressed: () =>
              ref.invalidate(workoutSessionTemplateProvider(plan.id)),
          child: const Text('Retry loading exercises')),
      data: (data) {
        if (data.isRestDay ||
            !data.isScheduledToday ||
            data.exercises.isEmpty) {
          return const SizedBox.shrink();
        }
        final exercises = [...data.exercises]
          ..sort((a, b) => a.order.compareTo(b.order));
        return Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Text('Today’s exercises',
                  style: AppType.headline
                      .copyWith(color: AppColors.resolveText(context))),
              const SizedBox(height: AppSpacing.md),
              for (final exercise in exercises)
                Padding(
                  padding: const EdgeInsets.only(bottom: AppSpacing.sm),
                  child: GlassCard(
                      child: Row(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                        const Icon(CupertinoIcons.sportscourt,
                            color: AppColors.accent, size: 22),
                        const SizedBox(width: AppSpacing.md),
                        Expanded(
                            child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                              Text(exercise.exerciseName,
                                  style: AppType.headline.copyWith(
                                      color: AppColors.resolveText(context))),
                              const SizedBox(height: 4),
                              Text(
                                  '${exercise.targetSets} sets × ${exercise.targetReps} reps',
                                  style: AppType.subhead.copyWith(
                                      color: AppColors.resolveTextSecondary(
                                          context))),
                            ])),
                      ])),
                ),
            ]);
      },
    );
  }
}
