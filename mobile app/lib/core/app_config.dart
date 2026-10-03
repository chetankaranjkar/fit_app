/// Compile-time configuration. Override with `--dart-define`.
///
/// **Production / UAT (HTTPS, Hostinger gateway):**
/// `flutter run --dart-define=API_BASE_URL=https://tigerfitness.tech`
/// `flutter run --dart-define=API_BASE_URL=https://uat.tigerfitness.tech`
/// (no `/api` suffix, no `:5104` — Nginx/gateway serves the API)
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

  /// Web help center. Override with `--dart-define=HELP_CENTER_URL=…`.
  /// Default is the existing SPA route on the same host as the API (`/help`).
  static String? get helpCenterUrl {
    const override = String.fromEnvironment('HELP_CENTER_URL');
    final trimmed = override.trim();
    if (trimmed.isNotEmpty) return _httpOrNull(trimmed);
    return _httpOrNull('$apiHost/help');
  }

  /// Approved privacy policy URL only. Empty unless `--dart-define=PRIVACY_POLICY_URL=…`
  /// or the API returns a stored `ClientApp:PrivacyPolicyUrl`. Never invents copy.
  static String? get privacyPolicyUrl {
    const override = String.fromEnvironment('PRIVACY_POLICY_URL');
    return _httpOrNull(override);
  }

  static String? httpOrNull(String? value) => _httpOrNull(value);

  static String? _httpOrNull(String? value) {
    final trimmed = value?.trim();
    if (trimmed == null || trimmed.isEmpty || trimmed == '#') return null;
    final uri = Uri.tryParse(trimmed);
    if (uri == null || !uri.hasScheme) return null;
    if (uri.scheme != 'http' && uri.scheme != 'https') return null;
    return trimmed;
  }
}
