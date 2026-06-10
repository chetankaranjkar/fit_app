import 'package:flutter/cupertino.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../models/me_models.dart';
import '../../theme/app_colors.dart';
import '../../theme/app_theme.dart';
import '../../widgets/fitness_text.dart';
import '../../widgets/glass_card.dart';
import '../../widgets/premium_background.dart';
import '../shell/shell_layout_metrics.dart';
import 'mobility_flow_screen.dart';
import 'workout_session_launcher.dart';

class WorkoutOverviewScreen extends ConsumerWidget {
  const WorkoutOverviewScreen({
    super.key,
    required this.plan,
    required this.template,
  });

  final MeWorkoutPlanSummary plan;
  final MeWorkoutSessionTemplate template;

  String _formatDuration(int? seconds) {
    if (seconds == null || seconds <= 0) return '—';
    final mins = (seconds / 60).ceil();
    return '$mins min';
  }

  Future<void> _start(BuildContext context, WidgetRef ref) async {
    HapticFeedback.mediumImpact();
    if (template.warmups.isNotEmpty) {
      context.push(
        '/workouts/${plan.id}/mobility',
        extra: {
          'plan': plan,
          'template': template,
          'phase': MobilityPhase.warmup,
        },
      );
      return;
    }
    await launchLiveWorkoutSession(context, ref, plan: plan, template: template);
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final warmupCount = template.warmups.isNotEmpty ? template.warmups.length : plan.warmupCount;
    final stretchCount = template.stretches.isNotEmpty ? template.stretches.length : plan.stretchCount;
    final exerciseCount = template.exercises.length;
    final estDuration = template.estimatedDurationSeconds ?? plan.estimatedDurationSeconds;

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
                  Text('WORKOUT OVERVIEW', style: FitnessText.label(context)),
                  const SizedBox(height: AppSpacing.sm),
                  Text(plan.planName, style: FitnessText.title(context)),
                  if (template.workoutCategoryName != null || plan.workoutCategoryName != null) ...[
                    const SizedBox(height: AppSpacing.xs),
                    Text(
                      template.workoutCategoryName ?? plan.workoutCategoryName!,
                      style: FitnessText.body(context),
                    ),
                  ],
                  const SizedBox(height: AppSpacing.lg),
                  GlassCard(
                    child: Column(
                      children: [
                        _StatRow(label: 'Warmups', value: '$warmupCount'),
                        const SizedBox(height: AppSpacing.sm),
                        _StatRow(label: 'Exercises', value: '$exerciseCount'),
                        const SizedBox(height: AppSpacing.sm),
                        _StatRow(label: 'Stretches', value: '$stretchCount'),
                        const SizedBox(height: AppSpacing.sm),
                        _StatRow(label: 'Estimated duration', value: _formatDuration(estDuration)),
                      ],
                    ),
                  ),
                  const Spacer(),
                  SizedBox(
                    width: double.infinity,
                    child: CupertinoButton.filled(
                      onPressed: () => _start(context, ref),
                      child: const Text('Start workout'),
                    ),
                  ),
                  CupertinoButton(
                    onPressed: () => context.pop(),
                    child: const Text('Back'),
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
