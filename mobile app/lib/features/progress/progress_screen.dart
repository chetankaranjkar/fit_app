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
import 'log_body_metric_sheet.dart';
import 'progress_insights.dart';

class ProgressScreen extends ConsumerStatefulWidget {
  const ProgressScreen({super.key});

  @override
  ConsumerState<ProgressScreen> createState() => _ProgressScreenState();
}

class _ProgressScreenState extends ConsumerState<ProgressScreen> {
  ProgressDateRange _range = ProgressDateRange.days30;

  @override
  Widget build(BuildContext context) {
    final attendance = ref.watch(attendanceProvider);
    final metrics = ref.watch(bodyMetricsProvider);
    final workoutHistory = ref.watch(workoutSessionHistoryProvider);
    final profile = ref.watch(profileProvider);
    final photos = ref.watch(progressPhotosProvider);
    final now = DateTime.now();

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
                    ref.invalidate(profileProvider);
                  },
                ),
                SliverPadding(
                  padding: ShellLayoutMetrics.scrollPadding(context),
                  sliver: SliverList(
                    delegate: SliverChildListDelegate([
                      const _ProgressHero(),
                      const SizedBox(height: AppSpacing.md),
                      _RangeChips(
                        value: _range,
                        onChanged: (v) => setState(() => _range = v),
                      ),
                      const SizedBox(height: AppSpacing.md),
                      _GoalAndEstimateCard(
                        profile: profile.asData?.value,
                        metrics: metrics.asData?.value ?? const [],
                        range: _range,
                        now: now,
                      ),
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
                                child: const Icon(
                                  CupertinoIcons.photo_on_rectangle,
                                  color: AppColors.accent,
                                  size: 22,
                                ),
                              ),
                              const SizedBox(width: 14),
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(
                                      'Transformation tracker',
                                      style: AppType.headline.copyWith(
                                        color: AppColors.resolveText(context),
                                      ),
                                    ),
                                    const SizedBox(height: 4),
                                    Text(
                                      photos.maybeWhen(
                                        data: (list) => list.isEmpty
                                            ? 'No recorded photos yet · camera & upload stay on this screen'
                                            : '${list.length} recorded photo${list.length == 1 ? '' : 's'}',
                                        orElse: () =>
                                            'Front · side · back photos, timeline & before/after',
                                      ),
                                      style: AppType.caption.copyWith(
                                        color: AppColors.resolveTextSecondary(context),
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                              Icon(
                                CupertinoIcons.chevron_right,
                                color: AppColors.resolveTextSecondary(context),
                                size: 18,
                              ),
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
                      SectionHeader(
                        title: 'Recorded weigh-ins',
                        action: 'Log weight',
                        onActionTap: () => showLogBodyMetricSheet(context, ref),
                      ),
                      const SizedBox(height: AppSpacing.md),
                      metrics.when(
                        loading: () => const SkeletonBlock(height: 220),
                        error: (e, _) => ErrorStateView(
                          message: e.toString(),
                          onRetry: () => ref.refresh(bodyMetricsProvider),
                        ),
                        data: (rows) => _WeightChart(rows: rows, range: _range, now: now),
                      ),
                      const SizedBox(height: AppSpacing.xl),
                      metrics.when(
                        loading: () => const SizedBox.shrink(),
                        error: (_, __) => const SizedBox.shrink(),
                        data: (rows) => _BodyFatChart(rows: rows, range: _range, now: now),
                      ),
                      const SectionHeader(title: 'Recorded workouts'),
                      const SizedBox(height: AppSpacing.md),
                      workoutHistory.when(
                        loading: () => const SkeletonBlock(height: 120),
                        error: (e, _) => ErrorStateView(
                          message: e.toString(),
                          onRetry: () => ref.refresh(workoutSessionHistoryProvider),
                        ),
                        data: (sessions) => _WorkoutHistoryList(
                          sessions: sessions,
                          range: _range,
                          now: now,
                        ),
                      ),
                      const SizedBox(height: AppSpacing.xl),
                      const SectionHeader(title: 'Recorded check-ins'),
                      const SizedBox(height: AppSpacing.sm),
                      Text(
                        'Last 30 days on file. Grey days are not inferred misses.',
                        style: AppType.caption.copyWith(
                          color: AppColors.resolveTextSecondary(context),
                        ),
                      ),
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
              'Recorded weigh-ins, recorded check-ins, and completed workouts. Assigned goals are labelled separately from estimates.',
              style: AppType.subhead.copyWith(color: AppColors.resolveText(context), height: 1.35),
            ),
          ),
        ],
      ),
    ).animate().fadeIn(duration: 300.ms).slideY(begin: 0.04, end: 0);
  }
}

