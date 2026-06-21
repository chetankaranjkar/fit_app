import 'package:flutter/cupertino.dart';
import 'package:flutter/services.dart';
import 'package:go_router/go_router.dart';

import '../../core/api_exception.dart';
import '../../services/auth_service.dart';
import '../../theme/app_typography.dart';
import '../../widgets/app_button.dart';
import '../../widgets/app_text_field.dart';

class ResetPasswordScreen extends StatefulWidget {
  const ResetPasswordScreen({super.key, required this.token});

  final String token;

  @override
  State<ResetPasswordScreen> createState() => _ResetPasswordScreenState();
}

class _ResetPasswordScreenState extends State<ResetPasswordScreen> {
  final _newPassword = TextEditingController();
  final _confirmPassword = TextEditingController();
  bool _submitting = false;
  String? _error;

  @override
  void dispose() {
    _newPassword.dispose();
    _confirmPassword.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (_submitting) return;
    final token = widget.token.trim();
    final newPassword = _newPassword.text.trim();
    final confirm = _confirmPassword.text.trim();
    if (token.isEmpty) {
      setState(() => _error = 'This reset link is invalid. Request a new one.');
      return;
    }
    if (newPassword.length < 6) {
      setState(() => _error = 'Password must be at least 6 characters.');
      return;
    }
    if (newPassword != confirm) {
      setState(() => _error = 'New password and confirmation do not match.');
      return;
    }

    setState(() {
      _submitting = true;
      _error = null;
    });
    try {
      await AuthService.instance.resetPassword(
        token: token,
        newPassword: newPassword,
        confirmPassword: confirm,
      );
      if (!mounted) return;
      HapticFeedback.mediumImpact();
      await showCupertinoDialog<void>(
        context: context,
        builder: (ctx) => CupertinoAlertDialog(
          title: const Text('Password updated'),
          content: const Text('You can sign in with your new password.'),
          actions: [
            CupertinoDialogAction(
              isDefaultAction: true,
              onPressed: () {
                Navigator.of(ctx).pop();
                context.go('/login');
              },
              child: const Text('Sign in'),
            ),
          ],
        ),
      );
    } on ApiException catch (e) {
      if (!mounted) return;
      setState(() => _error = e.message.isEmpty ? 'Could not reset password.' : e.message);
    } catch (_) {
      if (!mounted) return;
      setState(() => _error = 'Something went wrong. Please try again.');
    } finally {
      if (mounted) setState(() => _submitting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final tokenMissing = widget.token.trim().isEmpty;

    return CupertinoPageScaffold(
      backgroundColor: const Color(0xFF0B0B0C),
      navigationBar: const CupertinoNavigationBar(
        middle: Text('Reset password'),
        backgroundColor: Color(0xFF0B0B0C),
      ),
      child: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: tokenMissing
              ? Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    Text(
                      'This reset link is missing or invalid.',
                      style: AppType.body.copyWith(color: CupertinoColors.white.withValues(alpha: 0.85)),
                    ),
                    const SizedBox(height: 24),
                    AppButton(
                      label: 'Request new link',
                      onTap: () => context.push('/login/forgot-password'),
                    ),
                  ],
                )
              : Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    Text(
                      'Choose a new password for your account.',
                      style: AppType.footnote.copyWith(
                        color: CupertinoColors.white.withValues(alpha: 0.65),
                      ),
                    ),
                    const SizedBox(height: 20),
                    AppTextField(
                      controller: _newPassword,
                      placeholder: 'New password',
                      prefixIcon: CupertinoIcons.lock_fill,
                      obscure: true,
                      autofillHints: const [AutofillHints.newPassword],
                      textInputAction: TextInputAction.next,
                    ),
                    const SizedBox(height: 14),
                    AppTextField(
                      controller: _confirmPassword,
                      placeholder: 'Confirm password',
                      prefixIcon: CupertinoIcons.lock_fill,
                      obscure: true,
                      autofillHints: const [AutofillHints.newPassword],
                      textInputAction: TextInputAction.done,
                      onSubmitted: (_) => _submit(),
                    ),
                    if (_error != null) ...[
                      const SizedBox(height: 12),
                      Text(
                        _error!,
                        style: AppType.footnote.copyWith(color: const Color(0xFFFF6961)),
                      ),
                    ],
                    const SizedBox(height: 24),
                    AppButton(
                      label: 'Update password',
                      onTap: _submit,
                      isLoading: _submitting,
                    ),
                  ],
                ),
        ),
      ),
    );
  }
}
