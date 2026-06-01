import 'package:flutter/cupertino.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/api_exception.dart';
import '../../models/auth_models.dart';
import '../../services/auth_service.dart';
import '../../theme/app_colors.dart';
import '../../theme/app_theme.dart';
import '../../theme/app_typography.dart';
import '../../widgets/glass_card.dart';
import '../../widgets/premium_background.dart';

final accountAuthInfoProvider = FutureProvider<AccountAuthInfo>((ref) async {
  return AuthService.instance.getAccount();
});

class ChangePasswordScreen extends ConsumerStatefulWidget {
  const ChangePasswordScreen({super.key});

  @override
  ConsumerState<ChangePasswordScreen> createState() => _ChangePasswordScreenState();
}

class _ChangePasswordScreenState extends ConsumerState<ChangePasswordScreen> {
  final _current = TextEditingController();
  final _new = TextEditingController();
  final _confirm = TextEditingController();
  bool _obscureCurrent = true;
  bool _obscureNew = true;
  bool _obscureConfirm = true;
  bool _saving = false;

  @override
  void dispose() {
    _current.dispose();
    _new.dispose();
    _confirm.dispose();
    super.dispose();
  }

  Future<void> _submit(bool requiresCurrent) async {
    if (_saving) return;
    final newPw = _new.text.trim();
    final confirm = _confirm.text.trim();
    if (newPw.length < 6) {
      _showError('Password must be at least 6 characters.');
      return;
    }
    if (newPw != confirm) {
      _showError('New password and confirmation do not match.');
      return;
    }
    if (requiresCurrent && _current.text.trim().isEmpty) {
      _showError('Enter your current password.');
      return;
    }

    setState(() => _saving = true);
    try {
      await AuthService.instance.changePassword(
        newPassword: newPw,
        confirmPassword: confirm,
        currentPassword: requiresCurrent ? _current.text.trim() : null,
      );
      if (!mounted) return;
      HapticFeedback.mediumImpact();
      await showCupertinoDialog<void>(
        context: context,
        builder: (ctx) => CupertinoAlertDialog(
          title: const Text('Password updated'),
          content: const Text('Your password has been changed successfully.'),
          actions: [
            CupertinoDialogAction(
              isDefaultAction: true,
              onPressed: () {
                Navigator.of(ctx).pop();
                context.pop();
              },
              child: const Text('OK'),
            ),
          ],
        ),
      );
    } on ApiException catch (e) {
      if (!mounted) return;
      _showError(e.message);
    } on Object catch (e) {
      if (!mounted) return;
      _showError('$e');
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  void _showError(String message) {
    showCupertinoDialog<void>(
      context: context,
      builder: (ctx) => CupertinoAlertDialog(
        title: const Text('Could not update password'),
        content: Text(message),
        actions: [
          CupertinoDialogAction(
            isDefaultAction: true,
            onPressed: () => Navigator.of(ctx).pop(),
            child: const Text('OK'),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final account = ref.watch(accountAuthInfoProvider);

    return CupertinoPageScaffold(
      backgroundColor: AppColors.resolveBg(context),
      child: Stack(
        children: [
          const Positioned.fill(child: PremiumBackground()),
          SafeArea(
            child: account.when(
              loading: () => const Center(child: CupertinoActivityIndicator()),
              error: (e, _) => Center(
                child: Padding(
                  padding: const EdgeInsets.all(AppSpacing.lg),
                  child: Text('$e', textAlign: TextAlign.center),
                ),
              ),
              data: (info) {
                final requiresCurrent = info.requiresCurrentPassword;
                return CustomScrollView(
                  physics: const BouncingScrollPhysics(
                    parent: AlwaysScrollableScrollPhysics(),
                  ),
                  slivers: [
                    CupertinoSliverNavigationBar(
                      largeTitle: const Text('Change password'),
                      border: null,
                      leading: CupertinoNavigationBarBackButton(
                        onPressed: () => context.pop(),
                      ),
                    ),
                    SliverPadding(
                      padding: const EdgeInsets.all(AppSpacing.lg),
                      sliver: SliverList(
                        delegate: SliverChildListDelegate([
                          if (info.email.isNotEmpty)
                            Text(
                              'Login: ${info.email}',
                              style: AppType.subhead.copyWith(
                                color: AppColors.resolveTextSecondary(context),
                              ),
                            ),
                          if (!requiresCurrent) ...[
                            const SizedBox(height: AppSpacing.sm),
                            Text(
                              'You sign in with phone OTP. Set a password to also sign in with email and password.',
                              style: AppType.footnote.copyWith(
                                color: AppColors.accent,
                              ),
                            ),
                          ],
                          const SizedBox(height: AppSpacing.lg),
                          GlassCard(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.stretch,
                              children: [
                                if (requiresCurrent)
                                  _PasswordField(
                                    label: 'Current password',
                                    controller: _current,
                                    obscure: _obscureCurrent,
                                    onToggle: () => setState(
                                      () => _obscureCurrent = !_obscureCurrent,
                                    ),
                                  ),
                                if (requiresCurrent) const SizedBox(height: AppSpacing.md),
                                _PasswordField(
                                  label: 'New password',
                                  controller: _new,
                                  obscure: _obscureNew,
                                  onToggle: () =>
                                      setState(() => _obscureNew = !_obscureNew),
                                ),
                                const SizedBox(height: AppSpacing.md),
                                _PasswordField(
                                  label: 'Confirm new password',
                                  controller: _confirm,
                                  obscure: _obscureConfirm,
                                  onToggle: () => setState(
                                    () => _obscureConfirm = !_obscureConfirm,
                                  ),
                                ),
                                const SizedBox(height: AppSpacing.lg),
                                CupertinoButton.filled(
                                  onPressed: _saving ? null : () => _submit(requiresCurrent),
                                  child: _saving
                                      ? const CupertinoActivityIndicator()
                                      : const Text('Update password'),
                                ),
                              ],
                            ),
                          ),
                        ]),
                      ),
                    ),
                  ],
                );
              },
            ),
          ),
        ],
      ),
    );
  }
}

class _PasswordField extends StatelessWidget {
  const _PasswordField({
    required this.label,
    required this.controller,
    required this.obscure,
    required this.onToggle,
  });

  final String label;
  final TextEditingController controller;
  final bool obscure;
  final VoidCallback onToggle;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          label,
          style: AppType.caption.copyWith(color: AppColors.resolveTextSecondary(context)),
        ),
        const SizedBox(height: AppSpacing.xs),
        CupertinoTextField(
          controller: controller,
          obscureText: obscure,
          autocorrect: false,
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
          decoration: BoxDecoration(
            color: AppColors.resolveSurface(context),
            borderRadius: BorderRadius.circular(12),
          ),
          suffix: CupertinoButton(
            padding: EdgeInsets.zero,
            minimumSize: const Size(36, 36),
            onPressed: onToggle,
            child: Icon(
              obscure ? CupertinoIcons.eye_slash : CupertinoIcons.eye,
              size: 20,
              color: AppColors.resolveTextSecondary(context),
            ),
          ),
        ),
      ],
    );
  }
}
