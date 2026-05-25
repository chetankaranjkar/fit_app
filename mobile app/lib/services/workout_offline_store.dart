import 'dart:convert';

import 'package:shared_preferences/shared_preferences.dart';

import '../models/workout_tracking_models.dart';

/// On-device live workout session (SharedPreferences).
class WorkoutOfflineStore {
  WorkoutOfflineStore._();
  static final WorkoutOfflineStore instance = WorkoutOfflineStore._();

  static const _sessionKey = 'pulsefit_offline_live_workout_session';

  Future<ActiveWorkoutSession?> loadSession() async {
    final prefs = await SharedPreferences.getInstance();
    final raw = prefs.getString(_sessionKey);
    if (raw == null || raw.isEmpty) return null;
    try {
      final json = jsonDecode(raw) as Map<String, dynamic>;
      return ActiveWorkoutSession.fromJson(json);
    } catch (_) {
      return null;
    }
  }

  Future<void> saveSession(ActiveWorkoutSession session) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_sessionKey, jsonEncode(session.toJson()));
  }

  Future<void> clearSession() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(_sessionKey);
  }

  Future<bool> hasPendingSession() async {
    final s = await loadSession();
    return s != null && (s.isOffline || s.pendingCompleteSync);
  }
}
