import 'dart:async';
import 'dart:io';
import 'dart:ui' as ui;
import 'package:flutter/cupertino.dart';
import 'package:flutter/rendering.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';
import 'package:pulsefit/features/diet/diet_screen.dart';
import 'package:pulsefit/features/diet/water/water_intake_providers.dart';
import 'package:pulsefit/features/diet/water/water_intake_service.dart';
import 'package:pulsefit/features/diet/water/water_intake_store.dart';
import 'package:pulsefit/features/home/home_screen.dart';
import 'package:pulsefit/features/home/home_today_actions.dart';
import 'package:pulsefit/features/shell/app_shell.dart';
import 'package:pulsefit/features/workouts/workouts_screen.dart';
import 'package:pulsefit/features/workouts/logic/today_workout_gate.dart';
import 'package:pulsefit/models/me_models.dart';
import 'package:pulsefit/models/online_payment_models.dart';
import 'package:pulsefit/providers/me_providers.dart';
import 'package:pulsefit/providers/sync_status_provider.dart';
import 'package:pulsefit/providers/workout_tracking_providers.dart';
import 'package:pulsefit/theme/app_theme.dart';
import 'package:pulsefit/widgets/app_button.dart';
import 'package:pulsefit/workout_sync/sync/sync_manager.dart';

const plan = MeWorkoutPlanSummary(
    id: 9,
    planName: 'Upper body strength',
    workoutType: 'Strength',
    exerciseCount: 3,
    durationMinutes: 45);
const template = MeWorkoutSessionTemplate(plan: plan, exercises: [
  MeWorkoutExerciseLine(
      planExerciseId: 1,
      exerciseId: 1,
      exerciseName: 'Bench press',
      order: 1,
      targetSets: 3,
      targetReps: 10,
      restSeconds: 60),
  MeWorkoutExerciseLine(
      planExerciseId: 2,
      exerciseId: 2,
      exerciseName: 'Lat pulldown',
      order: 2,
      targetSets: 3,
      targetReps: 12,
      restSeconds: 60),
  MeWorkoutExerciseLine(
      planExerciseId: 3,
      exerciseId: 3,
      exerciseName: 'Shoulder press',
      order: 3,
      targetSets: 3,
      targetReps: 10,
      restSeconds: 60),
]);

List<Override> overrides() {
  final profile = MeProfile(
      userId: 1,
      firstName: 'Alex',
      lastName: 'Morgan',
      fullName: 'Alex Morgan',
      email: 'alex@example.com',
      registrationDate: DateTime(2026, 1, 1));
  final now = DateTime.now();
  final attendance = MeAttendanceSummary(
      totalThisMonth: 12,
      totalThisWeek: 3,
      currentStreakDays: 2,
      last30Days: List.generate(
          7,
          (i) => MeAttendanceDay(
              date: DateTime(now.year, now.month, now.day - 6 + i),
              visited: i < 3)));
  return [
    dashboardProvider.overrideWith((ref) async => MeDashboard(
        profile: profile,
        membership: MeMembership(
            id: 1,
            planId: 1,
            planName: 'Monthly membership',
            startDate: now,
            endDate: now.add(const Duration(days: 30)),
            status: 'Active',
            daysRemaining: 30,
            isExpiringSoon: false),
        attendance: attendance,
        upcomingSchedule: const [],
        recentNotifications: const [])),
    workoutPlansProvider.overrideWith((ref) async => const [
          plan,
          MeWorkoutPlanSummary(
              id: 10,
              planName: 'Lower body strength',
              workoutType: 'Strength',
              exerciseCount: 5,
              durationMinutes: 40)
        ]),
    workoutSessionTemplateProvider.overrideWith((ref, id) async => template),
    activeWorkoutProvider.overrideWith((ref) async => null),
    todayWorkoutProvider.overrideWith((ref) async =>
        const TodayWorkoutDecision(action: TodayWorkoutAction.start)),
    workoutSyncRefreshProvider.overrideWith((ref) {}),
    syncStatusProvider
        .overrideWith((ref) => Stream.value(SyncManager.idleSnapshot)),
    billingAccessProvider.overrideWith((ref) async =>
        const MeBillingAccess(accessBlocked: false, pendingAmount: 0)),
    onlinePaymentSummaryProvider.overrideWith((ref) async =>
        const MemberOnlinePaymentSummary(
            onlinePaymentsEnabled: true,
            paymentNeed: MemberPaymentNeed.nothingDue,
            message: '',
            outstandingAmount: 0)),
    dietPlanProvider.overrideWith((ref) async => MeDietPlan(
            assignmentId: 1,
            dietPlanId: 1,
            planName: 'Balanced nutrition',
            goalType: 'Strength & fitness',
            calories: 2100,
            proteinGrams: 140,
            carbsGrams: 240,
            fatsGrams: 65,
            startDate: now,
            meals: [
              for (final meal in [
                ('Breakfast', 'Oats, milk & banana'),
                ('Lunch', 'Rice, chicken & vegetables'),
                ('Dinner', 'Chapati, dal & salad')
              ])
                MeDietMeal(
                    id: meal.$1.hashCode,
                    mealName: meal.$1,
                    mealOrder: meal.$1 == 'Breakfast'
                        ? 0
                        : meal.$1 == 'Lunch'
                            ? 1
                            : 2,
                    items: [
                      MeDietMealItem(
                          id: 1,
                          foodName: meal.$2,
                          quantity: '1 serving',
                          calories: 500)
                    ]),
            ])),
    waterTodayControllerProvider.overrideWith((ref) => WaterTodayController(
        service: WaterIntakeService(store: MemoryWaterIntakeStore()),
        memberUserId: 1)),
  ];
}

