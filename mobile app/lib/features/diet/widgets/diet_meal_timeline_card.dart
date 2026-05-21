import 'package:flutter/cupertino.dart';
import 'package:flutter_animate/flutter_animate.dart';

import '../../../models/me_models.dart';
import '../../../theme/app_colors.dart';
import '../../../theme/app_theme.dart';
import '../../../widgets/fitness_text.dart';
import '../../../widgets/glass_card.dart';

class DietMealTimelineCard extends StatefulWidget {
  const DietMealTimelineCard({super.key, required this.meal, required this.index});

  final MeDietMeal meal;
  final int index;

  @override
  State<DietMealTimelineCard> createState() => _DietMealTimelineCardState();
}

class _DietMealTimelineCardState extends State<DietMealTimelineCard> {
  bool _open = false;
  bool _done = false;

  @override
  Widget build(BuildContext context) {
    final meal = widget.meal;
    final kcal = meal.items.fold<int>(0, (a, b) => a + (b.calories ?? 0));

    return Dismissible(
      key: ValueKey('meal-${meal.id}'),
      direction: DismissDirection.endToStart,
      confirmDismiss: (_) async {
        setState(() => _done = true);
        return false;
      },
      background: Container(
        alignment: Alignment.centerRight,
        padding: const EdgeInsets.only(right: AppSpacing.lg),
        margin: const EdgeInsets.only(bottom: AppSpacing.sm),
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(26),
          gradient: LinearGradient(
            colors: [
              AppColors.success.withValues(alpha: 0.05),
              AppColors.success.withValues(alpha: 0.35),
            ],
          ),
        ),
        child: Text(
          'Logged ✓',
          style: FitnessText.chip(context, color: CupertinoColors.white),
        ),
      ),
      child: Opacity(
        opacity: _done ? 0.45 : 1,
        child: GlassCard(
          radius: 26,
          padding: const EdgeInsets.all(AppSpacing.md),
          tint: AppColors.neonPurple.withValues(alpha: 0.05),
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
                      gradient: AppColors.neonGradient,
                    ),
                    child: Text(
                      '${widget.index + 1}',
                      style: FitnessText.metric(context, size: 16).copyWith(color: CupertinoColors.white),
                    ),
                  ),
                  const SizedBox(width: AppSpacing.md),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(meal.mealName, style: FitnessText.title(context)),
                        Text(
                          '$kcal kcal • macro-balanced',
                          style: FitnessText.body(context),
                        ),
                      ],
                    ),
                  ),
                  CupertinoButton(
                    padding: EdgeInsets.zero,
                    onPressed: () => setState(() => _open = !_open),
                    child: Icon(
                      _open ? CupertinoIcons.chevron_up : CupertinoIcons.chevron_down,
                      color: AppColors.resolveTextSecondary(context),
                    ),
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
                        Text('No foods listed.', style: FitnessText.body(context))
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
                                      Text(it.foodName, style: FitnessText.title(context).copyWith(fontSize: 15)),
                                      if (it.quantity.isNotEmpty)
                                        Text(it.quantity, style: FitnessText.body(context)),
                                    ],
                                  ),
                                ),
                                if (it.calories != null)
                                  Text('${it.calories}', style: FitnessText.chip(context, color: AppColors.accent)),
                              ],
                            ),
                          ),
                        ),
                      const SizedBox(height: AppSpacing.sm),
                      Row(
                        children: [
                          _MiniMacro('P', itProtein(meal), AppColors.neonCyan),
                          const SizedBox(width: 6),
                          _MiniMacro('C', itCarbs(meal), AppColors.neonBlueLite),
                          const SizedBox(width: 6),
                          _MiniMacro('F', itFats(meal), AppColors.neonPurpleLite),
                        ],
                      ),
                    ],
                  ),
                ),
                crossFadeState: _open ? CrossFadeState.showSecond : CrossFadeState.showFirst,
                duration: const Duration(milliseconds: 260),
              ),
            ],
          ),
        ),
      ),
    ).animate(delay: (widget.index * 40).ms).fadeIn(duration: 320.ms).slideX(begin: 0.03, end: 0);
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
        '$tag ${val}g',
        style: FitnessText.label(context).copyWith(color: color),
      ),
    );
  }
}
