import 'package:flutter/cupertino.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../providers/me_providers.dart';
import '../../services/support_service.dart';
import '../../theme/app_colors.dart';
import '../../theme/app_theme.dart';
import '../../theme/app_typography.dart';
import '../../widgets/apple_grouped_list.dart';
import '../../widgets/empty_state.dart';
import '../../widgets/press_scale.dart';
import '../../widgets/premium_background.dart';
import 'in_app_web_screen.dart';

class PrivacyScreen extends ConsumerWidget {
  const PrivacyScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final supportAsync = ref.watch(memberSupportProvider);
    final compileLinks = ref.watch(compileTimeLegalLinksProvider);

    return CupertinoPageScaffold(
      backgroundColor: AppColors.resolveBg(context),
      navigationBar: CupertinoNavigationBar(
        middle: const Text('Privacy'),
        leading: CupertinoNavigationBarBackButton(
          onPressed: () => context.pop(),
        ),
      ),
      child: Stack(
        children: [
          const Positioned.fill(child: PremiumBackground()),
          SafeArea(
            child: supportAsync.when(
              loading: () => const Center(child: CupertinoActivityIndicator()),
              error: (e, _) => ListView(
                padding: const EdgeInsets.all(AppSpacing.lg),
                children: [
                  ErrorStateView(
                    message: 'Privacy details could not be loaded. Check your connection and try again.',
                    onRetry: () => ref.invalidate(memberSupportProvider),
                  ),
                  const SizedBox(height: AppSpacing.xl),
                  _AccountControls(
                    onNotifications: () {
                      HapticFeedback.selectionClick();
                      context.push('/profile/notifications');
                    },
                    onSecurity: () {
                      HapticFeedback.selectionClick();
                      context.push('/profile/security');
                    },
                  ),
                ],
              ),
              data: (support) {
                final policyUrl = SupportService.mergePrivacyUrl(
                  support,
                  compileLinks.privacyPolicyUrl,
                );

                return ListView(
                  padding: const EdgeInsets.all(AppSpacing.lg),
                  children: [
                    if (policyUrl != null)
                      AppleGroupedSection(
                        header: 'Policy',
                        children: [
                          _NavRow(
                            key: const Key('open-privacy-policy'),
                            icon: CupertinoIcons.doc_plaintext,
                            label: 'Open privacy policy',
                            onTap: () {
                              HapticFeedback.selectionClick();
                              context.push(
                                '/profile/document',
                                extra: InAppWebArgs(
                                  title: 'Privacy policy',
                                  url: policyUrl,
                                ),
                              );
                            },
                          ),
                        ],
                      )
                    else
                      const EmptyState(
                        key: Key('privacy-unavailable'),
                        icon: CupertinoIcons.lock,
                        title: 'Privacy policy is not available',
                        message:
                            'The gym has not published a privacy policy URL. You can still manage notification and device settings below.',
                      ),
                    const SizedBox(height: AppSpacing.lg),
                    _AccountControls(
                      onNotifications: () {
                        HapticFeedback.selectionClick();
                        context.push('/profile/notifications');
                      },
                      onSecurity: () {
                        HapticFeedback.selectionClick();
                        context.push('/profile/security');
                      },
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

class _AccountControls extends StatelessWidget {
  const _AccountControls({
    required this.onNotifications,
    required this.onSecurity,
  });

  final VoidCallback onNotifications;
  final VoidCallback onSecurity;

  @override
  Widget build(BuildContext context) {
    return AppleGroupedSection(
      header: 'Your account',
      footer: 'Notification opt-in and signed-in devices are the privacy controls available in this app.',
      children: [
        _NavRow(
          key: const Key('privacy-notifications'),
          icon: CupertinoIcons.bell,
          label: 'Notification preferences',
          onTap: onNotifications,
        ),
        _NavRow(
          key: const Key('privacy-security'),
          icon: CupertinoIcons.shield,
          label: 'Security & devices',
          onTap: onSecurity,
        ),
      ],
    );
  }
}

class _NavRow extends StatelessWidget {
  const _NavRow({
    super.key,
    required this.icon,
    required this.label,
    required this.onTap,
  });

  final IconData icon;
  final String label;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return PressScale(
      onTap: onTap,
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: AppSpacing.lg, vertical: AppSpacing.md),
        child: Row(
          children: [
            Icon(icon, size: 18, color: AppColors.accent),
            const SizedBox(width: AppSpacing.md),
            Expanded(
              child: Text(
                label,
                style: AppType.body.copyWith(color: AppColors.resolveText(context)),
              ),
            ),
            Icon(
              CupertinoIcons.chevron_right,
              size: 14,
              color: AppColors.resolveTextSecondary(context),
            ),
          ],
        ),
      ),
    );
  }
}
