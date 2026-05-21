import 'package:fl_chart/fl_chart.dart';
import 'package:flutter/cupertino.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/formatters.dart';
import '../../models/me_models.dart';
import '../../providers/me_providers.dart';
import '../../theme/app_colors.dart';
import '../../theme/app_theme.dart';
import '../../theme/app_typography.dart';
import '../../widgets/empty_state.dart';
import '../../widgets/glass_card.dart';
import '../../widgets/section_header.dart';
import '../../widgets/skeleton_shimmer.dart';
import '../../widgets/stat_tile.dart';
import '../../widgets/premium_background.dart';
import '../../widgets/press_scale.dart';
import '../../services/me_service.dart';
import '../shell/shell_layout_metrics.dart';

class ProgressScreen extends ConsumerWidget {
  const ProgressScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final attendance = ref.watch(attendanceProvider);
    final metrics = ref.watch(bodyMetricsProvider);
    final workoutHistory = ref.watch(workoutSessionHistoryProvider);

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
              largeTitle: Text('Progress'),
              border: null,
            ),
            CupertinoSliverRefreshControl(
              onRefresh: () async {
                await MeService.instance.flushPendingWorkoutSessions();
                ref.invalidate(attendanceProvider);
                ref.invalidate(bodyMetricsProvider);
                ref.invalidate(workoutSessionHistoryProvider);
                ref.invalidate(progressPhotosProvider);
              },
            ),
            SliverPadding(
              padding: ShellLayoutMetrics.scrollPadding(context),
              sliver: SliverList(
                delegate: SliverChildListDelegate([
                  const _ProgressHero(),
                  const SizedBox(height: AppSpacing.md),
                  GlassCard(
                    tint: AppColors.neonPurple.withValues(alpha: 0.07),
                    child: PressScale(
                      onTap: () => context.push('/progress/transformation'),
                      child: Row(
                        children: [
                          Container(
                            padding: const EdgeInsets.all(10),
                            decoration: BoxDecoration(
                              borderRadius: BorderRadius.circular(AppRadius.md),
                              color: AppColors.accent.withValues(alpha: 0.15),
                            ),
                            child: const Icon(CupertinoIcons.photo_on_rectangle, color: AppColors.accent, size: 22),
                          ),
                          const SizedBox(width: 14),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  'Transformation tracker',
                                  style: AppType.headline.copyWith(color: AppColors.resolveText(context)),
                                ),
                                const SizedBox(height: 4),
                                Text(
                                  'Front · side · back photos, timeline & before/after',
                                  style: AppType.caption.copyWith(color: AppColors.resolveTextSecondary(context)),
                                ),
                              ],
                            ),
                          ),
                          Icon(CupertinoIcons.chevron_right, color: AppColors.resolveTextSecondary(context), size: 18),
                        ],
                      ),
                    ),
                  ),
                  const SizedBox(height: AppSpacing.lg),
                  attendance.when(
                    loading: () => const SkeletonBlock(height: 100),
                    error: (e, _) => ErrorStateView(
                      message: e.toString(),
                      onRetry: () => ref.refresh(attendanceProvider),
                    ),
                    data: (a) => _AttendanceStats(summary: a),
                  ),
                  const SizedBox(height: AppSpacing.xl),
                  const SectionHeader(title: 'Weight trend'),
                  const SizedBox(height: AppSpacing.md),
                  metrics.when(
                    loading: () => const SkeletonBlock(height: 220),
                    error: (e, _) => ErrorStateView(
                      message: e.toString(),
                      onRetry: () => ref.refresh(bodyMetricsProvider),
                    ),
                    data: (rows) => _WeightChart(rows: rows),
                  ),
                  const SizedBox(height: AppSpacing.xl),
                  metrics.when(
                    loading: () => const SizedBox.shrink(),
                    error: (_, __) => const SizedBox.shrink(),
                    data: (rows) => _BodyFatChart(rows: rows),
                  ),
                  const SectionHeader(title: 'Workout history'),
                  const SizedBox(height: AppSpacing.md),
                  workoutHistory.when(
                    loading: () => const SkeletonBlock(height: 120),
                    error: (e, _) => ErrorStateView(
                      message: e.toString(),
                      onRetry: () => ref.refresh(workoutSessionHistoryProvider),
                    ),
                    data: (sessions) => _WorkoutHistoryList(sessions: sessions),
                  ),
                  const SizedBox(height: AppSpacing.xl),
                  const SectionHeader(title: 'Last 30 days'),
                  const SizedBox(height: AppSpacing.md),
                  attendance.when(
                    loading: () => const SkeletonBlock(height: 140),
                    error: (e, _) => const SizedBox.shrink(),
                    data: (a) => _AttendanceGrid(summary: a),
                  ),
                ]),
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

