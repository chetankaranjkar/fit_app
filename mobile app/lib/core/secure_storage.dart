import 'package:flutter_secure_storage/flutter_secure_storage.dart';

/// Wrapper around flutter_secure_storage with named keys for auth tokens.
class SecureStorage {
  SecureStorage._();

  static const _storage = FlutterSecureStorage(
    aOptions: AndroidOptions(encryptedSharedPreferences: true),
  );

  static const String _kAccessToken = 'auth.access_token';
  static const String _kRefreshToken = 'auth.refresh_token';
  static const String _kRefreshExpiry = 'auth.refresh_expiry';
  static const String _kUserJson = 'auth.user_json';

  static Future<void> writeAccessToken(String token) =>
      _storage.write(key: _kAccessToken, value: token);

  static Future<String?> readAccessToken() => _storage.read(key: _kAccessToken);

  static Future<void> writeRefreshToken(String token) =>
      _storage.write(key: _kRefreshToken, value: token);

  static Future<String?> readRefreshToken() => _storage.read(key: _kRefreshToken);

  static Future<void> writeRefreshExpiry(String? iso) =>
      _storage.write(key: _kRefreshExpiry, value: iso);

  static Future<String?> readRefreshExpiry() => _storage.read(key: _kRefreshExpiry);

  static Future<void> writeUserJson(String json) =>
      _storage.write(key: _kUserJson, value: json);

  static Future<String?> readUserJson() => _storage.read(key: _kUserJson);

  static Future<void> clear() async {
    await _storage.delete(key: _kAccessToken);
    await _storage.delete(key: _kRefreshToken);
    await _storage.delete(key: _kRefreshExpiry);
    await _storage.delete(key: _kUserJson);
  }
}
