import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/cupertino.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/formatters.dart';
import '../../core/media_urls.dart';
import '../../providers/auth_providers.dart';
import '../../providers/me_providers.dart';
import '../../services/me_service.dart';
import '../../theme/app_colors.dart';
import '../../theme/app_theme.dart';
import '../../theme/app_typography.dart';
import '../../widgets/apple_grouped_list.dart';
import '../../widgets/empty_state.dart';
import '../../widgets/glass_card.dart';
import '../../widgets/press_scale.dart';
import '../../widgets/premium_background.dart';
import '../shell/shell_layout_metrics.dart';
import 'profile_edit_sheet.dart';
import '../../providers/sync_status_provider.dart';
import '../../widgets/skeleton_shimmer.dart';
import '../../widgets/sync_status_chip.dart';

class ProfileScreen extends ConsumerWidget {
  const ProfileScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final profile = ref.watch(profileProvider);
    return CupertinoPageScaffold(
      backgroundColor: AppColors.resolveBg(context),
      child: Stack(
        children: [
          const Positioned.fill(child: PremiumBackground()),
          SafeArea(
            bottom: false,
            child: CustomScrollView(
          physics: const BouncingScrollPhysics(parent: AlwaysScrollableScrollPhysics()),
          slivers: [
            CupertinoSliverNavigationBar(
              largeTitle: const Text('Profile'),
              border: null,
              trailing: const SyncStatusChip(),
            ),
            CupertinoSliverRefreshControl(
              onRefresh: () async {
                await MeService.instance.flushPendingWorkoutSessions();
                ref.invalidate(profileProvider);
                await ref.read(profileProvider.future);
                invalidateSyncStatus(ref);
              },
            ),
            SliverPadding(
              padding: ShellLayoutMetrics.scrollPadding(context),
              sliver: SliverList(
                delegate: SliverChildListDelegate([
                  profile.when(
                    loading: () => const SkeletonBlock(height: 140),
                    error: (e, _) => ErrorStateView(
                      message: e.toString(),
                      onRetry: () => ref.refresh(profileProvider),
                    ),
                    data: (p) => GlassCard(
                      padding: const EdgeInsets.all(AppSpacing.xl),
                      child: Row(
                        children: [
                          Container(
                            width: 64,
                            height: 64,
                            alignment: Alignment.center,
                            decoration: BoxDecoration(
                              gradient: AppColors.neonGradient,
                              borderRadius: BorderRadius.circular(AppRadius.lg),
                              boxShadow: [
                                BoxShadow(
                                  color: AppColors.neonPurple.withValues(alpha: 0.35),
                                  blurRadius: 14,
                                  offset: const Offset(0, 5),
                                ),
                              ],
                            ),
                            clipBehavior: Clip.antiAlias,
                            child: p.profilePictureUrl != null &&
                                    MediaUrls.resolve(p.profilePictureUrl!).isNotEmpty
                                ? CachedNetworkImage(
                                    imageUrl: MediaUrls.resolve(p.profilePictureUrl!),
                                    fit: BoxFit.cover,
                                    width: 64,
                                    height: 64,
                                    placeholder: (_, __) =>
                                        const CupertinoActivityIndicator(color: CupertinoColors.white),
                                    errorWidget: (_, __, ___) => Text(
                                      p.initials,
                                      style: AppType.title2.copyWith(
                                        color: CupertinoColors.white,
                                        fontWeight: FontWeight.w700,
                                      ),
                                    ),
                                  )
                                : Text(
                                    p.initials,
                                    style: AppType.title2.copyWith(
                                      color: CupertinoColors.white,
                                      fontWeight: FontWeight.w700,
                                    ),
                                  ),
                          ),
                          const SizedBox(width: AppSpacing.md),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  p.fullName.isEmpty ? 'Member' : p.fullName,
                                  style: AppType.title3.copyWith(
                                      color: AppColors.resolveText(context)),
                                ),
                                if (p.email.isNotEmpty)
                                  Padding(
                                    padding: const EdgeInsets.only(top: 2),
                                    child: Text(
                                      p.email,
                                      style: AppType.subhead.copyWith(
                                        color: AppColors.resolveTextSecondary(context),
                                      ),
                                    ),
                                  ),
                                if (p.phone != null)
                                  Padding(
                                    padding: const EdgeInsets.only(top: 2),
                                    child: Text(
                                      p.phone!,
                                      style: AppType.subhead.copyWith(
                                        color: AppColors.resolveTextSecondary(context),
                                      ),
                                    ),
                                  ),
                              ],
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                  const SizedBox(height: AppSpacing.lg),
                  GlassCard(
                    tint: AppColors.neonBlue.withValues(alpha: 0.08),
                    child: Row(
                      children: [
                        const Icon(CupertinoIcons.sparkles, color: AppColors.neonBlueLite, size: 18),
                        const SizedBox(width: 8),
                        Expanded(
                          child: Text(
                            'Your profile syncs automatically with the gym platform.',
                            style: AppType.footnote.copyWith(
                              color: AppColors.resolveTextSecondary(context),
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: AppSpacing.xl),
                  if (profile.asData?.value != null)
                    AppleGroupedSection(
                      header: 'Account',
                      children: [
                        _ActionRow(
                          icon: CupertinoIcons.pencil,
                          label: 'Edit profile',
                          onTap: () {
                            HapticFeedback.selectionClick();
                            final me = profile.asData!.value;
                            showCupertinoModalPopup<void>(
                              context: context,
                              builder: (modalContext) => Padding(
                                padding: EdgeInsets.only(
                                  bottom: MediaQuery.viewInsetsOf(modalContext).bottom,
                                ),
                                child: ProfileEditSheet(initial: me),
                              ),
                            );
                          },
                        ),
                      ],
                    ),
                  if (profile.asData?.value != null) const SizedBox(height: AppSpacing.lg),
                  AppleGroupedSection(
                    header: 'Member details',
                    children: [
                      _Row(
                        icon: CupertinoIcons.person_2,
                        label: 'Gender',
                        value: profile.value?.gender ?? '-',
                      ),
                      _Row(
                        icon: CupertinoIcons.gift,
                        label: 'Date of birth',
                        value: profile.value?.dateOfBirth == null
                            ? '-'
                            : Fmt.date(profile.value!.dateOfBirth!),
                      ),
                      _Row(
                        icon: CupertinoIcons.calendar,
                        label: 'Member since',
                        value: profile.value == null ? '-' : Fmt.date(profile.value!.registrationDate),
                      ),
                    ],
                  ),
                  const SizedBox(height: AppSpacing.lg),
                  AppleGroupedSection(
                    header: 'Preferences',
                    children: [
                      _ActionRow(icon: CupertinoIcons.bell, label: 'Notifications', onTap: () {}),
                      _ActionRow(
                        icon: CupertinoIcons.lock,
                        label: 'Privacy & security',
                        onTap: () {},
                      ),
                      _ActionRow(
                        icon: CupertinoIcons.question_circle,
                        label: 'Help & support',
                        onTap: () {},
                      ),
                    ],
                  ),
                  const SizedBox(height: AppSpacing.lg),
                  AppleGroupedSection(
                    children: [
                      _ActionRow(
                        icon: CupertinoIcons.square_arrow_right,
                        label: 'Sign out',
                        destructive: true,
                        onTap: () => _confirmSignOut(context, ref),
                      ),
                    ],
                  ),
                ]),
              ),
            ),
          ],
        ),
      ),
        ],
      ),
    );
  }

  void _confirmSignOut(BuildContext context, WidgetRef ref) {
    HapticFeedback.selectionClick();
    showCupertinoDialog<void>(
      context: context,
      builder: (dialogContext) => CupertinoAlertDialog(
        title: const Text('Sign out?'),
        content: const Text('You will need to sign in again to use the app.'),
        actions: [
          CupertinoDialogAction(
            onPressed: () => Navigator.of(dialogContext).pop(),
            child: const Text('Cancel'),
          ),
          CupertinoDialogAction(
            isDestructiveAction: true,
            onPressed: () async {
              Navigator.of(dialogContext).pop();
              await ref.read(authControllerProvider.notifier).logout();
              if (context.mounted) context.go('/login');
            },
            child: const Text('Sign out'),
          ),
        ],
      ),
    );
  }
}

class _Row extends StatelessWidget {
  const _Row({required this.icon, required this.label, required this.value});
  final IconData icon;
  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    return Padding(
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
          Text(
            value,
            style: AppType.subhead.copyWith(
              color: AppColors.resolveTextSecondary(context),
            ),
          ),
        ],
      ),
    );
  }
}

class _ActionRow extends StatelessWidget {
  const _ActionRow({
    required this.icon,
    required this.label,
    required this.onTap,
    this.destructive = false,
  });

  final IconData icon;
  final String label;
  final VoidCallback onTap;
  final bool destructive;

  @override
  Widget build(BuildContext context) {
    final color = destructive ? AppColors.danger : AppColors.resolveText(context);
    return PressScale(
      onTap: onTap,
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: AppSpacing.lg, vertical: AppSpacing.md),
        child: Row(
          children: [
            Icon(icon, size: 18, color: destructive ? AppColors.danger : AppColors.accent),
            const SizedBox(width: AppSpacing.md),
            Expanded(
              child: Text(
                label,
                style: AppType.body.copyWith(color: color),
              ),
            ),
            if (!destructive)
              Icon(CupertinoIcons.chevron_right,
                  size: 14, color: AppColors.resolveTextSecondary(context)),
          ],
        ),
      ),
    );
  }
}
