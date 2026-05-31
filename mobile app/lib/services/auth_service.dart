import 'dart:convert';

import '../core/api_client.dart';
import '../core/api_exception.dart';
import '../core/secure_storage.dart';
import '../models/auth_models.dart';
import '../models/device_security_models.dart';
import '../services/device_tracking_service.dart';

class AuthService {
  AuthService._();
  static final AuthService instance = AuthService._();

  Future<LoginResponse> login(
    String identifier,
    String password, {
    int? removeDeviceId,
  }) async {
    final id = identifier.trim();
    final isEmail = id.contains('@');
    final device = await DeviceTrackingService.instance.buildDeviceContext();

    final res = await ApiClient.instance.post<Map<String, dynamic>>(
      '/Auth/login',
      body: {
        'username': id,
        'password': password,
        if (isEmail) 'email': id,
        'device': device.toJson(),
        if (removeDeviceId != null) 'removeDeviceId': removeDeviceId,
      },
    );

    final data = res.data ?? <String, dynamic>{};
    final loginResponse = LoginResponse.fromJson(data);
    await _persist(loginResponse);
    return loginResponse;
  }

  Future<LoginResponse> loginWithDeviceLimitResolution(
    String identifier,
    String password,
    int removeDeviceId,
  ) =>
      login(identifier, password, removeDeviceId: removeDeviceId);

  DeviceLimitInfo? parseDeviceLimit(ApiException e) {
    if (e.statusCode != 409) return null;
    final data = e.data;
    if (data is Map<String, dynamic>) return DeviceLimitInfo.fromJson(data);
    if (data is Map) return DeviceLimitInfo.fromJson(Map<String, dynamic>.from(data));
    return null;
  }

  Future<LoginResponse?> tryRefresh() async {
    final refresh = await SecureStorage.readRefreshToken();
    if (refresh == null || refresh.isEmpty) return null;

    final deviceUniqueId = await DeviceTrackingService.instance.getOrCreateDeviceUniqueId();
    final sessionId = await SecureStorage.readSessionId();

    try {
      final res = await ApiClient.instance.post<Map<String, dynamic>>(
        '/Auth/refresh',
        body: {
          'refreshToken': refresh,
          'deviceUniqueId': deviceUniqueId,
          if (sessionId != null) 'sessionId': sessionId,
        },
      );
      final data = res.data ?? <String, dynamic>{};
      if ((data['token'] ?? data['Token'] ?? '').toString().isEmpty) return null;
      final loginResponse = LoginResponse.fromJson(data);
      await _persist(loginResponse);
      return loginResponse;
    } catch (_) {
      return null;
    }
  }

  Future<void> logout() async {
    try {
      await ApiClient.instance.post('/Auth/logout');
    } catch (_) {}
    await SecureStorage.clearSession();
  }

  Future<LoginResponse?> readCachedSession() async {
    final raw = await SecureStorage.readUserJson();
    if (raw == null || raw.isEmpty) return null;
    try {
      final map = jsonDecode(raw) as Map<String, dynamic>;
      return LoginResponse.fromJson(map);
    } catch (_) {
      return null;
    }
  }

  Future<void> _persist(LoginResponse session) async {
    await SecureStorage.writeAccessToken(session.token);
    if (session.refreshToken != null && session.refreshToken!.isNotEmpty) {
      await SecureStorage.writeRefreshToken(session.refreshToken!);
    }
    await SecureStorage.writeRefreshExpiry(
      session.refreshTokenExpiresAt?.toIso8601String(),
    );
    if (session.sessionId != null) {
      await SecureStorage.writeSessionId(session.sessionId!);
    }
    await SecureStorage.writeUserJson(jsonEncode(session.toJson()));
  }
}