Future<void> pumpScreen(
    WidgetTester tester, String route, Brightness brightness,
    {bool large = false}) async {
  tester.view.physicalSize =
      large ? const Size(320, 720) : const Size(390, 844);
  tester.view.devicePixelRatio = 1;
  addTearDown(tester.view.resetPhysicalSize);
  addTearDown(tester.view.resetDevicePixelRatio);
  final router = GoRouter(initialLocation: route, routes: [
    StatefulShellRoute.indexedStack(
        builder: (context, state, shell) => AppShell(navigationShell: shell),
        branches: [
          StatefulShellBranch(routes: [
            GoRoute(path: '/home', builder: (_, __) => const HomeScreen())
          ]),
          StatefulShellBranch(routes: [
            GoRoute(
                path: '/workouts', builder: (_, __) => const WorkoutsScreen())
          ]),
          StatefulShellBranch(routes: [
            GoRoute(path: '/diet', builder: (_, __) => const DietScreen())
          ]),
          StatefulShellBranch(routes: [
            GoRoute(path: '/progress', builder: (_, __) => const SizedBox())
          ]),
          StatefulShellBranch(routes: [
            GoRoute(path: '/profile', builder: (_, __) => const SizedBox())
          ]),
        ]),
  ]);
  addTearDown(router.dispose);
  await tester.pumpWidget(ProviderScope(
      overrides: overrides(),
      child: RepaintBoundary(
        key: const Key('preview'),
        child: CupertinoApp.router(
          debugShowCheckedModeBanner: false,
          theme: buildCupertinoTheme(brightness),
          routerConfig: router,
          builder: (context, child) => MediaQuery(
              data: MediaQuery.of(context).copyWith(
                  textScaler: TextScaler.linear(large ? 2 : 1),
                  disableAnimations: true),
              child: child!),
        ),
      )));
  await tester.pumpAndSettle();
}

void main() {
  setUpAll(() async {
    if (const bool.fromEnvironment('CAPTURE_MOBILE_PREVIEWS')) {
      final icons = FontLoader('packages/cupertino_icons/CupertinoIcons')
        ..addFont(rootBundle
            .load('packages/cupertino_icons/assets/CupertinoIcons.ttf'));
      await icons.load();
      final font = File('C:/Windows/Fonts/segoeui.ttf');
      if (await font.exists()) {
        final loader = FontLoader('.SF Pro Text')
          ..addFont(font.readAsBytes().then((b) => ByteData.sublistView(b)));
        await loader.load();
      }
    }
  });
  for (final brightness in Brightness.values) {
    for (final route in ['/home', '/workouts', '/diet']) {
      for (final large in [false, true]) {
        testWidgets(
            '$route ${brightness.name} ${large ? 'large text at 320' : 'standard'} layout',
            (tester) async {
          await pumpScreen(tester, route, brightness, large: large);
          expect(tester.takeException(), isNull);
          expect(find.byKey(const ValueKey('nav_2')), findsOneWidget);
          if (route == '/workouts') {
            expect(find.text('Start workout'), findsOneWidget);
            expect(find.text('Bench press'), findsOneWidget);
            expect(find.text('Recovery'), findsNothing);
            expect(find.text('Coach'), findsNothing);
          }
          if (route == '/diet') {
            expect(find.text('No meals logged today'), findsNothing);
            await tester.scrollUntilVisible(find.text('Water today'), 300,
                scrollable: find
                    .descendant(
                        of: find.byType(DietScreen),
                        matching: find.byType(Scrollable))
                    .first);
            await tester.pumpAndSettle();
            expect(tester.takeException(), isNull);
            await tester.tap(find.text('+250 ml'));
            await tester.pumpAndSettle();
            expect(find.textContaining('250 /'), findsOneWidget);
            await tester.tap(find.text('Undo'));
            await tester.pumpAndSettle();
            expect(find.textContaining('0 /'), findsOneWidget);
            final scrollable = find
                .descendant(
                    of: find.byType(DietScreen),
                    matching: find.byType(Scrollable))
                .first;
            tester.state<ScrollableState>(scrollable).position.jumpTo(0);
            await tester.pumpAndSettle();
          }
          if (const bool.fromEnvironment('CAPTURE_MOBILE_PREVIEWS') && !large) {
            final boundary = tester.renderObject<RenderRepaintBoundary>(
                find.byKey(const Key('preview')));
            await tester.runAsync(() async {
              final image = await boundary.toImage(pixelRatio: 2);
              final bytes =
                  await image.toByteData(format: ui.ImageByteFormat.png);
              final dir = Directory('build/redesign-previews');
              await dir.create(recursive: true);
              await File(
                      '${dir.path}/${route.substring(1)}-${brightness.name}.png')
                  .writeAsBytes(bytes!.buffer.asUint8List());
              image.dispose();
            });
          }
          await tester.pumpWidget(const SizedBox());
          await tester.pump();
        });
      }
    }
  }

  testWidgets(
      'Start waits for session state instead of launching while loading',
      (tester) async {
    final pending = Completer<TodayWorkoutDecision>();
    await tester.pumpWidget(ProviderScope(
        overrides: [
          ...overrides(),
          todayWorkoutProvider.overrideWith((ref) => pending.future),
        ],
        child: CupertinoApp(
            theme: buildCupertinoTheme(Brightness.dark),
            home: const CupertinoPageScaffold(child: TodayWorkoutCard()))));
    await tester.pump();
    expect(find.byType(AppButton), findsNothing);
    pending
        .complete(const TodayWorkoutDecision(action: TodayWorkoutAction.start));
    await tester.pumpAndSettle();
    expect(find.text('Start workout'), findsOneWidget);
  });
}
