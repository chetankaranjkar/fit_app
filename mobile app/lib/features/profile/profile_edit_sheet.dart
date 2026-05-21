import 'package:flutter/cupertino.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/api_exception.dart';
import '../../models/me_models.dart';
import '../../providers/me_providers.dart';
import '../../services/me_service.dart';
import '../../theme/app_colors.dart';
import '../../theme/app_theme.dart';
import '../../theme/app_typography.dart';
import '../media/premium_media_flow.dart';

/// Modal editor for member profile fields supported by `PUT /api/me/profile`.
class ProfileEditSheet extends ConsumerStatefulWidget {
  const ProfileEditSheet({super.key, required this.initial});

  final MeProfile initial;

  @override
  ConsumerState<ProfileEditSheet> createState() => _ProfileEditSheetState();
}

class _ProfileEditSheetState extends ConsumerState<ProfileEditSheet> {
  late final TextEditingController _first;
  late final TextEditingController _last;
  late final TextEditingController _phone;
  late final TextEditingController _photoUrl;
  bool _saving = false;

  @override
  void initState() {
    super.initState();
    final p = widget.initial;
    _first = TextEditingController(text: p.firstName);
    _last = TextEditingController(text: p.lastName);
    _phone = TextEditingController(text: p.phone ?? '');
    _photoUrl = TextEditingController(text: p.profilePictureUrl ?? '');
  }

  @override
  void dispose() {
    _first.dispose();
    _last.dispose();
    _phone.dispose();
    _photoUrl.dispose();
    super.dispose();
  }

  Future<void> _save() async {
    if (_saving) return;
    setState(() => _saving = true);
    try {
      await MeService.instance.updateProfile(
        firstName: _first.text.trim(),
        lastName: _last.text.trim(),
        phone: _phone.text.trim().isEmpty ? '' : _phone.text.trim(),
        profilePictureUrl: _photoUrl.text.trim().isEmpty ? '' : _photoUrl.text.trim(),
      );
      if (!mounted) return;
      ref.invalidate(profileProvider);
      ref.invalidate(dashboardProvider);
      Navigator.of(context).pop();
    } on ApiException catch (e) {
      if (!mounted) return;
      setState(() => _saving = false);
      showCupertinoDialog<void>(
        context: context,
        builder: (c) => CupertinoAlertDialog(
          title: const Text('Update failed'),
          content: Text(e.message),
          actions: [
            CupertinoDialogAction(onPressed: () => Navigator.pop(c), child: const Text('OK')),
          ],
        ),
      );
    } on Object catch (e) {
      if (!mounted) return;
      setState(() => _saving = false);
      showCupertinoDialog<void>(
        context: context,
        builder: (c) => CupertinoAlertDialog(
          title: const Text('Update failed'),
          content: Text('$e'),
          actions: [
            CupertinoDialogAction(onPressed: () => Navigator.pop(c), child: const Text('OK')),
          ],
        ),
      );
    }
  }

