import 'package:flutter/cupertino.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../models/me_models.dart';
import '../../providers/me_providers.dart';
import '../../theme/app_colors.dart';
import '../../theme/app_theme.dart';
import '../../theme/app_typography.dart';
import '../../widgets/empty_state.dart';
import '../../widgets/glass_card.dart';
import '../../widgets/premium_background.dart';
import '../shell/shell_layout_metrics.dart';
import '../../widgets/skeleton_shimmer.dart';

class DietScreen extends ConsumerWidget {
  const DietScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final plan = ref.watch(dietPlanProvider);

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
                  largeTitle: Text('Diet'),
                  border: null,
                ),
                CupertinoSliverRefreshControl(
                  onRefresh: () async => ref.refresh(dietPlanProvider),
                ),
                plan.when(
                  loading: () => SliverPadding(
                    padding: ShellLayoutMetrics.scrollPadding(context),
                    sliver: SliverList(
                      delegate: SliverChildListDelegate.fixed([
                        const SkeletonBlock(height: 120),
                        const SizedBox(height: AppSpacing.md),
                        const SkeletonBlock(height: 200),
                      ]),
                    ),
                  ),
                  error: (e, _) => SliverFillRemaining(
                    hasScrollBody: false,
                    child: ErrorStateView(
                      message: e.toString(),
                      onRetry: () => ref.refresh(dietPlanProvider),
                    ),
                  ),
                  data: (data) {
                    if (data == null) {
                      return const SliverFillRemaining(
                        hasScrollBody: false,
                        child: EmptyState(
                          title: 'No diet plan assigned',
                          message:
                              'Your trainer will assign a nutrition plan. Contact your gym if you need help.',
                          icon: CupertinoIcons.book,
                        ),
                      );
                    }
                    return SliverPadding(
                      padding: ShellLayoutMetrics.scrollPadding(context),
                      sliver: SliverList(
                        delegate: SliverChildListDelegate([
                          _DietHero(plan: data),
                          const SizedBox(height: AppSpacing.lg),
                          for (var i = 0; i < data.meals.length; i++) ...[
                            _MealCard(meal: data.meals[i])
                                .animate(delay: (i * 50).ms)
                                .fadeIn(duration: 280.ms),
                            if (i != data.meals.length - 1) const SizedBox(height: AppSpacing.md),
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

class _DietHero extends StatelessWidget {
  const _DietHero({required this.plan});
  final MeDietPlan plan;

  @override
  Widget build(BuildContext context) {
    return GlassCard(
      padding: const EdgeInsets.all(AppSpacing.lg),
      tint: AppColors.success.withValues(alpha: 0.08),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            plan.planName,
            style: AppType.headline.copyWith(
              color: AppColors.resolveText(context),
              fontWeight: FontWeight.w700,
            ),
          ),
          const SizedBox(height: 4),
          Text(
            plan.goalType,
            style: AppType.footnote.copyWith(color: AppColors.resolveTextSecondary(context)),
          ),
          if (plan.description != null && plan.description!.isNotEmpty) ...[
            const SizedBox(height: 8),
            Text(
              plan.description!,
              style: AppType.subhead.copyWith(color: AppColors.resolveTextSecondary(context)),
            ),
          ],
          const SizedBox(height: AppSpacing.md),
          Row(
            children: [
              _MacroChip(label: 'Cal', value: '${plan.calories}'),
              const SizedBox(width: 8),
              if (plan.proteinGrams != null)
                _MacroChip(label: 'P', value: '${plan.proteinGrams}g'),
              const SizedBox(width: 8),
              if (plan.carbsGrams != null) _MacroChip(label: 'C', value: '${plan.carbsGrams}g'),
              const SizedBox(width: 8),
              if (plan.fatsGrams != null) _MacroChip(label: 'F', value: '${plan.fatsGrams}g'),
            ],
          ),
        ],
      ),
    );
  }
}

class _MacroChip extends StatelessWidget {
  const _MacroChip({required this.label, required this.value});
  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
      decoration: BoxDecoration(
        color: AppColors.success.withValues(alpha: 0.12),
        borderRadius: BorderRadius.circular(AppRadius.pill),
      ),
      child: Text(
        '$label $value',
        style: AppType.caption.copyWith(
          color: AppColors.success,
          fontWeight: FontWeight.w700,
        ),
      ),
    );
  }
}

class _MealCard extends StatelessWidget {
  const _MealCard({required this.meal});
  final MeDietMeal meal;

  @override
  Widget build(BuildContext context) {
    return GlassCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            meal.mealName,
            style: AppType.headline.copyWith(
              color: AppColors.resolveText(context),
              fontWeight: FontWeight.w600,
            ),
          ),
          const SizedBox(height: AppSpacing.sm),
          if (meal.items.isEmpty)
            Text(
              'No foods listed for this meal.',
              style: AppType.footnote.copyWith(color: AppColors.resolveTextSecondary(context)),
            )
          else
            ...meal.items.map(
              (item) => Padding(
                padding: const EdgeInsets.only(bottom: 8),
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            item.foodName,
                            style: AppType.subhead.copyWith(color: AppColors.resolveText(context)),
                          ),
                          if (item.quantity.isNotEmpty)
                            Text(
                              item.quantity,
                              style: AppType.caption
                                  .copyWith(color: AppColors.resolveTextSecondary(context)),
                            ),
                        ],
                      ),
                    ),
                    if (item.calories != null)
                      Text(
                        '${item.calories} kcal',
                        style: AppType.caption.copyWith(color: AppColors.accent),
                      ),
                  ],
                ),
              ),
            ),
        ],
      ),
    );
  }
}
