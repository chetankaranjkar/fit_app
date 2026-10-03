import 'dart:math' as math;

import 'package:flutter/cupertino.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:percent_indicator/circular_percent_indicator.dart';

import '../../../models/me_models.dart';
import '../../../theme/app_a11y.dart';
import '../../../theme/app_colors.dart';
import '../../../theme/app_theme.dart';
import '../../../widgets/fitness_text.dart';
import '../../../widgets/glass_card.dart';
import '../diet_assigned_foods.dart';

class DietNutritionHero extends StatelessWidget {
  const DietNutritionHero({super.key, required this.plan});

  final MeDietPlan plan;

  @override
  Widget build(BuildContext context) {
    final p = plan.proteinGrams ?? 0;
    final c = plan.carbsGrams ?? 0;
    final f = plan.fatsGrams ?? 0;
    final totalMacro = math.max(1, p + c + f);
    final pPct = p / totalMacro;
    final cPct = c / totalMacro;
    final fPct = f / totalMacro;

    final card = GlassCard(
      radius: 28,
      padding: const EdgeInsets.all(AppSpacing.lg),
      tint: AppColors.neonCyan.withValues(alpha: 0.05),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(DietCopy.assignedDiet.toUpperCase(), style: FitnessText.label(context)),
          const SizedBox(height: 4),
          Text(
            plan.planName,
            style: FitnessText.display(context, size: 24),
          ),
          const SizedBox(height: 4),
          Text(plan.goalType, style: FitnessText.body(context)),
          const SizedBox(height: AppSpacing.lg),
          _PlannedCalorieRow(calories: plan.calories),
          const SizedBox(height: AppSpacing.md),
          if (p + c + f > 0) ...[
            _MacroBar(label: 'Protein (planned)', grams: p, pct: pPct, color: AppColors.neonCyan),
            const SizedBox(height: AppSpacing.sm),
            _MacroBar(label: 'Carbs (planned)', grams: c, pct: cPct, color: AppColors.neonBlueLite),
            const SizedBox(height: AppSpacing.sm),
            _MacroBar(label: 'Fats (planned)', grams: f, pct: fPct, color: AppColors.neonPurpleLite),
          ],
        ],
      ),
    );
    return AppA11y.maybeAnimate(
      context,
      card,
      (w) => w.animate().fadeIn(duration: 380.ms).slideY(begin: 0.04, end: 0),
    );
  }
}

class _PlannedCalorieRow extends StatelessWidget {
  const _PlannedCalorieRow({required this.calories});

  final int calories;

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        CircularPercentIndicator(
          radius: 32,
          lineWidth: 5,
          percent: 1.0,
                      animation: !AppA11y.reduceMotion(context),
          circularStrokeCap: CircularStrokeCap.round,
          backgroundColor: CupertinoColors.white.withValues(alpha: 0.06),
          linearGradient: const LinearGradient(colors: [AppColors.accent, AppColors.gold]),
          center: const Icon(CupertinoIcons.flame_fill, size: 18, color: AppColors.accent),
        ),
        const SizedBox(width: AppSpacing.md),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(DietCopy.plannedDailyTarget.toUpperCase(), style: FitnessText.label(context)),
              Text('$calories', style: FitnessText.metric(context, size: 26)),
              Text('kcal assigned', style: FitnessText.body(context)),
            ],
          ),
        ),
      ],
    );
  }
}

class _MacroBar extends StatelessWidget {
  const _MacroBar({
    required this.label,
    required this.grams,
    required this.pct,
    required this.color,
  });

  final String label;
  final int grams;
  final double pct;
  final Color color;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            Expanded(child: Text(label, style: FitnessText.chip(context))),
            const SizedBox(width: 8),
            Text('$grams g', style: FitnessText.chip(context, color: color)),
          ],
        ),
        const SizedBox(height: 4),
        ClipRRect(
          borderRadius: BorderRadius.circular(999),
          child: Stack(
            children: [
              Container(
                height: 10,
                color: CupertinoColors.white.withValues(alpha: 0.06),
              ),
              FractionallySizedBox(
                widthFactor: pct.clamp(0.05, 1.0),
                child: Container(
                  height: 10,
                  decoration: BoxDecoration(
                    gradient: LinearGradient(colors: [color, color.withValues(alpha: 0.55)]),
                  ),
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }
}
