import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../models/device_security_models.dart';
import '../services/device_security_service.dart';

final userDevicesProvider = FutureProvider.autoDispose<List<UserDeviceInfo>>((ref) async {
  return DeviceSecurityService.instance.fetchDevices();
});

final loginHistoryProvider = FutureProvider.autoDispose<List<LoginHistoryItem>>((ref) async {
  return DeviceSecurityService.instance.fetchLoginHistory();
});
