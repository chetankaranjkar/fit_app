import 'dart:convert';

import 'package:shared_preferences/shared_preferences.dart';

/// Last successful `/api/me/*` payloads for Home when the device is offline.
class MeResponseCache {
  MeResponseCache._();
  static final MeResponseCache instance = MeResponseCache._();

  static const dashboardKey = 'pulsefit_cache_me_dashboard';
  static const plansKey = 'pulsefit_cache_me_workout_plans';
  static const billingKey = 'pulsefit_cache_me_billing';

  Future<void> saveMap(String key, Map<String, dynamic> json) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(key, jsonEncode(json));
  }

  Future<void> saveList(String key, List<dynamic> json) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(key, jsonEncode(json));
  }

  Future<Map<String, dynamic>?> loadMap(String key) async {
    final prefs = await SharedPreferences.getInstance();
    final raw = prefs.getString(key);
    if (raw == null || raw.isEmpty) return null;
    try {
      final decoded = jsonDecode(raw);
      if (decoded is Map<String, dynamic>) return decoded;
      if (decoded is Map) return decoded.cast<String, dynamic>();
    } catch (_) {}
    return null;
  }

  Future<List<dynamic>?> loadList(String key) async {
    final prefs = await SharedPreferences.getInstance();
    final raw = prefs.getString(key);
    if (raw == null || raw.isEmpty) return null;
    try {
      final decoded = jsonDecode(raw);
      if (decoded is List) return decoded;
    } catch (_) {}
    return null;
  }
}
