import '../core/api_client.dart';
import '../models/device_security_models.dart';
import 'device_tracking_service.dart';

class DeviceSecurityService {
  DeviceSecurityService._();
  static final DeviceSecurityService instance = DeviceSecurityService._();

  Future<List<UserDeviceInfo>> fetchDevices() async {
    final uniqueId = await DeviceTrackingService.instance.getOrCreateDeviceUniqueId();
    final res = await ApiClient.instance.get<List<dynamic>>(
      '/me/devices',
      queryParameters: {'currentDeviceUniqueId': uniqueId},
    );
    final raw = res.data ?? [];
    return raw
        .whereType<Map>()
        .map((e) => UserDeviceInfo.fromJson(Map<String, dynamic>.from(e)))
        .toList();
  }

  Future<void> removeDevice(int deviceId) async {
    await ApiClient.instance.delete('/me/devices/$deviceId');
  }

  Future<void> logoutAllDevices() async {
    await ApiClient.instance.post('/me/devices/logout-all');
  }

  Future<List<LoginHistoryItem>> fetchLoginHistory({int take = 50}) async {
    final res = await ApiClient.instance.get<List<dynamic>>(
      '/me/login-history',
      queryParameters: {'take': take},
    );
    final raw = res.data ?? [];
    return raw
        .whereType<Map>()
        .map((e) => LoginHistoryItem.fromJson(Map<String, dynamic>.from(e)))
        .toList();
  }
}
