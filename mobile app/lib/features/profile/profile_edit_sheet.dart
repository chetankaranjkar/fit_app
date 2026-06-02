import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/cupertino.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/api_exception.dart';
import '../../core/media_urls.dart';
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
  late String? _photoUrl;
  bool _saving = false;
  bool _uploadingPhoto = false;

  @override
  void initState() {
    super.initState();
    final p = widget.initial;
    _first = TextEditingController(text: p.firstName);
    _last = TextEditingController(text: p.lastName);
    _phone = TextEditingController(text: p.phone ?? '');
    _photoUrl = p.profilePictureUrl;
  }

  @override
  void dispose() {
    _first.dispose();
    _last.dispose();
    _phone.dispose();
    super.dispose();
  }

  Future<void> _save() async {
    if (_saving || _uploadingPhoto) return;
    final phone = _phone.text.trim();
    if (phone.isNotEmpty && !RegExp(r'^\d{10}$').hasMatch(phone)) {
      _showError('Update failed', 'Phone number must be exactly 10 digits.');
      return;
    }
    setState(() => _saving = true);
    try {
      await MeService.instance.updateProfile(
        firstName: _first.text.trim(),
        lastName: _last.text.trim(),
        phone: phone.isEmpty ? '' : phone,
        profilePictureUrl: (_photoUrl ?? '').trim().isEmpty ? '' : _photoUrl!.trim(),
      );
      if (!mounted) return;
      ref.invalidate(profileProvider);
      ref.invalidate(dashboardProvider);
      Navigator.of(context).pop();
    } on ApiException catch (e) {
      if (!mounted) return;
      setState(() => _saving = false);
      _showError('Update failed', e.message);
    } on Object catch (e) {
      if (!mounted) return;
      setState(() => _saving = false);
      _showError('Update failed', '$e');
    }
  }

  Future<void> _pickPhoto(PremiumMediaSource source) async {
    if (_uploadingPhoto || _saving) return;
    HapticFeedback.selectionClick();
    final picked = await runPremiumMediaCapture(
      context,
      kind: PremiumMediaKind.profile,
      source: source,
    );
    if (!mounted || picked == null) return;

    setState(() => _uploadingPhoto = true);
    try {
      final profile = await MeService.instance.uploadProfilePhoto(picked.bytes, picked.fileName);
      if (!mounted) return;
      setState(() => _photoUrl = profile.profilePictureUrl);
      ref.invalidate(profileProvider);
      ref.invalidate(dashboardProvider);
      HapticFeedback.mediumImpact();
    } on ApiException catch (e) {
      if (!mounted) return;
      _showError('Upload failed', e.message);
    } on Object catch (e) {
      if (!mounted) return;
      _showError('Upload failed', '$e');
    } finally {
      if (mounted) setState(() => _uploadingPhoto = false);
    }
  }

  void _showError(String title, String message) {
    showCupertinoDialog<void>(
      context: context,
      builder: (c) => CupertinoAlertDialog(
        title: Text(title),
        content: Text(message),
        actions: [
          CupertinoDialogAction(onPressed: () => Navigator.pop(c), child: const Text('OK')),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final bottom = MediaQuery.paddingOf(context).bottom;
    final initials = widget.initial.initials;
    final resolvedPhoto = _photoUrl != null && MediaUrls.resolve(_photoUrl!).isNotEmpty
        ? MediaUrls.resolve(_photoUrl!)
        : null;
    final busy = _saving || _uploadingPhoto;

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
              const SizedBox(height: AppSpacing.lg),
              _ProfilePhotoSection(
                photoUrl: resolvedPhoto,
                initials: initials,
                uploading: _uploadingPhoto,
                onCamera: busy ? null : () => _pickPhoto(PremiumMediaSource.camera),
                onGallery: busy ? null : () => _pickPhoto(PremiumMediaSource.gallery),
              ),
              const SizedBox(height: AppSpacing.lg),
              _LabeledField(label: 'First name', controller: _first),
              _LabeledField(label: 'Last name', controller: _last),
              _LabeledField(
                label: 'Phone',
                controller: _phone,
                keyboardType: TextInputType.phone,
                maxLength: 10,
                inputFormatters: [FilteringTextInputFormatter.digitsOnly],
              ),
              const SizedBox(height: AppSpacing.xl),
              Row(
                children: [
                  Expanded(
                    child: CupertinoButton(
                      padding: const EdgeInsets.symmetric(vertical: 14),
                      color: AppColors.resolveSurfaceAlt(context),
                      borderRadius: BorderRadius.circular(AppRadius.lg),
                      onPressed: busy ? null : () => Navigator.of(context).pop(),
                      child: Text('Cancel', style: AppType.button.copyWith(color: AppColors.resolveText(context))),
                    ),
                  ),
                  const SizedBox(width: AppSpacing.md),
                  Expanded(
                    child: CupertinoButton(
                      padding: const EdgeInsets.symmetric(vertical: 14),
                      borderRadius: BorderRadius.circular(AppRadius.lg),
                      color: AppColors.accent,
                      onPressed: busy ? null : _save,
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

class _ProfilePhotoSection extends StatelessWidget {
  const _ProfilePhotoSection({
    required this.photoUrl,
    required this.initials,
    required this.uploading,
    required this.onCamera,
    required this.onGallery,
  });

  final String? photoUrl;
  final String initials;
  final bool uploading;
  final VoidCallback? onCamera;
  final VoidCallback? onGallery;

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Stack(
          alignment: Alignment.center,
          children: [
            Container(
              width: 96,
              height: 96,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                gradient: AppColors.neonGradient,
                boxShadow: [
                  BoxShadow(
                    color: AppColors.neonPurple.withValues(alpha: 0.35),
                    blurRadius: 18,
                    offset: const Offset(0, 6),
                  ),
                ],
              ),
              clipBehavior: Clip.antiAlias,
              child: photoUrl != null
                  ? CachedNetworkImage(
                      imageUrl: photoUrl!,
                      fit: BoxFit.cover,
                      width: 96,
                      height: 96,
                      placeholder: (_, __) => const CupertinoActivityIndicator(color: CupertinoColors.white),
                      errorWidget: (_, __, ___) => _InitialsAvatar(initials: initials),
                    )
                  : _InitialsAvatar(initials: initials),
            ),
            if (uploading)
              Container(
                width: 96,
                height: 96,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  color: CupertinoColors.black.withValues(alpha: 0.45),
                ),
                alignment: Alignment.center,
                child: const CupertinoActivityIndicator(color: CupertinoColors.white),
              ),
          ],
        ),
        const SizedBox(height: AppSpacing.md),
        Text(
          'Profile photo',
          style: AppType.subhead.copyWith(
            color: AppColors.resolveText(context),
            fontWeight: FontWeight.w600,
          ),
        ),
        const SizedBox(height: 4),
        Text(
          'Take a new photo or choose one from your gallery.',
          textAlign: TextAlign.center,
          style: AppType.caption.copyWith(color: AppColors.resolveTextSecondary(context)),
        ),
        const SizedBox(height: AppSpacing.md),
        Row(
          children: [
            Expanded(
              child: CupertinoButton(
                padding: const EdgeInsets.symmetric(vertical: 14),
                color: AppColors.resolveSurfaceAlt(context),
                borderRadius: BorderRadius.circular(AppRadius.lg),
                onPressed: onCamera,
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    const Icon(CupertinoIcons.camera_fill, size: 18, color: AppColors.accent),
                    const SizedBox(width: 8),
                    Text(
                      'Camera',
                      style: AppType.button.copyWith(color: AppColors.resolveText(context)),
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(width: AppSpacing.sm),
            Expanded(
              child: CupertinoButton(
                padding: const EdgeInsets.symmetric(vertical: 14),
                color: AppColors.resolveSurfaceAlt(context),
                borderRadius: BorderRadius.circular(AppRadius.lg),
                onPressed: onGallery,
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    const Icon(CupertinoIcons.photo_fill_on_rectangle_fill, size: 18, color: AppColors.accent),
                    const SizedBox(width: 8),
                    Text(
                      'Gallery',
                      style: AppType.button.copyWith(color: AppColors.resolveText(context)),
                    ),
                  ],
                ),
              ),
            ),
          ],
        ),
      ],
    );
  }
}

class _InitialsAvatar extends StatelessWidget {
  const _InitialsAvatar({required this.initials});

  final String initials;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Text(
        initials,
        style: AppType.title2.copyWith(
          color: CupertinoColors.white,
          fontWeight: FontWeight.w700,
        ),
      ),
    );
  }
}

class _LabeledField extends StatelessWidget {
  const _LabeledField({
    required this.label,
    required this.controller,
    this.keyboardType,
    this.maxLength,
    this.inputFormatters,
  });

  final String label;
  final TextEditingController controller;
  final TextInputType? keyboardType;
  final int? maxLength;
  final List<TextInputFormatter>? inputFormatters;

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
            keyboardType: keyboardType,
            maxLength: maxLength,
            inputFormatters: inputFormatters,
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
