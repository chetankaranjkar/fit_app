import 'package:flutter/cupertino.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';
import 'package:pulsefit/core/api_exception.dart';
import 'package:pulsefit/features/profile/help_support_screen.dart';
import 'package:pulsefit/features/profile/in_app_web_screen.dart';
import 'package:pulsefit/features/profile/privacy_screen.dart';
import 'package:pulsefit/features/profile/profile_screen.dart';
import 'package:pulsefit/models/me_models.dart';
import 'package:pulsefit/models/support_models.dart';
import 'package:pulsefit/providers/me_providers.dart';
import 'package:pulsefit/providers/sync_status_provider.dart';
import 'package:pulsefit/theme/app_theme.dart';
import 'package:pulsefit/workout_sync/sync/sync_manager.dart';

MeProfile get _profile => MeProfile(
      userId: 1,
      firstName: 'Ada',
      lastName: 'Lovelace',
      fullName: 'Ada Lovelace',
      email: 'ada@test.com',
      registrationDate: DateTime.utc(2024, 1, 1),
    );

GoRouter _router() {
  return GoRouter(
    initialLocation: '/profile',
    routes: [
      GoRoute(
        path: '/profile',
        builder: (_, __) => const ProfileScreen(),
        routes: [
          GoRoute(
            path: 'help',
            builder: (_, __) => const HelpSupportScreen(),
          ),
          GoRoute(
            path: 'privacy',
            builder: (_, __) => const PrivacyScreen(),
          ),
          GoRoute(
            path: 'document',
            builder: (context, state) {
              final extra = state.extra;
              if (extra is InAppWebArgs) {
                return InAppWebScreen(title: extra.title, url: extra.url);
              }
              return const InAppWebScreen(title: 'Document', url: '');
            },
          ),
          GoRoute(
            path: 'notifications',
            builder: (_, __) => const _NamedPage(title: 'Notifications'),
          ),
          GoRoute(
            path: 'security',
            builder: (_, __) => const _NamedPage(title: 'Security & Devices'),
          ),
        ],
      ),
    ],
  );
}

Widget _embed(
  BuildContext context, {
  required String url,
  required Object? loadError,
  required ValueChanged<Object> onError,
  required VoidCallback onRetry,
}) {
  if (loadError != null) {
    return Column(
      children: [
        const Text('This page could not be loaded. Check your connection and try again.'),
        CupertinoButton(onPressed: onRetry, child: const Text('Try again')),
        CupertinoButton(
          onPressed: () => onError('offline'),
          child: const Text('Simulate fail'),
        ),
      ],
    );
  }
  return Column(
    children: [
      Text('Opened $url', key: const Key('fake-webview')),
      CupertinoButton(
        onPressed: () => onError('offline'),
        child: const Text('Simulate fail'),
      ),
    ],
  );
}

List<Override> _overrides({
  MemberSupport support = const MemberSupport(),
  Object? supportError,
  ResolvedLegalLinks links = const ResolvedLegalLinks(
    helpCenterUrl: 'https://gym.test/help',
    privacyPolicyUrl: 'https://gym.test/privacy',
  ),
  List<HelpArticleSummary> articles = const [],
}) {
  return [
    profileProvider.overrideWith((ref) async => _profile),
    syncStatusProvider.overrideWith((ref) => Stream.value(SyncManager.idleSnapshot)),
    compileTimeLegalLinksProvider.overrideWithValue(links),
    helpArticlesProvider.overrideWith((ref) async => articles),
    inAppWebEmbedBuilderProvider.overrideWithValue(_embed),
    if (supportError != null)
      memberSupportProvider.overrideWith((ref) async => throw supportError)
    else
      memberSupportProvider.overrideWith((ref) async => support),
  ];
}

Future<void> _pump(WidgetTester tester, List<Override> overrides) async {
  final router = _router();
  await tester.binding.setSurfaceSize(const Size(800, 2000));
  addTearDown(() => tester.binding.setSurfaceSize(null));
  await tester.pumpWidget(
    ProviderScope(
      overrides: overrides,
      child: CupertinoApp.router(
        theme: buildCupertinoTheme(Brightness.dark),
        routerConfig: router,
      ),
    ),
  );
  await tester.pump();
  await tester.pump(const Duration(milliseconds: 100));
}

