import 'package:flutter/cupertino.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/formatters.dart';
import '../../models/me_models.dart';
import '../../providers/me_providers.dart';
import '../../providers/ui_banner_provider.dart';
import '../../services/me_service.dart';
import '../../animations/app_motion.dart';
import '../../theme/app_colors.dart';
import '../../theme/app_theme.dart';
import '../../theme/app_typography.dart';
import '../../widgets/empty_state.dart';
import '../../widgets/glass_card.dart';
import '../../widgets/press_scale.dart';
import '../../widgets/section_header.dart';
import '../../widgets/skeleton_shimmer.dart';
import '../../widgets/stat_tile.dart';
import '../../widgets/premium_background.dart';
import '../shell/shell_layout_metrics.dart';
import '../workouts/widgets/workout_dashboard_card.dart';
import '../../providers/sync_status_provider.dart';
import '../../providers/workout_tracking_providers.dart';
import '../../widgets/sync_status_chip.dart';

class HomeScreen extends ConsumerWidget {
  const HomeScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final dashboard = ref.watch(dashboardProvider);
    final checkIn = ref.watch(checkInBannerProvider);
    final topPad = MediaQuery.paddingOf(context).top;
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
                CupertinoSliverNavigationBar(
                  largeTitle: const Text('Today'),
                  border: null,
                  trailing: const SyncStatusChip(),
                ),
                CupertinoSliverRefreshControl(
                  onRefresh: () async {
                    await MeService.instance.flushPendingWorkoutSessions();
                    ref.invalidate(dashboardProvider);
                    ref.invalidate(workoutTrackingDashboardProvider);
                    ref.invalidate(activeWorkoutProvider);
                    invalidateSyncStatus(ref);
                  },
                ),
                dashboard.when(
                  loading: () => const SliverToBoxAdapter(child: _HomeSkeleton()),
                  error: (e, _) => SliverFillRemaining(
                    hasScrollBody: false,
                    child: ErrorStateView(
                      message: e.toString(),
                      onRetry: () => ref.refresh(dashboardProvider),
                    ),
                  ),
                  data: (data) => SliverPadding(
                    padding: EdgeInsets.fromLTRB(
                      AppSpacing.lg,
                      AppSpacing.lg,
                      AppSpacing.lg,
                      ShellLayoutMetrics.contentBottomPadding(context),
                    ),
                    sliver: SliverList(
                      delegate: SliverChildListDelegate([
                        _Greeting(profile: data.profile),
                        const SizedBox(height: AppSpacing.lg),
                        if (data.membership != null) ...[
                          _MembershipCard(membership: data.membership!),
                          const SizedBox(height: AppSpacing.lg),
                        ],
                        _StatsRow(attendance: data.attendance, metric: data.latestBodyMetric),
                        const SizedBox(height: AppSpacing.lg),
                        const WorkoutDashboardCard(),
                        const SizedBox(height: AppSpacing.xl),
                        SectionHeader(
                          title: 'This week',
                          action: 'See all',
                          onActionTap: () => context.go('/progress'),
                        ),
                        const SizedBox(height: AppSpacing.md),
                        _AttendanceStrip(summary: data.attendance),
                        const SizedBox(height: AppSpacing.xl),
                        SectionHeader(
                          title: 'Upcoming',
                          action: data.upcomingSchedule.isEmpty ? null : 'Explore',
                          onActionTap: () => context.go('/workouts'),
                        ),
                        const SizedBox(height: AppSpacing.md),
                        if (data.upcomingSchedule.isEmpty)
                          const _NoUpcoming()
                        else
                          Column(
                            children: [
                              for (final s in data.upcomingSchedule.take(3))
                                Padding(
                                  padding: const EdgeInsets.only(bottom: AppSpacing.md),
                                  child: _ScheduleTile(schedule: s),
                                ),
                            ],
                          ),
                        const SizedBox(height: AppSpacing.xl),
                        SectionHeader(
                          title: 'Recent activity',
                          action: data.recentNotifications.isEmpty ? null : 'View all',
                        ),
                        const SizedBox(height: AppSpacing.md),
                        if (data.recentNotifications.isEmpty)
                          GlassCard(
                            child: Text(
                              'No notifications yet. We will keep you posted.',
                              style: AppType.body.copyWith(
                                color: AppColors.resolveTextSecondary(context),
                              ),
                            ),
                          )
                        else
                          Column(
                            children: [
                              for (final n in data.recentNotifications.take(4))
                                Padding(
                                  padding: const EdgeInsets.only(bottom: AppSpacing.md),
                                  child: _NotificationTile(notification: n),
                                ),
                            ],
                          ),
                      ]),
                    ),
                  ),
                ),
              ],
            ),
          ),
          if (checkIn != null)
            Positioned(
              left: AppSpacing.lg,
              right: AppSpacing.lg,
              top: topPad + 6,
              child: _CheckInSuccessBanner(
                state: checkIn,
                onDismiss: () => ref.read(checkInBannerProvider.notifier).state = null,
              ),
            ),
          Positioned(
            right: AppSpacing.lg,
            bottom: ShellLayoutMetrics.fabBottomOffset(context),
            child: _ScanAttendanceFab(
              onTap: () => context.push('/scanner'),
            ),
          ),
        ],
      ),
    );
  }
}

