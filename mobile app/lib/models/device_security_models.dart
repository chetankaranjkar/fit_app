class UserDeviceInfo {
  const UserDeviceInfo({
    required this.deviceId,
    required this.deviceUniqueId,
    this.deviceName,
    this.deviceModel,
    this.platform,
    this.appVersion,
    this.isActive = true,
    this.isTrusted = false,
    this.isCurrent = false,
    this.lastLoginDate,
    this.lastActiveLabel = '',
  });

  final int deviceId;
  final String deviceUniqueId;
  final String? deviceName;
  final String? deviceModel;
  final String? platform;
  final String? appVersion;
  final bool isActive;
  final bool isTrusted;
  final bool isCurrent;
  final DateTime? lastLoginDate;
  final String lastActiveLabel;

  String get displayName {
    if (deviceName != null && deviceName!.trim().isNotEmpty) return deviceName!.trim();
    if (deviceModel != null && deviceModel!.trim().isNotEmpty) return deviceModel!.trim();
    return platform ?? 'Unknown Device';
  }

  factory UserDeviceInfo.fromJson(Map<String, dynamic> json) {
    DateTime? lastLogin;
    final raw = json['lastLoginDate'] ?? json['LastLoginDate'];
    if (raw is String) lastLogin = DateTime.tryParse(raw);

    return UserDeviceInfo(
      deviceId: (json['deviceId'] ?? json['DeviceId'] ?? 0) as int,
      deviceUniqueId: (json['deviceUniqueId'] ?? json['DeviceUniqueId'] ?? '').toString(),
      deviceName: (json['deviceName'] ?? json['DeviceName'])?.toString(),
      deviceModel: (json['deviceModel'] ?? json['DeviceModel'])?.toString(),
      platform: (json['platform'] ?? json['Platform'])?.toString(),
      appVersion: (json['appVersion'] ?? json['AppVersion'])?.toString(),
      isActive: json['isActive'] ?? json['IsActive'] ?? true,
      isTrusted: json['isTrusted'] ?? json['IsTrusted'] ?? false,
      isCurrent: json['isCurrent'] ?? json['IsCurrent'] ?? false,
      lastLoginDate: lastLogin,
      lastActiveLabel: (json['lastActiveLabel'] ?? json['LastActiveLabel'] ?? '').toString(),
    );
  }
}

class LoginHistoryItem {
  const LoginHistoryItem({
    required this.loginHistoryId,
    required this.loginDate,
    required this.deviceLabel,
    required this.loginStatus,
    this.platform,
    this.ipAddress,
    this.location,
    this.isSuspicious = false,
  });

  final int loginHistoryId;
  final DateTime loginDate;
  final String deviceLabel;
  final String loginStatus;
  final String? platform;
  final String? ipAddress;
  final String? location;
  final bool isSuspicious;

  factory LoginHistoryItem.fromJson(Map<String, dynamic> json) {
    final raw = json['loginDate'] ?? json['LoginDate'];
    final date = raw is String ? DateTime.tryParse(raw) ?? DateTime.now() : DateTime.now();

    return LoginHistoryItem(
      loginHistoryId: (json['loginHistoryId'] ?? json['LoginHistoryId'] ?? 0) as int,
      loginDate: date,
      deviceLabel: (json['deviceLabel'] ?? json['DeviceLabel'] ?? 'Unknown Device').toString(),
      loginStatus: (json['loginStatus'] ?? json['LoginStatus'] ?? 'Successful').toString(),
      platform: (json['platform'] ?? json['Platform'])?.toString(),
      ipAddress: (json['ipAddress'] ?? json['IPAddress'])?.toString(),
      location: (json['location'] ?? json['Location'])?.toString(),
      isSuspicious: json['isSuspicious'] ?? json['IsSuspicious'] ?? false,
    );
  }
}

class SecurityAlertInfo {
  const SecurityAlertInfo({
    required this.message,
    this.isNewDevice = false,
    this.isUnusualLocation = false,
  });

  final String message;
  final bool isNewDevice;
  final bool isUnusualLocation;

  factory SecurityAlertInfo.fromJson(Map<String, dynamic> json) => SecurityAlertInfo(
        message: (json['message'] ?? json['Message'] ?? '').toString(),
        isNewDevice: json['isNewDevice'] ?? json['IsNewDevice'] ?? false,
        isUnusualLocation: json['isUnusualLocation'] ?? json['IsUnusualLocation'] ?? false,
      );
}

class DeviceLimitInfo {
  const DeviceLimitInfo({
    required this.message,
    required this.maxDevices,
    required this.activeDevices,
  });

  final String message;
  final int maxDevices;
  final List<UserDeviceInfo> activeDevices;

  factory DeviceLimitInfo.fromJson(Map<String, dynamic> json) {
    final limit = json['deviceLimit'] ?? json['DeviceLimit'] ?? json;
    final devicesRaw = limit['activeDevices'] ?? limit['ActiveDevices'];
    final devices = <UserDeviceInfo>[];
    if (devicesRaw is List) {
      for (final d in devicesRaw) {
        if (d is Map<String, dynamic>) devices.add(UserDeviceInfo.fromJson(d));
        if (d is Map) devices.add(UserDeviceInfo.fromJson(Map<String, dynamic>.from(d)));
      }
    }
    return DeviceLimitInfo(
      message: (limit['message'] ?? limit['Message'] ?? 'Device limit reached').toString(),
      maxDevices: (limit['maxDevices'] ?? limit['MaxDevices'] ?? 3) as int,
      activeDevices: devices,
    );
  }
}

class DeviceContextPayload {
  const DeviceContextPayload({
    required this.deviceUniqueId,
    this.deviceName,
    this.deviceModel,
    this.platform,
    this.osVersion,
    this.appVersion,
    this.firebaseUid,
    this.locationHint,
  });

  final String deviceUniqueId;
  final String? deviceName;
  final String? deviceModel;
  final String? platform;
  final String? osVersion;
  final String? appVersion;
  final String? firebaseUid;
  final String? locationHint;

  Map<String, dynamic> toJson() => {
        'deviceUniqueId': deviceUniqueId,
        if (deviceName != null) 'deviceName': deviceName,
        if (deviceModel != null) 'deviceModel': deviceModel,
        if (platform != null) 'platform': platform,
        if (osVersion != null) 'osVersion': osVersion,
        if (appVersion != null) 'appVersion': appVersion,
        if (firebaseUid != null) 'firebaseUid': firebaseUid,
        if (locationHint != null) 'locationHint': locationHint,
      };
}
