import 'package:flutter/cupertino.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/formatters.dart';
import '../../models/me_models.dart';
import '../../providers/me_providers.dart';
import '../../theme/app_colors.dart';
import '../../theme/app_theme.dart';
import '../../theme/app_typography.dart';
import '../../widgets/empty_state.dart';
import '../../widgets/glass_card.dart';
import '../../widgets/progress_ring.dart';
import '../../widgets/premium_background.dart';
import '../../widgets/skeleton_shimmer.dart';

class MembershipScreen extends ConsumerWidget {
  const MembershipScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final membership = ref.watch(membershipProvider);
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
            const CupertinoSliverNavigationBar(
              largeTitle: Text('Membership'),
              border: null,
            ),
            CupertinoSliverRefreshControl(
              onRefresh: () async => ref.refresh(membershipProvider),
            ),
            SliverPadding(
              padding: const EdgeInsets.fromLTRB(
                  AppSpacing.lg, 0, AppSpacing.lg, 120),
              sliver: SliverList(
                delegate: SliverChildListDelegate([
                  membership.when(
                    loading: () => const SkeletonBlock(height: 260),
                    error: (e, _) => ErrorStateView(
                      message: e.toString(),
                      onRetry: () => ref.refresh(membershipProvider),
                    ),
                    data: (data) => data == null
                        ? const EmptyState(
                            title: 'No active membership',
                            message: 'Contact the gym front desk to activate one.',
                            icon: CupertinoIcons.creditcard,
                          )
                        : _MembershipDetail(membership: data),
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
}

class _MembershipDetail extends StatelessWidget {
  const _MembershipDetail({required this.membership});
  final MeMembership membership;

  @override
  Widget build(BuildContext context) {
    final daysTotal =
        membership.durationDays ?? membership.endDate.difference(membership.startDate).inDays;
    final daysUsed =
        (daysTotal - membership.daysRemaining).clamp(0, daysTotal == 0 ? 1 : daysTotal);
    final progress = daysTotal == 0 ? 0.0 : (daysUsed / daysTotal).clamp(0.0, 1.0);
    final isExpiring = membership.isExpiringSoon;
    final goldColor = isExpiring ? AppColors.orange : AppColors.gold;

    return Column(
      children: [
        // ── Premium gold membership card ──────────────────────────────────
        ClipRRect(
          borderRadius: BorderRadius.circular(AppRadius.xl),
          child: Container(
            decoration: BoxDecoration(
              gradient: isExpiring
                  ? const LinearGradient(
                      colors: [Color(0xFF3D1800), Color(0xFF7A3000), Color(0xFF3D1800)],
                      stops: [0.0, 0.55, 1.0],
                      begin: Alignment.topLeft,
                      end: Alignment.bottomRight,
                    )
                  : AppColors.goldGradient,
              borderRadius: BorderRadius.circular(AppRadius.xl),
              boxShadow: [
                BoxShadow(
                  color: goldColor.withValues(alpha: 0.40),
                  blurRadius: 30,
                  offset: const Offset(0, 10),
                ),
              ],
            ),
            child: Stack(
              children: [
                // Gold shimmer overlay
                Positioned.fill(
                  child: DecoratedBox(
                    decoration: BoxDecoration(
                      gradient: AppColors.goldShimmer,
                      borderRadius: BorderRadius.circular(AppRadius.xl),
                    ),
                  ),
                ),
                // Decorative glows
                Positioned(
                  top: -32,
                  right: -32,
                  child: Container(
                    width: 140,
                    height: 140,
                    decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      color: goldColor.withValues(alpha: 0.10),
                    ),
                  ),
                ),
                Positioned(
                  bottom: -44,
                  right: 30,
                  child: Container(
                    width: 160,
                    height: 160,
                    decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      color: goldColor.withValues(alpha: 0.06),
                    ),
                  ),
                ),
                // Card content
                Padding(
                  padding: const EdgeInsets.all(AppSpacing.xl),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          Icon(CupertinoIcons.creditcard_fill, color: goldColor, size: 18),
                          const SizedBox(width: 8),
                          Text(
                            membership.status.toUpperCase(),
                            style: AppType.caption.copyWith(
                              color: goldColor,
                              fontWeight: FontWeight.w700,
                              letterSpacing: 1.5,
                            ),
                          ),
                          const Spacer(),
                          Container(
                            padding: const EdgeInsets.symmetric(
                                horizontal: 10, vertical: 4),
                            decoration: BoxDecoration(
                              color: goldColor.withValues(alpha: 0.18),
                              borderRadius: BorderRadius.circular(AppRadius.pill),
                              border: Border.all(
                                color: goldColor.withValues(alpha: 0.45),
                                width: 0.8,
                              ),
                            ),
                            child: Row(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                Icon(CupertinoIcons.star_fill,
                                    size: 10, color: goldColor),
                                const SizedBox(width: 4),
                                Text(
                                  'PREMIUM',
                                  style: AppType.caption.copyWith(
                                    color: goldColor,
                                    fontWeight: FontWeight.w700,
                                    letterSpacing: 1.2,
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: AppSpacing.lg),
                      Text(
                        membership.planName,
                        style: AppType.title1.copyWith(
                          color: CupertinoColors.white,
                          fontWeight: FontWeight.w800,
                        ),
                      ),
                      if (membership.price != null) ...[
                        const SizedBox(height: 4),
                        Text(
                          Fmt.currency(membership.price!),
                          style: AppType.body.copyWith(
                            color: goldColor.withValues(alpha: 0.80),
                            fontWeight: FontWeight.w500,
                          ),
                        ),
                      ],
                      const SizedBox(height: AppSpacing.xl),
                      Row(
                        crossAxisAlignment: CrossAxisAlignment.center,
                        children: [
                          ProgressRing(
                            progress: progress,
                            label: 'used',
                            valueText: '${(progress * 100).round()}%',
                            color: goldColor,
                          ),
                          const SizedBox(width: AppSpacing.xl),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                _CardRow(label: 'Start', value: Fmt.date(membership.startDate)),
                                const SizedBox(height: 8),
                                _CardRow(label: 'End', value: Fmt.date(membership.endDate)),
                                const SizedBox(height: 8),
                                _CardRow(
                                  label: 'Days left',
                                  value: membership.daysRemaining < 0
                                      ? '0'
                                      : membership.daysRemaining.toString(),
                                  highlight: isExpiring ? AppColors.orange : goldColor,
                                ),
                              ],
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
        )
            .animate()
            .fadeIn(duration: 400.ms)
            .slideY(begin: 0.04, end: 0, curve: Curves.easeOutCubic),
        const SizedBox(height: AppSpacing.lg),
        // ── Benefits / perks tiles ────────────────────────────────────────
        const Row(
          children: [
            Expanded(
              child: _PerkTile(
                icon: CupertinoIcons.clock,
                label: '24/7 Access',
                color: AppColors.accent,
              ),
            ),
            SizedBox(width: AppSpacing.md),
            Expanded(
              child: _PerkTile(
                icon: CupertinoIcons.person_2_fill,
                label: 'Trainer Support',
                color: AppColors.purple,
              ),
            ),
            SizedBox(width: AppSpacing.md),
            Expanded(
              child: _PerkTile(
                icon: CupertinoIcons.drop_fill,
                label: 'Locker Room',
                color: AppColors.success,
              ),
            ),
          ],
        ).animate().fadeIn(delay: 120.ms, duration: 400.ms),
        const SizedBox(height: AppSpacing.lg),
        // ── Expiry warning ────────────────────────────────────────────────
        if (isExpiring)
          GlassCard(
            tint: AppColors.danger.withValues(alpha: 0.12),
            child: Row(
              children: [
                Container(
                  width: 40,
                  height: 40,
                  alignment: Alignment.center,
                  decoration: BoxDecoration(
                    color: AppColors.danger.withValues(alpha: 0.18),
                    borderRadius: BorderRadius.circular(AppRadius.md),
                  ),
                  child: const Icon(
                    CupertinoIcons.exclamationmark_triangle_fill,
                    color: AppColors.danger,
                    size: 20,
                  ),
                ),
                const SizedBox(width: AppSpacing.md),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Membership Expiring Soon',
                        style: AppType.headline.copyWith(
                          color: AppColors.danger,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                      const SizedBox(height: 2),
                      Text(
                        'Please renew at the front desk to keep your access.',
                        style: AppType.footnote.copyWith(
                          color: AppColors.resolveTextSecondary(context),
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ).animate().fadeIn(delay: 200.ms, duration: 400.ms),
        const SizedBox(height: AppSpacing.lg),
        GlassCard(
          tint: AppColors.neonPurple.withValues(alpha: 0.08),
          child: Row(
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Renew membership',
                      style: AppType.headline.copyWith(
                        color: AppColors.resolveText(context),
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      'Keep uninterrupted access to workouts and attendance tracking.',
                      style: AppType.footnote.copyWith(
                        color: AppColors.resolveTextSecondary(context),
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(width: AppSpacing.md),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                decoration: BoxDecoration(
                  gradient: AppColors.primaryGradient,
                  borderRadius: BorderRadius.circular(AppRadius.lg),
                  boxShadow: AppColors.orangeGlow(opacity: 0.4, blur: 16),
                ),
                child: Text(
                  'Renew',
                  style: AppType.callout.copyWith(
                    color: CupertinoColors.white,
                    fontWeight: FontWeight.w700,
                  ),
                ),
              ),
            ],
          ),
        ).animate().fadeIn(delay: 260.ms, duration: 380.ms),
      ],
    );
  }
}

class _CardRow extends StatelessWidget {
  const _CardRow({required this.label, required this.value, this.highlight});
  final String label;
  final String value;
  final Color? highlight;

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(
          label,
          style: AppType.footnote.copyWith(
            color: CupertinoColors.white.withValues(alpha: 0.60),
          ),
        ),
        Text(
          value,
          style: AppType.callout.copyWith(
            color: highlight ?? CupertinoColors.white,
            fontWeight: FontWeight.w700,
          ),
        ),
      ],
    );
  }
}

class _PerkTile extends StatelessWidget {
  const _PerkTile({
    required this.icon,
    required this.label,
    required this.color,
  });

  final IconData icon;
  final String label;
  final Color color;

  @override
  Widget build(BuildContext context) {
    return GlassCard(
      padding: const EdgeInsets.symmetric(horizontal: AppSpacing.md, vertical: AppSpacing.lg),
      child: Column(
        children: [
          Container(
            width: 40,
            height: 40,
            alignment: Alignment.center,
            decoration: BoxDecoration(
              color: color.withValues(alpha: 0.18),
              borderRadius: BorderRadius.circular(AppRadius.md),
              border: Border.all(
                color: color.withValues(alpha: 0.30),
                width: 0.8,
              ),
            ),
            child: Icon(icon, color: color, size: 20),
          ),
          const SizedBox(height: 8),
          Text(
            label,
            textAlign: TextAlign.center,
            style: AppType.caption.copyWith(
              color: AppColors.resolveText(context),
              fontWeight: FontWeight.w600,
            ),
          ),
        ],
      ),
    );
  }
}
