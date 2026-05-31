import 'package:flutter/cupertino.dart';

import '../../../theme/app_colors.dart';
import '../../../theme/app_theme.dart';
import '../../../theme/app_typography.dart';
import '../logic/set_completion_validator.dart';
import 'swipe_to_complete_set_widget.dart';

/// Per-set row for plan-based sessions: weight + reps fields and swipe-to-complete.
class PlanSetCompletionRow extends StatefulWidget {
  const PlanSetCompletionRow({
    super.key,
    required this.setNumber,
    required this.weightController,
    required this.repsController,
    required this.completed,
    required this.saving,
    required this.onCompleted,
  });

  final int setNumber;
  final TextEditingController weightController;
  final TextEditingController repsController;
  final bool completed;
  final bool saving;
  final Future<void> Function(int reps, double weight) onCompleted;

  @override
  State<PlanSetCompletionRow> createState() => _PlanSetCompletionRowState();
}

class _PlanSetCompletionRowState extends State<PlanSetCompletionRow> {
  String? _validationError;

  void _validate() {
    setState(() {
      _validationError = SetCompletionValidation.firstError(
        widget.repsController.text,
        widget.weightController.text,
      );
    });
  }

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: AppSpacing.sm),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                width: 52,
                padding: const EdgeInsets.symmetric(vertical: 6),
                alignment: Alignment.center,
                decoration: BoxDecoration(
                  borderRadius: BorderRadius.circular(10),
                  color: widget.completed
                      ? AppColors.success.withValues(alpha: 0.15)
                      : AppColors.accent.withValues(alpha: 0.12),
                ),
                child: Text(
                  'Set ${widget.setNumber}',
                  style: AppType.caption.copyWith(
                    color: widget.completed ? AppColors.success : AppColors.accent,
                    fontWeight: FontWeight.w700,
                  ),
                ),
              ),
              const SizedBox(width: AppSpacing.sm),
              Expanded(
                child: _Field(
                  label: 'Weight (kg)',
                  controller: widget.weightController,
                  enabled: !widget.completed && !widget.saving,
                  keyboardType: const TextInputType.numberWithOptions(decimal: true),
                  onChanged: (_) => _validate(),
                ),
              ),
              const SizedBox(width: AppSpacing.sm),
              Expanded(
                child: _Field(
                  label: 'Reps',
                  controller: widget.repsController,
                  enabled: !widget.completed && !widget.saving,
                  keyboardType: TextInputType.number,
                  onChanged: (_) => _validate(),
                ),
              ),
            ],
          ),
          if (!widget.completed) ...[
            const SizedBox(height: AppSpacing.sm),
            SwipeToCompleteSetWidget(
              enabled: !widget.saving,
              isLoading: widget.saving,
              isCompleted: widget.completed,
              validationError: _validationError,
              onCompleteSwipe: () async {
                _validate();
                final parsed = SetCompletionValidation.parse(
                  widget.repsController.text,
                  widget.weightController.text,
                );
                if (parsed == null) return;
                await widget.onCompleted(parsed.actualReps, parsed.actualWeight);
              },
            ),
          ] else ...[
            const SizedBox(height: 6),
            Row(
              children: [
                const Icon(CupertinoIcons.checkmark_seal_fill, size: 14, color: AppColors.success),
                const SizedBox(width: 6),
                Text(
                  'Logged: ${widget.repsController.text} reps @ ${widget.weightController.text} kg',
                  style: AppType.caption.copyWith(
                    color: AppColors.success,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ],
            ),
          ],
        ],
      ),
    );
  }
}

class _Field extends StatelessWidget {
  const _Field({
    required this.label,
    required this.controller,
    required this.enabled,
    required this.keyboardType,
    required this.onChanged,
  });

  final String label;
  final TextEditingController controller;
  final bool enabled;
  final TextInputType keyboardType;
  final ValueChanged<String> onChanged;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          label,
          style: AppType.caption.copyWith(color: AppColors.resolveTextSecondary(context)),
        ),
        const SizedBox(height: 4),
        CupertinoTextField(
          controller: controller,
          enabled: enabled,
          keyboardType: keyboardType,
          onChanged: onChanged,
          placeholder: label.contains('Weight') ? 'kg' : 'reps',
          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
          decoration: BoxDecoration(
            color: CupertinoColors.systemGrey6.resolveFrom(context),
            borderRadius: BorderRadius.circular(AppRadius.sm),
          ),
          style: AppType.subhead.copyWith(color: AppColors.resolveText(context)),
        ),
      ],
    );
  }
}
