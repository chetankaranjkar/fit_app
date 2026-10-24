import '../../models/me_models.dart';
import '../../models/online_payment_models.dart';
import '../../models/workout_tracking_models.dart';

/// Handoff to membership / the mobile payment journey. Home does not host checkout.
const kMemberPaymentHandoffRoute = '/membership';
const kHomeScannerRoute = '/scanner';

enum HomeMembershipKind {
  outstanding,
  missing,
  expired,
  frozen,
  pending,
  current,
}

enum HomeWorkoutKind {
  resume,
  start,
  restDay,
  noPlan,
  unavailableOffline,
  completed,
}

class HomeCheckInAction {
  const HomeCheckInAction({
    required this.enabled,
    required this.title,
    required this.detail,
  });

  final bool enabled;
  final String title;
  final String detail;
}

class HomeWorkoutAction {
  const HomeWorkoutAction({
    required this.kind,
    required this.title,
    required this.detail,
    this.cta,
    this.plan,
    this.session,
  });

  final HomeWorkoutKind kind;
  final String title;
  final String detail;
  final String? cta;
  final MeWorkoutPlanSummary? plan;
  final ActiveWorkoutSession? session;

  bool get canLaunch =>
      cta != null &&
      (kind == HomeWorkoutKind.resume ||
          kind == HomeWorkoutKind.start ||
          kind == HomeWorkoutKind.completed);
}

class HomeMembershipAction {
  const HomeMembershipAction({
    required this.kind,
    required this.title,
    required this.detail,
    required this.cta,
    required this.emphasize,
  });

  final HomeMembershipKind kind;
  final String title;
  final String detail;
  final String cta;
  final bool emphasize;

  bool get isPayOutstanding => kind == HomeMembershipKind.outstanding;
}

class HomePrimaryActions {
  const HomePrimaryActions({
    required this.checkIn,
    required this.workout,
    required this.membership,
    required this.offline,
    required this.usingCachedData,
  });

  final HomeCheckInAction checkIn;
  final HomeWorkoutAction workout;
  final HomeMembershipAction membership;
  final bool offline;
  final bool usingCachedData;
}

bool membershipStatusIsFrozen(String? status) {
  final s = (status ?? '').toLowerCase();
  return s == 'frozen' || s == 'paused';
}

bool membershipStatusIsPending(String? status) {
  final s = (status ?? '').toLowerCase();
  return s == 'pending' || s == 'voidpending';
}

bool membershipStatusIsExpired(MeMembership? membership) {
  if (membership == null) return false;
  final s = membership.status.toLowerCase();
  if (s == 'expired') return true;
  if (membershipStatusIsFrozen(s) || membershipStatusIsPending(s)) return false;
  return membership.daysRemaining < 0;
}

