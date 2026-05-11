import 'package:flutter/cupertino.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'routes/app_router.dart';
import 'theme/app_theme.dart';

void main() {
  WidgetsFlutterBinding.ensureInitialized();
  SystemChrome.setPreferredOrientations([
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
      title: 'PulseFit',
      debugShowCheckedModeBanner: false,
      theme: buildCupertinoTheme(brightness),
      routerConfig: appRouter,
    );
  }
}
