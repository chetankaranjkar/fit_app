import 'package:flutter/cupertino.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/formatters.dart';
import '../../models/me_models.dart';
import '../../providers/me_providers.dart';
import '../../providers/sync_status_provider.dart';
import '../../providers/workout_tracking_providers.dart';
import '../workouts/logic/today_workout_gate.dart';
import '../../theme/app_colors.dart';
import '../../theme/app_theme.dart';
import '../../theme/app_typography.dart';
import '../../widgets/glass_card.dart';
import '../../widgets/app_button.dart';
import '../../widgets/skeleton_shimmer.dart';
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

/// Shared presentation state for Home and Workouts; no parallel session logic.
final todayWorkoutActionProvider =
    Provider.autoDispose<HomeWorkoutAction?>((ref) {
  ref.watch(workoutSyncRefreshProvider);
  final plans = ref.watch(workoutPlansProvider);
  final template = ref.watch(todayAssignedTemplateProvider);
  final active = ref.watch(activeWorkoutProvider);
  final today = ref.watch(todayWorkoutProvider);
  final sync = ref.watch(syncStatusProvider).valueOrNull;
  final offline = sync != null &&
      (sync.displayState == WorkoutSyncDisplayState.offline ||
          !sync.hasDeviceNetwork);
  final decision = today.valueOrNull;
  final session = decision?.action == TodayWorkoutAction.resume
      ? decision?.session
      : active.valueOrNull;
  final completed = decision?.isClosed == true ? decision?.session : null;
  if (session == null &&
      completed == null &&
      (plans.isLoading ||
          template.isLoading ||
          today.isLoading ||
          active.isLoading)) {
    return null;
  }
  return resolveHomeWorkoutAction(
    plans: plans.valueOrNull ?? const [],
    template: template.valueOrNull,
    activeSession: session,
    completedToday: completed,
    templateLoadFailed: template.hasError || today.hasError || active.hasError,
    offline: offline,
  );
});

/// Scan, today's workout, and membership/payment from existing providers.
class HomeTodayActions extends ConsumerWidget {
  const HomeTodayActions({super.key, this.dashboard});
  final MeDashboard? dashboard;
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final sync = ref.watch(syncStatusProvider).valueOrNull;
    final offline = sync != null &&
        (sync.displayState == WorkoutSyncDisplayState.offline ||
            !sync.hasDeviceNetwork);
    final billing = ref.watch(billingAccessProvider).valueOrNull;
    final payment = ref.watch(onlinePaymentSummaryProvider).valueOrNull;
    return Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
      if (dashboard?.isStale == true || offline) ...[
        const _OfflineHint(),
        const SizedBox(height: AppSpacing.md),
      ],
      _CheckInCard(action: resolveHomeCheckInAction(offline: offline)),
      const SizedBox(height: AppSpacing.md),
      const TodayWorkoutCard(),
      const SizedBox(height: AppSpacing.md),
      _MembershipIssueCard(
        action: resolveHomeMembershipAction(
            membership: dashboard?.membership,
            billing: billing,
            payment: payment),
        pendingAmount: payment?.outstandingAmount ?? billing?.pendingAmount,
      ),
    ]);
  }
}

class _OfflineHint extends StatelessWidget {
  const _OfflineHint();

