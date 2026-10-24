import 'package:flutter/cupertino.dart';

import '../../../models/me_models.dart';
import '../../../theme/app_colors.dart';
import '../../../theme/app_theme.dart';
import '../../../widgets/fitness_text.dart';
import '../../../widgets/glass_card.dart';
import '../diet_assigned_foods.dart';

class DietIntelPanelCompact extends StatefulWidget {
  const DietIntelPanelCompact({super.key, required this.plan});

  final MeDietPlan plan;

  @override
  State<DietIntelPanelCompact> createState() => _DietIntelPanelCompactState();
}

class _DietIntelPanelCompactState extends State<DietIntelPanelCompact> {
  final _controller = TextEditingController();
  List<AssignedFoodMatch> _matches = const [];

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  void _onQuery(String value) {
    setState(() => _matches = searchAssignedFoods(widget.plan, value));
  }

  @override
  Widget build(BuildContext context) {
    final query = _controller.text.trim();

    return GlassCard(
      radius: AppRadius.lg,
      padding: const EdgeInsets.all(AppSpacing.md),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(DietCopy.searchAssignedFoods.toUpperCase(),
              style: FitnessText.label(context)),
          const SizedBox(height: 4),
          Text(DietCopy.notLoggedIntake, style: FitnessText.body(context)),
          const SizedBox(height: AppSpacing.sm),
          CupertinoSearchTextField(
            controller: _controller,
            placeholder: 'Search foods on your assigned plan',
            style: FitnessText.body(context),
            onChanged: _onQuery,
            onSubmitted: _onQuery,
          ),
          if (query.isNotEmpty) ...[
            const SizedBox(height: AppSpacing.md),
            if (_matches.isEmpty)
              Text(DietCopy.noAssignedMatch, style: FitnessText.body(context))
            else
              ..._matches.map(
                (m) => Padding(
                  padding: const EdgeInsets.only(bottom: AppSpacing.sm),
                  child: _AssignedFoodResult(match: m),
                ),
              ),
          ],
        ],
      ),
    );
  }
}

class _AssignedFoodResult extends StatelessWidget {
  const _AssignedFoodResult({required this.match});

  final AssignedFoodMatch match;

  @override
  Widget build(BuildContext context) {
    final macros = <String>[];
    if (match.calories != null) macros.add('${match.calories} kcal planned');
    if (match.proteinGrams != null) {
      macros.add('P ${match.proteinGrams!.round()}g');
    }
    if (match.carbsGrams != null) macros.add('C ${match.carbsGrams!.round()}g');
    if (match.fatsGrams != null) macros.add('F ${match.fatsGrams!.round()}g');

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(match.foodName,
            style: FitnessText.title(context).copyWith(fontSize: 15)),
        Text(
          '${match.mealName}${match.quantity.isNotEmpty ? ' · ${match.quantity}' : ''}',
          style: FitnessText.body(context),
        ),
        if (macros.isNotEmpty)
          Text(macros.join(' · '),
              style: FitnessText.chip(context, color: AppColors.accent)),
      ],
    );
  }
}
