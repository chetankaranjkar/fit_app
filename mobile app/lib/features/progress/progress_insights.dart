import '../../models/me_models.dart';

/// Chart / summary window. Attendance calendar from `/me/attendance` is last-30 only.
enum ProgressDateRange { days30, days90, all }

class WeightPoint {
  const WeightPoint({required this.loggedAt, required this.kg});
  final DateTime loggedAt;
  final double kg;
}

class BodyFatPoint {
  const BodyFatPoint({required this.loggedAt, required this.percent});
  final DateTime loggedAt;
  final double percent;
}

class GoalProgressSummary {
  const GoalProgressSummary({
    required this.goalKg,
    required this.latestLoggedKg,
    required this.headline,
    this.towardGoalPercent,
    this.towardGoalCaption,
  });

  final double goalKg;
  final double latestLoggedKg;
  final String headline;
  final double? towardGoalPercent;
  final String? towardGoalCaption;
}

/// Pure presentation helpers for the Progress tab. Trends use recorded logs only.
class ProgressInsights {
  ProgressInsights._();

  static const notEnoughLoggedData = 'Not enough logged data';

  static DateTime? rangeStart(ProgressDateRange range, DateTime now) {
    switch (range) {
      case ProgressDateRange.days30:
        return now.subtract(const Duration(days: 30));
      case ProgressDateRange.days90:
        return now.subtract(const Duration(days: 90));
      case ProgressDateRange.all:
        return null;
    }
  }

  static bool inRange(DateTime at, ProgressDateRange range, DateTime now) {
    final start = rangeStart(range, now);
    if (start == null) return true;
    return !at.isBefore(start);
  }

  static List<T> filterDated<T>(
    Iterable<T> items,
    DateTime Function(T) dateOf,
    ProgressDateRange range,
    DateTime now,
  ) {
    return items.where((e) => inRange(dateOf(e), range, now)).toList();
  }

  /// A filtered page is not the full history when the server says more rows exist.
  static String historyScopeCaption({
    required int returned,
    required int totalMatching,
    required bool truncated,
  }) {
    if (truncated || returned < totalMatching) {
      return 'Showing $returned of $totalMatching recorded workouts. Totals use only the workouts loaded.';
    }
    return '$totalMatching recorded workouts';
  }

  static List<WeightPoint> recordedWeights(Iterable<MeBodyMetricLog> rows) {
    final points = <WeightPoint>[];
    for (final row in rows) {
      final w = row.weight;
      if (w == null || w <= 0) continue;
      points.add(WeightPoint(loggedAt: row.loggedAt, kg: w.toDouble()));
    }
    points.sort((a, b) => a.loggedAt.compareTo(b.loggedAt));
    return points;
  }

  static List<BodyFatPoint> recordedBodyFat(Iterable<MeBodyMetricLog> rows) {
    final points = <BodyFatPoint>[];
    for (final row in rows) {
      final v = row.bodyFatPercent;
      if (v == null || v <= 0) continue;
      points.add(BodyFatPoint(loggedAt: row.loggedAt, percent: v.toDouble()));
    }
    points.sort((a, b) => a.loggedAt.compareTo(b.loggedAt));
    return points;
  }

  static List<WeightPoint> weightsInRange(
    Iterable<MeBodyMetricLog> rows,
    ProgressDateRange range,
    DateTime now,
  ) {
    return recordedWeights(rows).where((p) => inRange(p.loggedAt, range, now)).toList();
  }

  /// A slope requires two recorded points. One point is not a trend.
  static bool canShowTrend(int measuredPointCount) => measuredPointCount >= 2;

  static String? trendEmptyMessage(int measuredPointCount) {
    if (measuredPointCount == 0) return null;
    if (measuredPointCount < 2) return notEnoughLoggedData;
    return null;
  }

  static double? deltaKg(List<WeightPoint> chronological) {
    if (!canShowTrend(chronological.length)) return null;
    return chronological.last.kg - chronological.first.kg;
  }

  /// BMI from last recorded weight + height. Always an estimate (not a weigh-in).
  static double? estimateBmi({double? weightKg, double? heightCm}) {
    if (weightKg == null || weightKg <= 0) return null;
    if (heightCm == null || heightCm <= 0) return null;
    final meters = heightCm / 100.0;
    if (meters <= 0) return null;
    return _round1(weightKg / (meters * meters));
  }

  static double? heightCmForBmi({
    required Iterable<MeBodyMetricLog> logs,
    double? assignedHeightCm,
  }) {
    MeBodyMetricLog? latestWithHeight;
    for (final row in logs) {
      final h = row.height;
      if (h == null || h <= 0) continue;
      if (latestWithHeight == null || row.loggedAt.isAfter(latestWithHeight.loggedAt)) {
        latestWithHeight = row;
      }
    }
    final fromLog = latestWithHeight?.height?.toDouble();
    if (fromLog != null && fromLog > 0) return fromLog;
    if (assignedHeightCm != null && assignedHeightCm > 0) return assignedHeightCm;
    return null;
  }

  static GoalProgressSummary? goalSummary({
    required double? goalKg,
    required double? latestLoggedKg,
    double? firstLoggedKg,
  }) {
    if (goalKg == null || goalKg <= 0) return null;
    if (latestLoggedKg == null || latestLoggedKg <= 0) return null;
    final headline =
        'Goal ${_fmtKg(goalKg)} kg · latest logged ${_fmtKg(latestLoggedKg)} kg';

    double? percent;
    String? caption;
    if (firstLoggedKg != null && firstLoggedKg > 0) {
      final denom = firstLoggedKg - goalKg;
      if (denom.abs() >= 0.05) {
        percent = _round1(100 * (firstLoggedKg - latestLoggedKg) / denom);
        caption =
            'Toward goal from first logged weigh-in (start − current) ÷ (start − goal). Not a coach score.';
      }
    }

    return GoalProgressSummary(
      goalKg: goalKg,
      latestLoggedKg: latestLoggedKg,
      headline: headline,
      towardGoalPercent: percent,
      towardGoalCaption: caption,
    );
  }

  /// Linear projection from first→last recorded points in the window. Estimate only.
  static DateTime? estimateGoalDate({
    required List<WeightPoint> chronological,
    required double goalKg,
  }) {
    if (!canShowTrend(chronological.length)) return null;
    if (goalKg <= 0) return null;
    final first = chronological.first;
    final last = chronological.last;
    final days = last.loggedAt.difference(first.loggedAt).inMilliseconds / 86400000.0;
    if (days <= 0) return null;
    final ratePerDay = (last.kg - first.kg) / days;
    if (ratePerDay.abs() < 0.0001) return null;
    final remaining = goalKg - last.kg;
    if (remaining * ratePerDay <= 0) return null;
    final daysNeeded = remaining / ratePerDay;
    if (daysNeeded > 3650) return null;
    return last.loggedAt.add(Duration(milliseconds: (daysNeeded * 86400000).round()));
  }

  static int recordedVisitCount(Iterable<MeAttendanceDay> days) =>
      days.where((d) => d.visited).length;

  static bool hasNoRecordedVisits(Iterable<MeAttendanceDay> days) =>
      recordedVisitCount(days) == 0;

  static String _fmtKg(double kg) {
    if ((kg - kg.round()).abs() < 0.05) return kg.round().toString();
    return kg.toStringAsFixed(1);
  }

  static double _round1(double v) => (v * 10).round() / 10.0;
}
