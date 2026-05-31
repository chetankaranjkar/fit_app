import 'package:flutter/cupertino.dart';
import 'package:flutter/services.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/api_exception.dart';
import '../../core/app_config.dart';
import '../../providers/auth_providers.dart';
import '../../animations/app_motion.dart';
import '../../theme/app_typography.dart';
import '../../widgets/app_button.dart';
import '../../widgets/app_text_field.dart';
import '../../widgets/tiger_fitness_logo.dart';

/// Freeletics-inspired: near-black canvas, bold wordmark, single strong CTA rail.
class LoginScreen extends ConsumerStatefulWidget {
  const LoginScreen({super.key});

  @override
  ConsumerState<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends ConsumerState<LoginScreen> {
  final _identifier = TextEditingController();
  final _password = TextEditingController();
  bool _submitting = false;
  String? _error;

  static const _kCanvas = Color(0xFF0B0B0C);
  static const _kSurface = Color(0xFF161618);
  static const _kBorder = Color(0xFF2A2A2E);

  @override
  void dispose() {
    _identifier.dispose();
    _password.dispose();
    super.dispose();
  }

  Future<void> _signIn() async {
    if (_submitting) return;
    final id = _identifier.text.trim();
    final pwd = _password.text;
    if (id.isEmpty || pwd.isEmpty) {
      setState(() => _error = 'Enter your email or username and password');
      return;
    }
    setState(() {
      _submitting = true;
      _error = null;
    });
    HapticFeedback.selectionClick();

    try {
      await ref.read(authControllerProvider.notifier).login(id, pwd);
      if (!mounted) return;
      context.go('/home');
    } on ApiException catch (e) {
      HapticFeedback.heavyImpact();
      setState(() {
        _error = e.statusCode == 401
            ? 'Wrong email/username or password'
            : (e.message.isEmpty ? 'Could not sign you in' : e.message);
      });
    } catch (_) {
      HapticFeedback.heavyImpact();
      setState(() => _error = 'Something went wrong. Please try again.');
    } finally {
      if (mounted) setState(() => _submitting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return CupertinoPageScaffold(
      backgroundColor: _kCanvas,
      child: GestureDetector(
        onTap: () => FocusScope.of(context).unfocus(),
        child: Stack(
          children: [
            const Positioned.fill(
              child: DecoratedBox(
                decoration: BoxDecoration(
                  gradient: LinearGradient(
                    begin: Alignment.topCenter,
                    end: Alignment.bottomCenter,
                    colors: [
                      Color(0xFF0B0B0C),
                      Color(0xFF101014),
                      Color(0xFF0B0B0C),
                    ],
                    stops: [0.0, 0.45, 1.0],
                  ),
                ),
              ),
            ),
            // Subtle hero wash (Freeletics-style photography substitute)
            Positioned(
              top: -40,
              right: -20,
              child: Container(
                width: 220,
                height: 220,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  gradient: RadialGradient(
                    colors: [
                      const Color(0xFFFF6B2C).withValues(alpha: 0.14),
                      const Color(0xFFFF6B2C).withValues(alpha: 0),
                    ],
                  ),
                ),
              ),
            ),
            SafeArea(
              child: Center(
                child: SingleChildScrollView(
                  padding: const EdgeInsets.symmetric(horizontal: 24),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      const SizedBox(height: 28),
                      const TigerFitnessBrandBlock(compact: false, showTagline: true)
                          .animate()
                          .fadeIn(duration: AppFx.regular)
                          .moveY(begin: 8, end: 0, curve: Curves.easeOutCubic),
                      const SizedBox(height: 40),
                      Text(
                        'LOG IN',
                        textAlign: TextAlign.center,
                        style: AppType.title2.copyWith(
                          color: CupertinoColors.white,
                          fontWeight: FontWeight.w800,
                          letterSpacing: 3,
                        ),
                      ).animate().fadeIn(delay: 60.ms, duration: AppFx.regular),
                      const SizedBox(height: 8),
                      Text(
                        'Your training data, membership, and check-ins — one account.',
                        textAlign: TextAlign.center,
                        style: AppType.footnote.copyWith(
                          color: CupertinoColors.white.withValues(alpha: 0.55),
                          height: 1.35,
                        ),
                      ).animate().fadeIn(delay: 90.ms, duration: AppFx.regular),
                      const SizedBox(height: 36),
                      Container(
                        padding: const EdgeInsets.all(20),
                        decoration: BoxDecoration(
                          color: _kSurface,
                          borderRadius: BorderRadius.circular(20),
                          border: Border.all(color: _kBorder),
                          boxShadow: [
                            BoxShadow(
                              color: CupertinoColors.black.withValues(alpha: 0.35),
                              blurRadius: 40,
                              offset: const Offset(0, 20),
                            ),
                          ],
                        ),
                        child: AutofillGroup(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.stretch,
                            children: [
                              AppTextField(
                                controller: _identifier,
                                placeholder: 'Email or username',
                                prefixIcon: CupertinoIcons.person_fill,
                                keyboardType: TextInputType.emailAddress,
                                autocorrect: false,
                                autofillHints: const [
                                  AutofillHints.username,
                                  AutofillHints.email,
                                ],
                                textInputAction: TextInputAction.next,
                              ),
                              const SizedBox(height: 14),
                              AppTextField(
                                controller: _password,
                                placeholder: 'Password',
                                prefixIcon: CupertinoIcons.lock_fill,
                                obscure: true,
                                autocorrect: false,
                                autofillHints: const [AutofillHints.password],
                                textInputAction: TextInputAction.done,
                                onSubmitted: (_) => _signIn(),
                              ),
                              if (_error != null) ...[
                                const SizedBox(height: 12),
                                Row(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    const Icon(
                                      CupertinoIcons.exclamationmark_circle_fill,
                                      size: 16,
                                      color: Color(0xFFFF453A),
                                    ),
                                    const SizedBox(width: 8),
                                    Expanded(
                                      child: Text(
                                        _error!,
                                        style: AppType.footnote.copyWith(
                                          color: const Color(0xFFFF6961),
                                          height: 1.3,
                                        ),
                                      ),
                                    ),
                                  ],
                                ).animate().shakeX(duration: 320.ms),
                              ],
                            ],
                          ),
                        ),
                      ).animate().fadeIn(delay: 120.ms, duration: AppFx.relaxed).slideY(
                            begin: 0.04,
                            end: 0,
                            curve: Curves.easeOutCubic,
                          ),
                      const SizedBox(height: 24),
                      AppButton(
                        label: 'Log in',
                        icon: CupertinoIcons.arrow_right_circle_fill,
                        onTap: _signIn,
                        isLoading: _submitting,
                      ),
                      const SizedBox(height: 16),
                      Text(
                        'API: ${AppConfig.apiRoot}',
                        textAlign: TextAlign.center,
                        style: AppType.caption.copyWith(
                          color: CupertinoColors.white.withValues(alpha: 0.32),
                          fontSize: 11,
                        ),
                      ),
                      if (AppConfig.looksLikeEmulatorDefault) ...[
                        const SizedBox(height: 8),
                        Text(
                          'Rebuild with --dart-define=API_BASE_URL=http://YOUR_VPS_IP',
                          textAlign: TextAlign.center,
                          style: AppType.caption.copyWith(
                            color: const Color(0xFFFF9F0A),
                            fontSize: 11,
                          ),
                        ),
                      ],
                      const SizedBox(height: 28),
                      Text(
                        'By continuing you agree to our Terms & Privacy.',
                        textAlign: TextAlign.center,
                        style: AppType.caption.copyWith(
                          color: CupertinoColors.white.withValues(alpha: 0.38),
                        ),
                      ),
                      const SizedBox(height: 48),
                    ],
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
