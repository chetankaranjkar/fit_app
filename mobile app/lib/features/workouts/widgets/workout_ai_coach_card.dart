import 'package:flutter/cupertino.dart';
import 'package:flutter_animate/flutter_animate.dart';

import '../../../theme/app_colors.dart';
import '../../../theme/app_theme.dart';
import '../../../widgets/fitness_text.dart';
import '../../../widgets/glass_card.dart';
import '../workout_tip.dart';

class WorkoutAiCoachCard extends StatelessWidget {
  const WorkoutAiCoachCard({super.key, this.assignedPlanDescription});

  final String? assignedPlanDescription;

  @override
  Widget build(BuildContext context) {
    final tip = WorkoutTip.resolve(assignedPlanDescription);

    return GlassCard(
      radius: 26,
      padding: const EdgeInsets.all(AppSpacing.lg),
      tint: AppColors.neonPurple.withValues(alpha: 0.07),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            width: 46,
            height: 46,
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(16),
              gradient: AppColors.neonGradient,
              boxShadow: AppColors.purpleGlow(opacity: 0.35, blur: 18),
            ),
            child: const Icon(CupertinoIcons.lightbulb, color: CupertinoColors.white),
          ),
          const SizedBox(width: AppSpacing.md),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(tip.title, style: FitnessText.label(context)),
                const SizedBox(height: 2),
                Text(
                  tip.caption,
                  style: FitnessText.chip(context, color: AppColors.neonPurpleLite),
                ),
                const SizedBox(height: 4),
                Text(tip.body, style: FitnessText.body(context)),
              ],
            ),
          ),
        ],
      ),
    ).animate().fadeIn(duration: 380.ms).slideY(begin: 0.03, end: 0);
  }
}
