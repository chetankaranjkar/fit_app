import 'package:flutter/cupertino.dart';
import 'package:intl/intl.dart';

import '../../../models/workout_tracking_models.dart';
import '../../../theme/app_colors.dart';
import '../../../theme/app_theme.dart';
import '../../../theme/app_typography.dart';
import '../logic/set_completion_validator.dart';
import 'swipe_to_complete_set_widget.dart';

/// Premium per-set card with target display, actual inputs, and swipe completion.
class WorkoutSetCard extends StatefulWidget {
  const WorkoutSetCard({
    super.key,
    required this.set,
    required this.exerciseName,
    required this.saving,
    required this.onComplete,
  });

  final TrackedWorkoutSet set;
  final String exerciseName;
  final bool saving;
  final Future<void> Function(TrackedWorkoutSet set, int reps, double weight) onComplete;

  @override
  State<WorkoutSetCard> createState() => _WorkoutSetCardState();
}

class _WorkoutSetCardState extends State<WorkoutSetCard> {
  late final TextEditingController _weight;
  late final TextEditingController _reps;
  String? _validationError;

  @override
  void initState() {
    super.initState();
    _weight = TextEditingController(text: _fmt(widget.set.actualWeight ?? widget.set.targetWeight));
    _reps = TextEditingController(text: '${widget.set.actualReps ?? widget.set.targetReps}');
  }

  @override
  void didUpdateWidget(covariant WorkoutSetCard oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.set.id != widget.set.id) return;
    if (widget.set.isCompleted && !oldWidget.set.isCompleted) {
      _weight.text = _fmt(widget.set.actualWeight);
      _reps.text = '${widget.set.actualReps ?? ''}';
    }
  }

  @override
  void dispose() {
    _weight.dispose();
    _reps.dispose();
    super.dispose();
  }

  String _fmt(double? v) {
    if (v == null || v <= 0) return '';
    if (v == v.roundToDouble()) return '${v.round()}';
    return v.toStringAsFixed(1);
  }

  String _targetLabel() {
    final reps = widget.set.targetReps;
    final weight = widget.set.targetWeight;
    if (weight != null && weight > 0) {
      return '$reps reps @ ${_fmt(weight)}kg';
    }
    return '$reps reps';
  }

  void _validateInputs() {
    setState(() {
      _validationError = SetCompletionValidation.firstError(_reps.text, _weight.text);
    });
  }

  @override
  Widget build(BuildContext context) {
    final completed = widget.set.isCompleted;
    final completedAt = widget.set.completedAt?.toLocal();
    final timeLabel = completedAt != null ? DateFormat.jm().format(completedAt) : null;

    return AnimatedContainer(
      duration: const Duration(milliseconds: 320),
      curve: Curves.easeOutCubic,
      margin: const EdgeInsets.only(bottom: AppSpacing.md),
      padding: const EdgeInsets.all(AppSpacing.md),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(18),
        color: completed
            ? AppColors.success.withValues(alpha: 0.08)
            : AppColors.bgDark.withValues(alpha: 0.45),
        border: Border.all(
          color: completed
              ? AppColors.success.withValues(alpha: 0.45)
              : AppColors.borderDark.withValues(alpha: 0.55),
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                decoration: BoxDecoration(
                  borderRadius: BorderRadius.circular(999),
                  color: AppColors.accent.withValues(alpha: 0.15),
                ),
                child: Text(
                  'Set ${widget.set.setNumber}',
                  style: AppType.caption.copyWith(
                    color: AppColors.accent,
                    fontWeight: FontWeight.w700,
                  ),
                ),
              ),
              const SizedBox(width: AppSpacing.sm),
              Expanded(
                child: Text(
                  'Target: ${_targetLabel()}',
                  style: AppType.footnote.copyWith(color: AppColors.resolveTextSecondary(context)),
                ),
              ),
            ],
          ),
          if (completed) ...[
            const SizedBox(height: AppSpacing.sm),
            Row(
              children: [
                const Icon(CupertinoIcons.checkmark_seal_fill, size: 16, color: AppColors.success),
                const SizedBox(width: 6),
                Text(
                  'Set completed',
                  style: AppType.footnote.copyWith(
                    color: AppColors.success,
                    fontWeight: FontWeight.w700,
                  ),
                ),
              ],
            ),
            if (timeLabel != null) ...[
              const SizedBox(height: 4),
              Text(
                'Completed at $timeLabel',
                style: AppType.caption.copyWith(color: AppColors.resolveTextSecondary(context)),
              ),
            ],
            const SizedBox(height: 6),
            Text(
              'Actual: ${widget.set.actualReps} reps @ ${_fmt(widget.set.actualWeight)}kg',
              style: AppType.body.copyWith(
                color: AppColors.resolveText(context),
                fontWeight: FontWeight.w600,
              ),
            ),
          ] else ...[
            const SizedBox(height: AppSpacing.md),
            Row(
              children: [
                Expanded(
                  child: _MetricField(
                    label: 'Actual reps',
                    controller: _reps,
                    enabled: !completed && !widget.saving,
                    keyboardType: TextInputType.number,
                    onChanged: (_) => _validateInputs(),
                  ),
                ),
                const SizedBox(width: AppSpacing.sm),
                Expanded(
                  child: _MetricField(
                    label: 'Actual weight (kg)',
                    controller: _weight,
                    enabled: !completed && !widget.saving,
                    keyboardType: const TextInputType.numberWithOptions(decimal: true),
                    onChanged: (_) => _validateInputs(),
                  ),
                ),
              ],
            ),
            const SizedBox(height: AppSpacing.md),
            SwipeToCompleteSetWidget(
              enabled: !completed,
              isLoading: widget.saving,
              isCompleted: completed,
              validationError: _validationError,
              onCompleteSwipe: () async {
                _validateInputs();
                final parsed = SetCompletionValidation.parse(_reps.text, _weight.text);
                if (parsed == null) return;
                await widget.onComplete(widget.set, parsed.actualReps, parsed.actualWeight);
              },
            ),
          ],
        ],
      ),
    );
  }
}

class _MetricField extends StatelessWidget {
  const _MetricField({
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
        const SizedBox(height: 6),
        CupertinoTextField(
          controller: controller,
          enabled: enabled,
          keyboardType: keyboardType,
          onChanged: onChanged,
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
          decoration: BoxDecoration(
            color: AppColors.surfaceDark.withValues(alpha: 0.75),
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: AppColors.borderDark.withValues(alpha: 0.6)),
          ),
          style: AppType.body.copyWith(color: AppColors.resolveText(context)),
        ),
      ],
    );
  }
}