Future<void> _openFromProfile(WidgetTester tester, Key tile) async {
  await tester.ensureVisible(find.byKey(tile));
  await tester.pump();
  await tester.tap(find.byKey(tile));
  await tester.pump();
  await tester.pump(const Duration(milliseconds: 100));
}

Future<void> _back(WidgetTester tester) async {
  final nav = tester.state<NavigatorState>(find.byType(Navigator).last);
  nav.pop();
  await tester.pump();
  await tester.pump(const Duration(milliseconds: 100));
}

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  testWidgets('Help tap opens help center when URL is configured', (tester) async {
    await _pump(
      tester,
      _overrides(
        support: const MemberSupport(email: 'desk@gym.test', phone: '9876543210'),
      ),
    );

    await _openFromProfile(tester, const Key('profile-help'));
    expect(find.text('Help & support'), findsWidgets);
    expect(find.byKey(const Key('open-help-center')), findsOneWidget);
    expect(find.text('desk@gym.test'), findsOneWidget);
    expect(find.text('9876543210'), findsOneWidget);

    await tester.tap(find.byKey(const Key('open-help-center')));
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 100));
    expect(find.byKey(const Key('fake-webview')), findsOneWidget);
    expect(find.text('Opened https://gym.test/help'), findsOneWidget);
  });

  testWidgets('Help shows unavailable when URL and contact are missing', (tester) async {
    await _pump(
      tester,
      _overrides(
        links: const ResolvedLegalLinks(),
      ),
    );

    await _openFromProfile(tester, const Key('profile-help'));
    expect(find.byKey(const Key('help-not-configured')), findsOneWidget);
    expect(find.text('Help is not configured'), findsOneWidget);
    expect(find.byKey(const Key('open-help-center')), findsNothing);
  });

  testWidgets('Help offline state retries and keeps Profile reachable', (tester) async {
    await _pump(
      tester,
      _overrides(supportError: const ApiException('Failed host lookup')),
    );

    await _openFromProfile(tester, const Key('profile-help'));
    expect(find.textContaining('Check your connection'), findsOneWidget);
    expect(find.text('Try again'), findsOneWidget);

    await _back(tester);
    expect(find.text('Profile'), findsWidgets);
  });

  testWidgets('Privacy tap opens policy when URL is configured and back returns', (tester) async {
    await _pump(tester, _overrides());

    await _openFromProfile(tester, const Key('profile-privacy'));
    expect(find.byKey(const Key('open-privacy-policy')), findsOneWidget);

    await tester.tap(find.byKey(const Key('open-privacy-policy')));
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 100));
    expect(find.text('Opened https://gym.test/privacy'), findsOneWidget);

    await _back(tester);
    expect(find.text('Privacy'), findsWidgets);

    await _back(tester);
    expect(find.text('Profile'), findsWidgets);
  });

  testWidgets('Privacy unavailable when no policy URL, account controls remain', (tester) async {
    await _pump(
      tester,
      _overrides(links: const ResolvedLegalLinks()),
    );

    await _openFromProfile(tester, const Key('profile-privacy'));
    expect(find.byKey(const Key('privacy-unavailable')), findsOneWidget);
    expect(find.text('Privacy policy is not available'), findsOneWidget);
    expect(find.byKey(const Key('privacy-notifications')), findsOneWidget);
    expect(find.byKey(const Key('privacy-security')), findsOneWidget);
    expect(find.byKey(const Key('open-privacy-policy')), findsNothing);
  });

  testWidgets('In-app document failed load can retry', (tester) async {
    await _pump(tester, _overrides());

    await _openFromProfile(tester, const Key('profile-help'));
    await tester.tap(find.byKey(const Key('open-help-center')));
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 100));

    await tester.tap(find.text('Simulate fail'));
    await tester.pump();
    expect(find.textContaining('could not be loaded'), findsOneWidget);

    await tester.tap(find.text('Try again'));
    await tester.pump();
    expect(find.byKey(const Key('fake-webview')), findsOneWidget);
  });
}

class _NamedPage extends StatelessWidget {
  const _NamedPage({required this.title});
  final String title;

  @override
  Widget build(BuildContext context) {
    return CupertinoPageScaffold(
      navigationBar: CupertinoNavigationBar(
        middle: Text(title),
        leading: CupertinoNavigationBarBackButton(onPressed: () => context.pop()),
      ),
      child: const SizedBox.expand(),
    );
  }
}
