import 'package:flutter/cupertino.dart';
import 'package:flutter_animate/flutter_animate.dart';

import '../../../theme/app_colors.dart';
import '../../../theme/app_theme.dart';
import '../../../widgets/fitness_text.dart';
import '../../../widgets/glass_card.dart';

class WorkoutAiCoachCard extends StatelessWidget {
  const WorkoutAiCoachCard({super.key});

  @override
  Widget build(BuildContext context) {
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
            child: const Icon(CupertinoIcons.sparkles, color: CupertinoColors.white),
          ),
          const SizedBox(width: AppSpacing.md),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('NEURAL COACH', style: FitnessText.label(context)),
                const SizedBox(height: 4),
                Text(
                  'Prime intent: controlled tempo on eccentric phases. '
                  'If RPE stays under 7 by set 3, add 2.5% load next week.',
                  style: FitnessText.body(context),
                ),
              ],
            ),
          ),
        ],
      ),
    ).animate().fadeIn(duration: 380.ms).slideY(begin: 0.03, end: 0);
  }
}
