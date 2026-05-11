import 'dart:convert';

import '../core/api_client.dart';
import '../core/secure_storage.dart';
import '../models/auth_models.dart';

class AuthService {
  AuthService._();
  static final AuthService instance = AuthService._();

  Future<LoginResponse> login(String identifier, String password) async {
    final isEmail = identifier.contains('@');
    final res = await ApiClient.instance.post<Map<String, dynamic>>(
      '/Auth/login',
      body: {
        'email': isEmail ? identifier.trim() : '',
        'username': isEmail ? '' : identifier.trim(),
        'password': password,
      },
    );

    final data = res.data ?? <String, dynamic>{};
    final loginResponse = LoginResponse.fromJson(data);
    await _persist(loginResponse);
    return loginResponse;
  }

  Future<LoginResponse?> tryRefresh() async {
    final refresh = await SecureStorage.readRefreshToken();
    if (refresh == null || refresh.isEmpty) return null;

    try {
      final res = await ApiClient.instance.post<Map<String, dynamic>>(
        '/Auth/refresh',
        body: {'refreshToken': refresh},
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
    await SecureStorage.clear();
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
    await SecureStorage.writeUserJson(jsonEncode(session.toJson()));
  }
}
