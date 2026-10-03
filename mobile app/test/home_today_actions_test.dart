import 'package:flutter/cupertino.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:pulsefit/features/home/home_action_resolver.dart';
import 'package:pulsefit/features/home/home_today_actions.dart';
import 'package:pulsefit/models/me_models.dart';
import 'package:pulsefit/models/online_payment_models.dart';
import 'package:pulsefit/models/workout_tracking_models.dart';
import 'package:pulsefit/providers/me_providers.dart';
import 'package:pulsefit/providers/sync_status_provider.dart';
import 'package:pulsefit/providers/workout_tracking_providers.dart';
import 'package:pulsefit/theme/app_theme.dart';
import 'package:pulsefit/workout_sync/models/workout_sync_enums.dart';
import 'package:pulsefit/workout_sync/sync/sync_manager.dart';

MeProfile _profile() => MeProfile(
      userId: 1,
      firstName: 'Ada',
      lastName: 'Lovelace',
      fullName: 'Ada Lovelace',
      email: 'ada@example.com',
      registrationDate: DateTime(2026, 1, 1),
    );

MeMembership _membership({
  String status = 'Active',
  int daysRemaining = 40,
  bool expiring = false,
}) =>
    MeMembership(
      id: 1,
      planId: 2,
      planName: 'Gold',
      startDate: DateTime(2026, 1, 1),
      endDate: DateTime(2026, 12, 1),
      status: status,
      daysRemaining: daysRemaining,
      isExpiringSoon: expiring,
    );

MeDashboard _dashboard({MeMembership? membership}) => MeDashboard(
      profile: _profile(),
      membership: membership ?? _membership(),
      attendance: const MeAttendanceSummary(
        totalThisMonth: 4,
        totalThisWeek: 2,
        currentStreakDays: 2,
        last30Days: [],
      ),
      upcomingSchedule: const [],
      recentNotifications: const [],
    );

const _plan = MeWorkoutPlanSummary(
  id: 9,
  planName: 'Push',
  workoutType: 'Strength',
  exerciseCount: 5,
  durationMinutes: 45,
);

MeWorkoutSessionTemplate _template({
  bool rest = false,
  bool scheduledToday = true,
  bool withExercises = true,
}) =>
    MeWorkoutSessionTemplate(
      plan: _plan,
      exercises: withExercises && !rest
          ? const [
              MeWorkoutExerciseLine(
                planExerciseId: 1,
                exerciseId: 1,
                exerciseName: 'Bench',
                order: 1,
                targetSets: 3,
                targetReps: 10,
                restSeconds: 60,
              ),
            ]
          : const [],
      isRestDay: rest,
      todayDayName: rest ? 'Sunday' : 'Monday',
      isScheduledToday: scheduledToday,
    );

ActiveWorkoutSession _active() => ActiveWorkoutSession(
      sessionId: 44,
      memberId: 1,
      workoutPlanId: 9,
      planName: 'Push',
      status: 'InProgress',
      startTimeUtc: DateTime.utc(2026, 10, 3, 10),
      completionPercent: 40,
      completedSets: 4,
      totalSets: 10,
      totalVolume: 0,
      exercises: const [],
    );

MemberOnlinePaymentSummary _paySummary({
  MemberPaymentNeed need = MemberPaymentNeed.nothingDue,
  num amount = 0,
}) =>
    MemberOnlinePaymentSummary(
      onlinePaymentsEnabled: true,
      paymentNeed: need,
      message: need == MemberPaymentNeed.settleOutstanding
          ? 'Settle the balance on your current membership bill. Paying does not add gym time.'
          : '',
      outstandingAmount: amount,
    );

AppSyncSnapshot _sync({required bool offline}) {
  if (!offline) return SyncManager.idleSnapshot;
  return const AppSyncSnapshot(
    displayState: WorkoutSyncDisplayState.offline,
    hasDeviceNetwork: false,
    serverReachable: false,
    pendingCount: 0,
    failedCount: 0,
    syncedCount: 0,
    isSyncing: false,
  );
}

List<Override> _overrides({
  List<MeWorkoutPlanSummary> plans = const [_plan],
  MeWorkoutSessionTemplate? template,
  ActiveWorkoutSession? active,
  MemberOnlinePaymentSummary? payment,
  MeBillingAccess? billing,
  bool offline = false,
}) {
  return [
    workoutPlansProvider.overrideWith((ref) async => plans),
    todayAssignedTemplateProvider.overrideWith((ref) async => template),
    activeWorkoutProvider.overrideWith((ref) async => active),
    billingAccessProvider.overrideWith(
      (ref) async =>
          billing ?? const MeBillingAccess(accessBlocked: false, pendingAmount: 0),
    ),
    onlinePaymentSummaryProvider.overrideWith(
      (ref) async => payment ?? _paySummary(),
    ),
    syncStatusProvider.overrideWith((ref) => Stream.value(_sync(offline: offline))),
  ];
}

