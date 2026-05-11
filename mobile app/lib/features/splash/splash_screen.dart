import 'package:flutter/cupertino.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../providers/auth_providers.dart';
import '../../theme/app_colors.dart';
import 'package:pulsefit/widgets/pulsefit_logo.dart';

class SplashScreen extends ConsumerStatefulWidget {
  const SplashScreen({super.key});

  @override
  ConsumerState<SplashScreen> createState() => _SplashScreenState();
}

class _SplashScreenState extends ConsumerState<SplashScreen> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) async {
      await ref.read(authControllerProvider.notifier).bootstrap();
      if (!mounted) return;
      final state = ref.read(authControllerProvider);
      if (state.status == AuthBootstrapStatus.signedIn) {
        context.go('/home');
      } else {
        context.go('/login');
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    return CupertinoPageScaffold(
      backgroundColor: AppColors.bgDark,
      child: Stack(
        children: [
          // ── Deep gym-dark gradient background ─────────────────────────────
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
          // ── Ambient orange glow ────────────────────────────────────────────
          Center(
            child: Container(
              width: 260,
              height: 260,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                gradient: RadialGradient(
                  colors: [
                    AppColors.accent.withValues(alpha: 0.22),
                    AppColors.accent.withValues(alpha: 0.0),
                  ],
                ),
              ),
            ),
          ),
          // ── Main content ──────────────────────────────────────────────────
          SafeArea(
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                const Spacer(flex: 2),
                const PulseFitBrandBlock(compact: false, showTagline: true)
                    .animate()
                    .fadeIn(duration: 500.ms)
                    .scale(
                      begin: const Offset(0.92, 0.92),
                      end: const Offset(1.0, 1.0),
                      curve: Curves.easeOutCubic,
                      duration: 600.ms,
                    ),
                const Spacer(flex: 2),
                CupertinoActivityIndicator(
                  color: AppColors.accent.withValues(alpha: 0.7),
                  radius: 12,
                ).animate().fadeIn(delay: 500.ms, duration: 400.ms),
                const SizedBox(height: 56),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
