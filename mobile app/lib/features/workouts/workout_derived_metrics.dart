import 'dart:math' as math;

import '../../models/me_models.dart';

/// UI-only heuristics derived from `/api/me/*` payloads — no extra network calls.
class WorkoutDerivedMetrics {
  WorkoutDerivedMetrics._();

  /// 0–100 based on weekly check-ins and streak (motivational, not clinical).
  static double completionPercent(MeAttendanceSummary a) {
    final week = math.min(5, math.max(0, a.totalThisWeek));
    final streakBonus = math.min(a.currentStreakDays, 7) * 4.0;
    return (week / 5 * 72 + streakBonus).clamp(0, 100);
  }

  /// Rough kcal estimate for a plan session (MET-style placeholder).
  static int estimatedSessionKcal(MeWorkoutPlanSummary plan) {
    final mins = plan.durationMinutes ?? 45;
    return (mins * 6.2).round();
  }

  /// 0–100 readiness heuristic from streak + recency of visits.
  static int recoveryScore(MeAttendanceSummary a) {
    final base = 62 + math.min(28, a.currentStreakDays * 3);
    final pull = a.totalThisWeek > 4 ? 6 : 0;
    return math.min(98, base + pull).toInt();
  }

  static String coachName(MeDashboard? d) {
    final schedule = d?.upcomingSchedule;
    if (schedule == null) return 'Coach';
    final t = schedule
        .map((e) => e.trainerName?.trim() ?? '')
        .firstWhere((e) => e.isNotEmpty, orElse: () => '');
    if (t.isEmpty) return 'Coach';
    return t;
  }
}