class _RangeChips extends StatelessWidget {
  const _RangeChips({required this.value, required this.onChanged});
  final ProgressDateRange value;
  final ValueChanged<ProgressDateRange> onChanged;

  @override
  Widget build(BuildContext context) {
    return CupertinoSlidingSegmentedControl<ProgressDateRange>(
      groupValue: value,
      onValueChanged: (v) {
        if (v != null) onChanged(v);
      },
      children: const {
        ProgressDateRange.days30: Padding(
          padding: EdgeInsets.symmetric(horizontal: 8, vertical: 6),
          child: Text('30 days'),
        ),
        ProgressDateRange.days90: Padding(
          padding: EdgeInsets.symmetric(horizontal: 8, vertical: 6),
          child: Text('90 days'),
        ),
        ProgressDateRange.all: Padding(
          padding: EdgeInsets.symmetric(horizontal: 8, vertical: 6),
          child: Text('All'),
        ),
      },
    );
  }
}

class _EstimateBadge extends StatelessWidget {
  const _EstimateBadge();

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(999),
        color: AppColors.orange.withValues(alpha: 0.16),
        border: Border.all(color: AppColors.orange.withValues(alpha: 0.4)),
      ),
      child: Text(
        'Estimate',
        style: AppType.caption.copyWith(
          color: AppColors.orange,
          fontWeight: FontWeight.w700,
          letterSpacing: 0.2,
        ),
      ),
    );
  }
}

class _GoalAndEstimateCard extends StatelessWidget {
  const _GoalAndEstimateCard({
    required this.profile,
    required this.metrics,
    required this.range,
    required this.now,
  });

  final MeProfile? profile;
  final List<MeBodyMetricLog> metrics;
  final ProgressDateRange range;
  final DateTime now;

