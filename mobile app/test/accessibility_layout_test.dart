import 'package:flutter/cupertino.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:pulsefit/features/diet/diet_assigned_foods.dart';
import 'package:pulsefit/features/home/home_today_actions.dart';
import 'package:pulsefit/models/me_models.dart';
import 'package:pulsefit/models/online_payment_models.dart';
import 'package:pulsefit/providers/me_providers.dart';
import 'package:pulsefit/providers/sync_status_provider.dart';
import 'package:pulsefit/providers/workout_tracking_providers.dart';
import 'package:pulsefit/theme/app_theme.dart';
import 'package:pulsefit/widgets/app_button.dart';
import 'package:pulsefit/widgets/permission_rationale_dialog.dart';
import 'package:pulsefit/workout_sync/sync/sync_manager.dart';

MeProfile _profile() => MeProfile(
      userId: 1,
      firstName: 'Ada',
      lastName: 'Lovelace',
      fullName: 'Ada Lovelace',
      email: 'ada@example.com',
      registrationDate: DateTime(2026, 1, 1),
    );

MeDashboard _dashboard() => MeDashboard(
      profile: _profile(),
      membership: MeMembership(
        id: 1,
        planId: 2,
        planName: 'Gold',
        startDate: DateTime(2026, 1, 1),
        endDate: DateTime(2026, 12, 1),
        status: 'Active',
        daysRemaining: 40,
        isExpiringSoon: false,
      ),
      attendance: const MeAttendanceSummary(
        totalThisMonth: 4,
        totalThisWeek: 2,
        currentStreakDays: 2,
        last30Days: [],
      ),
      upcomingSchedule: const [],
      recentNotifications: const [],
    );

Future<void> _setNarrow(WidgetTester tester) async {
  tester.view.physicalSize = const Size(320, 720);
  tester.view.devicePixelRatio = 1;
  addTearDown(tester.view.resetPhysicalSize);
  addTearDown(tester.view.resetDevicePixelRatio);
}

void main() {
  setUpAll(() {
    GoogleFonts.config.allowRuntimeFetching = false;
  });

  test('plain member-facing copy replaces sci-fi diet labels', () {
    expect(DietCopy.water, 'Water');
    expect(DietCopy.assignedMeals.toLowerCase(), contains('meal'));
    expect(DietCopy.assignedDiet.toLowerCase(), isNot(contains('os')));
    const blob =
        '${DietCopy.water} ${DietCopy.assignedMeals} ${DietCopy.assignedDiet} ${DietCopy.plannedDailyTarget}';
    expect(blob.toLowerCase(), isNot(contains('nutrition os')));
    expect(blob.toLowerCase(), isNot(contains('hydration matrix')));
    expect(blob.toLowerCase(), isNot(contains('fluid equilibrium')));
    expect(blob.toLowerCase(), isNot(contains('meal module')));
  });

  testWidgets('primary CTAs remain at 320pt and 2.0 text scale', (tester) async {
    await _setNarrow(tester);
    await tester.pumpWidget(
      CupertinoApp(
        theme: buildCupertinoTheme(Brightness.dark),
        builder: (context, child) {
          return MediaQuery(
            data: MediaQuery.of(context).copyWith(
              size: const Size(320, 720),
              textScaler: const TextScaler.linear(2),
              boldText: true,
              disableAnimations: true,
            ),
            child: child!,
          );
        },
        home: const CupertinoPageScaffold(
          child: SingleChildScrollView(
            child: Column(
              children: [
                AppButton(label: 'Pay outstanding ₹1,500'),
                AppButton(label: 'Complete workout'),
                AppButton(label: 'Scan'),
              ],
            ),
          ),
        ),
      ),
    );
    await tester.pump();
    expect(tester.takeException(), isNull);
    expect(find.textContaining('Pay outstanding'), findsOneWidget);
    expect(find.text('Complete workout'), findsOneWidget);
    expect(find.text('Scan'), findsOneWidget);
  });

  testWidgets('home primary actions visible when large text', (tester) async {
    await _setNarrow(tester);
    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          workoutPlansProvider.overrideWith((ref) async => const <MeWorkoutPlanSummary>[]),
          todayAssignedTemplateProvider.overrideWith((ref) async => null),
          activeWorkoutProvider.overrideWith((ref) async => null),
          billingAccessProvider.overrideWith(
            (ref) async => const MeBillingAccess(accessBlocked: false, pendingAmount: 0),
          ),
          onlinePaymentSummaryProvider.overrideWith(
            (ref) async => const MemberOnlinePaymentSummary(
              onlinePaymentsEnabled: true,
              paymentNeed: MemberPaymentNeed.settleOutstanding,
              message: 'Settle the balance.',
              outstandingAmount: 1500,
            ),
          ),
          syncStatusProvider.overrideWith((ref) => Stream.value(SyncManager.idleSnapshot)),
        ],
        child: CupertinoApp(
          theme: buildCupertinoTheme(Brightness.dark),
          builder: (context, appChild) {
            return MediaQuery(
              data: MediaQuery.of(context).copyWith(
                size: const Size(320, 720),
                textScaler: const TextScaler.linear(1.5),
                disableAnimations: true,
              ),
              child: appChild!,
            );
          },
          home: CupertinoPageScaffold(
            child: SingleChildScrollView(
              child: HomeTodayActions(dashboard: _dashboard()),
            ),
          ),
        ),
      ),
    );
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 50));
    expect(tester.takeException(), isNull);
    expect(find.text('Pay outstanding'), findsOneWidget);
    expect(find.textContaining('Scan'), findsWidgets);
  });

  testWidgets('permission rationale has labelled Open settings / Not now', (tester) async {
    await tester.pumpWidget(
      CupertinoApp(
        home: Builder(
          builder: (context) => CupertinoButton(
            onPressed: () => showPermissionRationaleDialog(
              context,
              title: 'Camera access',
              message: 'Allow camera in Settings.',
              openSettingsOnConfirm: false,
            ),
            child: const Text('Ask'),
          ),
        ),
      ),
    );
    await tester.tap(find.text('Ask'));
    await tester.pumpAndSettle();
    expect(find.text('Open settings'), findsOneWidget);
    expect(find.text('Not now'), findsOneWidget);
  });
}
