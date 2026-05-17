import 'package:flutter/cupertino.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../models/me_models.dart';
import '../../providers/me_providers.dart';
import '../../theme/app_colors.dart';
import '../../theme/app_theme.dart';
import '../../theme/app_typography.dart';
import '../../widgets/empty_state.dart';
import '../../widgets/glass_card.dart';
import '../../widgets/press_scale.dart';
import '../../widgets/premium_background.dart';
import '../shell/shell_layout_metrics.dart';
import '../../widgets/skeleton_shimmer.dart';

class WorkoutsScreen extends ConsumerWidget {
  const WorkoutsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final plans = ref.watch(workoutPlansProvider);
    return CupertinoPageScaffold(
      backgroundColor: AppColors.resolveBg(context),
      child: Stack(
        children: [
          const Positioned.fill(child: PremiumBackground()),
          SafeArea(
            bottom: false,
            child: CustomScrollView(
          physics: const BouncingScrollPhysics(parent: AlwaysScrollableScrollPhysics()),
          slivers: [
            const CupertinoSliverNavigationBar(
              largeTitle: Text('Workouts'),
              border: null,
            ),
            CupertinoSliverRefreshControl(
              onRefresh: () async => ref.refresh(workoutPlansProvider),
            ),
            plans.when(
              loading: () => SliverPadding(
                padding: ShellLayoutMetrics.scrollPadding(context),
                sliver: SliverList(
                  delegate: SliverChildListDelegate.fixed([
                    for (var i = 0; i < 6; i++) ...[
                      const SkeletonBlock(height: 96),
                      const SizedBox(height: AppSpacing.md),
                    ],
                  ]),
                ),
              ),
              error: (e, _) => SliverFillRemaining(
                hasScrollBody: false,
                child: ErrorStateView(
                  message: e.toString(),
                  onRetry: () => ref.refresh(workoutPlansProvider),
                ),
              ),
              data: (data) {
                if (data.isEmpty) {
                  return const SliverFillRemaining(
                    hasScrollBody: false,
                    child: EmptyState(
                      title: 'No workout assigned',
                      message:
                          'Ask your trainer or front desk to assign a workout plan. Contact your gym if you need help.',
                      icon: CupertinoIcons.flame,
                    ),
                  );
                }
                return SliverPadding(
                  padding: ShellLayoutMetrics.scrollPadding(context),
                  sliver: SliverList(
                    delegate: SliverChildListDelegate([
                      _WorkoutsHero(totalPlans: data.length),
                      const SizedBox(height: AppSpacing.lg),
                      _CategoryStrip(plans: data),
                      const SizedBox(height: AppSpacing.lg),
                      for (var i = 0; i < data.length; i++) ...[
                        _PlanCard(plan: data[i])
                            .animate(delay: (i * 60).ms)
                            .fadeIn(duration: 320.ms)
                            .slideY(begin: 0.04, end: 0, curve: Curves.easeOutCubic),
                        if (i != data.length - 1) const SizedBox(height: AppSpacing.md),
                      ],
                    ]),
                  ),
                );
              },
            ),
          ],
        ),
      ),
        ],
      ),
    );
  }
}

class _WorkoutsHero extends StatelessWidget {
  const _WorkoutsHero({required this.totalPlans});
  final int totalPlans;