  @override
  Widget build(BuildContext context) {
    final allWeights = ProgressInsights.recordedWeights(metrics);
    final inRange = ProgressInsights.weightsInRange(metrics, range, now);
    final latest = allWeights.isEmpty ? null : allWeights.last.kg;
    final firstLogged = allWeights.isEmpty ? null : allWeights.first.kg;
    final goal = profile?.targetWeightKg?.toDouble();
    final summary = ProgressInsights.goalSummary(
      goalKg: goal,
      latestLoggedKg: latest,
      firstLoggedKg: firstLogged,
    );
    final heightCm = ProgressInsights.heightCmForBmi(
      logs: metrics,
      assignedHeightCm: profile?.heightCm?.toDouble(),
    );
    final bmi = ProgressInsights.estimateBmi(weightKg: latest, heightCm: heightCm);
    final projected = goal == null
        ? null
        : ProgressInsights.estimateGoalDate(chronological: inRange, goalKg: goal);

    final assignedGoal = profile?.assignedGoalType?.trim();
    final hasAnything = summary != null ||
        bmi != null ||
        projected != null ||
        goal != null ||
        (assignedGoal != null && assignedGoal.isNotEmpty);

    if (!hasAnything) {
      return const GlassCard(
        child: EmptyState(
          title: 'No goal summary yet',
          message:
              'Log a recorded weigh-in. An assigned goal weight from the gym is needed to compare against it.',
          icon: CupertinoIcons.flag,
        ),
      );
    }

    return GlassCard(
      tint: AppColors.accent.withValues(alpha: 0.05),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          if (assignedGoal != null && assignedGoal.isNotEmpty) ...[
            Text(
              'Assigned goal · $assignedGoal',
              style: AppType.caption.copyWith(color: AppColors.resolveTextSecondary(context)),
            ),
            const SizedBox(height: 6),
          ],
          if (summary != null) ...[
            Text(
              summary.headline,
              style: AppType.headline.copyWith(color: AppColors.resolveText(context)),
            ),
            if (summary.towardGoalPercent != null) ...[
              const SizedBox(height: 8),
              Text(
                '${summary.towardGoalPercent!.toStringAsFixed(0)}% toward goal',
                style: AppType.subhead.copyWith(color: AppColors.resolveText(context)),
              ),
              const SizedBox(height: 4),
              Text(
                summary.towardGoalCaption ?? '',
                style: AppType.caption.copyWith(
                  color: AppColors.resolveTextSecondary(context),
                  height: 1.35,
                ),
              ),
            ],
          ] else if (latest != null)
            Text(
              'Latest logged ${_fmt(latest)} kg · no assigned goal weight on file',
              style: AppType.headline.copyWith(color: AppColors.resolveText(context)),
            )
          else if (goal != null)
            Text(
              'Assigned goal ${_fmt(goal)} kg · no recorded weigh-in yet',
              style: AppType.headline.copyWith(color: AppColors.resolveText(context)),
            ),
          if (bmi != null) ...[
            const SizedBox(height: AppSpacing.md),
            Row(
              children: [
                const _EstimateBadge(),
                const SizedBox(width: 8),
                Expanded(
                  child: Text(
                    'BMI ${bmi.toStringAsFixed(1)} from last logged weight and height',
                    style: AppType.footnote.copyWith(color: AppColors.resolveText(context)),
                  ),
                ),
              ],
            ),
          ],
          if (projected != null) ...[
            const SizedBox(height: AppSpacing.sm),
            Row(
              children: [
                const _EstimateBadge(),
                const SizedBox(width: 8),
                Expanded(
                  child: Text(
                    'Goal date ${Fmt.date(projected)} if the current logged trend continues',
                    style: AppType.footnote.copyWith(color: AppColors.resolveText(context)),
                  ),
                ),
              ],
            ),
          ],
        ],
      ),
    );
  }

  static String _fmt(double kg) {
    if ((kg - kg.round()).abs() < 0.05) return kg.round().toString();
    return kg.toStringAsFixed(1);
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
  const _WeightChart({
    required this.rows,
    required this.range,
    required this.now,
  });
  final List<MeBodyMetricLog> rows;
  final ProgressDateRange range;
  final DateTime now;

  @override
  Widget build(BuildContext context) {
    final filtered = ProgressInsights.weightsInRange(rows, range, now);

    if (filtered.isEmpty) {
      return const GlassCard(
        child: EmptyState(
          title: 'No recorded weigh-ins',
          message: 'Tap Log weight to record your first checkpoint. Assigned workout targets are not shown here.',
          icon: CupertinoIcons.gauge,
        ),
      );
    }

    if (!ProgressInsights.canShowTrend(filtered.length)) {
      final only = filtered.single;
      return GlassCard(
        child: EmptyState(
          title: ProgressInsights.notEnoughLoggedData,
          message:
              'Latest logged ${only.kg.toStringAsFixed(only.kg % 1 == 0 ? 0 : 1)} kg on ${Fmt.date(only.loggedAt)}. A trend needs at least two recorded weigh-ins.',
          icon: CupertinoIcons.graph_square,
        ),
      );
    }

    final spots = <FlSpot>[
      for (var i = 0; i < filtered.length; i++) FlSpot(i.toDouble(), filtered[i].kg),
    ];
    final values = filtered.map((r) => r.kg).toList();
    final minY = values.reduce((a, b) => a < b ? a : b) - 1;
    final maxY = values.reduce((a, b) => a > b ? a : b) + 1;
    final delta = ProgressInsights.deltaKg(filtered);

    return GlassCard(
      padding: const EdgeInsets.fromLTRB(AppSpacing.md, AppSpacing.lg, AppSpacing.lg, AppSpacing.md),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          if (delta != null)
            Padding(
              padding: const EdgeInsets.only(bottom: 8, left: 4),
              child: Text(
                'Recorded change ${delta >= 0 ? '+' : ''}${delta.toStringAsFixed(1)} kg in this window',
                style: AppType.caption.copyWith(color: AppColors.resolveTextSecondary(context)),
              ),
            ),
          SizedBox(
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
                      showTitles: true,
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
                    isCurved: false,
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
        ],
      ),
    );
  }
}

class _BodyFatChart extends StatelessWidget {
  const _BodyFatChart({
    required this.rows,
    required this.range,
    required this.now,
  });
  final List<MeBodyMetricLog> rows;
  final ProgressDateRange range;
  final DateTime now;