HomeMembershipAction resolveHomeMembershipAction({
  required MeMembership? membership,
  MeBillingAccess? billing,
  MemberOnlinePaymentSummary? payment,
}) {
  if (membership == null) {
    if (payment?.paymentNeed == MemberPaymentNeed.settleOutstanding) {
      return HomeMembershipAction(
        kind: HomeMembershipKind.outstanding,
        title: 'Pay outstanding balance',
        detail: payment!.message.isNotEmpty
            ? payment.message
            : 'Settle the balance on your current membership bill. Paying does not add gym time.',
        cta: 'Pay outstanding',
        emphasize: true,
      );
    }
    return const HomeMembershipAction(
      kind: HomeMembershipKind.missing,
      title: 'No membership on file',
      detail:
          'Ask the front desk to add a plan. Paying a bill does not start a membership.',
      cta: 'View membership',
      emphasize: true,
    );
  }

  if (membershipStatusIsFrozen(membership.status)) {
    return HomeMembershipAction(
      kind: HomeMembershipKind.frozen,
      title: 'Membership ${membership.status}',
      detail:
          'Gym access is paused. Ask the front desk to restore it. Paying a balance does not unfreeze a membership.',
      cta: 'View membership',
      emphasize: true,
    );
  }

  if (membershipStatusIsPending(membership.status)) {
    return const HomeMembershipAction(
      kind: HomeMembershipKind.pending,
      title: 'Awaiting gym review',
      detail:
          'Your membership is waiting on gym approval. Access stays closed until they finish.',
      cta: 'View membership',
      emphasize: true,
    );
  }

  if (payment?.paymentNeed == MemberPaymentNeed.settleOutstanding) {
    return HomeMembershipAction(
      kind: HomeMembershipKind.outstanding,
      title: 'Pay outstanding balance',
      detail: payment!.message.isNotEmpty
          ? payment.message
          : 'Settle the balance on your current membership bill. Paying does not add gym time.',
      cta: 'Pay outstanding',
      emphasize: true,
    );
  }

  if (payment?.paymentNeed == MemberPaymentNeed.renewalRequired ||
      membershipStatusIsExpired(membership)) {
    return HomeMembershipAction(
      kind: HomeMembershipKind.expired,
      title: 'Membership ended',
      detail: payment?.message.isNotEmpty == true
          ? payment!.message
          : 'Ask the front desk to renew. Paying an outstanding bill does not add gym time.',
      cta: 'View membership',
      emphasize: true,
    );
  }

  final outstanding = billing?.hasPendingBalance == true;
  if (outstanding) {
    return const HomeMembershipAction(
      kind: HomeMembershipKind.outstanding,
      title: 'Pay outstanding balance',
      detail:
          'Settle the balance on your current membership bill. Paying does not add gym time.',
      cta: 'Pay outstanding',
      emphasize: true,
    );
  }

  final days = membership.daysRemaining;
  final expiring = membership.isExpiringSoon;
  return HomeMembershipAction(
    kind: HomeMembershipKind.current,
    title: membership.planName,
    detail: expiring
        ? 'Ends soon · $days days left. Renew at the front desk when you are ready.'
        : '${membership.status} · $days days left',
    cta: 'View membership',
    emphasize: expiring,
  );
}