  @override
  Widget build(BuildContext context) {
    return GlassCard(
      padding: const EdgeInsets.all(AppSpacing.lg),
      tint: AppColors.neonPurple.withValues(alpha: 0.08),
      child: Row(
        children: [
          Container(
            width: 48,
            height: 48,
            decoration: BoxDecoration(
              gradient: AppColors.neonGradient,
              borderRadius: BorderRadius.circular(AppRadius.md),
            ),
            child: const Icon(CupertinoIcons.flame_fill, color: CupertinoColors.white),
          ),
          const SizedBox(width: AppSpacing.md),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  '$totalPlans active plans',
                  style: AppType.headline.copyWith(
                    color: AppColors.resolveText(context),
                    fontWeight: FontWeight.w700,
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  'Pick a plan and start your session with guided structure.',
                  style: AppType.footnote.copyWith(color: AppColors.resolveTextSecondary(context)),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _CategoryStrip extends StatelessWidget {
  const _CategoryStrip({required this.plans});
  final List<MeWorkoutPlanSummary> plans;

  @override
  Widget build(BuildContext context) {
    final categories = plans.map((e) => e.workoutType).toSet().take(6).toList();
    if (categories.isEmpty) return const SizedBox.shrink();
    return SizedBox(
      height: 34,
      child: ListView.separated(
        scrollDirection: Axis.horizontal,
        itemCount: categories.length,
        separatorBuilder: (_, __) => const SizedBox(width: 8),
        itemBuilder: (_, i) => Container(
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(AppRadius.pill),
            color: AppColors.neonBlue.withValues(alpha: 0.15),
            border: Border.all(color: AppColors.neonBlueLite.withValues(alpha: 0.4), width: 0.7),
          ),
          child: Text(
            categories[i],
            style: AppType.caption.copyWith(color: AppColors.neonBlueLite, fontWeight: FontWeight.w700),
          ),
        ),
      ),
    );
  }
}

class _PlanCard extends StatelessWidget {
  const _PlanCard({required this.plan});
  final MeWorkoutPlanSummary plan;

  Color _difficultyColor() {
    switch ((plan.difficultyLevel ?? '').toLowerCase()) {
      case 'beginner':
        return AppColors.success;
      case 'intermediate':
        return AppColors.gold;
      case 'advanced':
        return AppColors.danger;
      default:
        return AppColors.accent;
    }
  }

  LinearGradient _iconGradient() {
    switch ((plan.difficultyLevel ?? '').toLowerCase()) {
      case 'beginner':
        return LinearGradient(
          colors: [AppColors.success.withValues(alpha: 0.9), AppColors.success],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        );
      case 'intermediate':
        return AppColors.primaryGradient;
      case 'advanced':
        return AppColors.energyGradient;
      default:
        return AppColors.primaryGradient;
    }
  }

  @override
  Widget build(BuildContext context) {
    final diffColor = _difficultyColor();

    return PressScale(
      onTap: () => context.go('/workouts/${plan.id}', extra: plan),
      child: GlassCard(
        child: Row(
          children: [
            // Colorful icon container with gradient
            Container(
              width: 58,
              height: 58,
              alignment: Alignment.center,
              decoration: BoxDecoration(
                gradient: _iconGradient(),
                borderRadius: BorderRadius.circular(AppRadius.md),
                boxShadow: [
                  BoxShadow(
                    color: diffColor.withValues(alpha: 0.40),
                    blurRadius: 12,
                    offset: const Offset(0, 4),
                  ),
                ],
              ),
              child: const Icon(CupertinoIcons.flame_fill,
                  color: CupertinoColors.white, size: 26),
            ),
            const SizedBox(width: AppSpacing.md),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    plan.planName,
                    style: AppType.headline
                        .copyWith(color: AppColors.resolveText(context)),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                  const SizedBox(height: 6),
                  Wrap(
                    spacing: 6,
                    runSpacing: 5,
                    children: [
                      _Pill(label: plan.workoutType, color: AppColors.accent),
                      if (plan.difficultyLevel != null)
                        _Pill(label: plan.difficultyLevel!, color: _difficultyColor()),
                      if (plan.durationMinutes != null && plan.durationMinutes! > 0)
                        _Pill(label: '${plan.durationMinutes} min', color: AppColors.purple),
                      if (plan.exerciseCount > 0)
                        _Pill(
                          label:
                              '${plan.exerciseCount} exercise${plan.exerciseCount == 1 ? '' : 's'}',
                          color: AppColors.success,
                        ),
                    ],
                  ),
                ],
              ),
            ),
            const SizedBox(width: 6),
            Container(
              width: 30,
              height: 30,
              alignment: Alignment.center,
              decoration: BoxDecoration(
                color: AppColors.accent.withValues(alpha: 0.12),
                borderRadius: BorderRadius.circular(AppRadius.sm),
              ),
              child: const Icon(CupertinoIcons.chevron_right,
                  color: AppColors.accent, size: 14),
            ),
          ],
        ),
      ),
    );
  }
}

class _Pill extends StatelessWidget {
  const _Pill({required this.label, required this.color});
  final String label;
  final Color color;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 3),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.16),
        borderRadius: BorderRadius.circular(AppRadius.pill),
        border: Border.all(color: color.withValues(alpha: 0.25), width: 0.6),
      ),
      child: Text(
        label,
        style: AppType.caption.copyWith(
          color: color,
          fontWeight: FontWeight.w700,
          letterSpacing: 0.2,
        ),
      ),
    );
  }
}
