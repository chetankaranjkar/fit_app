import 'dart:async';

import 'package:flutter/cupertino.dart';
import 'package:flutter/services.dart';
import 'package:go_router/go_router.dart';

import '../../services/biometric_prefs.dart';
import '../../services/biometric_service.dart';
import '../../theme/app_colors.dart';
import '../../theme/app_theme.dart';
import '../../widgets/tiger_fitness_logo.dart';
import 'post_auth_navigation.dart';

/// Gate before home when a cached session exists and biometric unlock is enabled.
class BiometricUnlockScreen extends StatefulWidget {
  const BiometricUnlockScreen({super.key});

  @override
  State<BiometricUnlockScreen> createState() => _BiometricUnlockScreenState();
}

class _BiometricUnlockScreenState extends State<BiometricUnlockScreen> {
  String _label = 'Biometric unlock';
  bool _busy = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => unawaited(_prepare()));
  }

  Future<void> _prepare() async {
    final label = await BiometricService.instance.unlockLabel();
    if (!mounted) return;
    setState(() => _label = label);

    final can = await BiometricService.instance.canAuthenticate();
    if (!mounted) return;
    if (!can) {
      await BiometricPrefs.setEnabled(false);
      if (!mounted) return;
      context.go('/login');
      return;
    }

    await _authenticate();
  }

  Future<void> _authenticate() async {
    if (_busy) return;
    setState(() {
      _busy = true;
      _error = null;
    });

    final ok = await BiometricService.instance.authenticate(
      reason: 'Unlock Tiger Fitness',
    );

    if (!mounted) return;

    if (ok) {
      HapticFeedback.lightImpact();
      await navigateAfterAuthenticatedSession(context);
      return;
    }

    setState(() {
      _busy = false;
      _error = 'Could not verify $_label. Try again or use your password.';
    });
  }

  void _usePassword() {
    HapticFeedback.selectionClick();
    context.go('/login');
  }

  @override
  Widget build(BuildContext context) {
    return CupertinoPageScaffold(
      backgroundColor: const Color(0xFF000000),
      child: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(AppSpacing.xl),
          child: Column(
            children: [
              const Spacer(flex: 2),
              const TigerFitnessBrandBlock(compact: true, showTagline: false),
              const SizedBox(height: AppSpacing.xl),
              Icon(
                CupertinoIcons.lock_shield,
                size: 48,
                color: AppColors.accent.withValues(alpha: 0.9),
              ),
              const SizedBox(height: AppSpacing.lg),
              Text(
                'Unlock with $_label',
                textAlign: TextAlign.center,
                style: const TextStyle(
                  fontSize: 20,
                  fontWeight: FontWeight.w600,
                  color: CupertinoColors.white,
                ),
              ),
              const SizedBox(height: AppSpacing.sm),
              Text(
                'Confirm your identity to continue to your workouts.',
                textAlign: TextAlign.center,
                style: TextStyle(
                  fontSize: 14,
                  color: CupertinoColors.white.withValues(alpha: 0.65),
                ),
              ),
              if (_error != null) ...[
                const SizedBox(height: AppSpacing.md),
                Text(
                  _error!,
                  textAlign: TextAlign.center,
                  style: const TextStyle(fontSize: 13, color: AppColors.danger),
                ),
              ],
              const Spacer(flex: 3),
              if (_busy)
                const CupertinoActivityIndicator(color: AppColors.accent)
              else
                CupertinoButton.filled(
                  onPressed: _authenticate,
                  child: Text('Use $_label'),
                ),
              const SizedBox(height: AppSpacing.sm),
              CupertinoButton(
                onPressed: _usePassword,
                child: const Text('Use password instead'),
              ),
              const SizedBox(height: AppSpacing.lg),
            ],
          ),
        ),
      ),
    );
  }
}
