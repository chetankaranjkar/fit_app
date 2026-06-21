import 'package:flutter/cupertino.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/api_exception.dart';
import '../../services/auth_service.dart';
import '../../theme/app_typography.dart';
import '../../widgets/app_button.dart';
import '../../widgets/app_text_field.dart';

class ForgotPasswordScreen extends ConsumerStatefulWidget {
  const ForgotPasswordScreen({super.key});

  @override
  ConsumerState<ForgotPasswordScreen> createState() => _ForgotPasswordScreenState();
}

class _ForgotPasswordScreenState extends ConsumerState<ForgotPasswordScreen> {
  final _email = TextEditingController();
  bool _submitting = false;
  String? _error;
  String? _submittedEmail;

  @override
  void dispose() {
    _email.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (_submitting) return;
    final email = _email.text.trim();
    if (email.isEmpty) {
      setState(() => _error = 'Enter your login email.');
      return;
    }
    setState(() {
      _submitting = true;
      _error = null;
    });
    try {
      await AuthService.instance.forgotPassword(email);
      if (!mounted) return;
      HapticFeedback.mediumImpact();
      setState(() => _submittedEmail = email);
    } on ApiException catch (e) {
      if (!mounted) return;
      setState(() => _error = e.message.isEmpty ? 'Could not send reset instructions.' : e.message);
    } catch (_) {
      if (!mounted) return;
      setState(() => _error = 'Something went wrong. Please try again.');
    } finally {
      if (mounted) setState(() => _submitting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return CupertinoPageScaffold(
      backgroundColor: const Color(0xFF0B0B0C),
      navigationBar: const CupertinoNavigationBar(
        middle: Text('Forgot password'),
        backgroundColor: Color(0xFF0B0B0C),
      ),
      child: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: _submittedEmail != null
              ? Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    Text(
                      'If an account exists for $_submittedEmail, password reset instructions have been sent.',
                      style: AppType.body.copyWith(color: CupertinoColors.white.withValues(alpha: 0.85)),
                    ),
                    const SizedBox(height: 24),
                    AppButton(
                      label: 'Back to sign in',
                      onTap: () => context.pop(),
                    ),
                  ],
                )
              : Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    Text(
                      'Enter the email linked to your gym account. We will send reset instructions if it exists.',
                      style: AppType.footnote.copyWith(
                        color: CupertinoColors.white.withValues(alpha: 0.65),
                        height: 1.35,
                      ),
                    ),
                    const SizedBox(height: 20),
                    AppTextField(
                      controller: _email,
                      placeholder: 'Email',
                      prefixIcon: CupertinoIcons.mail_solid,
                      keyboardType: TextInputType.emailAddress,
                      autocorrect: false,
                      autofillHints: const [AutofillHints.email],
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
                      label: 'Send reset link',
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
