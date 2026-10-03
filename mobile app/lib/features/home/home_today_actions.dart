import 'package:flutter/cupertino.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/formatters.dart';
import '../../models/me_models.dart';
import '../../providers/me_providers.dart';
import '../../providers/sync_status_provider.dart';
import '../../providers/workout_tracking_providers.dart';
import '../../theme/app_colors.dart';
import '../../theme/app_theme.dart';
import '../../theme/app_typography.dart';
import '../../widgets/glass_card.dart';
import '../../widgets/press_scale.dart';
import '../../workout_sync/models/workout_sync_enums.dart';
import '../workouts/workout_flow_launcher.dart';
import 'home_action_resolver.dart';

final todayAssignedTemplateProvider =
    FutureProvider.autoDispose<MeWorkoutSessionTemplate?>((ref) async {
  final plans = await ref.watch(workoutPlansProvider.future);
  if (plans.isEmpty) return null;
  return ref.watch(workoutSessionTemplateProvider(plans.first.id).future);
});

/// Scan, today’s workout, and membership/payment — derived from existing providers.
class HomeTodayActions extends ConsumerWidget {
  const HomeTodayActions({super.key, this.dashboard});

  final MeDashboard? dashboard;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final sync = ref.watch(syncStatusProvider).valueOrNull;
    final offline = sync != null &&
        (sync.displayState == WorkoutSyncDisplayState.offline || !sync.hasDeviceNetwork);
    final membership = dashboard?.membership;
    final billing = ref.watch(billingAccessProvider);
    final payment = ref.watch(onlinePaymentSummaryProvider);
    final plansAsync = ref.watch(workoutPlansProvider);
    final templateAsync = ref.watch(todayAssignedTemplateProvider);
    final activeAsync = ref.watch(activeWorkoutProvider);

    final plans = plansAsync.valueOrNull ?? const <MeWorkoutPlanSummary>[];
    final templateFailed = templateAsync.hasError;
    final template = templateAsync.valueOrNull;
    final active = activeAsync.valueOrNull;

    final actions = resolveHomePrimaryActions(
      membership: membership,
      billing: billing.valueOrNull,
      payment: payment.valueOrNull,
      plans: plans,
      template: template,
      activeSession: active,
      templateLoadFailed: templateFailed,
      offline: offline,
      usingCachedData: dashboard?.isStale == true || offline,
    );

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        if (actions.usingCachedData) ...[
          const _OfflineHint(),
          const SizedBox(height: AppSpacing.md),
        ],
        _CheckInCard(action: actions.checkIn),
        const SizedBox(height: AppSpacing.md),
        _WorkoutCard(action: actions.workout),
        const SizedBox(height: AppSpacing.md),
        _MembershipIssueCard(
          action: actions.membership,
          pendingAmount: payment.valueOrNull?.outstandingAmount ?? billing.valueOrNull?.pendingAmount,
        ),
      ],
    );
  }
}

class _OfflineHint extends StatelessWidget {
  const _OfflineHint();

  @override
  Widget build(BuildContext context) {
    return GlassCard(
      key: const Key('home-offline-hint'),
      padding: const EdgeInsets.symmetric(horizontal: AppSpacing.lg, vertical: AppSpacing.md),
      tint: AppColors.orange.withValues(alpha: 0.12),
      child: Row(
        children: [
          const Icon(CupertinoIcons.wifi_slash, color: AppColors.orange, size: 18),
          const SizedBox(width: AppSpacing.sm),
          Expanded(
            child: Text(
              'Showing last-known membership and workout. Check-in needs a connection.',
              style: AppType.footnote.copyWith(color: AppColors.resolveText(context)),
            ),
          ),
        ],
      ),
    );
  }
}

class _CheckInCard extends StatelessWidget {
  const _CheckInCard({required this.action});

  final HomeCheckInAction action;

