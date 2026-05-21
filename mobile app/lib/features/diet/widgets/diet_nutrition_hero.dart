import 'dart:math' as math;

import 'package:flutter/cupertino.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:percent_indicator/circular_percent_indicator.dart';

import '../../../models/me_models.dart';
import '../../../theme/app_colors.dart';
import '../../../theme/app_theme.dart';
import '../../../widgets/fitness_text.dart';
import '../../../widgets/glass_card.dart';

class DietNutritionHero extends StatelessWidget {
  const DietNutritionHero({super.key, required this.plan});

  final MeDietPlan plan;

  int _score() {
    var s = 72;
    if (plan.proteinGrams != null && plan.proteinGrams! > 0) s += 8;
    if (plan.carbsGrams != null && plan.carbsGrams! > 0) s += 8;
    if (plan.fatsGrams != null && plan.fatsGrams! > 0) s += 6;
    return math.min(98, s);
  }

  @override
  Widget build(BuildContext context) {
    final score = _score() / 100.0;
    final p = plan.proteinGrams ?? 0;
    final c = plan.carbsGrams ?? 0;
    final f = plan.fatsGrams ?? 0;
    final totalMacro = math.max(1, p + c + f);
    final pPct = p / totalMacro;
    final cPct = c / totalMacro;
    final fPct = f / totalMacro;

    return GlassCard(
      radius: 28,
      padding: const EdgeInsets.all(AppSpacing.lg),
      tint: AppColors.neonCyan.withValues(alpha: 0.05),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text('NUTRITION OS', style: FitnessText.label(context)),
                    const SizedBox(height: 4),
                    Text(
                      plan.planName,
                      style: FitnessText.display(context, size: 24),
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                    ),
                    const SizedBox(height: 4),
                    Text(
                      plan.goalType,
                      style: FitnessText.body(context),
                    ),
                  ],
                ),
              ),
              CircularPercentIndicator(
                radius: 40,
                lineWidth: 6,
                percent: score.clamp(0.0, 1.0),
                animation: true,
                circularStrokeCap: CircularStrokeCap.round,
                backgroundColor: CupertinoColors.white.withValues(alpha: 0.08),
                linearGradient: const LinearGradient(
                  colors: [AppColors.neonCyan, AppColors.neonBlue, AppColors.neonPurple],
                ),
                center: Text(
                  '${(score * 100).round()}',
                  style: FitnessText.metric(context, size: 15),
                ),
              ).animate().scale(begin: const Offset(0.9, 0.9), curve: Curves.easeOutBack),
            ],
          ),
          const SizedBox(height: AppSpacing.lg),
          _MacroRingRow(
            label: 'Calories',
            value: '${plan.calories}',
            sub: 'kcal target',
            percent: 1.0,
            colors: const [AppColors.accent, AppColors.gold],
          ),
          const SizedBox(height: AppSpacing.md),
          if (p + c + f > 0) ...[
            _MacroBar(label: 'Protein', grams: p, pct: pPct, color: AppColors.neonCyan),
            const SizedBox(height: AppSpacing.sm),
            _MacroBar(label: 'Carbs', grams: c, pct: cPct, color: AppColors.neonBlueLite),
            const SizedBox(height: AppSpacing.sm),
            _MacroBar(label: 'Fats', grams: f, pct: fPct, color: AppColors.neonPurpleLite),
          ],
        ],
      ),
    ).animate().fadeIn(duration: 380.ms).slideY(begin: 0.04, end: 0);
  }
}

class _MacroRingRow extends StatelessWidget {
  const _MacroRingRow({
    required this.label,
    required this.value,
    required this.sub,
    required this.percent,
    required this.colors,
  });

  final String label;
  final String value;
  final String sub;
  final double percent;
  final List<Color> colors;

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        CircularPercentIndicator(
          radius: 32,
          lineWidth: 5,
          percent: percent.clamp(0.0, 1.0),
          animation: true,
          circularStrokeCap: CircularStrokeCap.round,
          backgroundColor: CupertinoColors.white.withValues(alpha: 0.06),
          linearGradient: LinearGradient(colors: colors),
          center: Icon(CupertinoIcons.flame_fill, size: 18, color: colors.first),
        ),
        const SizedBox(width: AppSpacing.md),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(label.toUpperCase(), style: FitnessText.label(context)),
              Text(
                value,
                style: FitnessText.metric(context, size: 26),
              ),
              Text(sub, style: FitnessText.body(context)),
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
            Text(label, style: FitnessText.chip(context)),
            const Spacer(),
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
                    boxShadow: [
                      BoxShadow(color: color.withValues(alpha: 0.35), blurRadius: 12),
                    ],
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