class _ProgressHero extends StatelessWidget {
  const _ProgressHero();

  @override
  Widget build(BuildContext context) {
    return GlassCard(
      tint: AppColors.neonBlue.withValues(alpha: 0.08),
      child: Row(
        children: [
          Container(
            width: 46,
            height: 46,
            decoration: BoxDecoration(
              gradient: AppColors.neonGradient,
              borderRadius: BorderRadius.circular(AppRadius.md),
            ),
            child: const Icon(CupertinoIcons.graph_square_fill, color: CupertinoColors.white),
          ),
          const SizedBox(width: AppSpacing.md),
          Expanded(
            child: Text(
              'Track attendance, streaks and body metrics in one timeline.',
              style: AppType.subhead.copyWith(color: AppColors.resolveText(context), height: 1.35),
            ),
          ),
        ],
      ),
    ).animate().fadeIn(duration: 300.ms).slideY(begin: 0.04, end: 0);
  }
}

class _AttendanceStats extends StatelessWidget {
  const _AttendanceStats({required this.summary});
  final MeAttendanceSummary summary;

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Expanded(
          child: StatTile(
            label: 'This week',
            value: summary.totalThisWeek.toString(),
            suffix: 'visits',
            icon: CupertinoIcons.calendar_today,
          ),
        ),
        const SizedBox(width: AppSpacing.md),
        Expanded(
          child: StatTile(
            label: 'This month',
            value: summary.totalThisMonth.toString(),
            suffix: 'visits',
            icon: CupertinoIcons.chart_bar_alt_fill,
            color: AppColors.purple,
          ),
        ),
        const SizedBox(width: AppSpacing.md),
        Expanded(
          child: StatTile(
            label: 'Streak',
            value: summary.currentStreakDays.toString(),
            suffix: summary.currentStreakDays == 1 ? 'day' : 'days',
            icon: CupertinoIcons.flame_fill,
            color: AppColors.orange,
          ),
        ),
      ],
    );
  }
}

class _WeightChart extends StatelessWidget {
  const _WeightChart({required this.rows});
  final List<MeBodyMetricLog> rows;

