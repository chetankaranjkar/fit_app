import 'package:flutter/cupertino.dart';
import '../../../models/me_models.dart';
import '../../../theme/app_theme.dart';
import '../../../widgets/fitness_text.dart';
import '../../../widgets/glass_card.dart';
import '../diet_assigned_foods.dart';

/// Assigned targets, without a progress ring suggesting consumed calories.
class DietNutritionHero extends StatelessWidget {
  const DietNutritionHero({super.key, required this.plan});
  final MeDietPlan plan;
  @override
  Widget build(BuildContext context) => GlassCard(
          child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(DietCopy.assignedDiet.toUpperCase(),
              style: FitnessText.label(context)),
          const SizedBox(height: AppSpacing.sm),
          Text(plan.planName, style: FitnessText.title(context)),
          if (plan.goalType.isNotEmpty) ...[
            const SizedBox(height: 4),
            Text(plan.goalType, style: FitnessText.body(context)),
          ],
          const SizedBox(height: AppSpacing.lg),
          Text(DietCopy.plannedDailyTarget.toUpperCase(),
              style: FitnessText.label(context)),
          const SizedBox(height: AppSpacing.sm),
          Text('${plan.calories}',
              style: FitnessText.metric(context, size: 30)),
          Text('kcal assigned', style: FitnessText.body(context)),
          const SizedBox(height: AppSpacing.md),
          Wrap(spacing: 16, runSpacing: 8, children: [
            if (plan.proteinGrams != null)
              Text('Protein ${plan.proteinGrams} g',
                  style: FitnessText.chip(context)),
            if (plan.carbsGrams != null)
              Text('Carbs ${plan.carbsGrams} g',
                  style: FitnessText.chip(context)),
            if (plan.fatsGrams != null)
              Text('Fat ${plan.fatsGrams} g', style: FitnessText.chip(context)),
          ]),
        ],
      ));
}