  @override
  Widget build(BuildContext context) {
    return _PrimaryActionCard(
      testKey: const Key('home-scan-cta'),
      icon: CupertinoIcons.qrcode_viewfinder,
      title: action.title,
      detail: action.detail,
      cta: action.enabled ? 'Scan' : null,
      enabled: action.enabled,
      highlighted: action.enabled,
      onTap: action.enabled ? () => context.push(kHomeScannerRoute) : null,
    );
  }
}

class _WorkoutCard extends ConsumerWidget {
  const _WorkoutCard({required this.action});

  final HomeWorkoutAction action;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return _PrimaryActionCard(
      testKey: const Key('home-workout-cta'),
      icon: action.kind == HomeWorkoutKind.restDay
          ? CupertinoIcons.moon_stars_fill
          : CupertinoIcons.flame_fill,
      title: action.title,
      detail: action.detail,
      cta: action.cta,
      enabled: action.canLaunch,
      highlighted: action.canLaunch,
      onTap: !action.canLaunch
          ? null
          : () async {
              if (action.kind == HomeWorkoutKind.resume && action.session != null) {
                context.push('/workouts/live', extra: action.session);
                return;
              }
              final plan = action.plan;
              if (plan == null) return;
              await launchFullWorkoutFlow(context, ref, plan: plan);
            },
    );
  }
}

class _MembershipIssueCard extends StatelessWidget {
  const _MembershipIssueCard({required this.action, this.pendingAmount});

  final HomeMembershipAction action;
  final num? pendingAmount;

  @override
  Widget build(BuildContext context) {
    var detail = action.detail;
    if (action.isPayOutstanding && pendingAmount != null && pendingAmount! > 0) {
      detail = '${Fmt.currency(pendingAmount!)} is due. ${action.detail}';
    }

    return _PrimaryActionCard(
      testKey: const Key('home-membership-cta'),
      icon: action.isPayOutstanding
          ? CupertinoIcons.money_dollar_circle_fill
          : CupertinoIcons.creditcard_fill,
      title: action.title,
      detail: detail,
      cta: action.cta,
      enabled: true,
      highlighted: action.emphasize,
      warn: action.emphasize,
      onTap: () => context.push(kMemberPaymentHandoffRoute),
    );
  }
}

class _PrimaryActionCard extends StatelessWidget {
  const _PrimaryActionCard({
    required this.testKey,
    required this.icon,
    required this.title,
    required this.detail,
    required this.highlighted,
    this.cta,
    this.enabled = true,
    this.warn = false,
    this.onTap,
  });

  final Key testKey;
  final IconData icon;
  final String title;
  final String detail;
  final String? cta;
  final bool enabled;
  final bool highlighted;
  final bool warn;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    final accent = warn ? AppColors.orange : AppColors.accent;
    final child = GlassCard(
      tint: highlighted ? accent.withValues(alpha: 0.12) : null,
      child: Opacity(
        opacity: enabled ? 1 : 0.55,
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Container(
              width: 44,
              height: 44,
              alignment: Alignment.center,
              decoration: BoxDecoration(
                gradient: highlighted && enabled ? AppColors.primaryGradient : null,
                color: highlighted && enabled ? null : accent.withValues(alpha: 0.18),
                borderRadius: BorderRadius.circular(AppRadius.md),
              ),
              child: Icon(
                icon,
                color: highlighted && enabled ? CupertinoColors.white : accent,
                size: 22,
              ),
            ),
            const SizedBox(width: AppSpacing.md),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    title,
                    style: AppType.headline.copyWith(color: AppColors.resolveText(context)),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    detail,
                    style: AppType.footnote.copyWith(
                      color: AppColors.resolveTextSecondary(context),
                      height: 1.35,
                    ),
                  ),
                  if (cta != null) ...[
                    const SizedBox(height: AppSpacing.sm),
                    Text(
                      cta!,
                      style: AppType.callout.copyWith(
                        color: accent,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                  ],
                ],
              ),
            ),
            Icon(
              CupertinoIcons.chevron_right,
              size: 16,
              color: AppColors.resolveTextSecondary(context),
            ),
          ],
        ),
      ),
    );

    return KeyedSubtree(
      key: testKey,
      child: PressScale(onTap: onTap, child: child),
    );
  }
}
