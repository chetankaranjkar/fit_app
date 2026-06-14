import 'package:local_auth/local_auth.dart';

/// Device fingerprint / face unlock via OS APIs (unlocks stored JWT only).
class BiometricService {
  BiometricService._();

  static final BiometricService instance = BiometricService._();

  final LocalAuthentication _auth = LocalAuthentication();

  Future<bool> canAuthenticate() async {
    try {
      if (!await _auth.isDeviceSupported()) return false;
      final types = await _auth.getAvailableBiometrics();
      return types.isNotEmpty;
    } catch (_) {
      return false;
    }
  }

  /// User-facing label for dialogs and settings.
  Future<String> unlockLabel() async {
    try {
      final types = await _auth.getAvailableBiometrics();
      if (types.contains(BiometricType.face) ||
          types.contains(BiometricType.strong)) {
        return 'Face unlock';
      }
      if (types.contains(BiometricType.fingerprint) ||
          types.contains(BiometricType.weak)) {
        return 'Fingerprint';
      }
    } catch (_) {}
    return 'Biometric unlock';
  }

  Future<bool> authenticate({required String reason}) async {
    try {
      return await _auth.authenticate(
        localizedReason: reason,
        options: const AuthenticationOptions(
          stickyAuth: true,
          biometricOnly: false,
        ),
      );
    } catch (_) {
      return false;
    }
  }
}
