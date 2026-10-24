import 'package:flutter/cupertino.dart';
import '../../../theme/app_colors.dart';
import '../../../theme/app_theme.dart';
import '../../../widgets/fitness_text.dart';
import '../../../widgets/glass_card.dart';

/// Compact daily water log, backed by the existing per-member local store.
class DietWaterLab extends StatelessWidget {
  const DietWaterLab(
      {super.key,
      required this.goalMl,
      required this.recordedMl,
      required this.onAdd,
      required this.onUndo,
      required this.canUndo});
  final int goalMl;
  final int recordedMl;
  final ValueChanged<int> onAdd;
  final VoidCallback onUndo;
  final bool canUndo;
  @override
  Widget build(BuildContext context) {
    final progress = goalMl <= 0 ? 0.0 : (recordedMl / goalMl).clamp(0.0, 1.0);
    return GlassCard(
        child:
            Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
      Text('Water today', style: FitnessText.title(context)),
      const SizedBox(height: AppSpacing.sm),
      Text('$recordedMl / $goalMl ml',
          style: FitnessText.metric(context, size: 24)),
      const SizedBox(height: AppSpacing.md),
      Semantics(
        label: 'Recorded water',
        value: '$recordedMl of $goalMl milliliters',
        child: ClipRRect(
          borderRadius: BorderRadius.circular(8),
          child: SizedBox(
              height: 8,
              child: ColoredBox(
                color: AppColors.resolveSurfaceAlt(context),
                child: Align(
                    alignment: Alignment.centerLeft,
                    child: FractionallySizedBox(
                        widthFactor: progress,
                        child: const ColoredBox(
                            color: AppColors.accent,
                            child: SizedBox.expand()))),
              )),
        ),
      ),
      const SizedBox(height: AppSpacing.md),
      Wrap(spacing: 8, runSpacing: 8, children: [
        for (final ml in [250, 500, 750])
          Semantics(
            label: 'Add $ml milliliters',
            button: true,
            child: CupertinoButton(
              color: ml == 250
                  ? AppColors.accent
                  : AppColors.resolveSurfaceAlt(context),
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
              onPressed: () => onAdd(ml),
              child: Text('+$ml ml',
                  style: FitnessText.chip(context,
                      color: ml == 250
                          ? CupertinoColors.white
                          : AppColors.resolveText(context))),
            ),
          ),
        CupertinoButton(
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
            onPressed: canUndo ? onUndo : null,
            child: const Text('Undo')),
      ]),
      const SizedBox(height: AppSpacing.sm),
      Text('Estimated daily goal · intake saved on this device',
          style: FitnessText.label(context)),
    ]));
  }
}