class _CheckInSuccessBanner extends StatelessWidget {
  const _CheckInSuccessBanner({required this.state, required this.onDismiss});

  final CheckInBannerState state;
  final VoidCallback onDismiss;

  @override
  Widget build(BuildContext context) {
    return GlassCard(
      radius: AppRadius.lg,
      padding: const EdgeInsets.symmetric(horizontal: AppSpacing.lg, vertical: AppSpacing.md),
      tint: AppColors.success.withValues(alpha: 0.12),
      child: Row(
        children: [
          const Icon(CupertinoIcons.checkmark_seal_fill, color: AppColors.success, size: 26),
          const SizedBox(width: AppSpacing.md),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  state.title,
                  style: AppType.headline.copyWith(color: AppColors.resolveText(context)),
                ),
                Text(
                  state.subtitle,
                  style: AppType.footnote.copyWith(color: AppColors.resolveTextSecondary(context)),
                ),
              ],
            ),
          ),
          CupertinoButton(
            padding: EdgeInsets.zero,
            onPressed: onDismiss,
            child: Icon(
              CupertinoIcons.xmark_circle_fill,
              color: AppColors.resolveTextSecondary(context),
              size: 22,
            ),
          ),
        ],
      ),
    )
        .animate()
        .fadeIn(duration: 280.ms)
        .slideY(begin: -0.06, end: 0, curve: Curves.easeOutCubic);
  }
}

class _ScanAttendanceFab extends StatelessWidget {
  const _ScanAttendanceFab({required this.onTap});
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return PressScale(
      onTap: onTap,
      child: Container(
        height: 58,
        padding: const EdgeInsets.symmetric(horizontal: 18),
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(20),
          gradient: AppColors.primaryGradient,
          border: Border.all(color: AppColors.gold.withValues(alpha: 0.45), width: 0.9),
          boxShadow: [
            ...AppColors.orangeGlow(opacity: 0.52, blur: 26),
            BoxShadow(
              color: AppColors.neonPurple.withValues(alpha: 0.22),
              blurRadius: 28,
              spreadRadius: 1,
              offset: const Offset(0, 6),
            ),
          ],
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              width: 30,
              height: 30,
              decoration: BoxDecoration(
                color: CupertinoColors.white.withValues(alpha: 0.2),
                borderRadius: BorderRadius.circular(10),
              ),
              child: const Icon(
                CupertinoIcons.qrcode_viewfinder,
                size: 17,
                color: CupertinoColors.white,
              ),
            ),
            const SizedBox(width: 10),
            Text(
              'Scan Attendance',
              style: AppType.callout.copyWith(
                color: CupertinoColors.white,
                fontWeight: FontWeight.w700,
              ),
            ),
          ],
        ),
      ),
    )
        .animate(onPlay: (controller) => controller.repeat(reverse: true))
        .scaleXY(begin: 1, end: 1.03, duration: AppFx.ambient, curve: AppFx.ambientCurve);
  }
}

class _Greeting extends StatelessWidget {
  const _Greeting({required this.profile});
  final MeProfile profile;

  @override
  Widget build(BuildContext context) {
    final greeting = Fmt.greeting(DateTime.now());
    final firstName = profile.firstName.isEmpty ? 'there' : profile.firstName;
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                '$greeting, $firstName 👋',
                style: AppType.title2.copyWith(color: AppColors.resolveText(context)),
              ),
              const SizedBox(height: 4),
              Text(
                Fmt.weekdayWithDate(DateTime.now()),
                style: AppType.footnote.copyWith(
                  color: AppColors.resolveTextSecondary(context),
                ),
              ),
            ],
          ),
        ),
        // Avatar badge with gradient border
        Container(
          width: 46,
          height: 46,
          decoration: BoxDecoration(
            gradient: AppColors.primaryGradient,
            borderRadius: BorderRadius.circular(AppRadius.lg),
            boxShadow: [
              BoxShadow(
                color: AppColors.accent.withValues(alpha: 0.35),
                blurRadius: 12,
                offset: const Offset(0, 4),
              ),
            ],
          ),
          child: Center(
            child: Text(
              profile.initials,
              style: AppType.headline.copyWith(
                color: CupertinoColors.white,
                fontWeight: FontWeight.w800,
              ),
            ),
          ),
        ),
      ],
    ).animate().fadeIn(duration: 320.ms).slideY(begin: 0.05, end: 0, curve: Curves.easeOutCubic);
  }
}

