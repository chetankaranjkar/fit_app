import 'dart:convert';

import 'package:shared_preferences/shared_preferences.dart';

import 'water_intake_models.dart';

abstract class WaterIntakeStore {
  Future<WaterDayRecord?> load({required int memberUserId, required String localDate});

  Future<void> save(WaterDayRecord record);
}

/// In-memory store for tests (fake persistence / restart = new service, same store).
class MemoryWaterIntakeStore implements WaterIntakeStore {
  final Map<String, String> _jsonByKey = {};

  static String key(int memberUserId, String localDate) =>
      SharedPreferencesWaterIntakeStore.storageKey(memberUserId, localDate);

  @override
  Future<WaterDayRecord?> load({required int memberUserId, required String localDate}) async {
    final raw = _jsonByKey[key(memberUserId, localDate)];
    if (raw == null || raw.isEmpty) return null;
    final decoded = WaterDayRecord.fromJson(jsonDecode(raw) as Map<String, dynamic>);
    if (decoded.memberUserId != memberUserId || decoded.localDate != localDate) return null;
    return decoded;
  }

  @override
  Future<void> save(WaterDayRecord record) async {
    _jsonByKey[key(record.memberUserId, record.localDate)] = jsonEncode(record.toJson());
  }
}

/// Reuses existing SharedPreferences (Hive for workouts is delayed on startup).
class SharedPreferencesWaterIntakeStore implements WaterIntakeStore {
  SharedPreferencesWaterIntakeStore({Future<SharedPreferences> Function()? prefs})
      : _prefs = prefs ?? SharedPreferences.getInstance;

  final Future<SharedPreferences> Function() _prefs;

  static const prefix = 'water_intake.v1';

  static String storageKey(int memberUserId, String localDate) =>
      '$prefix.$memberUserId.$localDate';

  @override
  Future<WaterDayRecord?> load({required int memberUserId, required String localDate}) async {
    if (memberUserId <= 0 || localDate.isEmpty) return null;
    final prefs = await _prefs();
    final raw = prefs.getString(storageKey(memberUserId, localDate));
    if (raw == null || raw.isEmpty) return null;
    try {
      final decoded = WaterDayRecord.fromJson(jsonDecode(raw) as Map<String, dynamic>);
      if (decoded.memberUserId != memberUserId || decoded.localDate != localDate) {
        return null;
      }
      return decoded;
    } catch (_) {
      return null;
    }
  }

  @override
  Future<void> save(WaterDayRecord record) async {
    if (record.memberUserId <= 0) return;
    final prefs = await _prefs();
    await prefs.setString(
      storageKey(record.memberUserId, record.localDate),
      jsonEncode(record.toJson()),
    );
  }
}
