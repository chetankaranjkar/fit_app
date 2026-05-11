import 'package:flutter/cupertino.dart';
import 'package:go_router/go_router.dart';

import '../../models/me_models.dart';
import '../../theme/app_colors.dart';
import '../../theme/app_theme.dart';
import '../../theme/app_typography.dart';
import '../../widgets/app_button.dart';
import '../../widgets/glass_card.dart';

class WorkoutDetailScreen extends StatelessWidget {
  const WorkoutDetailScreen({super.key, required this.plan});
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

  @override
  Widget build(BuildContext context) {
    return CupertinoPageScaffold(
      backgroundColor: AppColors.resolveBg(context),
      child: SafeArea(
        child: CustomScrollView(
          physics: const BouncingScrollPhysics(),
          slivers: [
            CupertinoSliverNavigationBar(
              largeTitle: Text(plan.planName),
              border: null,
            ),
            SliverPadding(
              padding: const EdgeInsets.fromLTRB(
                  AppSpacing.lg, AppSpacing.lg, AppSpacing.lg, 120),
              sliver: SliverList(
                delegate: SliverChildListDelegate([
                  // ── Header card ──────────────────────────────────────────
                  GlassCard(
                    padding: const EdgeInsets.all(AppSpacing.xl),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          children: [
                            Container(
                              width: 52,
                              height: 52,
                              alignment: Alignment.center,
                              decoration: BoxDecoration(
                                gradient: AppColors.primaryGradient,
                                borderRadius: BorderRadius.circular(AppRadius.md),
                                boxShadow: [
                                  BoxShadow(
                                    color: AppColors.accent.withValues(alpha: 0.4),
                                    blurRadius: 14,
                                    offset: const Offset(0, 4),
                                  ),
                                ],
                              ),
                              child: const Icon(CupertinoIcons.flame_fill,
                                  color: CupertinoColors.white, size: 24),
                            ),
                            const SizedBox(width: AppSpacing.md),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    plan.workoutType,
                                    style: AppType.headline.copyWith(
                                      color: AppColors.resolveText(context),
                                    ),
                                  ),
                                  if (plan.difficultyLevel != null)
                                    Container(
                                      margin: const EdgeInsets.only(top: 4),
                                      padding: const EdgeInsets.symmetric(
                                          horizontal: 8, vertical: 3),
                                      decoration: BoxDecoration(
                                        color: _difficultyColor().withValues(alpha: 0.18),
                                        borderRadius: BorderRadius.circular(AppRadius.pill),
                                        border: Border.all(
                                          color: _difficultyColor().withValues(alpha: 0.35),
                                          width: 0.7,
                                        ),
                                      ),
                                      child: Text(
                                        plan.difficultyLevel!,
                                        style: AppType.caption.copyWith(
                                          color: _difficultyColor(),
                                          fontWeight: FontWeight.w700,
                                        ),
                                      ),
                                    ),
                                ],
                              ),
                            ),
                          ],
                        ),
                        if ((plan.description ?? '').trim().isNotEmpty) ...[
                          const SizedBox(height: AppSpacing.md),
                          Text(
                            plan.description!,
                            style: AppType.body.copyWith(
                              color: AppColors.resolveTextSecondary(context),
                            ),
                          ),
                        ],
                      ],
                    ),
                  ),
                  const SizedBox(height: AppSpacing.lg),
                  // ── Detail tiles row ─────────────────────────────────────
                  Row(
                    children: [
                      Expanded(
                        child: _DetailTile(
                          label: 'Difficulty',
                          value: plan.difficultyLevel ?? '-',
                          icon: CupertinoIcons.bolt_fill,
                          color: _difficultyColor(),
                        ),
                      ),
                      const SizedBox(width: AppSpacing.md),
                      Expanded(
                        child: _DetailTile(
                          label: 'Duration',
                          value: plan.durationMinutes == null || plan.durationMinutes! <= 0
                              ? '-'
                              : '${plan.durationMinutes} min',
                          icon: CupertinoIcons.clock,
                          color: AppColors.purple,
                        ),
                      ),
                      const SizedBox(width: AppSpacing.md),
                      Expanded(
                        child: _DetailTile(
                          label: 'Exercises',
                          value: plan.exerciseCount.toString(),
                          icon: CupertinoIcons.list_bullet,
                          color: AppColors.success,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: AppSpacing.xl),
                  // ── CTA button ───────────────────────────────────────────
                  AppButton(
                    label: 'Start session',
                    icon: CupertinoIcons.play_fill,
                    onTap: () => context.push('/workouts/${plan.id}/session', extra: plan),
                  ),
                ]),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _DetailTile extends StatelessWidget {
  const _DetailTile({
    required this.label,
    required this.value,
    required this.icon,
    this.color,
  });

  final String label;
  final String value;
  final IconData icon;
  final Color? color;

  @override
  Widget build(BuildContext context) {
    final c = color ?? AppColors.accent;
    return GlassCard(
      padding: const EdgeInsets.all(AppSpacing.md),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            width: 32,
            height: 32,
            alignment: Alignment.center,
            decoration: BoxDecoration(
              color: c.withValues(alpha: 0.16),
              borderRadius: BorderRadius.circular(AppRadius.sm),
            ),
            child: Icon(icon, size: 16, color: c),
          ),
          const SizedBox(height: 8),
          Text(
            label,
            style: AppType.caption.copyWith(
              color: AppColors.resolveTextSecondary(context),
            ),
          ),
          const SizedBox(height: 2),
          Text(
            value,
            style: AppType.headline.copyWith(
              color: AppColors.resolveText(context),
              fontWeight: FontWeight.w700,
            ),
          ),
        ],
      ),
    );
  }
}
