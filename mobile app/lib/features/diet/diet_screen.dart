import 'package:flutter/cupertino.dart';
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
import '../supplements/assigned_supplements_screen.dart';
import '../../widgets/skeleton_shimmer.dart';
import 'diet_assigned_foods.dart';
import 'widgets/diet_intel_panel.dart';
import 'widgets/diet_meal_timeline_card.dart';
import 'widgets/diet_nutrition_hero.dart';
import 'water/water_intake_providers.dart';
import 'widgets/diet_water_lab.dart';

class DietScreen extends ConsumerStatefulWidget {
  const DietScreen({super.key});

  @override
  ConsumerState<DietScreen> createState() => _DietScreenState();
}

class _DietScreenState extends ConsumerState<DietScreen> {
  Future<void> _onPullRefresh() async {
    await MeService.instance.flushPendingWorkoutSessions();
    ref.invalidate(dietPlanProvider);
    ref.invalidate(workoutSessionHistoryProvider);
    await ref.read(waterTodayControllerProvider.notifier).reload();
  }

  /// Diet plans have no water field; keep the existing calorie-derived target as Goal.
  int _waterGoal(MeDietPlan? plan) {
    final kcal = plan?.calories ?? 2000;
    return (kcal * 1.1).round().clamp(2200, 4200);
  }

  @override
  Widget build(BuildContext context) {
    final plan = ref.watch(dietPlanProvider);
    final waterToday = ref.watch(waterTodayControllerProvider);

    return CupertinoPageScaffold(
      backgroundColor: AppColors.resolveBg(context),
      child: Stack(
        children: [
          const Positioned.fill(child: PremiumBackground()),
          SafeArea(
            bottom: false,
            child: plan.when(
              loading: () => CustomScrollView(
                physics: const BouncingScrollPhysics(
                    parent: AlwaysScrollableScrollPhysics()),
                slivers: [
                  const CupertinoSliverNavigationBar(
                    largeTitle: Text('Diet'),
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
                physics: const BouncingScrollPhysics(
                    parent: AlwaysScrollableScrollPhysics()),
                slivers: [
                  const CupertinoSliverNavigationBar(
                    largeTitle: Text('Diet'),
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
                    physics: const BouncingScrollPhysics(
                        parent: AlwaysScrollableScrollPhysics()),
                    slivers: [
                      const CupertinoSliverNavigationBar(
                        largeTitle: Text('Diet'),
                        border: null,
                      ),
                      CupertinoSliverRefreshControl(
                        onRefresh: _onPullRefresh,
                      ),
                      SliverFillRemaining(
                        hasScrollBody: false,
                        child: Padding(
                          padding: ShellLayoutMetrics.scrollPadding(context),
                          child: const Column(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              EmptyState(
                                title: DietCopy.noDietPlanTitle,
                                message: DietCopy.noDietPlanMessage,
                                icon: CupertinoIcons.book,
                              ),
                              SizedBox(height: AppSpacing.xl),
                              AssignedSupplementsLinkCard(),
                            ],
                          ),
                        ),
                      ),
                    ],
                  );
                }

                final sortedMeals = List<MeDietMeal>.from(data.meals)
                  ..sort((a, b) => a.mealOrder.compareTo(b.mealOrder));

                return CustomScrollView(
                  physics: const BouncingScrollPhysics(
                      parent: AlwaysScrollableScrollPhysics()),
                  slivers: [
                    const CupertinoSliverNavigationBar(
                      largeTitle: Text('Diet'),
                      border: null,
                    ),
                    CupertinoSliverRefreshControl(
                      onRefresh: _onPullRefresh,
                    ),
                    SliverPadding(
                      padding: ShellLayoutMetrics.scrollPadding(context),
                      sliver: SliverList(
                        delegate: SliverChildListDelegate([
                          Text('Your assigned meal plan',
                              style: FitnessText.body(context)),
                          const SizedBox(height: AppSpacing.lg),
                          DietNutritionHero(plan: data),
                          const SizedBox(height: AppSpacing.xl),
                          Text(DietCopy.assignedMeals,
                              style: FitnessText.title(context)),
                          const SizedBox(height: 4),
                          Text(DietCopy.notLoggedIntake,
                              style: FitnessText.label(context)),
                          const SizedBox(height: AppSpacing.md),
                          if (sortedMeals.isEmpty)
                            Text(DietCopy.noMealsOnPlan,
                                style: FitnessText.body(context))
                          else
                            for (var i = 0; i < sortedMeals.length; i++) ...[
                              DietMealTimelineCard(
                                  meal: sortedMeals[i], index: i),
                              if (i != sortedMeals.length - 1)
                                const SizedBox(height: AppSpacing.md),
                            ],
                          const SizedBox(height: AppSpacing.xl),
                          DietWaterLab(
                            goalMl: _waterGoal(data),
                            recordedMl: waterToday.totalMl,
                            canUndo: waterToday.canUndo,
                            onAdd: (v) => ref
                                .read(waterTodayControllerProvider.notifier)
                                .add(v),
                            onUndo: () => ref
                                .read(waterTodayControllerProvider.notifier)
                                .undoLast(),
                          ),
                          const SizedBox(height: AppSpacing.xl),
                          DietIntelPanelCompact(plan: data),
                          const SizedBox(height: AppSpacing.xl),
                          const AssignedSupplementsLinkCard(),
                          if (data.assignmentNotes != null &&
                              data.assignmentNotes!.trim().isNotEmpty) ...[
                            const SizedBox(height: AppSpacing.xl),
                            GlassCard(
                              radius: AppRadius.lg,
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(DietCopy.coachNotes,
                                      style: FitnessText.label(context)),
                                  const SizedBox(height: AppSpacing.sm),
                                  Text(data.assignmentNotes!.trim(),
                                      style: FitnessText.body(context)),
                                ],
                              ),
                            ),
                          ],
                          if (data.description != null &&
                              data.description!.trim().isNotEmpty) ...[
                            const SizedBox(height: AppSpacing.xl),
                            GlassCard(
                              radius: AppRadius.lg,
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(DietCopy.planNotes,
                                      style: FitnessText.label(context)),
                                  const SizedBox(height: AppSpacing.sm),
                                  Text(data.description!.trim(),
                                      style: FitnessText.body(context)),
                                ],
                              ),
                            ),
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
