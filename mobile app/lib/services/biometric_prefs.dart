import 'package:shared_preferences/shared_preferences.dart';

/// Local preference: unlock cached session with device biometrics (no server change).
class BiometricPrefs {
  BiometricPrefs._();

  static const _enabledKey = 'auth.biometric_unlock_enabled';

  static Future<bool> isEnabled() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getBool(_enabledKey) ?? false;
  }

  static Future<void> setEnabled(bool enabled) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setBool(_enabledKey, enabled);
  }
}