  @override
  Widget build(BuildContext context) {
    final filtered = rows
        .where((r) => r.weight != null && r.weight! > 0)
        .toList()
      ..sort((a, b) => a.loggedAt.compareTo(b.loggedAt));

    if (filtered.isEmpty) {
      return const GlassCard(
        child: EmptyState(
          title: 'No weight data',
          message: 'Log a body metric in the gym to see your trend here.',
          icon: CupertinoIcons.gauge,
        ),
      );
    }

    final spots = <FlSpot>[
      for (var i = 0; i < filtered.length; i++)
        FlSpot(i.toDouble(), filtered[i].weight!.toDouble()),
    ];

    final values = filtered.map((r) => r.weight!.toDouble()).toList();
    final minY = values.reduce((a, b) => a < b ? a : b) - 1;
    final maxY = values.reduce((a, b) => a > b ? a : b) + 1;

    return GlassCard(
      padding: const EdgeInsets.fromLTRB(AppSpacing.md, AppSpacing.lg, AppSpacing.lg, AppSpacing.md),
      child: SizedBox(
        height: 220,
        child: LineChart(
          LineChartData(
            minY: minY,
            maxY: maxY,
            gridData: FlGridData(
              show: true,
              drawVerticalLine: false,
              horizontalInterval: ((maxY - minY) / 4).clamp(0.5, double.infinity),
              getDrawingHorizontalLine: (_) => FlLine(
                color: AppColors.resolveBorder(context).withValues(alpha: 0.5),
                strokeWidth: 0.6,
              ),
            ),
            titlesData: FlTitlesData(
              topTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
              rightTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
              bottomTitles: AxisTitles(
                sideTitles: SideTitles(
                  showTitles: filtered.length > 1,
                  reservedSize: 24,
                  interval: (filtered.length / 4).ceilToDouble().clamp(1, double.infinity),
                  getTitlesWidget: (value, _) {
                    final i = value.round();
                    if (i < 0 || i >= filtered.length) return const SizedBox.shrink();
                    return Padding(
                      padding: const EdgeInsets.only(top: 6),
                      child: Text(
                        Fmt.dateShort(filtered[i].loggedAt),
                        style: AppType.caption.copyWith(
                          color: AppColors.resolveTextSecondary(context),
                        ),
                      ),
                    );
                  },
                ),
              ),
              leftTitles: AxisTitles(
                sideTitles: SideTitles(
                  showTitles: true,
                  reservedSize: 36,
                  interval: ((maxY - minY) / 4).clamp(0.5, double.infinity),
                  getTitlesWidget: (value, _) => Text(
                    value.toStringAsFixed(0),
                    style: AppType.caption.copyWith(
                      color: AppColors.resolveTextSecondary(context),
                    ),
                  ),
                ),
              ),
            ),
            borderData: FlBorderData(show: false),
            lineBarsData: [
              LineChartBarData(
                spots: spots,
                isCurved: true,
                curveSmoothness: 0.32,
                color: AppColors.accent,
                barWidth: 3,
                dotData: FlDotData(
                  show: true,
                  getDotPainter: (spot, _, __, ___) => FlDotCirclePainter(
                    radius: 3.5,
                    color: AppColors.accent,
                    strokeWidth: 2,
                    strokeColor: AppColors.resolveBg(context),
                  ),
                ),
                belowBarData: BarAreaData(
                  show: true,
                  gradient: LinearGradient(
                    begin: Alignment.topCenter,
                    end: Alignment.bottomCenter,
                    colors: [
                      AppColors.accent.withValues(alpha: 0.28),
                      AppColors.accent.withValues(alpha: 0.0),
                    ],
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _BodyFatChart extends StatelessWidget {
  const _BodyFatChart({required this.rows});
  final List<MeBodyMetricLog> rows;

  @override
  Widget build(BuildContext context) {
    final filtered = rows
        .where((r) => r.bodyFatPercent != null && r.bodyFatPercent! > 0)
        .toList()
      ..sort((a, b) => a.loggedAt.compareTo(b.loggedAt));

    if (filtered.isEmpty) return const SizedBox.shrink();

    final spots = <FlSpot>[
      for (var i = 0; i < filtered.length; i++) FlSpot(i.toDouble(), filtered[i].bodyFatPercent!.toDouble()),
    ];
    final values = filtered.map((r) => r.bodyFatPercent!.toDouble()).toList();
    final minY = (values.reduce((a, b) => a < b ? a : b) - 0.5).clamp(0.0, 100.0);
    final maxY = (values.reduce((a, b) => a > b ? a : b) + 0.5).clamp(0.0, 100.0);

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        const SectionHeader(title: 'Body fat %'),
        const SizedBox(height: AppSpacing.md),
        GlassCard(
          padding: const EdgeInsets.fromLTRB(AppSpacing.md, AppSpacing.lg, AppSpacing.lg, AppSpacing.md),
          child: SizedBox(
            height: 200,
            child: LineChart(
              LineChartData(
                minY: minY,
                maxY: maxY,
                gridData: FlGridData(
                  show: true,
                  drawVerticalLine: false,
                  horizontalInterval: ((maxY - minY) / 4).clamp(0.5, double.infinity),
                  getDrawingHorizontalLine: (_) => FlLine(
                    color: AppColors.resolveBorder(context).withValues(alpha: 0.5),
                    strokeWidth: 0.6,
                  ),
                ),
                titlesData: FlTitlesData(
                  topTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
                  rightTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
                  bottomTitles: AxisTitles(
                    sideTitles: SideTitles(
                      showTitles: filtered.length > 1,
                      reservedSize: 24,
                      interval: (filtered.length / 4).ceilToDouble().clamp(1, double.infinity),
                      getTitlesWidget: (value, _) {
                        final i = value.round();
                        if (i < 0 || i >= filtered.length) return const SizedBox.shrink();
                        return Padding(
                          padding: const EdgeInsets.only(top: 6),
                          child: Text(
                            Fmt.dateShort(filtered[i].loggedAt),
                            style: AppType.caption.copyWith(
                              color: AppColors.resolveTextSecondary(context),
                            ),
                          ),
                        );
                      },
                    ),
                  ),
                  leftTitles: AxisTitles(
                    sideTitles: SideTitles(
                      showTitles: true,
                      reservedSize: 32,
                      interval: ((maxY - minY) / 4).clamp(0.5, double.infinity),
                      getTitlesWidget: (value, _) => Text(
                        value.toStringAsFixed(0),
                        style: AppType.caption.copyWith(
                          color: AppColors.resolveTextSecondary(context),
                        ),
                      ),
                    ),
                  ),
                ),
                borderData: FlBorderData(show: false),
                lineBarsData: [
                  LineChartBarData(
                    spots: spots,
                    isCurved: true,
                    curveSmoothness: 0.32,
                    color: AppColors.neonPurple,
                    barWidth: 3,
                    dotData: FlDotData(
                      show: true,
                      getDotPainter: (spot, _, __, ___) => FlDotCirclePainter(
                        radius: 3.5,
                        color: AppColors.neonPurple,
                        strokeWidth: 2,
                        strokeColor: AppColors.resolveBg(context),
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
        const SizedBox(height: AppSpacing.xl),
      ],
    );
  }
}

class _WorkoutHistoryList extends StatelessWidget {
  const _WorkoutHistoryList({required this.sessions});
  final List<MeWorkoutSessionSummary> sessions;

  @override
  Widget build(BuildContext context) {
    if (sessions.isEmpty) {
      return const GlassCard(
        child: EmptyState(
          title: 'No sessions yet',
          message: 'Complete a workout from the Workouts tab to see history here.',
          icon: CupertinoIcons.flame,
        ),
      );
    }

    return GlassCard(
      child: Column(
        children: [
          for (var i = 0; i < sessions.length; i++) ...[
            Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Icon(CupertinoIcons.flame_fill, color: AppColors.accent, size: 20),
                const SizedBox(width: AppSpacing.md),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        sessions[i].planName,
                        style: AppType.headline.copyWith(color: AppColors.resolveText(context)),
                      ),
                      Text(
                        '${Fmt.date(sessions[i].sessionDateUtc.toLocal())} · '
                        '${sessions[i].setsLogged} sets'
                        '${sessions[i].durationMinutes != null ? ' · ${sessions[i].durationMinutes} min' : ''}',
                        style: AppType.caption.copyWith(color: AppColors.resolveTextSecondary(context)),
                      ),
                    ],
                  ),
                ),
              ],
            ),
            if (i < sessions.length - 1)
              Padding(
                padding: const EdgeInsets.symmetric(vertical: AppSpacing.md),
                child: Container(
                  height: 1,
                  color: AppColors.resolveBorder(context).withValues(alpha: 0.35),
                ),
              ),
          ],
        ],
      ),
    );
  }
}

class _AttendanceGrid extends StatelessWidget {
  const _AttendanceGrid({required this.summary});
  final MeAttendanceSummary summary;

  @override
  Widget build(BuildContext context) {
    return GlassCard(
      child: GridView.count(
        physics: const NeverScrollableScrollPhysics(),
        shrinkWrap: true,
        crossAxisCount: 7,
        mainAxisSpacing: 6,
        crossAxisSpacing: 6,
        childAspectRatio: 1,
        children: [
          for (final day in summary.last30Days)
            _GridDot(day: day),
        ],
      ),
    );
  }
}

class _GridDot extends StatelessWidget {
  const _GridDot({required this.day});
  final MeAttendanceDay day;

  @override
  Widget build(BuildContext context) {
    final isDark = CupertinoTheme.of(context).brightness == Brightness.dark;
    final base = isDark ? AppColors.borderDark : AppColors.borderLight;
    return Container(
      decoration: BoxDecoration(
        color: day.visited
            ? AppColors.accent
            : base.withValues(alpha: 0.55),
        borderRadius: BorderRadius.circular(6),
      ),
    );
  }
}
