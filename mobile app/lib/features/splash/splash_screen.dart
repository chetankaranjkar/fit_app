import 'dart:async';

import 'package:flutter/cupertino.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../../core/app_config.dart';
import '../../providers/auth_providers.dart';
import '../../theme/app_colors.dart';
import '../../theme/app_theme.dart';
import '../media/onboarding_profile_photo_screen.dart';
import 'package:pulsefit/widgets/pulsefit_logo.dart';

/// Splash: navigate quickly; no Hive/network on this screen.
class SplashScreen extends ConsumerStatefulWidget {
  const SplashScreen({super.key});

  @override
  ConsumerState<SplashScreen> createState() => _SplashScreenState();
}

class _SplashScreenState extends ConsumerState<SplashScreen> {
  String? _hint;
  bool _leftSplash = false;

  @override
  void initState() {
    super.initState();
    Timer(const Duration(milliseconds: 1200), () {
      _openLogin(reason: 'failsafe');
    });
    WidgetsBinding.instance.addPostFrameCallback((_) => unawaited(_boot()));
  }

  Future<void> _boot() async {
    if (!AppConfig.looksLikeEmulatorDefault && mounted) {
      setState(() {
        _hint =
            'Physical phone: build with --dart-define=API_BASE_URL=http://YOUR_PC_IP:5104';
      });
    }

    var hasCache = false;
    try {
      hasCache = await ref
          .read(authControllerProvider.notifier)
          .bootstrapFromCache()
          .timeout(const Duration(seconds: 2), onTimeout: () => false);
    } catch (_) {
      hasCache = false;
    }

    if (!mounted || _leftSplash) return;

    if (hasCache) {
      await _openHome();
    } else {
      _openLogin(reason: 'signed-out');
    }
  }

  void _openLogin({required String reason}) {
    if (!mounted || _leftSplash) return;
    _leftSplash = true;
    debugPrint('Splash → login ($reason)');
    context.go('/login');
  }

  Future<void> _openHome() async {
    if (!mounted || _leftSplash) return;
    _leftSplash = true;
    debugPrint('Splash → home');

    try {
      final prefs = await SharedPreferences.getInstance()
          .timeout(const Duration(seconds: 2));
      final dismissed = prefs.getBool(kProfilePhotoPromptDismissedKey) ?? false;
      if (!mounted) return;
      if (!dismissed) {
        context.go('/onboarding/photo');
        return;
      }
    } catch (_) {}

    if (!mounted) return;
    context.go('/home');
  }

  @override
  Widget build(BuildContext context) {
    return CupertinoPageScaffold(
      backgroundColor: AppColors.bgDark,
      child: Stack(
        children: [
          const Positioned.fill(
            child: DecoratedBox(
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  begin: Alignment.topCenter,
                  end: Alignment.bottomCenter,
                  colors: [Color(0xFF0D0D0F), Color(0xFF1A1005), Color(0xFF0D0D0F)],
                  stops: [0.0, 0.5, 1.0],
                ),
              ),
            ),
          ),
          SafeArea(
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                const Spacer(flex: 2),
                const PulseFitBrandBlock(compact: false, showTagline: true),
                const SizedBox(height: AppSpacing.xl),
                const CupertinoActivityIndicator(
                  color: AppColors.accent,
                  radius: 14,
                ),
                if (_hint != null) ...[
                  const SizedBox(height: AppSpacing.lg),
                  Padding(
                    padding: const EdgeInsets.symmetric(horizontal: AppSpacing.xl),
                    child: Text(
                      _hint!,
                      textAlign: TextAlign.center,
                      style: const TextStyle(fontSize: 12, color: AppColors.accent),
                    ),
                  ),
                ],
                const Spacer(flex: 2),
                Padding(
                  padding: const EdgeInsets.symmetric(horizontal: AppSpacing.xl),
                  child: CupertinoButton(
                    onPressed: () => _openLogin(reason: 'manual'),
                    child: const Text(
                      'Continue to sign in',
                      style: TextStyle(color: AppColors.accent),
                    ),
                  ),
                ),
                const SizedBox(height: AppSpacing.lg),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