  Future<void> _uploadPhoto() async {
    HapticFeedback.selectionClick();
    final picked = await runPremiumMediaCapture(context, kind: PremiumMediaKind.profile);
    if (!mounted || picked == null) return;
    setState(() => _saving = true);
    try {
      final profile = await MeService.instance.uploadProfilePhoto(picked.bytes, picked.fileName);
      if (!mounted) return;
      _photoUrl.text = profile.profilePictureUrl ?? '';
      ref.invalidate(profileProvider);
      ref.invalidate(dashboardProvider);
      showCupertinoDialog<void>(
        context: context,
        builder: (c) => CupertinoAlertDialog(
          title: const Text('Photo updated'),
          content: const Text('Your new profile picture has been saved.'),
          actions: [CupertinoDialogAction(isDefaultAction: true, onPressed: () => Navigator.pop(c), child: const Text('OK'))],
        ),
      );
    } on ApiException catch (e) {
      if (!mounted) return;
      showCupertinoDialog<void>(
        context: context,
        builder: (c) => CupertinoAlertDialog(
          title: const Text('Upload failed'),
          content: Text(e.message),
          actions: [CupertinoDialogAction(onPressed: () => Navigator.pop(c), child: const Text('OK'))],
        ),
      );
    } on Object catch (e) {
      if (!mounted) return;
      showCupertinoDialog<void>(
        context: context,
        builder: (c) => CupertinoAlertDialog(
          title: const Text('Upload failed'),
          content: Text('$e'),
          actions: [CupertinoDialogAction(onPressed: () => Navigator.pop(c), child: const Text('OK'))],
        ),
      );
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final bottom = MediaQuery.paddingOf(context).bottom;
    return Container(
      decoration: BoxDecoration(
        color: AppColors.resolveSurface(context),
        borderRadius: const BorderRadius.vertical(top: Radius.circular(20)),
      ),
      padding: EdgeInsets.fromLTRB(AppSpacing.lg, AppSpacing.md, AppSpacing.lg, bottom + AppSpacing.lg),
      child: SafeArea(
        top: false,
        child: SingleChildScrollView(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Center(
                child: Container(
                  width: 40,
                  height: 4,
                  decoration: BoxDecoration(
                    color: AppColors.resolveBorder(context),
                    borderRadius: BorderRadius.circular(999),
                  ),
                ),
              ),
              const SizedBox(height: AppSpacing.lg),
              Text('Edit profile', style: AppType.title2.copyWith(color: AppColors.resolveText(context))),
              const SizedBox(height: AppSpacing.md),
              _LabeledField(label: 'First name', controller: _first),
              _LabeledField(label: 'Last name', controller: _last),
              _LabeledField(label: 'Phone', controller: _phone, keyboardType: TextInputType.phone),
              CupertinoButton.filled(
                padding: const EdgeInsets.symmetric(vertical: 14),
                borderRadius: BorderRadius.circular(AppRadius.lg),
                onPressed: _saving ? null : _uploadPhoto,
                child: _saving
                    ? const CupertinoActivityIndicator(color: CupertinoColors.white)
                    : const Text('Upload profile photo'),
              ),
              const SizedBox(height: AppSpacing.md),
              _LabeledField(
                label: 'Or paste photo URL',
                controller: _photoUrl,
                placeholder: 'https://…',
              ),
              const SizedBox(height: AppSpacing.sm),
              Text(
                'Advanced: public image URL. Most members use Upload above.',
                style: AppType.caption.copyWith(color: AppColors.resolveTextSecondary(context)),
              ),
              const SizedBox(height: AppSpacing.xl),
              Row(
                children: [
                  Expanded(
                    child: CupertinoButton(
                      padding: const EdgeInsets.symmetric(vertical: 14),
                      color: AppColors.resolveSurfaceAlt(context),
                      borderRadius: BorderRadius.circular(AppRadius.lg),
                      onPressed: _saving ? null : () => Navigator.of(context).pop(),
                      child: Text('Cancel', style: AppType.button.copyWith(color: AppColors.resolveText(context))),
                    ),
                  ),
                  const SizedBox(width: AppSpacing.md),
                  Expanded(
                    child: CupertinoButton(
                      padding: const EdgeInsets.symmetric(vertical: 14),
                      borderRadius: BorderRadius.circular(AppRadius.lg),
                      color: AppColors.accent,
                      onPressed: _saving ? null : _save,
                      child: _saving
                          ? const CupertinoActivityIndicator(color: CupertinoColors.white)
                          : Text('Save', style: AppType.button.copyWith(color: CupertinoColors.white)),
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _LabeledField extends StatelessWidget {
  const _LabeledField({
    required this.label,
    required this.controller,
    this.placeholder,
    this.keyboardType,
  });

  final String label;
  final TextEditingController controller;
  final String? placeholder;
  final TextInputType? keyboardType;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: AppSpacing.md),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(label, style: AppType.caption.copyWith(color: AppColors.resolveTextSecondary(context))),
          const SizedBox(height: 4),
          CupertinoTextField(
            controller: controller,
            placeholder: placeholder,
            keyboardType: keyboardType,
            padding: const EdgeInsets.symmetric(horizontal: AppSpacing.md, vertical: AppSpacing.sm),
            decoration: BoxDecoration(
              color: AppColors.resolveSurfaceAlt(context),
              borderRadius: BorderRadius.circular(AppRadius.md),
              border: Border.all(color: AppColors.resolveBorder(context).withValues(alpha: 0.5)),
            ),
          ),
        ],
      ),
    );
  }
}