/// Premium gold-style membership card.
class _MembershipCard extends StatelessWidget {
  const _MembershipCard({required this.membership});
  final MeMembership membership;

  @override
  Widget build(BuildContext context) {
    final daysRemaining = membership.daysRemaining;
    final isExpiring = membership.isExpiringSoon;
    final cardGradient = isExpiring
        ? const LinearGradient(
            colors: [Color(0xFF3D1800), Color(0xFF7A3000), Color(0xFF3D1800)],
            stops: [0.0, 0.55, 1.0],
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
          )
        : AppColors.goldGradient;
    final goldColor = isExpiring ? AppColors.orange : AppColors.gold;

    return ClipRRect(
      borderRadius: BorderRadius.circular(AppRadius.xl),
      child: Container(
        decoration: BoxDecoration(
          gradient: cardGradient,
          borderRadius: BorderRadius.circular(AppRadius.xl),
          boxShadow: [
            BoxShadow(
              color: goldColor.withValues(alpha: 0.35),
              blurRadius: 24,
              offset: const Offset(0, 8),
            ),
          ],
        ),
        child: Stack(
          children: [
            // Shimmer highlight overlay
            Positioned.fill(
              child: DecoratedBox(
                decoration: BoxDecoration(
                  gradient: AppColors.goldShimmer,
                  borderRadius: BorderRadius.circular(AppRadius.xl),
                ),
              ),
            ),
            // Decorative circles for premium card texture
            Positioned(
              top: -28,
              right: -28,
              child: Container(
                width: 120,
                height: 120,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  color: goldColor.withValues(alpha: 0.08),
                ),
              ),
            ),
            Positioned(
              bottom: -40,
              right: 40,
              child: Container(
                width: 150,
                height: 150,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  color: goldColor.withValues(alpha: 0.05),
                ),
              ),
            ),
            // Card content
            Padding(
              padding: const EdgeInsets.all(AppSpacing.xl),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Icon(CupertinoIcons.creditcard_fill, color: goldColor, size: 16),
                      const SizedBox(width: 8),
                      Text(
                        membership.status.toUpperCase(),
                        style: AppType.caption.copyWith(
                          color: goldColor,
                          fontWeight: FontWeight.w700,
                          letterSpacing: 1.5,
                        ),
                      ),
                      const Spacer(),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                        decoration: BoxDecoration(
                          color: goldColor.withValues(alpha: 0.18),
                          borderRadius: BorderRadius.circular(AppRadius.pill),
                          border: Border.all(
                            color: goldColor.withValues(alpha: 0.4),
                            width: 0.8,
                          ),
                        ),
                        child: Text(
                          'MEMBER',
                          style: AppType.caption.copyWith(
                            color: goldColor,
                            fontWeight: FontWeight.w700,
                            letterSpacing: 1.2,
                          ),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: AppSpacing.md),
                  Text(
                    membership.planName,
                    style: AppType.title2.copyWith(
                      color: CupertinoColors.white,
                      fontWeight: FontWeight.w800,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    'Valid till ${Fmt.date(membership.endDate)}',
                    style: AppType.footnote.copyWith(
                      color: CupertinoColors.white.withValues(alpha: 0.65),
                    ),
                  ),
                  const SizedBox(height: AppSpacing.lg),
                  Row(
                    crossAxisAlignment: CrossAxisAlignment.baseline,
                    textBaseline: TextBaseline.alphabetic,
                    children: [
                      Text(
                        daysRemaining < 0 ? '0' : daysRemaining.toString(),
                        style: AppType.metric.copyWith(
                          color: CupertinoColors.white,
                          fontSize: 36,
                          fontWeight: FontWeight.w900,
                        ),
                      ),
                      const SizedBox(width: 8),
                      Padding(
                        padding: const EdgeInsets.only(bottom: 6),
                        child: Text(
                          daysRemaining == 1 ? 'day left' : 'days left',
                          style: AppType.callout.copyWith(
                            color: CupertinoColors.white.withValues(alpha: 0.7),
                            fontWeight: FontWeight.w500,
                          ),
                        ),
                      ),
                      const Spacer(),
                      if (isExpiring)
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                          decoration: BoxDecoration(
                            color: AppColors.danger.withValues(alpha: 0.85),
                            borderRadius: BorderRadius.circular(AppRadius.pill),
                          ),
                          child: Text(
                            'Expiring soon',
                            style: AppType.caption.copyWith(
                              color: CupertinoColors.white,
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                        ),
                    ],
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _StatsRow extends StatelessWidget {
  const _StatsRow({required this.attendance, required this.metric});
  final MeAttendanceSummary attendance;
  final MeBodyMetricSummary? metric;

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Expanded(
          child: StatTile(
            label: 'This month',
            value: attendance.totalThisMonth.toString(),
            suffix: 'visits',
            icon: CupertinoIcons.calendar,
            color: AppColors.accent,
          ),
        ),
        const SizedBox(width: AppSpacing.md),
        Expanded(
          child: StatTile(
            label: 'Streak',
            value: attendance.currentStreakDays.toString(),
            suffix: attendance.currentStreakDays == 1 ? 'day' : 'days',
            icon: CupertinoIcons.flame_fill,
            color: AppColors.gold,
          ),
        ),
        const SizedBox(width: AppSpacing.md),
        Expanded(
          child: StatTile(
            label: 'Weight',
            value: metric?.weight == null ? '-' : metric!.weight!.toStringAsFixed(1),
            suffix: metric?.weight == null ? '' : 'kg',
            icon: CupertinoIcons.gauge,
            color: AppColors.success,
          ),
        ),
      ],
    );
  }
}

class _AttendanceStrip extends StatelessWidget {
  const _AttendanceStrip({required this.summary});
  final MeAttendanceSummary summary;

  @override
  Widget build(BuildContext context) {
    final last7 = summary.last30Days.length >= 7
        ? summary.last30Days.sublist(summary.last30Days.length - 7)
        : summary.last30Days;

    return GlassCard(
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          for (final day in last7) _DayDot(day: day),
        ],
      ),
    );
  }
}

class _DayDot extends StatelessWidget {
  const _DayDot({required this.day});
  final MeAttendanceDay day;

  @override
  Widget build(BuildContext context) {
    final isDark = CupertinoTheme.of(context).brightness == Brightness.dark;
    final isToday = _isSameDay(day.date.toLocal(), DateTime.now());
    final baseColor = isDark ? AppColors.borderDark : AppColors.borderLight;

    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        Text(
          _shortWeekday(day.date),
          style: AppType.caption.copyWith(
            color: day.visited
                ? AppColors.accent
                : AppColors.resolveTextSecondary(context),
            fontWeight: day.visited ? FontWeight.w700 : FontWeight.w400,
          ),
        ),
        const SizedBox(height: 6),
        Container(
          width: 30,
          height: 30,
          alignment: Alignment.center,
          decoration: BoxDecoration(
            gradient: day.visited ? AppColors.primaryGradient : null,
            color: day.visited ? null : baseColor.withValues(alpha: 0.5),
            borderRadius: BorderRadius.circular(10),
            border: isToday
                ? Border.all(color: AppColors.accent, width: 2)
                : null,
            boxShadow: day.visited
                ? [
                    BoxShadow(
                      color: AppColors.accent.withValues(alpha: 0.4),
                      blurRadius: 8,
                      offset: const Offset(0, 2),
                    ),
                  ]
                : null,
          ),
          child: day.visited
              ? const Icon(CupertinoIcons.check_mark, size: 14,
                  color: CupertinoColors.white)
              : null,
        ),
      ],
    );
  }

  static String _shortWeekday(DateTime d) {
    const labels = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];
    return labels[(d.toLocal().weekday - 1).clamp(0, 6)];
  }

