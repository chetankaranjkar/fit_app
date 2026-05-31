import 'package:flutter/cupertino.dart';
import 'package:flutter/services.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';

import '../../animations/app_motion.dart';
import '../../models/device_security_models.dart';
import '../../providers/auth_providers.dart';
import '../../providers/device_security_providers.dart';
import '../../services/device_security_service.dart';
import '../../theme/app_colors.dart';
import '../../theme/app_theme.dart';
import '../../theme/app_typography.dart';
import '../../widgets/empty_state.dart';
import '../../widgets/glass_card.dart';
import '../../widgets/press_scale.dart';
import '../../widgets/premium_background.dart';
import '../../widgets/skeleton_shimmer.dart';

class SecurityDevicesScreen extends ConsumerWidget {
  const SecurityDevicesScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final devices = ref.watch(userDevicesProvider);

    return CupertinoPageScaffold(
      backgroundColor: AppColors.resolveBg(context),
      child: Stack(
        children: [
          const Positioned.fill(child: PremiumBackground()),
          SafeArea(
            child: CustomScrollView(
              physics: const BouncingScrollPhysics(parent: AlwaysScrollableScrollPhysics()),
              slivers: [
                CupertinoSliverNavigationBar(
                  largeTitle: const Text('Security & Devices'),
                  border: null,
                  leading: CupertinoNavigationBarBackButton(
                    onPressed: () => context.pop(),
                  ),
                ),
                CupertinoSliverRefreshControl(
                  onRefresh: () async {
                    ref.invalidate(userDevicesProvider);
                    await ref.read(userDevicesProvider.future);
                  },
                ),
                SliverPadding(
                  padding: const EdgeInsets.all(AppSpacing.lg),
                  sliver: SliverList(
                    delegate: SliverChildListDelegate([
                      devices.when(
                        loading: () => const SkeletonBlock(height: 220),
                        error: (e, _) => ErrorStateView(
                          message: e.toString(),
                          onRetry: () => ref.invalidate(userDevicesProvider),
                        ),
                        data: (list) => Column(
                          crossAxisAlignment: CrossAxisAlignment.stretch,
                          children: [
                            _SectionHeader(
                              title: 'This device',
                              icon: CupertinoIcons.device_phone_portrait,
                            ),
                            const SizedBox(height: AppSpacing.sm),
                            ...list.where((d) => d.isCurrent).map((d) => _DeviceCard(device: d)),
                            if (list.where((d) => d.isCurrent).isEmpty)
                              const GlassCard(
                                child: Text('Current device will appear after your next login.'),
                              ),
                            const SizedBox(height: AppSpacing.xl),
                            _SectionHeader(
                              title: 'Other devices',
                              icon: CupertinoIcons.square_stack_3d_up,
                            ),
                            const SizedBox(height: AppSpacing.sm),
                            ...list.where((d) => !d.isCurrent).map(
                                  (d) => _DeviceCard(
                                    device: d,
                                    onRemove: () => _confirmRemove(context, ref, d),
                                  ),
                                ),
                            if (list.where((d) => !d.isCurrent).isEmpty)
                              GlassCard(
                                child: Text(
                                  'No other active devices.',
                                  style: AppType.subhead.copyWith(
                                    color: AppColors.resolveTextSecondary(context),
                                  ),
                                ),
                              ),
                            const SizedBox(height: AppSpacing.xl),
                            PressScale(
                              onTap: () => context.push('/profile/security/login-history'),
                              child: GlassCard(
                                child: Row(
                                  children: [
                                    Icon(CupertinoIcons.clock, color: AppColors.accent, size: 20),
                                    const SizedBox(width: AppSpacing.md),
                                    Expanded(
                                      child: Text(
                                        'Login history',
                                        style: AppType.body.copyWith(
                                          color: AppColors.resolveText(context),
                                        ),
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
                            ),
                            const SizedBox(height: AppSpacing.lg),
                            CupertinoButton(
                              padding: EdgeInsets.zero,
                              onPressed: () => _confirmLogoutAll(context, ref),
                              child: Text(
                                'Logout from all devices',
                                style: AppType.body.copyWith(color: AppColors.danger),
                              ),
                            ),
                          ],
                        ),
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

  Future<void> _confirmRemove(BuildContext context, WidgetRef ref, UserDeviceInfo device) async {
    HapticFeedback.selectionClick();
    final ok = await showCupertinoDialog<bool>(
      context: context,
      builder: (ctx) => CupertinoAlertDialog(
        title: const Text('Remove device?'),
        content: Text(
          '${device.displayName} will be signed out and must log in again.',
        ),
        actions: [
          CupertinoDialogAction(
            onPressed: () => Navigator.pop(ctx, false),
            child: const Text('Cancel'),
          ),
          CupertinoDialogAction(
            isDestructiveAction: true,
            onPressed: () => Navigator.pop(ctx, true),
            child: const Text('Remove'),
          ),
        ],
      ),
    );
    if (ok != true || !context.mounted) return;

    await DeviceSecurityService.instance.removeDevice(device.deviceId);
    ref.invalidate(userDevicesProvider);
  }

  Future<void> _confirmLogoutAll(BuildContext context, WidgetRef ref) async {
    HapticFeedback.selectionClick();
    final ok = await showCupertinoDialog<bool>(
      context: context,
      builder: (ctx) => CupertinoAlertDialog(
        title: const Text('Logout from all devices?'),
        content: const Text(
          'Every active session will end. You will need to sign in again on each device.',
        ),
        actions: [
          CupertinoDialogAction(
            onPressed: () => Navigator.pop(ctx, false),
            child: const Text('Cancel'),
          ),
          CupertinoDialogAction(
            isDestructiveAction: true,
            onPressed: () => Navigator.pop(ctx, true),
            child: const Text('Logout all'),
          ),
        ],
      ),
    );
    if (ok != true || !context.mounted) return;

    await DeviceSecurityService.instance.logoutAllDevices();
    await ref.read(authControllerProvider.notifier).logout();
    if (context.mounted) context.go('/login');
  }
}

class LoginHistoryScreen extends ConsumerWidget {
  const LoginHistoryScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final history = ref.watch(loginHistoryProvider);
    final dateFmt = DateFormat('d MMM yyyy');
    final timeFmt = DateFormat('h:mm a');

    return CupertinoPageScaffold(
      backgroundColor: AppColors.resolveBg(context),
      child: Stack(
        children: [
          const Positioned.fill(child: PremiumBackground()),
          SafeArea(
            child: CustomScrollView(
              slivers: [
                CupertinoSliverNavigationBar(
                  largeTitle: const Text('Login History'),
                  border: null,
                  leading: CupertinoNavigationBarBackButton(onPressed: () => context.pop()),
                ),
                CupertinoSliverRefreshControl(
                  onRefresh: () async {
                    ref.invalidate(loginHistoryProvider);
                    await ref.read(loginHistoryProvider.future);
                  },
                ),
                SliverPadding(
                  padding: const EdgeInsets.all(AppSpacing.lg),
                  sliver: history.when(
                    loading: () => SliverToBoxAdapter(child: SkeletonBlock(height: 200)),
                    error: (e, _) => SliverToBoxAdapter(
                      child: ErrorStateView(
                        message: e.toString(),
                        onRetry: () => ref.invalidate(loginHistoryProvider),
                      ),
                    ),
                    data: (items) => SliverList(
                      delegate: SliverChildBuilderDelegate(
                        (context, index) {
                          final item = items[index];
                          final statusColor = item.loginStatus.toLowerCase() == 'successful'
                              ? AppColors.neonBlueLite
                              : item.loginStatus.toLowerCase() == 'blocked'
                                  ? AppColors.danger
                                  : AppColors.warning;
                          return Padding(
                            padding: const EdgeInsets.only(bottom: AppSpacing.md),
                            child: GlassCard(
                              child: Row(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Container(
                                    width: 40,
                                    height: 40,
                                    decoration: BoxDecoration(
                                      color: statusColor.withValues(alpha: 0.15),
                                      borderRadius: BorderRadius.circular(12),
                                    ),
                                    child: Icon(
                                      item.isSuspicious
                                          ? CupertinoIcons.exclamationmark_shield
                                          : CupertinoIcons.device_phone_portrait,
                                      color: statusColor,
                                      size: 20,
                                    ),
                                  ),
                                  const SizedBox(width: AppSpacing.md),
                                  Expanded(
                                    child: Column(
                                      crossAxisAlignment: CrossAxisAlignment.start,
                                      children: [
                                        Text(
                                          dateFmt.format(item.loginDate.toLocal()),
                                          style: AppType.subhead.copyWith(
                                            color: AppColors.resolveTextSecondary(context),
                                          ),
                                        ),
                                        const SizedBox(height: 4),
                                        Text(
                                          item.deviceLabel,
                                          style: AppType.body.copyWith(
                                            color: AppColors.resolveText(context),
                                            fontWeight: FontWeight.w600,
                                          ),
                                        ),
                                        Text(
                                          '${timeFmt.format(item.loginDate.toLocal())} · ${item.loginStatus}',
                                          style: AppType.footnote.copyWith(color: statusColor),
                                        ),
                                      ],
                                    ),
                                  ),
                                ],
                              ),
                            )
                                .animate()
                                .fadeIn(duration: AppFx.regular, delay: (40 * index).ms)
                                .slideY(begin: 0.03, end: 0),
                          );
                        },
                        childCount: items.length,
                      ),
                    ),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _SectionHeader extends StatelessWidget {
  const _SectionHeader({required this.title, required this.icon});
  final String title;
  final IconData icon;

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Icon(icon, size: 16, color: AppColors.accent),
        const SizedBox(width: 8),
        Text(
          title.toUpperCase(),
          style: AppType.caption.copyWith(
            color: AppColors.resolveTextSecondary(context),
            letterSpacing: 1.2,
            fontWeight: FontWeight.w700,
          ),
        ),
      ],
    );
  }
}

class _DeviceCard extends StatelessWidget {
  const _DeviceCard({required this.device, this.onRemove});
  final UserDeviceInfo device;
  final VoidCallback? onRemove;

  @override
  Widget build(BuildContext context) {
    final icon = device.platform?.toLowerCase().contains('ios') == true
        ? CupertinoIcons.device_phone_portrait
        : CupertinoIcons.device_laptop;

    return Padding(
      padding: const EdgeInsets.only(bottom: AppSpacing.sm),
      child: GlassCard(
        child: Row(
          children: [
            Container(
              width: 44,
              height: 44,
              decoration: BoxDecoration(
                gradient: AppColors.neonGradient,
                borderRadius: BorderRadius.circular(14),
              ),
              child: Icon(icon, color: CupertinoColors.white, size: 22),
            ),
            const SizedBox(width: AppSpacing.md),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Expanded(
                        child: Text(
                          device.displayName,
                          style: AppType.body.copyWith(
                            color: AppColors.resolveText(context),
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                      ),
                      if (device.isCurrent)
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                          decoration: BoxDecoration(
                            color: AppColors.neonBlue.withValues(alpha: 0.15),
                            borderRadius: BorderRadius.circular(999),
                          ),
                          child: Text(
                            'Current',
                            style: AppType.caption.copyWith(color: AppColors.neonBlueLite),
                          ),
                        ),
                    ],
                  ),
                  const SizedBox(height: 2),
                  Text(
                    'Last active: ${device.lastActiveLabel.isEmpty ? 'Recently' : device.lastActiveLabel}',
                    style: AppType.footnote.copyWith(
                      color: AppColors.resolveTextSecondary(context),
                    ),
                  ),
                ],
              ),
            ),
            if (onRemove != null)
              CupertinoButton(
                padding: EdgeInsets.zero,
                minSize: 0,
                onPressed: onRemove,
                child: const Icon(CupertinoIcons.trash, color: AppColors.danger, size: 20),
              ),
          ],
        ),
      ),
    ).animate().fadeIn(duration: AppFx.regular).slideY(begin: 0.04, end: 0);
  }
}
