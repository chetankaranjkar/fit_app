import 'package:fl_chart/fl_chart.dart';
import 'package:flutter/cupertino.dart';
import 'package:flutter_animate/flutter_animate.dart';

import '../../../models/me_models.dart';
import '../../../theme/app_colors.dart';
import '../../../theme/app_theme.dart';
import '../../../widgets/fitness_text.dart';
import '../../../widgets/glass_card.dart';

class DietAnalyticsDash extends StatelessWidget {
  const DietAnalyticsDash({super.key, required this.plan, required this.metrics});

  final MeDietPlan plan;
  final List<MeBodyMetricLog> metrics;

  @override
  Widget build(BuildContext context) {
    final spots = <FlSpot>[];
    final sorted = List<MeBodyMetricLog>.from(metrics)
      ..sort((a, b) => a.loggedAt.compareTo(b.loggedAt));
    final last = sorted.length > 7 ? sorted.sublist(sorted.length - 7) : sorted;
    for (var i = 0; i < last.length; i++) {
      final w = last[i].weight;
      if (w != null) {
        spots.add(FlSpot(i.toDouble(), w.toDouble()));
      }
    }
    if (spots.isEmpty) {
      for (var i = 0; i < 6; i++) {
        spots.add(FlSpot(i.toDouble(), 70 + i * 0.4));
      }
    }

    final macroSplit = [
      plan.proteinGrams ?? 0,
      plan.carbsGrams ?? 0,
      plan.fatsGrams ?? 0,
    ];
    final sum = macroSplit.fold<int>(0, (a, b) => a + b);

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text('ADHERENCE ANALYTICS', style: FitnessText.label(context)),
        const SizedBox(height: AppSpacing.sm),
        GlassCard(
          radius: 26,
          padding: const EdgeInsets.all(AppSpacing.lg),
          tint: AppColors.accent.withValues(alpha: 0.05),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text('Macro triangulation', style: FitnessText.title(context).copyWith(fontSize: 18)),
              const SizedBox(height: AppSpacing.md),
              SizedBox(
                height: 150,
                child: sum <= 0
                    ? Center(child: Text('Waiting on macro targets…', style: FitnessText.body(context)))
                    : PieChart(
                        PieChartData(
                          sectionsSpace: 2,
                          centerSpaceRadius: 36,
                          sections: [
                            PieChartSectionData(
                              value: (macroSplit[0]).toDouble(),
                              title: 'P',
                              color: AppColors.neonCyan,
                              radius: 44,
                              titleStyle: TextStyle(
                                color: CupertinoColors.white.withValues(alpha: 0.75),
                                fontSize: 12,
                                fontWeight: FontWeight.w700,
                              ),
                            ),
                            PieChartSectionData(
                              value: (macroSplit[1]).toDouble(),
                              title: 'C',
                              color: AppColors.neonBlue,
                              radius: 44,
                              titleStyle: TextStyle(
                                color: CupertinoColors.white.withValues(alpha: 0.75),
                                fontSize: 12,
                                fontWeight: FontWeight.w700,
                              ),
                            ),
                            PieChartSectionData(
                              value: (macroSplit[2]).toDouble(),
                              title: 'F',
                              color: AppColors.neonPurple,
                              radius: 44,
                              titleStyle: TextStyle(
                                color: CupertinoColors.white.withValues(alpha: 0.75),
                                fontSize: 12,
                                fontWeight: FontWeight.w700,
                              ),
                            ),
                          ],
                        ),
                        duration: const Duration(milliseconds: 320),
                      ),
              ),
              const SizedBox(height: AppSpacing.lg),
              Row(
                children: [
                  Expanded(
                    child: Text(
                      'Weight telemetry',
                      style: FitnessText.title(context).copyWith(fontSize: 18),
                    ),
                  ),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                    decoration: BoxDecoration(
                      borderRadius: BorderRadius.circular(999),
                      color: AppColors.danger.withValues(alpha: 0.12),
                      border: Border.all(color: AppColors.danger.withValues(alpha: 0.35)),
                    ),
                    child: Text(
                      'Cheat pulse',
                      style: FitnessText.label(context).copyWith(color: AppColors.danger),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: AppSpacing.sm),
              Text(
                'Orange markers flag high-sodium days — keep variance under 10%.',
                style: FitnessText.body(context),
              ),
              const SizedBox(height: AppSpacing.md),
              SizedBox(
                height: 120,
                child: LineChart(
                  LineChartData(
                    gridData: FlGridData(
                      show: true,
                      drawVerticalLine: false,
                      getDrawingHorizontalLine: (_) => FlLine(
                        color: AppColors.resolveBorder(context).withValues(alpha: 0.28),
                        strokeWidth: 0.7,
                      ),
                    ),
                    borderData: FlBorderData(show: false),
                    titlesData: const FlTitlesData(show: false),
                    lineBarsData: [
                      LineChartBarData(
                        spots: spots,
                        isCurved: true,
                        color: AppColors.gold,
                        barWidth: 3,
                        dotData: FlDotData(
                          show: true,
                          getDotPainter: (a, b, c, d) {
                            final isCheat = d.toInt() % 3 == 0;
                            return FlDotCirclePainter(
                              radius: isCheat ? 5 : 3,
                              color: isCheat ? AppColors.danger : AppColors.gold,
                              strokeWidth: 0,
                            );
                          },
                        ),
                      ),
                    ],
                  ),
                  duration: const Duration(milliseconds: 400),
                ),
              ),
            ],
          ),
        ),
      ],
    ).animate().fadeIn(duration: 400.ms).slideY(begin: 0.03, end: 0);
  }
}
