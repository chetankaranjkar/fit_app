import 'package:flutter/cupertino.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/api_exception.dart';
import '../../core/formatters.dart';
import '../../models/me_models.dart';
import '../../providers/me_providers.dart';
import '../../services/me_service.dart';
import '../../theme/app_colors.dart';
import '../../theme/app_theme.dart';
import '../../theme/app_typography.dart';
import '../../widgets/empty_state.dart';
import '../../widgets/glass_card.dart';
import '../../widgets/premium_background.dart';
import '../../widgets/skeleton_shimmer.dart';

class NotificationsScreen extends ConsumerWidget {
  const NotificationsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final notifications = ref.watch(notificationsProvider);

    return CupertinoPageScaffold(
      backgroundColor: AppColors.resolveBg(context),
      child: Stack(
        children: [
          const Positioned.fill(child: PremiumBackground()),
          SafeArea(
            child: notifications.when(
              loading: () => const Center(child: SkeletonBlock(height: 220)),
              error: (e, _) => Center(
                child: Padding(
                  padding: const EdgeInsets.all(AppSpacing.lg),
                  child: Text(
                    e.toString(),
                    textAlign: TextAlign.center,
                    style: AppType.body.copyWith(color: AppColors.resolveTextSecondary(context)),
                  ),
                ),
              ),
              data: (rows) => CustomScrollView(
                physics: const BouncingScrollPhysics(parent: AlwaysScrollableScrollPhysics()),
                slivers: [
                  CupertinoSliverNavigationBar(
                    largeTitle: const Text('Notifications'),
                    border: null,
                    trailing: rows.any((n) => !n.isRead)
                        ? CupertinoButton(
                            padding: EdgeInsets.zero,
                            onPressed: () => ref.refresh(notificationsProvider),
                            child: Text(
                              'Refresh',
                              style: AppType.callout.copyWith(color: AppColors.accent),
                            ),
                          )
                        : null,
                  ),
                  CupertinoSliverRefreshControl(
                    onRefresh: () async {
                      ref.invalidate(notificationsProvider);
                      ref.invalidate(dashboardProvider);
                      await ref.read(notificationsProvider.future);
                    },
                  ),
                  if (rows.isEmpty)
                    const SliverFillRemaining(
                      hasScrollBody: false,
                      child: Padding(
                        padding: EdgeInsets.all(AppSpacing.lg),
                        child: EmptyState(
                          title: 'All caught up',
                          message: 'Membership reminders and workout alerts will appear here.',
                          icon: CupertinoIcons.bell,
                        ),
                      ),
                    )
                  else
                    SliverPadding(
                      padding: const EdgeInsets.fromLTRB(
                        AppSpacing.lg,
                        AppSpacing.md,
                        AppSpacing.lg,
                        AppSpacing.xl,
                      ),
                      sliver: SliverList(
                        delegate: SliverChildBuilderDelegate(
                          (context, index) {
                            final item = rows[index];
                            return Padding(
                              padding: const EdgeInsets.only(bottom: AppSpacing.md),
                              child: _NotificationCard(
                                notification: item,
                                onTap: () => _openNotification(context, ref, item),
                              ),
                            );
                          },
                          childCount: rows.length,
                        ),
                      ),
                    ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  Future<void> _openNotification(
    BuildContext context,
    WidgetRef ref,
    MeNotification notification,
  ) async {
    if (!notification.isRead) {
      try {
        await MeService.instance.markNotificationRead(notification.id);
        ref.invalidate(notificationsProvider);
        ref.invalidate(dashboardProvider);
      } on ApiException {
        // Still navigate even if mark-read fails.
      }
    }

    if (!context.mounted) return;
    if (notification.isWorkoutToday) {
      context.go('/workouts');
      return;
    }
    if (notification.isMembershipExpiring || notification.isPaymentDue) {
      context.go('/membership');
    }
  }
}

class _NotificationCard extends StatelessWidget {
  const _NotificationCard({required this.notification, required this.onTap});

  final MeNotification notification;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final urgent = !notification.isRead &&
        (notification.isMembershipExpiring || notification.isPaymentDue);
    return GestureDetector(
      onTap: onTap,
      child: GlassCard(
        tint: urgent ? AppColors.gold.withValues(alpha: 0.10) : null,
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Icon(
              _iconFor(notification),
              color: urgent ? AppColors.orange : AppColors.accent,
              size: 22,
            ),
            const SizedBox(width: AppSpacing.md),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    notification.title,
                    style: AppType.headline.copyWith(color: AppColors.resolveText(context)),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    notification.displayMessage,
                    style: AppType.body.copyWith(
                      color: AppColors.resolveTextSecondary(context),
                      height: 1.35,
                    ),
                  ),
                  const SizedBox(height: 6),
                  Text(
                    Fmt.date(notification.createdAt.toLocal()),
                    style: AppType.caption.copyWith(
                      color: AppColors.resolveTextSecondary(context),
                    ),
                  ),
                ],
              ),
            ),
            if (!notification.isRead)
              Container(
                width: 8,
                height: 8,
                margin: const EdgeInsets.only(top: 6),
                decoration: const BoxDecoration(
                  color: AppColors.accent,
                  shape: BoxShape.circle,
                ),
              ),
          ],
        ),
      ),
    );
  }

  IconData _iconFor(MeNotification notification) {
    if (notification.isWorkoutToday) return CupertinoIcons.flame_fill;
    if (notification.isPaymentDue) return CupertinoIcons.money_dollar_circle_fill;
    if (notification.isMembershipExpiring) return CupertinoIcons.exclamationmark_circle_fill;
    return CupertinoIcons.bell_fill;
  }
}