HomeWorkoutAction resolveHomeWorkoutAction({
  required List<MeWorkoutPlanSummary> plans,
  MeWorkoutSessionTemplate? template,
  ActiveWorkoutSession? activeSession,
  ActiveWorkoutSession? completedToday,
  bool templateLoadFailed = false,
  bool offline = false,
}) {
  final active = activeSession != null &&
      activeSession.status.toLowerCase() != 'completed' &&
      !activeSession.pendingCompleteSync;
  if (active) {
    final pct = activeSession.completionPercent.round();
    final name = activeSession.planName?.trim();
    return HomeWorkoutAction(
      kind: HomeWorkoutKind.resume,
      title: 'Resume today’s workout',
      detail: [
        if (name != null && name.isNotEmpty) name,
        '$pct% complete',
        if (activeSession.isOffline) 'Saved on device — waiting to sync',
      ].join(' · '),
      cta: 'Resume',
      plan: _planFor(plans, activeSession.workoutPlanId),
      session: activeSession,
    );
  }

  final saved = completedToday != null &&
      (completedToday.pendingCompleteSync ||
          completedToday.status.toLowerCase() == 'completed');
  if (saved) {
    return HomeWorkoutAction(
      kind: HomeWorkoutKind.completed,
      title: 'Completed today',
      detail: [
        if (completedToday.planName != null &&
            completedToday.planName!.trim().isNotEmpty)
          completedToday.planName!.trim(),
        '${completedToday.completedSets}/${completedToday.totalSets} sets',
        if (completedToday.pendingCompleteSync)
          'Saved on device — waiting to sync',
      ].join(' · '),
      cta: 'View workout',
      plan: _planFor(plans, completedToday.workoutPlanId),
      session: completedToday,
    );
  }

  if (plans.isEmpty) {
    return const HomeWorkoutAction(
      kind: HomeWorkoutKind.noPlan,
      title: 'No workout assigned',
      detail:
          'Ask your coach or the front desk to assign a plan. There is nothing to start today.',
    );
  }

  final plan = template?.plan ?? plans.first;

  if (template != null && template.isRestDay) {
    final day = template.todayDayName?.trim();
    return HomeWorkoutAction(
      kind: HomeWorkoutKind.restDay,
      title: 'Rest day',
      detail: day != null && day.isNotEmpty
          ? '$day is programmed as rest. Recovery is part of the plan — there is no session to start.'
          : 'Today is programmed as rest. Recovery is part of the plan — there is no session to start.',
      plan: plan,
    );
  }

  if (template != null && !template.isScheduledToday) {
    return HomeWorkoutAction(
      kind: HomeWorkoutKind.noPlan,
      title: 'No workout scheduled today',
      detail:
          'Your assigned plan has no session for today. Open Workouts to review the full plan.',
      plan: plan,
    );
  }

  if (template != null && template.exercises.isEmpty) {
    return HomeWorkoutAction(
      kind: HomeWorkoutKind.noPlan,
      title: 'No workout assigned today',
      detail:
          'This plan has no exercises for today. Ask your coach if you expected a session.',
      plan: plan,
    );
  }

  if (template == null && (templateLoadFailed || offline)) {
    return HomeWorkoutAction(
      kind: HomeWorkoutKind.unavailableOffline,
      title: plan.planName,
      detail: offline
          ? 'Last-known plan is shown. Today’s session details are not on this device yet.'
          : 'Could not load today’s session. Pull to refresh, or open Workouts.',
      plan: plan,
    );
  }

  return HomeWorkoutAction(
    kind: HomeWorkoutKind.start,
    title: 'Start today’s workout',
    detail: [
      '${template?.exercises.length ?? plan.exerciseCount} exercises',
      if (template?.todayDayName != null &&
          template!.todayDayName!.trim().isNotEmpty)
        template.todayDayName!.trim(),
      if (plan.durationMinutes != null) '${plan.durationMinutes} min',
    ].join(' · '),
    cta: 'Start',
    plan: plan,
  );
}

MeWorkoutPlanSummary? _planFor(List<MeWorkoutPlanSummary> plans, int? planId) {
  for (final plan in plans) {
    if (plan.id == planId) return plan;
  }
  return plans.isNotEmpty ? plans.first : null;
}

HomeCheckInAction resolveHomeCheckInAction({required bool offline}) {
  if (offline) {
    return const HomeCheckInAction(
      enabled: false,
      title: 'Scan to check in',
      detail: 'Check-in needs a connection. Connect to scan the gym QR.',
    );
  }
  return const HomeCheckInAction(
    enabled: true,
    title: 'Scan to check in',
    detail: 'Scan the gym QR at the desk to record today’s visit.',
  );
}

HomePrimaryActions resolveHomePrimaryActions({
  required MeMembership? membership,
  MeBillingAccess? billing,
  MemberOnlinePaymentSummary? payment,
  required List<MeWorkoutPlanSummary> plans,
  MeWorkoutSessionTemplate? template,
  ActiveWorkoutSession? activeSession,
  ActiveWorkoutSession? completedToday,
  bool templateLoadFailed = false,
  bool offline = false,
  bool usingCachedData = false,
}) {
  return HomePrimaryActions(
    checkIn: resolveHomeCheckInAction(offline: offline),
    workout: resolveHomeWorkoutAction(
      plans: plans,
      template: template,
      activeSession: activeSession,
      completedToday: completedToday,
      templateLoadFailed: templateLoadFailed,
      offline: offline,
    ),
    membership: resolveHomeMembershipAction(
      membership: membership,
      billing: billing,
      payment: payment,
    ),
    offline: offline,
    usingCachedData: usingCachedData || offline,
  );
}
