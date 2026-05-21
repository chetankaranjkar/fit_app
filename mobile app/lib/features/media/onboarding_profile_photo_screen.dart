import 'package:flutter/cupertino.dart';
import 'package:flutter/services.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../../animations/app_motion.dart';
import '../../core/api_exception.dart';
import '../../providers/me_providers.dart';
import '../../services/me_service.dart';
import '../../theme/app_colors.dart';
import '../../theme/app_theme.dart';
import '../../theme/app_typography.dart';
import '../../widgets/glass_card.dart';
import '../../widgets/premium_background.dart';
import 'premium_media_flow.dart';

const kProfilePhotoPromptDismissedKey = 'pulsefit_profile_photo_prompt_dismissed';

/// Optional Step 2 after sign-in: profile photo (take, upload, or skip).
class OnboardingProfilePhotoScreen extends ConsumerWidget {
  const OnboardingProfilePhotoScreen({super.key});

  Future<void> _skip(BuildContext context) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setBool(kProfilePhotoPromptDismissedKey, true);
    if (context.mounted) context.go('/home');
  }

  Future<void> _upload(BuildContext context, WidgetRef ref) async {
    HapticFeedback.selectionClick();
    final picked = await runPremiumMediaCapture(context, kind: PremiumMediaKind.profile);
    if (!context.mounted || picked == null) return;
    try {
      await MeService.instance.uploadProfilePhoto(picked.bytes, picked.fileName);
      final prefs = await SharedPreferences.getInstance();
      await prefs.setBool(kProfilePhotoPromptDismissedKey, true);
      ref.invalidate(profileProvider);
      ref.invalidate(dashboardProvider);
      if (!context.mounted) return;
      context.go('/home');
    } on ApiException catch (e) {
      if (!context.mounted) return;
      showCupertinoDialog<void>(
        context: context,
        builder: (c) => CupertinoAlertDialog(
          title: const Text('Upload failed'),
          content: Text(e.message),
          actions: [CupertinoDialogAction(onPressed: () => Navigator.pop(c), child: const Text('OK'))],
        ),
      );
    }
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return CupertinoPageScaffold(
      backgroundColor: AppColors.resolveBg(context),
      child: Stack(
        children: [
          const Positioned.fill(child: PremiumBackground()),
          SafeArea(
            child: Padding(
              padding: const EdgeInsets.all(AppSpacing.lg),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  const SizedBox(height: 8),
                  Text(
                    'Almost there',
                    style: AppType.title2.copyWith(color: AppColors.resolveText(context)),
                  ).animate().fadeIn(duration: AppFx.regular),
                  const SizedBox(height: 8),
                  Text(
                    'Step 2 · Add a profile photo',
                    style: AppType.footnote.copyWith(color: AppColors.resolveTextSecondary(context)),
                  ).animate().fadeIn(duration: AppFx.regular, delay: 40.ms),
                  const SizedBox(height: AppSpacing.xl),
                  GlassCard(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.stretch,
                      children: [
                        Row(
                          children: [
                            Container(
                              width: 72,
                              height: 72,
                              decoration: BoxDecoration(
                                shape: BoxShape.circle,
                                gradient: AppColors.neonGradient,
                                boxShadow: [
                                  BoxShadow(
                                    color: AppColors.neonPurple.withValues(alpha: 0.35),
                                    blurRadius: 16,
                                    offset: const Offset(0, 6),
                                  ),
                                ],
                              ),
                              alignment: Alignment.center,
                              child: Icon(CupertinoIcons.person_fill, size: 32, color: AppColors.resolveText(context)),
                            ),
                            const SizedBox(width: 16),
                            Expanded(
                              child: Text(
                                'A clear face photo helps trainers recognize you and secures your check-ins.',
                                style: AppType.subhead.copyWith(color: AppColors.resolveTextSecondary(context), height: 1.35),
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: AppSpacing.lg),
                        CupertinoButton.filled(
                          borderRadius: BorderRadius.circular(AppRadius.lg),
                          onPressed: () => _upload(context, ref),
                          child: const Text('Take or upload photo'),
                        ),
                        const SizedBox(height: AppSpacing.sm),
                        CupertinoButton(
                          onPressed: () => _skip(context),
                          child: Text(
                            'Skip for now',
                            style: AppType.body.copyWith(color: AppColors.resolveTextSecondary(context)),
                          ),
                        ),
                      ],
                    ),
                  ).animate().fadeIn(duration: AppFx.relaxed, delay: 80.ms).moveY(begin: 12, end: 0, curve: Curves.easeOutCubic),
                  const Spacer(),
                  Text(
                    'You can change this anytime in Profile.',
                    textAlign: TextAlign.center,
                    style: AppType.caption.copyWith(color: AppColors.resolveTextSecondary(context)),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}
