import 'package:fl_chart/fl_chart.dart';
import 'package:flutter/cupertino.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';

import '../../../providers/workout_tracking_providers.dart';
import '../../../theme/app_colors.dart';
import '../../../theme/app_theme.dart';
import '../../../widgets/fitness_text.dart';

class ExerciseHistorySheet extends ConsumerWidget {
  const ExerciseHistorySheet({
    super.key,
    required this.memberId,
    required this.exerciseId,
    required this.exerciseName,
  });

  final int memberId;
  final int exerciseId;
  final String exerciseName;

  static Future<void> show(
    BuildContext context, {
    required int memberId,
    required int exerciseId,
    required String exerciseName,
  }) {
    return showCupertinoModalPopup<void>(
      context: context,
      builder: (ctx) => ExerciseHistorySheet(
        memberId: memberId,
        exerciseId: exerciseId,
        exerciseName: exerciseName,
      ),
    );
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final history = ref.watch(exerciseHistoryProvider((memberId, exerciseId)));
    final bottom = MediaQuery.paddingOf(context).bottom;

    return Container(
      constraints: BoxConstraints(
        maxHeight: MediaQuery.sizeOf(context).height * 0.85,
      ),
      decoration: BoxDecoration(
        color: AppColors.resolveBg(context),
        borderRadius: const BorderRadius.vertical(top: Radius.circular(20)),
        border: Border.all(color: AppColors.borderDark.withValues(alpha: 0.5)),
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          const SizedBox(height: 8),
          Container(
            width: 40,
            height: 4,
            decoration: BoxDecoration(
              color: AppColors.resolveTextSecondary(context).withValues(alpha: 0.4),
              borderRadius: BorderRadius.circular(2),
            ),
          ),
          Padding(
            padding: const EdgeInsets.fromLTRB(AppSpacing.lg, AppSpacing.md, AppSpacing.lg, AppSpacing.sm),
            child: Row(
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(exerciseName, style: FitnessText.title(context)),
                      Text('History', style: FitnessText.label(context)),
                    ],
                  ),
                ),
                CupertinoButton(
                  padding: EdgeInsets.zero,
                  onPressed: () => Navigator.of(context).pop(),
                  child: const Text('Close'),
                ),
              ],
            ),
          ),
          Flexible(
            child: history.when(
              loading: () => const Padding(
                padding: EdgeInsets.all(48),
                child: Center(child: CupertinoActivityIndicator()),
              ),
              error: (e, _) => Padding(
                padding: const EdgeInsets.all(AppSpacing.lg),
                child: Text(e.toString(), style: FitnessText.body(context)),
              ),
              data: (h) {
                final entries = h.entries;
                final chartSpots = entries.reversed
                    .take(12)
                    .toList()
                    .asMap()
                    .entries
                    .map((e) => FlSpot(e.key.toDouble(), e.value.volume))
                    .toList();

                return ListView(
                  padding: EdgeInsets.fromLTRB(
                    AppSpacing.lg,
                    0,
                    AppSpacing.lg,
                    bottom + AppSpacing.lg,
                  ),
                  shrinkWrap: true,
                  children: [
                    if (h.bestVolume != null)
                      Text(
                        'Best: ${h.bestWeight ?? '—'} kg × ${h.bestReps ?? '—'} (${h.bestVolume!.round()} vol)',
                        style: FitnessText.chip(context, color: AppColors.accent),
                      ),
                    if (chartSpots.length > 1) ...[
                      const SizedBox(height: AppSpacing.md),
                      SizedBox(
                        height: 140,
                        child: LineChart(
                          LineChartData(
                            gridData: const FlGridData(show: false),
                            titlesData: const FlTitlesData(show: false),
                            borderData: FlBorderData(show: false),
                            lineBarsData: [
                              LineChartBarData(
                                spots: chartSpots,
                                isCurved: true,
                                color: AppColors.neonCyan,
                                barWidth: 2.5,
                                dotData: const FlDotData(show: false),
                                belowBarData: BarAreaData(
                                  show: true,
                                  color: AppColors.neonCyan.withValues(alpha: 0.15),
                                ),
                              ),
                            ],
                          ),
                        ),
                      ),
                    ],
                    const SizedBox(height: AppSpacing.md),
                    for (final e in entries)
                      Container(
                        margin: const EdgeInsets.only(bottom: AppSpacing.sm),
                        padding: const EdgeInsets.all(AppSpacing.md),
                        decoration: BoxDecoration(
                          borderRadius: BorderRadius.circular(12),
                          border: Border.all(color: AppColors.borderDark.withValues(alpha: 0.4)),
                        ),
                        child: Row(
                          children: [
                            Expanded(
                              child: Text(
                                DateFormat.yMMMd().format(e.workoutDateUtc.toLocal()),
                                style: FitnessText.body(context),
                              ),
                            ),
                            Text(
                              'Set ${e.setNumber}',
                              style: FitnessText.label(context),
                            ),
                            const SizedBox(width: 8),
                            Text(
                              '${e.weight ?? '—'} × ${e.reps ?? '—'}',
                              style: FitnessText.chip(context),
                            ),
                            if (e.isPersonalRecord)
                              Padding(
                                padding: const EdgeInsets.only(left: 6),
                                child: Text(
                                  'PR',
                                  style: FitnessText.label(context, color: AppColors.accent)
                                      .copyWith(fontWeight: FontWeight.w800),
                                ),
                              ),
                          ],
                        ),
                      ),
                    if (entries.isEmpty)
                      Padding(
                        padding: const EdgeInsets.all(AppSpacing.xl),
                        child: Text(
                          'No logged sets yet.',
                          style: FitnessText.body(context),
                          textAlign: TextAlign.center,
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
