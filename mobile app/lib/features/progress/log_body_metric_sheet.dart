import 'package:flutter/cupertino.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/api_exception.dart';
import '../../providers/me_providers.dart';
import '../../services/me_service.dart';
import '../../theme/app_colors.dart';
import '../../theme/app_theme.dart';
import '../../theme/app_typography.dart';
import '../../widgets/app_button.dart';
import '../../widgets/app_text_field.dart';

Future<bool?> showLogBodyMetricSheet(BuildContext context, WidgetRef ref) {
  return showCupertinoModalPopup<bool>(
    context: context,
    builder: (ctx) => _LogBodyMetricSheet(
      onSaved: () {
        ref.invalidate(bodyMetricsProvider);
      },
    ),
  );
}

class _LogBodyMetricSheet extends StatefulWidget {
  const _LogBodyMetricSheet({required this.onSaved});

  final VoidCallback onSaved;

  @override
  State<_LogBodyMetricSheet> createState() => _LogBodyMetricSheetState();
}

class _LogBodyMetricSheetState extends State<_LogBodyMetricSheet> {
  final _weight = TextEditingController();
  final _bodyFat = TextEditingController();
  final _notes = TextEditingController();
  bool _saving = false;
  String? _error;

  @override
  void dispose() {
    _weight.dispose();
    _bodyFat.dispose();
    _notes.dispose();
    super.dispose();
  }

  Future<void> _save() async {
    if (_saving) return;
    final weight = double.tryParse(_weight.text.trim());
    if (weight == null || weight <= 0) {
      setState(() => _error = 'Enter your weight in kg.');
      return;
    }
    final bodyFatRaw = _bodyFat.text.trim();
    double? bodyFat;
    if (bodyFatRaw.isNotEmpty) {
      bodyFat = double.tryParse(bodyFatRaw);
      if (bodyFat == null || bodyFat <= 0 || bodyFat > 100) {
        setState(() => _error = 'Body fat must be between 0 and 100%.');
        return;
      }
    }

    setState(() {
      _saving = true;
      _error = null;
    });
    try {
      await MeService.instance.createBodyMetric(
        weightKg: weight,
        bodyFatPct: bodyFat,
        notes: _notes.text.trim().isEmpty ? null : _notes.text.trim(),
      );
      if (!mounted) return;
      HapticFeedback.mediumImpact();
      widget.onSaved();
      Navigator.of(context).pop(true);
    } on ApiException catch (e) {
      if (!mounted) return;
      setState(() => _error = e.message.isEmpty ? 'Could not save metric.' : e.message);
    } catch (_) {
      if (!mounted) return;
      setState(() => _error = 'Something went wrong. Please try again.');
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return CupertinoPopupSurface(
      child: Container(
        color: AppColors.resolveBg(context),
        child: SafeArea(
          top: false,
          child: Padding(
            padding: EdgeInsets.only(
              left: AppSpacing.lg,
              right: AppSpacing.lg,
              top: AppSpacing.lg,
              bottom: MediaQuery.viewInsetsOf(context).bottom + AppSpacing.lg,
            ),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Text(
                  'Log weight',
                  style: AppType.title3.copyWith(color: AppColors.resolveText(context)),
                ),
                const SizedBox(height: 6),
                Text(
                  'Track your progress from the app.',
                  style: AppType.caption.copyWith(color: AppColors.resolveTextSecondary(context)),
                ),
                const SizedBox(height: AppSpacing.lg),
                AppTextField(
                  controller: _weight,
                  placeholder: 'Weight (kg)',
                  prefixIcon: CupertinoIcons.gauge,
                  keyboardType: const TextInputType.numberWithOptions(decimal: true),
                  textInputAction: TextInputAction.next,
                ),
                const SizedBox(height: AppSpacing.md),
                AppTextField(
                  controller: _bodyFat,
                  placeholder: 'Body fat % (optional)',
                  prefixIcon: CupertinoIcons.percent,
                  keyboardType: const TextInputType.numberWithOptions(decimal: true),
                  textInputAction: TextInputAction.next,
                ),
                const SizedBox(height: AppSpacing.md),
                AppTextField(
                  controller: _notes,
                  placeholder: 'Notes (optional)',
                  prefixIcon: CupertinoIcons.text_bubble,
                  textInputAction: TextInputAction.done,
                  onSubmitted: (_) => _save(),
                ),
                if (_error != null) ...[
                  const SizedBox(height: AppSpacing.sm),
                  Text(
                    _error!,
                    style: AppType.footnote.copyWith(color: const Color(0xFFFF6961)),
                  ),
                ],
                const SizedBox(height: AppSpacing.lg),
                Row(
                  children: [
                    Expanded(
                      child: CupertinoButton(
                        onPressed: _saving ? null : () => Navigator.of(context).pop(false),
                        child: Text(
                          'Cancel',
                          style: AppType.callout.copyWith(color: AppColors.resolveTextSecondary(context)),
                        ),
                      ),
                    ),
                    Expanded(
                      child: AppButton(
                        label: 'Save',
                        onTap: _save,
                        isLoading: _saving,
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}