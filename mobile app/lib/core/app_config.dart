/// Compile-time configuration. Override with `--dart-define`.
///
/// **VPS (Hostinger, port 80):**
/// `flutter run --dart-define=API_BASE_URL=http://YOUR_VPS_IP`
/// (no `/api` suffix, no `:5104` — gateway serves API on port 80)
///
/// **Android emulator → PC localhost:**
/// `http://10.0.2.2:5104`
///
/// **Physical phone → PC on LAN:**
/// `http://192.168.x.x:5104` with API listening on `0.0.0.0:5104`
class AppConfig {
  AppConfig._();

  static const String apiBaseUrl = String.fromEnvironment(
    'API_BASE_URL',
    defaultValue: 'https://tigerfitness.tech',
  );

  static const String apiPrefix = '/api';

  /// Normalized host root (no trailing slash, no duplicate `/api`).
  static String get apiHost {
    var base = apiBaseUrl.trim();
    while (base.endsWith('/')) {
      base = base.substring(0, base.length - 1);
    }
    if (base.toLowerCase().endsWith('/api')) {
      base = base.substring(0, base.length - 4);
    }
    return base;
  }

  /// Full API root used by Dio, e.g. `http://187.127.169.135/api`
  static String get apiRoot => '$apiHost$apiPrefix';

  /// True when pointing at local emulator default (likely wrong on a real device).
  static bool get looksLikeEmulatorDefault =>
      apiHost == 'http://10.0.2.2:5104' || apiHost == 'http://127.0.0.1:5104';
}
