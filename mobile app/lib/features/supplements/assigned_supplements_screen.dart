import 'package:flutter/cupertino.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/formatters.dart';
import '../../core/member_access.dart';
import '../../models/member_supplement_models.dart';
import '../../providers/health_providers.dart';
import '../../theme/app_colors.dart';
import '../../theme/app_theme.dart';
import '../../theme/app_typography.dart';
import '../../widgets/empty_state.dart';
import '../../widgets/glass_card.dart';
import '../../widgets/premium_background.dart';
import '../../widgets/press_scale.dart';
import '../../widgets/skeleton_shimmer.dart';

class AssignedSupplementsScreen extends ConsumerWidget {
  const AssignedSupplementsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final async = ref.watch(assignedSupplementsProvider);

    return CupertinoPageScaffold(
      backgroundColor: AppColors.resolveBg(context),
      navigationBar: CupertinoNavigationBar(
        middle: const Text('Assigned supplements'),
        leading: CupertinoNavigationBarBackButton(onPressed: () => context.pop()),
      ),
      child: Stack(
        children: [
          const Positioned.fill(child: PremiumBackground()),
          SafeArea(
            child: async.when(
              loading: () => const Padding(
                padding: EdgeInsets.all(AppSpacing.lg),
                child: SkeletonBlock(height: 180),
              ),
              error: (e, _) {
                if (MemberAccessCopy.isForbidden(e)) {
                  return const EmptyState(
                    title: MemberAccessCopy.accessDeniedTitle,
                    message: MemberAccessCopy.accessDeniedBody,
                    icon: CupertinoIcons.lock,
                  );
                }
                return ErrorStateView(
                  message: MemberAccessCopy.message(e, fallback: 'Could not load your supplements.'),
                  onRetry: () => ref.invalidate(assignedSupplementsProvider),
                );
              },
              data: (items) {
                if (items.isEmpty) {
                  return const EmptyState(
                    title: 'No protocol assigned yet',
                    message:
                        'Your coach or front desk will add your assigned supplement protocol here. This is not a purchase history.',
                    icon: CupertinoIcons.cube_box,
                  );
                }
                return ListView(
                  padding: const EdgeInsets.all(AppSpacing.lg),
                  children: [
                    Text(
                      'Assigned protocol on your account — dosage, timing, and coach instructions. Read-only.',
                      style: AppType.footnote.copyWith(color: AppColors.resolveTextSecondary(context)),
                    ),
                    const SizedBox(height: AppSpacing.lg),
                    for (final item in items) ...[
                      _SupplementCard(item: item),
                      const SizedBox(height: AppSpacing.md),
                    ],
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

class AssignedSupplementsLinkCard extends StatelessWidget {
  const AssignedSupplementsLinkCard({super.key});

  @override
  Widget build(BuildContext context) {
    return PressScale(
      onTap: () => context.push('/profile/supplements'),
      child: GlassCard(
        child: Row(
          children: [
            const Icon(CupertinoIcons.cube_box, color: AppColors.accent, size: 20),
            const SizedBox(width: AppSpacing.md),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Assigned supplements',
                    style: AppType.body.copyWith(color: AppColors.resolveText(context)),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    'Coach protocol — dosage and timing (not a food log).',
                    style: AppType.footnote.copyWith(color: AppColors.resolveTextSecondary(context)),
                  ),
                ],
              ),
            ),
            Icon(CupertinoIcons.chevron_right, size: 14, color: AppColors.resolveTextSecondary(context)),
          ],
        ),
      ),
    );
  }
}

class _SupplementCard extends StatelessWidget {
  const _SupplementCard({required this.item});
  final MemberSupplementAssignment item;

  @override
  Widget build(BuildContext context) {
    final duration = [
      if (item.startDate != null) Fmt.date(item.startDate!),
      item.endDate != null ? Fmt.date(item.endDate!) : 'Ongoing',
    ].join(' → ');
    final remaining = item.daysRemaining != null
        ? '${item.daysRemaining} days'
        : item.isCurrentlyActive
            ? 'Open-ended'
            : '—';

    return GlassCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            item.category.toUpperCase(),
            style: AppType.caption.copyWith(color: AppColors.accent, letterSpacing: 0.6),
          ),
          const SizedBox(height: 4),
          Text(item.supplementName, style: AppType.title3.copyWith(color: AppColors.resolveText(context))),
          if (item.assignedByName != null && item.assignedByName!.trim().isNotEmpty) ...[
            const SizedBox(height: 4),
            Text(
              'Assigned by ${item.assignedByName}',
              style: AppType.footnote.copyWith(color: AppColors.resolveTextSecondary(context)),
            ),
          ],
          const SizedBox(height: 6),
          Text(
            item.status,
            style: AppType.caption.copyWith(color: AppColors.resolveTextSecondary(context)),
          ),
          const SizedBox(height: AppSpacing.md),
          _kv(context, 'Dosage', item.dosage),
          _kv(context, 'Timing', item.timingLabel.isEmpty ? item.timing : item.timingLabel),
          _kv(context, 'Duration', duration),
          _kv(context, 'Remaining', remaining),
          if (item.instructions != null && item.instructions!.trim().isNotEmpty) ...[
            const SizedBox(height: AppSpacing.sm),
            Text(item.instructions!, style: AppType.footnote.copyWith(color: AppColors.resolveText(context))),
          ],
          if (item.notes != null && item.notes!.trim().isNotEmpty) ...[
            const SizedBox(height: 4),
            Text(item.notes!, style: AppType.footnote.copyWith(color: AppColors.resolveTextSecondary(context))),
          ],
          if (item.productName != null && item.productName!.trim().isNotEmpty) ...[
            const SizedBox(height: 8),
            Text(
              'Linked product: ${item.productName}',
              style: AppType.caption.copyWith(color: AppColors.resolveTextSecondary(context)),
            ),
          ],
        ],
      ),
    );
  }

  Widget _kv(BuildContext context, String k, String v) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 6),
      child: Row(
        children: [
          SizedBox(
            width: 88,
            child: Text(k, style: AppType.caption.copyWith(color: AppColors.resolveTextSecondary(context))),
          ),
          Expanded(
            child: Text(v, style: AppType.subhead.copyWith(color: AppColors.resolveText(context))),
          ),
        ],
      ),
    );
  }
}
