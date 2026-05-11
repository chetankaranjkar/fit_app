/// Compile-time configuration. Override with `--dart-define`.
///
/// **Android emulator:** default `http://10.0.2.2:5104` reaches your PC localhost.
///
/// **Physical phone (same Wi‑Fi as PC):** you must rebuild with your PC LAN IP,
/// e.g. `flutter run --dart-define=API_BASE_URL=http://192.168.1.50:5104`
/// AND run the API bound to `0.0.0.0`, not only `localhost`.
class AppConfig {
  AppConfig._();

  /// Backend base URL (scheme + host + port, **no** `/api` suffix).
  static const String apiBaseUrl = String.fromEnvironment(
    'API_BASE_URL',
    defaultValue: 'http://10.0.2.2:5104',
  );

  /// API path prefix.
  static const String apiPrefix = '/api';

  static String get apiRoot => '$apiBaseUrl$apiPrefix';
}