Future<void> _pumpActions(
  WidgetTester tester, {
  required List<Override> overrides,
  MeDashboard? dashboard,
}) async {
  await tester.pumpWidget(
    ProviderScope(
      overrides: overrides,
      child: CupertinoApp(
        theme: buildCupertinoTheme(Brightness.dark),
        home: CupertinoPageScaffold(
          child: SingleChildScrollView(
            child: HomeTodayActions(dashboard: dashboard ?? _dashboard()),
          ),
        ),
      ),
    ),
  );
  await tester.pumpAndSettle();
}

void main() {
  group('resolveHomePrimaryActions', () {
    test('rest day has no Start', () {
      final actions = resolveHomePrimaryActions(
        membership: _membership(),
        plans: const [_plan],
        template: _template(rest: true),
      );
      expect(actions.workout.kind, HomeWorkoutKind.restDay);
      expect(actions.workout.cta, isNull);
      expect(actions.workout.canLaunch, isFalse);
    });

    test('no assigned plan has no Start', () {
      final actions = resolveHomePrimaryActions(
        membership: _membership(),
        plans: const [],
      );
      expect(actions.workout.kind, HomeWorkoutKind.noPlan);
      expect(actions.workout.cta, isNull);
    });

    test('outstanding uses Pay outstanding, not renew', () {
      final actions = resolveHomePrimaryActions(
        membership: _membership(),
        payment: _paySummary(need: MemberPaymentNeed.settleOutstanding, amount: 1200),
        plans: const [],
      );
      expect(actions.membership.kind, HomeMembershipKind.outstanding);
      expect(actions.membership.cta, 'Pay outstanding');
      expect(actions.membership.title, 'Pay outstanding balance');
    });

    test('frozen does not offer pay to unfreeze', () {
      final actions = resolveHomePrimaryActions(
        membership: _membership(status: 'Frozen'),
        payment: _paySummary(need: MemberPaymentNeed.settleOutstanding, amount: 500),
        plans: const [],
      );
      expect(actions.membership.kind, HomeMembershipKind.frozen);
      expect(actions.membership.cta, 'View membership');
    });

    test('active session is Resume, assigned unused session is Start', () {
      final resume = resolveHomePrimaryActions(
        membership: _membership(),
        plans: const [_plan],
        template: _template(),
        activeSession: _active(),
      );
      expect(resume.workout.kind, HomeWorkoutKind.resume);
      expect(resume.workout.cta, 'Resume');

      final start = resolveHomePrimaryActions(
        membership: _membership(),
        plans: const [_plan],
        template: _template(),
      );
      expect(start.workout.kind, HomeWorkoutKind.start);
      expect(start.workout.cta, 'Start');
    });

    test('offline disables scan', () {
      final actions = resolveHomePrimaryActions(
        membership: _membership(),
        plans: const [_plan],
        template: _template(),
        offline: true,
        usingCachedData: true,
      );
      expect(actions.checkIn.enabled, isFalse);
      expect(actions.usingCachedData, isTrue);
    });
  });

  group('HomeTodayActions widgets', () {
    testWidgets('rest day shows copy without Start', (tester) async {
      await _pumpActions(
        tester,
        overrides: _overrides(template: _template(rest: true)),
      );
      expect(find.text('Rest day'), findsOneWidget);
      expect(find.text('Start'), findsNothing);
      expect(find.text('Resume'), findsNothing);
    });

    testWidgets('no plan shows empty copy without Start', (tester) async {
      await _pumpActions(
        tester,
        overrides: _overrides(plans: const [], template: null),
      );
      expect(find.text('No workout assigned'), findsOneWidget);
      expect(find.text('Start'), findsNothing);
    });

    testWidgets('outstanding shows Pay outstanding CTA', (tester) async {
      await _pumpActions(
        tester,
        overrides: _overrides(
          payment: _paySummary(need: MemberPaymentNeed.settleOutstanding, amount: 1500),
        ),
      );
      expect(find.text('Pay outstanding balance'), findsOneWidget);
      expect(find.text('Pay outstanding'), findsOneWidget);
    });

    testWidgets('Resume vs Start from active session', (tester) async {
      await _pumpActions(
        tester,
        overrides: _overrides(template: _template(), active: _active()),
      );
      expect(find.text('Resume'), findsOneWidget);
      expect(find.text('Start'), findsNothing);
    });

    testWidgets('assigned plan without session shows Start', (tester) async {
      await _pumpActions(
        tester,
        overrides: _overrides(template: _template()),
      );
      expect(find.text('Start'), findsOneWidget);
      expect(find.text('Resume'), findsNothing);
    });

    testWidgets('offline hint and disabled scan', (tester) async {
      await _pumpActions(
        tester,
        dashboard: _dashboard().asStale(),
        overrides: _overrides(template: _template(), offline: true),
      );
      expect(find.byKey(const Key('home-offline-hint')), findsOneWidget);
      expect(find.textContaining('last-known membership'), findsOneWidget);
      expect(find.text('Scan'), findsNothing);
    });
  });
}
