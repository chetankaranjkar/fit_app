import 'package:flutter/cupertino.dart';
import 'package:go_router/go_router.dart';

import '../features/auth/login_screen.dart';
import '../features/home/home_screen.dart';
import '../features/diet/diet_screen.dart';
import '../features/membership/membership_screen.dart';
import '../features/profile/profile_screen.dart';
import '../features/progress/progress_screen.dart';
import '../features/scanner/qr_scanner_screen.dart';
import '../features/shell/app_shell.dart';
import '../features/splash/splash_screen.dart';
import '../features/workouts/workout_detail_screen.dart';
import '../workout_session_screen.dart';
import '../features/workouts/workouts_screen.dart';
import '../models/me_models.dart';

final _rootNavKey = GlobalKey<NavigatorState>();

final appRouter = GoRouter(
  navigatorKey: _rootNavKey,
  initialLocation: '/splash',
  routes: [
    GoRoute(
      path: '/splash',
      pageBuilder: (_, __) => _fadePage(const SplashScreen()),
    ),
    GoRoute(
      path: '/login',
      pageBuilder: (_, __) => _fadePage(const LoginScreen()),
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
    StatefulShellRoute.indexedStack(
      builder: (_, __, navigationShell) => AppShell(navigationShell: navigationShell),
      branches: [
        StatefulShellBranch(routes: [
          GoRoute(
            path: '/home',
            pageBuilder: (_, __) => _fadePage(const HomeScreen()),
          ),
        ]),
        StatefulShellBranch(routes: [
          GoRoute(
            path: '/workouts',
            pageBuilder: (_, __) => _fadePage(const WorkoutsScreen()),
            routes: [
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
            pageBuilder: (_, __) => _fadePage(const DietScreen()),
          ),
        ]),
        StatefulShellBranch(routes: [
          GoRoute(
            path: '/progress',
            pageBuilder: (_, __) => _fadePage(const ProgressScreen()),
          ),
        ]),
        StatefulShellBranch(routes: [
          GoRoute(
            path: '/profile',
            pageBuilder: (_, __) => _fadePage(const ProfileScreen()),
          ),
        ]),
      ],
    ),
  ],
);

CustomTransitionPage<T> _fadePage<T>(Widget child) {
  return CustomTransitionPage<T>(
    child: child,
    transitionDuration: const Duration(milliseconds: 280),
    transitionsBuilder: (_, animation, __, child) {
      final fade = CurvedAnimation(parent: animation, curve: Curves.easeOutCubic);
      return FadeTransition(opacity: fade, child: child);
    },
  );
}

CupertinoPage<T> _slidePage<T>(Widget child) {
  return CupertinoPage<T>(child: child);
}

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
