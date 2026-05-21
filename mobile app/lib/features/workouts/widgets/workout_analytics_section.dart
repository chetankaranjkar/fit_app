import 'package:fl_chart/fl_chart.dart';
import 'package:flutter/cupertino.dart';
import 'package:flutter_animate/flutter_animate.dart';

import '../../../models/me_models.dart';
import '../../../theme/app_colors.dart';
import '../../../theme/app_theme.dart';
import '../../../widgets/fitness_text.dart';
import '../../../widgets/glass_card.dart';

class WorkoutAnalyticsSection extends StatelessWidget {
  const WorkoutAnalyticsSection({super.key, required this.attendance});

  final MeAttendanceSummary attendance;

  @override
  Widget build(BuildContext context) {
    final days = attendance.last30Days;
    final week = days.length >= 7 ? days.sublist(days.length - 7) : days;
    final spots = <FlSpot>[];
    for (var i = 0; i < week.length; i++) {
      spots.add(FlSpot(i.toDouble(), week[i].visited ? 1 : 0.15));
    }
    if (spots.isEmpty) {
      for (var i = 0; i < 7; i++) {
        spots.add(FlSpot(i.toDouble(), 0.2));
      }
    }

    final recoverySpots = List.generate(7, (i) {
      final base = 0.55 + (i / 12);
      final bump = week.length > i && week[i].visited ? 0.12 : -0.05;
      return FlSpot(i.toDouble(), (base + bump).clamp(0.35, 0.95));
    });

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text('PERFORMANCE LAB', style: FitnessText.label(context)),
        const SizedBox(height: AppSpacing.sm),
        GlassCard(
          radius: 26,
          padding: const EdgeInsets.all(AppSpacing.lg),
          tint: AppColors.neonBlue.withValues(alpha: 0.06),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Expanded(
                    child: Text(
                      'Weekly consistency',
                      style: FitnessText.title(context).copyWith(fontSize: 18),
                    ),
                  ),
                  _StatPill(
                    label: 'Streak',
                    value: '${attendance.currentStreakDays}d',
                    color: AppColors.success,
                  ),
                ],
              ),
              const SizedBox(height: AppSpacing.md),
              SizedBox(
                height: 120,
                child: BarChart(
                  BarChartData(
                    maxY: 1.1,
                    gridData: const FlGridData(show: false),
                    borderData: FlBorderData(show: false),
                    titlesData: FlTitlesData(
                      topTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
                      rightTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
                      leftTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
                      bottomTitles: AxisTitles(
                        sideTitles: SideTitles(
                          showTitles: true,
                          reservedSize: 22,
                          getTitlesWidget: (v, m) {
                            const names = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
                            final i = v.toInt().clamp(0, names.length - 1);
                            return Padding(
                              padding: const EdgeInsets.only(top: 6),
                              child: Text(
                                names[i],
                                style: FitnessText.label(context),
                              ),
                            );
                          },
                        ),
                      ),
                    ),
                    barGroups: List.generate(spots.length, (i) {
                      return BarChartGroupData(
                        x: i,
                        barRods: [
                          BarChartRodData(
                            toY: spots[i].y.clamp(0.0, 1.0),
                            width: 12,
                            borderRadius: BorderRadius.circular(10),
                            gradient: LinearGradient(
                              colors: [
                                AppColors.neonCyan.withValues(alpha: 0.9),
                                AppColors.neonBlue.withValues(alpha: 0.8),
                              ],
                              begin: Alignment.bottomCenter,
                              end: Alignment.topCenter,
                            ),
                          ),
                        ],
                      );
                    }),
                  ),
                  duration: Duration.zero,
                ),
              ),
              const SizedBox(height: AppSpacing.lg),
              Text('Recovery curve', style: FitnessText.title(context).copyWith(fontSize: 18)),
              const SizedBox(height: AppSpacing.sm),
              SizedBox(
                height: 110,
                child: LineChart(
                  LineChartData(
                    minY: 0,
                    maxY: 1,
                    gridData: FlGridData(
                      show: true,
                      drawVerticalLine: false,
                      horizontalInterval: 0.25,
                      getDrawingHorizontalLine: (v) => FlLine(
                        color: AppColors.resolveBorder(context).withValues(alpha: 0.35),
                        strokeWidth: 0.8,
                      ),
                    ),
                    borderData: FlBorderData(show: false),
                    titlesData: const FlTitlesData(show: false),
                    lineBarsData: [
                      LineChartBarData(
                        spots: recoverySpots,
                        isCurved: true,
                        color: AppColors.neonPurple,
                        barWidth: 3,
                        dotData: const FlDotData(show: false),
                        belowBarData: BarAreaData(
                          show: true,
                          gradient: LinearGradient(
                            colors: [
                              AppColors.neonPurple.withValues(alpha: 0.32),
                              AppColors.neonPurple.withValues(alpha: 0),
                            ],
                            begin: Alignment.topCenter,
                            end: Alignment.bottomCenter,
                          ),
                        ),
                      ),
                    ],
                  ),
                  duration: Duration.zero,
                ),
              ),
            ],
          ),
        ),
      ],
    ).animate().fadeIn(duration: 400.ms).slideY(begin: 0.04, end: 0);
  }
}

class _StatPill extends StatelessWidget {
  const _StatPill({required this.label, required this.value, required this.color});

  final String label;
  final String value;
  final Color color;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(999),
        color: color.withValues(alpha: 0.12),
        border: Border.all(color: color.withValues(alpha: 0.35)),
      ),
      child: Row(
        children: [
          Text(label, style: FitnessText.label(context)),
          const SizedBox(width: 6),
          Text(value, style: FitnessText.metric(context, size: 14).copyWith(color: color)),
        ],
      ),
    );
  }
}
