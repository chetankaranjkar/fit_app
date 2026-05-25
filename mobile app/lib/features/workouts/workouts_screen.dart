import 'package:flutter/cupertino.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../models/me_models.dart';
import '../../providers/me_providers.dart';
import '../../services/me_service.dart';
import '../../theme/app_colors.dart';
import '../../theme/app_theme.dart';
import '../../widgets/empty_state.dart';
import '../../widgets/premium_background.dart';
import '../shell/shell_layout_metrics.dart';
import '../../widgets/skeleton_shimmer.dart';
import 'widgets/workout_ai_coach_card.dart';
import 'widgets/workout_analytics_section.dart';
import 'widgets/workout_command_hero.dart';
import 'widgets/workout_featured_carousel.dart';
import 'widgets/workout_dashboard_card.dart';
import 'widgets/workout_quick_dock.dart';
import '../../providers/workout_tracking_providers.dart';

class WorkoutsScreen extends ConsumerWidget {
  const WorkoutsScreen({super.key});

  static MeProfile _fallbackProfile() {
    return MeProfile(
      userId: 0,
      firstName: 'Athlete',
      lastName: '',
      fullName: 'Athlete',
      email: '',
      registrationDate: DateTime.now(),
    );
  }

  static MeAttendanceSummary _fallbackAttendance() {
    return const MeAttendanceSummary(
      totalThisMonth: 0,
      totalThisWeek: 0,
      currentStreakDays: 0,
      last30Days: [],
    );
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final plans = ref.watch(workoutPlansProvider);
    final dash = ref.watch(dashboardProvider);

    return CupertinoPageScaffold(
      backgroundColor: AppColors.resolveBg(context),
      child: Stack(
        children: [
          const Positioned.fill(child: PremiumBackground()),
          SafeArea(
            bottom: false,
            child: plans.when(
              loading: () => CustomScrollView(
                physics: const BouncingScrollPhysics(parent: AlwaysScrollableScrollPhysics()),
                slivers: [
                  const CupertinoSliverNavigationBar(
                    largeTitle: Text('Workouts'),
                    border: null,
                  ),
                  CupertinoSliverRefreshControl(
                    onRefresh: () async {
                      await MeService.instance.flushPendingWorkoutSessions();
                      ref.invalidate(dashboardProvider);
                      ref.invalidate(workoutPlansProvider);
                      ref.invalidate(workoutSessionHistoryProvider);
                    },
                  ),
                  SliverPadding(
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
                ],
              ),
              error: (e, _) => CustomScrollView(
                physics: const BouncingScrollPhysics(parent: AlwaysScrollableScrollPhysics()),
                slivers: [
                  const CupertinoSliverNavigationBar(
                    largeTitle: Text('Workouts'),
                    border: null,
                  ),
                  SliverFillRemaining(
                    hasScrollBody: false,
                    child: ErrorStateView(
                      message: e.toString(),
                      onRetry: () => ref.invalidate(workoutPlansProvider),
                    ),
                  ),
                ],
              ),
              data: (data) {
                if (data.isEmpty) {
                  return CustomScrollView(
                    physics: const BouncingScrollPhysics(parent: AlwaysScrollableScrollPhysics()),
                    slivers: [
                      const CupertinoSliverNavigationBar(
                        largeTitle: Text('Workouts'),
                        border: null,
                      ),
                      CupertinoSliverRefreshControl(
                        onRefresh: () async {
                          await MeService.instance.flushPendingWorkoutSessions();
                          ref.invalidate(dashboardProvider);
                          ref.invalidate(workoutPlansProvider);
                          ref.invalidate(workoutSessionHistoryProvider);
                        },
                      ),
                      SliverFillRemaining(
                        hasScrollBody: false,
                        child: Padding(
                          padding: ShellLayoutMetrics.scrollPadding(context),
                          child: const EmptyState(
                            title: 'No workout assigned',
                            message:
                                'Ask your trainer or front desk to assign a workout plan. Contact your gym if you need help.',
                            icon: CupertinoIcons.flame,
                          ),
                        ),
                      ),
                    ],
                  );
                }

                final profile = dash.maybeWhen(
                  data: (d) => d.profile,
                  orElse: () => _fallbackProfile(),
                );
                final attendance = dash.maybeWhen(
                  data: (d) => d.attendance,
                  orElse: () => _fallbackAttendance(),
                );
                final dashboard = dash.maybeWhen(
                  data: (d) => d,
                  orElse: () => null,
                );
                final featured = data.first;

                return CustomScrollView(
                  physics: const BouncingScrollPhysics(parent: AlwaysScrollableScrollPhysics()),
                  slivers: [
                    const CupertinoSliverNavigationBar(
                      largeTitle: Text('Workouts'),
                      border: null,
                    ),
                    CupertinoSliverRefreshControl(
                      onRefresh: () async {
                        await MeService.instance.flushPendingWorkoutSessions();
                        ref.invalidate(dashboardProvider);
                        ref.invalidate(workoutPlansProvider);
                        ref.invalidate(workoutSessionHistoryProvider);
                        ref.invalidate(workoutTrackingDashboardProvider);
                        ref.invalidate(activeWorkoutProvider);
                      },
                    ),
                    SliverPadding(
                      padding: ShellLayoutMetrics.scrollPadding(context),
                      sliver: SliverList(
                        delegate: SliverChildListDelegate([
                          const WorkoutDashboardCard(),
                          const SizedBox(height: AppSpacing.xl),
                          WorkoutCommandHero(
                            profile: profile,
                            attendance: attendance,
                            featuredPlan: featured,
                          ),
                          const SizedBox(height: AppSpacing.xl),
                          WorkoutFeaturedCarousel(plans: data, dashboard: dashboard),
                          const SizedBox(height: AppSpacing.xl),
                          const WorkoutAiCoachCard(),
                          const SizedBox(height: AppSpacing.xl),
                          WorkoutAnalyticsSection(attendance: attendance),
                          const SizedBox(height: AppSpacing.xxl),
                        ]),
                      ),
                    ),
                  ],
                );
              },
            ),
          ),
          if (plans.hasValue && plans.requireValue.isNotEmpty) const WorkoutQuickDock(),
        ],
      ),
    );
  }
}