  static bool _isSameDay(DateTime a, DateTime b) =>
      a.year == b.year && a.month == b.month && a.day == b.day;
}

class _ScheduleTile extends StatelessWidget {
  const _ScheduleTile({required this.schedule});
  final MeUpcomingSchedule schedule;

  @override
  Widget build(BuildContext context) {
    return PressScale(
      onTap: () {},
      child: GlassCard(
        child: Row(
          children: [
            Container(
              width: 46,
              height: 46,
              alignment: Alignment.center,
              decoration: BoxDecoration(
                gradient: AppColors.primaryGradient,
                borderRadius: BorderRadius.circular(AppRadius.md),
                boxShadow: [
                  BoxShadow(
                    color: AppColors.accent.withValues(alpha: 0.4),
                    blurRadius: 10,
                    offset: const Offset(0, 3),
                  ),
                ],
              ),
              child: const Icon(CupertinoIcons.flame_fill,
                  color: CupertinoColors.white, size: 20),
            ),
            const SizedBox(width: AppSpacing.md),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    schedule.title,
                    style: AppType.headline.copyWith(
                        color: AppColors.resolveText(context)),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    [
                      if (schedule.dayOfWeek != null) schedule.dayOfWeek,
                      if (schedule.startTime != null) schedule.startTime,
                      if (schedule.trainerName != null) 'with \${schedule.trainerName}',
                    ].whereType<String>().join(' · '),
                    style: AppType.footnote.copyWith(
                      color: AppColors.resolveTextSecondary(context),
                    ),
                  ),
                ],
              ),
            ),
            Icon(CupertinoIcons.chevron_right,
                size: 16, color: AppColors.resolveTextSecondary(context)),
          ],
        ),
      ),
    );
  }
}

