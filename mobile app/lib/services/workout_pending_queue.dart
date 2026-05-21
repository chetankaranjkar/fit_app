import 'dart:convert';

import 'package:shared_preferences/shared_preferences.dart';

import '../models/me_models.dart';

/// Persists failed workout completions for retry when connectivity returns.
class WorkoutPendingQueue {
  WorkoutPendingQueue._();
  static final WorkoutPendingQueue instance = WorkoutPendingQueue._();

  static const _prefsKey = 'pulsefit_pending_workout_completions';

  Future<List<Map<String, dynamic>>> _readRaw(SharedPreferences prefs) async {
    final s = prefs.getString(_prefsKey);
    if (s == null || s.isEmpty) return [];
    final decoded = jsonDecode(s);
    if (decoded is! List) return [];
    return decoded.whereType<Map>().map((e) => e.cast<String, dynamic>()).toList();
  }

  Future<void> enqueue({
    required int workoutPlanId,
    int? durationMinutes,
    required List<MeWorkoutSetEntry> sets,
  }) async {
    final prefs = await SharedPreferences.getInstance();
    final list = await _readRaw(prefs);
    list.add({
      'workoutPlanId': workoutPlanId,
      if (durationMinutes != null) 'durationMinutes': durationMinutes,
      'sets': sets.map((e) => e.toJson()).toList(),
      'queuedAt': DateTime.now().toUtc().toIso8601String(),
    });
    await prefs.setString(_prefsKey, jsonEncode(list));
  }

  Future<int> pendingCount() async {
    final prefs = await SharedPreferences.getInstance();
    return (await _readRaw(prefs)).length;
  }

  Future<void> _writeAll(SharedPreferences prefs, List<Map<String, dynamic>> list) async {
    if (list.isEmpty) {
      await prefs.remove(_prefsKey);
    } else {
      await prefs.setString(_prefsKey, jsonEncode(list));
    }
  }

  /// Attempts each pending completion; removes entries that succeed.
  /// Returns number successfully synced.
  Future<int> drain(
    Future<void> Function(int workoutPlanId, int? durationMinutes, List<MeWorkoutSetEntry> sets) submit,
  ) async {
    final prefs = await SharedPreferences.getInstance();
    final list = await _readRaw(prefs);
    if (list.isEmpty) return 0;

    var synced = 0;
    final remaining = <Map<String, dynamic>>[];

    for (final item in list) {
      final planId = item['workoutPlanId'] as int? ?? (item['workoutPlanId'] as num?)?.toInt();
      if (planId == null || planId <= 0) {
        continue;
      }
      final duration = item['durationMinutes'] as int? ?? (item['durationMinutes'] as num?)?.toInt();
      final setsRaw = item['sets'];
      if (setsRaw is! List) {
        remaining.add(item);
        continue;
      }
      final sets = <MeWorkoutSetEntry>[];
      for (final s in setsRaw) {
        if (s is! Map) continue;
        final m = s.cast<String, dynamic>();
        final ex = m['exerciseId'];
        final sn = m['setNumber'];
        final rd = m['repsDone'];
        if (ex == null || sn == null || rd == null) continue;
        sets.add(MeWorkoutSetEntry(
          exerciseId: ex is int ? ex : int.parse('$ex'),
          setNumber: sn is int ? sn : int.parse('$sn'),
          repsDone: rd is int ? rd : int.parse('$rd'),
          weightUsed: m['weightUsed'] != null ? (m['weightUsed'] as num).toDouble() : null,
        ));
      }
      if (sets.isEmpty) {
        remaining.add(item);
        continue;
      }
      try {
        await submit(planId, duration, sets);
        synced++;
      } catch (_) {
        remaining.add(item);
      }
    }

    await _writeAll(prefs, remaining);
    return synced;
  }
}
