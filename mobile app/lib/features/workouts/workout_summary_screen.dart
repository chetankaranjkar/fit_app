import 'package:flutter/cupertino.dart';
import 'package:flutter/services.dart';
import 'package:go_router/go_router.dart';

import '../../models/me_models.dart';
import '../../theme/app_colors.dart';
import '../../theme/app_theme.dart';
import '../../widgets/fitness_text.dart';
import '../../widgets/glass_card.dart';
import '../../widgets/premium_background.dart';
import '../shell/shell_layout_metrics.dart';

class WorkoutSummaryScreen extends StatelessWidget {
  const WorkoutSummaryScreen({
    super.key,
    required this.plan,
    required this.summary,
  });

  final MeWorkoutPlanSummary plan;
  final WorkoutFlowSummary summary;

  String _formatDuration(int seconds) {
    if (seconds <= 0) return '—';
    final mins = (seconds / 60).ceil();
    return '$mins min';
  }

  @override
  Widget build(BuildContext context) {
    return CupertinoPageScaffold(
      backgroundColor: AppColors.resolveBg(context),
      child: Stack(
        children: [
          const Positioned.fill(child: PremiumBackground()),
          SafeArea(
            child: Padding(
              padding: const EdgeInsets.all(ShellLayoutMetrics.horizontalInset),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text('WORKOUT COMPLETE', style: FitnessText.label(context)),
                  const SizedBox(height: AppSpacing.sm),
                  Text(plan.planName, style: FitnessText.title(context)),
                  const SizedBox(height: AppSpacing.lg),
                  GlassCard(
                    child: Column(
                      children: [
                        _StatRow(label: 'Warmups completed', value: '${summary.warmupsCompleted}'),
                        const SizedBox(height: AppSpacing.sm),
                        _StatRow(label: 'Exercises completed', value: '${summary.exercisesCompleted}'),
                        const SizedBox(height: AppSpacing.sm),
                        _StatRow(label: 'Stretches completed', value: '${summary.stretchesCompleted}'),
                        const SizedBox(height: AppSpacing.sm),
                        _StatRow(label: 'Duration', value: _formatDuration(summary.durationSeconds)),
                        if (summary.estimatedCalories != null) ...[
                          const SizedBox(height: AppSpacing.sm),
                          _StatRow(label: 'Calories (est.)', value: '${summary.estimatedCalories}'),
                        ],
                      ],
                    ),
                  ),
                  const Spacer(),
                  SizedBox(
                    width: double.infinity,
                    child: CupertinoButton.filled(
                      onPressed: () {
                        HapticFeedback.mediumImpact();
                        context.go('/workouts');
                      },
                      child: const Text('Finish'),
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

class _StatRow extends StatelessWidget {
  const _StatRow({required this.label, required this.value});

  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(label, style: FitnessText.body(context)),
        Text(value, style: FitnessText.chip(context)),
      ],
    );
  }
}