class _NotificationTile extends StatelessWidget {
  const _NotificationTile({required this.notification});
  final MeNotification notification;

  @override
  Widget build(BuildContext context) {
    return GlassCard(
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            width: 10,
            height: 10,
            margin: const EdgeInsets.only(top: 5, right: 10),
            decoration: BoxDecoration(
              gradient: notification.isRead ? null : AppColors.primaryGradient,
              color: notification.isRead ? CupertinoColors.transparent : null,
              shape: BoxShape.circle,
              boxShadow: notification.isRead
                  ? null
                  : [
                      BoxShadow(
                        color: AppColors.accent.withValues(alpha: 0.5),
                        blurRadius: 6,
                      ),
                    ],
            ),
          ),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  notification.title,
                  style: AppType.headline
                      .copyWith(color: AppColors.resolveText(context)),
                ),
                const SizedBox(height: 2),
                Text(
                  notification.message,
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                  style: AppType.subhead.copyWith(
                    color: AppColors.resolveTextSecondary(context),
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  Fmt.relative(notification.createdAt),
                  style: AppType.caption.copyWith(
                    color: AppColors.resolveTextSecondary(context),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _NoUpcoming extends StatelessWidget {
  const _NoUpcoming();

  @override
  Widget build(BuildContext context) {
    return GlassCard(
      child: Row(
        children: [
          Container(
            width: 44,
            height: 44,
            alignment: Alignment.center,
            decoration: BoxDecoration(
              gradient: LinearGradient(
                colors: [
                  AppColors.accent.withValues(alpha: 0.22),
                  AppColors.accentSoft.withValues(alpha: 0.12),
                ],
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
              ),
              borderRadius: BorderRadius.circular(AppRadius.md),
              border: Border.all(
                color: AppColors.accent.withValues(alpha: 0.3),
                width: 0.8,
              ),
            ),
            child: const Icon(CupertinoIcons.calendar_badge_plus,
                color: AppColors.accent),
          ),
          const SizedBox(width: AppSpacing.md),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'No upcoming workouts',
                  style: AppType.headline
                      .copyWith(color: AppColors.resolveText(context)),
                ),
                const SizedBox(height: 2),
                Text(
                  'Browse plans to get started.',
                  style: AppType.footnote.copyWith(
                    color: AppColors.resolveTextSecondary(context),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _HomeSkeleton extends StatelessWidget {
  const _HomeSkeleton();

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: EdgeInsets.fromLTRB(
        AppSpacing.lg,
        AppSpacing.lg,
        AppSpacing.lg,
        ShellLayoutMetrics.contentBottomPadding(context),
      ),
      child: const Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SkeletonBlock(height: 18, width: 120),
          SizedBox(height: 8),
          SkeletonBlock(height: 32, width: 200),
          SizedBox(height: AppSpacing.lg),
          SkeletonBlock(height: 145),
          SizedBox(height: AppSpacing.lg),
          Row(
            children: [
              Expanded(child: SkeletonBlock(height: 100)),
              SizedBox(width: AppSpacing.md),
              Expanded(child: SkeletonBlock(height: 100)),
              SizedBox(width: AppSpacing.md),
              Expanded(child: SkeletonBlock(height: 100)),
            ],
          ),
          SizedBox(height: AppSpacing.xl),
          SkeletonBlock(height: 80),
          SizedBox(height: AppSpacing.md),
          SkeletonBlock(height: 80),
        ],
      ),
    );
  }
}
