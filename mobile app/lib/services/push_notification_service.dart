import '../../services/device_tracking_service.dart';
import '../../services/me_service.dart';

/// Registers FCM tokens with the backend when available.
///
/// Add `firebase_core` + `firebase_messaging` and `google-services.json` to enable
/// device push; until then this service is a no-op after login.
class PushNotificationService {
  PushNotificationService._();
  static final PushNotificationService instance = PushNotificationService._();

  String? _lastRegisteredToken;

  Future<void> syncAfterLogin({String? fcmToken}) async {
    final token = fcmToken?.trim();
    if (token == null || token.isEmpty) return;
    if (token == _lastRegisteredToken) return;

    final deviceId = await DeviceTrackingService.instance.getOrCreateDeviceUniqueId();
    await MeService.instance.registerPushToken(token: token, deviceUniqueId: deviceId);
    _lastRegisteredToken = token;
  }
}
