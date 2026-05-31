import 'dart:async';

import 'package:flutter/cupertino.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'routes/app_router.dart';
import 'theme/app_theme.dart';
import 'workout_sync/sync/workout_sync_bootstrap.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();

  FlutterError.onError = (details) {
    FlutterError.presentError(details);
    debugPrint('FlutterError: ${details.exceptionAsString()}');
  };

  // Hive + sync only after UI is up (prevents emulator OOM on cold start).
  WorkoutSyncBootstrap.scheduleDelayedStart();
  await SystemChrome.setPreferredOrientations([
    DeviceOrientation.portraitUp,
  ]);
  runApp(const ProviderScope(child: PulseFitApp()));
}

/// Rebuild theme when OS light/dark changes (Cupertino parity with built-in apps).
class PulseFitApp extends StatefulWidget {
  const PulseFitApp({super.key});

  @override
  State<PulseFitApp> createState() => _PulseFitAppState();
}

class _PulseFitAppState extends State<PulseFitApp> with WidgetsBindingObserver {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    super.dispose();
  }

  @override
  void didChangePlatformBrightness() => setState(() {});

  @override
  Widget build(BuildContext context) {
    final brightness = WidgetsBinding.instance.platformDispatcher.platformBrightness;
    return CupertinoApp.router(
      title: 'Tiger Fitness',
      debugShowCheckedModeBanner: false,
      theme: buildCupertinoTheme(brightness),
      routerConfig: appRouter,
    );
  }
}
