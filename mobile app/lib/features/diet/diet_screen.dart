import 'package:flutter/cupertino.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../models/me_models.dart';
import '../../providers/me_providers.dart';
import '../../services/me_service.dart';
import '../../theme/app_colors.dart';
import '../../theme/app_theme.dart';
import '../../widgets/empty_state.dart';
import '../../widgets/fitness_text.dart';
import '../../widgets/glass_card.dart';
import '../../widgets/premium_background.dart';
import '../shell/shell_layout_metrics.dart';
import '../../widgets/skeleton_shimmer.dart';
import 'widgets/diet_analytics_dash.dart';
import 'widgets/diet_intel_panel.dart';
import 'widgets/diet_meal_timeline_card.dart';
import 'widgets/diet_nutrition_hero.dart';
import 'widgets/diet_water_lab.dart';

class DietScreen extends ConsumerStatefulWidget {
  const DietScreen({super.key});

  @override
  ConsumerState<DietScreen> createState() => _DietScreenState();
}

class _DietScreenState extends ConsumerState<DietScreen> {
  int _waterMl = 0;

  Future<void> _onPullRefresh() async {
    await MeService.instance.flushPendingWorkoutSessions();
    ref.invalidate(dietPlanProvider);
    ref.invalidate(bodyMetricsProvider);
    ref.invalidate(workoutSessionHistoryProvider);
  }

  int _waterGoal(MeDietPlan? plan) {
    final kcal = plan?.calories ?? 2000;
    return (kcal * 1.1).round().clamp(2200, 4200);
  }

  @override
  Widget build(BuildContext context) {
    final plan = ref.watch(dietPlanProvider);
    final metrics = ref.watch(bodyMetricsProvider);

    return CupertinoPageScaffold(
      backgroundColor: AppColors.resolveBg(context),
      child: Stack(
        children: [
          const Positioned.fill(child: PremiumBackground()),
          SafeArea(
            bottom: false,
            child: plan.when(
              loading: () => CustomScrollView(
                physics: const BouncingScrollPhysics(parent: AlwaysScrollableScrollPhysics()),
                slivers: [
                  const CupertinoSliverNavigationBar(
                    largeTitle: Text('Nutrition'),
                    border: null,
                  ),
                  CupertinoSliverRefreshControl(
                    onRefresh: _onPullRefresh,
                  ),
                  SliverPadding(
                    padding: ShellLayoutMetrics.scrollPadding(context),
                    sliver: const SliverList(
                      delegate: SliverChildListDelegate.fixed([
                        SkeletonBlock(height: 140),
                        SizedBox(height: AppSpacing.md),
                        SkeletonBlock(height: 220),
                      ]),
                    ),
                  ),
                ],
              ),
              error: (e, _) => CustomScrollView(
                physics: const BouncingScrollPhysics(parent: AlwaysScrollableScrollPhysics()),
                slivers: [
                  const CupertinoSliverNavigationBar(
                    largeTitle: Text('Nutrition'),
                    border: null,
                  ),
                  SliverFillRemaining(
                    hasScrollBody: false,
                    child: ErrorStateView(
                      message: e.toString(),
                      onRetry: () => ref.invalidate(dietPlanProvider),
                    ),
                  ),
                ],
              ),
              data: (data) {
                if (data == null) {
                  return CustomScrollView(
                    physics: const BouncingScrollPhysics(parent: AlwaysScrollableScrollPhysics()),
                    slivers: [
                      const CupertinoSliverNavigationBar(
                        largeTitle: Text('Nutrition'),
                        border: null,
                      ),
                      CupertinoSliverRefreshControl(
                        onRefresh: _onPullRefresh,
                      ),
                      SliverFillRemaining(
                        hasScrollBody: false,
                        child: Padding(
                          padding: ShellLayoutMetrics.scrollPadding(context),
                          child: const EmptyState(
                            title: 'No diet plan assigned',
                            message:
                                'Your trainer will assign a nutrition plan. Contact your gym if you need help.',
                            icon: CupertinoIcons.book,
                          ),
                        ),
                      ),
                    ],
                  );
                }

                final m = metrics.asData?.value ?? const <MeBodyMetricLog>[];
                final sortedMeals = List<MeDietMeal>.from(data.meals)
                  ..sort((a, b) => a.mealOrder.compareTo(b.mealOrder));

                return CustomScrollView(
                  physics: const BouncingScrollPhysics(parent: AlwaysScrollableScrollPhysics()),
                  slivers: [
                    const CupertinoSliverNavigationBar(
                      largeTitle: Text('Nutrition'),
                      border: null,
                    ),
                    CupertinoSliverRefreshControl(
                      onRefresh: _onPullRefresh,
                    ),
                    SliverPadding(
                      padding: ShellLayoutMetrics.scrollPadding(context),
                      sliver: SliverList(
                        delegate: SliverChildListDelegate([
                          Text(
                            'FUEL INTELLIGENCE',
                            style: FitnessText.label(context).copyWith(color: AppColors.neonCyan),
                          ).animate().fadeIn(duration: 320.ms),
                          const SizedBox(height: AppSpacing.sm),
                          DietNutritionHero(plan: data),
                          const SizedBox(height: AppSpacing.xl),
                          Row(
                            children: [
                              Text('MEAL TIMELINE', style: FitnessText.label(context)),
                              const Spacer(),
                              Text(
                                '${sortedMeals.length} modules',
                                style: FitnessText.chip(context, color: AppColors.neonPurpleLite),
                              ),
                            ],
                          ),
                          const SizedBox(height: AppSpacing.sm),
                          for (var i = 0; i < sortedMeals.length; i++) ...[
                            DietMealTimelineCard(meal: sortedMeals[i], index: i),
                            if (i != sortedMeals.length - 1) const SizedBox(height: AppSpacing.md),
                          ],
                          const SizedBox(height: AppSpacing.xl),
                          const DietIntelPanelCompact(),
                          const SizedBox(height: AppSpacing.xl),
                          DietWaterLab(
                            goalMl: _waterGoal(data),
                            currentMl: _waterMl,
                            onAdd: (v) => setState(() => _waterMl += v),
                          ),
                          const SizedBox(height: AppSpacing.xl),
                          DietAnalyticsDash(plan: data, metrics: m),
                          if (data.description != null && data.description!.trim().isNotEmpty) ...[
                            const SizedBox(height: AppSpacing.xl),
                            GlassCard(
                              radius: 26,
                              tint: AppColors.success.withValues(alpha: 0.05),
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text('AI protocol note', style: FitnessText.label(context)),
                                  const SizedBox(height: AppSpacing.sm),
                                  Text(data.description!.trim(), style: FitnessText.body(context)),
                                ],
                              ),
                            ).animate().fadeIn(),
                          ],
                          const SizedBox(height: AppSpacing.xxl),
                        ]),
                      ),
                    ),
                  ],
                );
              },
            ),
          ),
        ],
      ),
    );
  }
}
