import 'package:flutter/cupertino.dart';
import '../../../theme/app_a11y.dart';

import '../../../models/me_models.dart';
import '../../../theme/app_colors.dart';
import '../../../theme/app_theme.dart';
import '../../../widgets/app_icon_button.dart';
import '../../../widgets/fitness_text.dart';
import '../../../widgets/glass_card.dart';

class DietMealTimelineCard extends StatefulWidget {
  const DietMealTimelineCard(
      {super.key, required this.meal, required this.index});

  final MeDietMeal meal;
  final int index;

  @override
  State<DietMealTimelineCard> createState() => _DietMealTimelineCardState();
}

class _DietMealTimelineCardState extends State<DietMealTimelineCard> {
  bool _open = false;

  @override
  Widget build(BuildContext context) {
    final meal = widget.meal;
    final kcal = meal.items.fold<int>(0, (a, b) => a + (b.calories ?? 0));
    final plannedLine = kcal > 0 ? 'Planned $kcal kcal' : 'Assigned meal';

    return GlassCard(
      radius: AppRadius.lg,
      padding: const EdgeInsets.all(AppSpacing.md),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                width: 42,
                height: 42,
                alignment: Alignment.center,
                decoration: BoxDecoration(
                  borderRadius: BorderRadius.circular(16),
                  color: AppColors.accent.withValues(alpha: 0.12),
                ),
                child: Text(
                  '${widget.index + 1}',
                  style: FitnessText.metric(context, size: 16)
                      .copyWith(color: AppColors.accent),
                ),
              ),
              const SizedBox(width: AppSpacing.md),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(meal.mealName, style: FitnessText.title(context)),
                    Text(plannedLine, style: FitnessText.body(context)),
                    if (meal.items.isNotEmpty)
                      Text(meal.items.map((item) => item.foodName).join(', '),
                          style: FitnessText.body(context)),
                  ],
                ),
              ),
              AppIconButton(
                icon: _open
                    ? CupertinoIcons.chevron_up
                    : CupertinoIcons.chevron_down,
                semanticLabel: _open ? 'Hide meal foods' : 'Show meal foods',
                onPressed: () => setState(() => _open = !_open),
                color: AppColors.resolveTextSecondary(context),
              ),
            ],
          ),
          AnimatedCrossFade(
            firstChild: const SizedBox.shrink(),
            secondChild: Padding(
              padding: const EdgeInsets.only(top: AppSpacing.md),
              child: Column(
                children: [
                  if (meal.items.isEmpty)
                    Text('No foods listed on this assigned meal.',
                        style: FitnessText.body(context))
                  else
                    ...meal.items.map(
                      (it) => Padding(
                        padding: const EdgeInsets.only(bottom: AppSpacing.sm),
                        child: Row(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(it.foodName,
                                      style: FitnessText.title(context)
                                          .copyWith(fontSize: 15)),
                                  if (it.quantity.isNotEmpty)
                                    Text(it.quantity,
                                        style: FitnessText.body(context)),
                                ],
                              ),
                            ),
                            if (it.calories != null)
                              Text(
                                '${it.calories} planned',
                                style: FitnessText.chip(context,
                                    color: AppColors.accent),
                              ),
                          ],
                        ),
                      ),
                    ),
                  const SizedBox(height: AppSpacing.sm),
                  Wrap(
                    spacing: 6,
                    runSpacing: 6,
                    children: [
                      _MiniMacro('P', itProtein(meal), AppColors.neonCyan),
                      _MiniMacro('C', itCarbs(meal), AppColors.neonBlueLite),
                      _MiniMacro('F', itFats(meal), AppColors.neonPurpleLite),
                    ],
                  ),
                ],
              ),
            ),
            crossFadeState:
                _open ? CrossFadeState.showSecond : CrossFadeState.showFirst,
            duration:
                AppA11y.motion(context, const Duration(milliseconds: 260)),
          ),
        ],
      ),
    );
  }

  static int itProtein(MeDietMeal m) =>
      m.items.fold<int>(0, (a, b) => a + (b.proteinGrams?.round() ?? 0));

  static int itCarbs(MeDietMeal m) =>
      m.items.fold<int>(0, (a, b) => a + (b.carbsGrams?.round() ?? 0));

  static int itFats(MeDietMeal m) =>
      m.items.fold<int>(0, (a, b) => a + (b.fatsGrams?.round() ?? 0));
}

class _MiniMacro extends StatelessWidget {
  const _MiniMacro(this.tag, this.val, this.color);

  final String tag;
  final int val;
  final Color color;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(999),
        color: color.withValues(alpha: 0.12),
        border: Border.all(color: color.withValues(alpha: 0.35)),
      ),
      child: Text(
        '$tag ${val}g planned',
        style: FitnessText.label(context).copyWith(color: color),
      ),
    );
  }
}