  @override
  Widget build(BuildContext context) {
    return GlassCard(
      key: const Key('home-offline-hint'),
      padding: const EdgeInsets.symmetric(
          horizontal: AppSpacing.lg, vertical: AppSpacing.md),
      tint: AppColors.orange.withValues(alpha: 0.12),
      child: Row(
        children: [
          const Icon(CupertinoIcons.wifi_slash,
              color: AppColors.orange, size: 18),
          const SizedBox(width: AppSpacing.sm),
          Expanded(
            child: Text(
              'Showing last-known membership and workout. Check-in needs a connection.',
              style: AppType.footnote
                  .copyWith(color: AppColors.resolveText(context)),
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
    return Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
      AppButton(
        key: const Key('home-scan-cta'),
        label: action.title,
        icon: CupertinoIcons.qrcode_viewfinder,
        onTap: action.enabled ? () => context.push(kHomeScannerRoute) : null,
      ),
      if (!action.enabled) ...[
        const SizedBox(height: AppSpacing.sm),
        Text(action.detail,
            style: AppType.footnote
                .copyWith(color: AppColors.resolveTextSecondary(context))),
      ],
    ]);
  }
}

/// One primary workout action, preserving scheduled/rest/offline/completed states.
class TodayWorkoutCard extends ConsumerStatefulWidget {
  const TodayWorkoutCard({super.key});
  @override
  ConsumerState<TodayWorkoutCard> createState() => _TodayWorkoutCardState();
}

class _TodayWorkoutCardState extends ConsumerState<TodayWorkoutCard> {
  bool _opening = false;
  Future<void> _open(HomeWorkoutAction action) async {
    if (_opening) return;
    setState(() => _opening = true);
    try {
      if (action.kind == HomeWorkoutKind.completed && action.plan != null) {
        context.push('/workouts/${action.plan!.id}', extra: action.plan);
      } else if (action.kind == HomeWorkoutKind.resume &&
          action.session != null) {
        context.push('/workouts/live', extra: action.session);
      } else if (action.plan != null) {
        await launchFullWorkoutFlow(context, ref, plan: action.plan!);
      }
    } catch (_) {
      if (!mounted) return;
      await showCupertinoDialog<void>(
          context: context,
          builder: (c) => CupertinoAlertDialog(
                title: const Text('Unable to open workout'),
                content: const Text(
                    'Check your connection and try again. Your saved workout is kept on this device.'),
                actions: [
                  CupertinoDialogAction(
                      onPressed: () => Navigator.pop(c),
                      child: const Text('OK'))
                ],
              ));
    } finally {
      if (mounted) setState(() => _opening = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final action = ref.watch(todayWorkoutActionProvider);
    if (action == null) return const SkeletonBlock(height: 170);
    final label = switch (action.kind) {
      HomeWorkoutKind.start => 'Start workout',
      HomeWorkoutKind.resume => 'Resume workout',
      _ => action.cta,
    };
    return GlassCard(
        key: const Key('home-workout-cta'),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Text(
                action.kind == HomeWorkoutKind.start
                    ? 'Today’s workout'
                    : action.title,
                style: AppType.footnote.copyWith(color: AppColors.accent)),
            const SizedBox(height: AppSpacing.sm),
            if (action.plan != null)
              Text(action.plan!.planName,
                  style: AppType.title3
                      .copyWith(color: AppColors.resolveText(context))),
            const SizedBox(height: AppSpacing.sm),
            Text(action.detail,
                style: AppType.subhead
                    .copyWith(color: AppColors.resolveTextSecondary(context))),
            if (action.canLaunch && label != null) ...[
              const SizedBox(height: AppSpacing.lg),
              AppButton(
                  label: label,
                  isLoading: _opening,
                  icon: action.kind == HomeWorkoutKind.completed
                      ? CupertinoIcons.checkmark_circle
                      : CupertinoIcons.play_fill,
                  onTap: () => _open(action)),
            ] else if (action.plan != null) ...[
              const SizedBox(height: AppSpacing.sm),
              CupertinoButton(
                  padding: EdgeInsets.zero,
                  onPressed: () => context.push('/workouts/${action.plan!.id}',
                      extra: action.plan),
                  child: const Text('View assigned plan')),
            ],
          ],
        ));
  }
}

class _MembershipIssueCard extends StatelessWidget {
  const _MembershipIssueCard({required this.action, this.pendingAmount});

  final HomeMembershipAction action;
  final num? pendingAmount;

  @override
  Widget build(BuildContext context) {
    var detail = action.kind == HomeMembershipKind.current
        ? '${action.title} · ${action.detail}'
        : action.detail;
    if (action.isPayOutstanding &&
        pendingAmount != null &&
        pendingAmount! > 0) {
      detail = '${Fmt.currency(pendingAmount!)} is due. ${action.detail}';
    }

    return _PrimaryActionCard(
      testKey: const Key('home-membership-cta'),
      icon: action.isPayOutstanding
          ? CupertinoIcons.money_dollar_circle_fill
          : CupertinoIcons.creditcard_fill,
      title: action.kind == HomeMembershipKind.current
          ? 'Membership active'
          : action.title,
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
      tint: warn ? accent.withValues(alpha: 0.06) : null,
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
                gradient:
                    highlighted && enabled ? AppColors.primaryGradient : null,
                color: highlighted && enabled
                    ? null
                    : accent.withValues(alpha: 0.18),
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
                    style: AppType.headline
                        .copyWith(color: AppColors.resolveText(context)),
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