  @override
  Widget build(BuildContext context) {
    final all = ProgressInsights.recordedBodyFat(rows);
    final filtered = all.where((p) => ProgressInsights.inRange(p.loggedAt, range, now)).toList();
    if (all.isEmpty) return const SizedBox.shrink();

    Widget body;
    if (filtered.isEmpty) {
      body = const GlassCard(
        child: EmptyState(
          title: 'No recorded body fat in this window',
          message: 'Logged body-fat % outside this date range is hidden until you widen the filter.',
          icon: CupertinoIcons.percent,
        ),
      );
    } else if (!ProgressInsights.canShowTrend(filtered.length)) {
      body = const GlassCard(
        child: EmptyState(
          title: ProgressInsights.notEnoughLoggedData,
          message: 'A body-fat trend needs at least two recorded measurements in this window.',
          icon: CupertinoIcons.percent,
        ),
      );
    } else {
      final spots = <FlSpot>[
        for (var i = 0; i < filtered.length; i++) FlSpot(i.toDouble(), filtered[i].percent),
      ];
      final values = filtered.map((r) => r.percent).toList();
      final minY = (values.reduce((a, b) => a < b ? a : b) - 0.5).clamp(0.0, 100.0);
      final maxY = (values.reduce((a, b) => a > b ? a : b) + 0.5).clamp(0.0, 100.0);
      body = GlassCard(
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
                    showTitles: true,
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
                  isCurved: false,
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
      );
    }

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        const SectionHeader(title: 'Recorded body fat %'),
        const SizedBox(height: AppSpacing.md),
        body,
        const SizedBox(height: AppSpacing.xl),
      ],
    );
  }
}

class _WorkoutHistoryList extends StatelessWidget {
  const _WorkoutHistoryList({
    required this.sessions,
    required this.range,
    required this.now,
  });
  final List<MeWorkoutSessionSummary> sessions;
  final ProgressDateRange range;
  final DateTime now;

  @override
  Widget build(BuildContext context) {
    final filtered = ProgressInsights.filterDated(
      sessions,
      (s) => s.sessionDateUtc,
      range,
      now,
    );

    if (filtered.isEmpty) {
      return const GlassCard(
        child: EmptyState(
          title: 'No recorded sessions',
          message: 'Complete a workout from the Workouts tab to see history here. Assigned plans are not counted until you log a session.',
          icon: CupertinoIcons.flame,
        ),
      );
    }

    return GlassCard(
      child: Column(
        children: [
          for (var i = 0; i < filtered.length; i++) ...[
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
                        filtered[i].planName,
                        style: AppType.headline.copyWith(color: AppColors.resolveText(context)),
                      ),
                      Text(
                        '${Fmt.date(filtered[i].sessionDateUtc.toLocal())} · '
                        '${filtered[i].setsLogged} sets'
                        '${filtered[i].durationMinutes != null ? ' · ${filtered[i].durationMinutes} min' : ''}',
                        style: AppType.caption.copyWith(color: AppColors.resolveTextSecondary(context)),
                      ),
                    ],
                  ),
                ),
              ],
            ),
            if (i < filtered.length - 1)
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
    if (ProgressInsights.hasNoRecordedVisits(summary.last30Days)) {
      return const GlassCard(
        child: EmptyState(
          title: 'No recorded visits yet',
          message: 'Grey days are not inferred misses. Only a check-in creates a recorded visit.',
          icon: CupertinoIcons.calendar,
        ),
      );
    }

    final recorded = ProgressInsights.recordedVisitCount(summary.last30Days);
    return GlassCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            '$recorded recorded visit${recorded == 1 ? '' : 's'} in this window.',
            style: AppType.caption.copyWith(color: AppColors.resolveTextSecondary(context)),
          ),
          const SizedBox(height: AppSpacing.md),
          GridView.count(
            physics: const NeverScrollableScrollPhysics(),
            shrinkWrap: true,
            crossAxisCount: 7,
            mainAxisSpacing: 6,
            crossAxisSpacing: 6,
            childAspectRatio: 1,
            children: [
              for (final day in summary.last30Days) _GridDot(day: day),
            ],
          ),
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
        color: day.visited ? AppColors.accent : base.withValues(alpha: 0.55),
        borderRadius: BorderRadius.circular(6),
      ),
    );
  }
}
