import 'package:flutter/cupertino.dart';
import 'package:go_router/go_router.dart';

import '../features/auth/login_screen.dart';
import '../features/media/onboarding_profile_photo_screen.dart';
import '../features/media/transformation_tracker_screen.dart';
import '../features/home/home_screen.dart';
import '../features/diet/diet_screen.dart';
import '../features/membership/membership_screen.dart';
import '../features/profile/profile_screen.dart';
import '../features/progress/progress_screen.dart';
import '../features/scanner/qr_scanner_screen.dart';
import '../features/shell/app_shell.dart';
import '../features/splash/splash_screen.dart';
import '../features/workouts/workout_detail_screen.dart';
import '../features/workouts/live_workout_session_screen.dart';
import '../models/workout_tracking_models.dart';
import '../workout_session_screen.dart';
import '../features/workouts/workouts_screen.dart';
import '../models/me_models.dart';

final _rootNavKey = GlobalKey<NavigatorState>();

final appRouter = GoRouter(
  navigatorKey: _rootNavKey,
  initialLocation: '/splash',
  errorBuilder: (context, state) => CupertinoPageScaffold(
    child: SafeArea(
      child: Center(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Icon(CupertinoIcons.exclamationmark_triangle, size: 40),
              const SizedBox(height: 12),
              Text(
                state.error?.toString() ?? 'Navigation error',
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 16),
              CupertinoButton.filled(
                onPressed: () => context.go('/login'),
                child: const Text('Go to login'),
              ),
            ],
          ),
        ),
      ),
    ),
  ),
  routes: [
    GoRoute(
      path: '/splash',
      pageBuilder: (_, __) => _plainPage(const SplashScreen()),
    ),
    GoRoute(
      path: '/login',
      pageBuilder: (_, __) => _plainPage(const LoginScreen()),
    ),
    GoRoute(
      path: '/onboarding/photo',
      pageBuilder: (_, __) => _plainPage(const OnboardingProfilePhotoScreen()),
    ),
    GoRoute(
      path: '/scanner',
      pageBuilder: (_, __) => _slidePage(const QrScannerScreen()),
    ),
    GoRoute(
      path: '/membership',
      parentNavigatorKey: _rootNavKey,
      pageBuilder: (_, __) => _slidePage(const MembershipScreen()),
    ),
    GoRoute(
      path: '/progress/transformation',
      parentNavigatorKey: _rootNavKey,
      pageBuilder: (_, __) => _slidePage(const TransformationTrackerScreen()),
    ),
    StatefulShellRoute.indexedStack(
      builder: (_, __, navigationShell) => AppShell(navigationShell: navigationShell),
      branches: [
        StatefulShellBranch(routes: [
          GoRoute(
            path: '/home',
            pageBuilder: (_, __) => _plainPage(const HomeScreen()),
          ),
        ]),
        StatefulShellBranch(routes: [
          GoRoute(
            path: '/workouts',
            pageBuilder: (_, __) => _plainPage(const WorkoutsScreen()),
            routes: [
              GoRoute(
                path: 'live',
                parentNavigatorKey: _rootNavKey,
                pageBuilder: (context, state) {
                  final extra = state.extra;
                  return _slidePage(
                    LiveWorkoutSessionScreen(
                      initialSession: extra is ActiveWorkoutSession ? extra : null,
                    ),
                  );
                },
              ),
              GoRoute(
                path: ':planId',
                pageBuilder: (context, state) {
                  final extra = state.extra;
                  if (extra is MeWorkoutPlanSummary) {
                    return _slidePage(WorkoutDetailScreen(plan: extra));
                  }
                  return _slidePage(const _MissingPlan());
                },
                routes: [
                  GoRoute(
                    path: 'session',
                    pageBuilder: (context, state) {
                      final extra = state.extra;
                      if (extra is MeWorkoutPlanSummary) {
                        return _slidePage(WorkoutSessionScreen(plan: extra));
                      }
                      return _slidePage(const _MissingPlan());
                    },
                  ),
                ],
              ),
            ],
          ),
        ]),
        StatefulShellBranch(routes: [
          GoRoute(
            path: '/diet',
            pageBuilder: (_, __) => _plainPage(const DietScreen()),
          ),
        ]),
        StatefulShellBranch(routes: [
          GoRoute(
            path: '/progress',
            pageBuilder: (_, __) => _plainPage(const ProgressScreen()),
          ),
        ]),
        StatefulShellBranch(routes: [
          GoRoute(
            path: '/profile',
            pageBuilder: (_, __) => _plainPage(const ProfileScreen()),
          ),
        ]),
      ],
    ),
  ],
);

/// Instant show — avoids blank screen when [FadeTransition] stays at opacity 0 after [GoRouter.go].
CupertinoPage<T> _plainPage<T>(Widget child) => CupertinoPage<T>(child: child);

CupertinoPage<T> _slidePage<T>(Widget child) => CupertinoPage<T>(child: child);

class _MissingPlan extends StatelessWidget {
  const _MissingPlan();

  @override
  Widget build(BuildContext context) {
    return CupertinoPageScaffold(
      navigationBar: const CupertinoNavigationBar(middle: Text('Plan')),
      child: SafeArea(
        child: Center(
          child: Padding(
            padding: const EdgeInsets.all(24),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                const Icon(CupertinoIcons.question_circle, size: 36),
                const SizedBox(height: 8),
                const Text('Plan not found.'),
                const SizedBox(height: 16),
                CupertinoButton.filled(
                  onPressed: () => GoRouter.of(context).go('/workouts'),
                  child: const Text('Back to workouts'),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
