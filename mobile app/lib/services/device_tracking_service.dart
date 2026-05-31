import 'dart:io';

import 'package:device_info_plus/device_info_plus.dart';
import 'package:package_info_plus/package_info_plus.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:uuid/uuid.dart';

import '../models/device_security_models.dart';

/// Collects stable device identity + metadata for login and session tracking.
class DeviceTrackingService {
  DeviceTrackingService._();
  static final DeviceTrackingService instance = DeviceTrackingService._();

  static const _deviceIdKey = 'device.unique_id';

  Future<String> getOrCreateDeviceUniqueId() async {
    final prefs = await SharedPreferences.getInstance();
    final existing = prefs.getString(_deviceIdKey);
    if (existing != null && existing.isNotEmpty) return existing;
    final id = const Uuid().v4();
    await prefs.setString(_deviceIdKey, id);
    return id;
  }

  Future<DeviceContextPayload> buildDeviceContext({String? firebaseUid}) async {
    final uniqueId = await getOrCreateDeviceUniqueId();
    final plugin = DeviceInfoPlugin();
    final package = await PackageInfo.fromPlatform();

    String? deviceName;
    String? deviceModel;
    String? platform;
    String? osVersion;

    if (Platform.isAndroid) {
      final info = await plugin.androidInfo;
      deviceName = info.name;
      deviceModel = info.model;
      platform = 'Android';
      osVersion = info.version.release;
    } else if (Platform.isIOS) {
      final info = await plugin.iosInfo;
      deviceName = info.name;
      deviceModel = info.utsname.machine;
      platform = 'iOS';
      osVersion = info.systemVersion;
    } else {
      platform = Platform.operatingSystem;
      osVersion = Platform.operatingSystemVersion;
    }

    return DeviceContextPayload(
      deviceUniqueId: uniqueId,
      deviceName: deviceName,
      deviceModel: deviceModel,
      platform: platform,
      osVersion: osVersion,
      appVersion: package.version,
      firebaseUid: firebaseUid,
    );
  }
}
