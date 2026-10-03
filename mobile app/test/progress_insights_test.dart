import 'package:flutter_test/flutter_test.dart';
import 'package:pulsefit/features/progress/progress_insights.dart';
import 'package:pulsefit/models/me_models.dart';

MeBodyMetricLog _log({
  required DateTime at,
  num? weight,
  num? height,
  num? bodyFat,
  int id = 1,
}) {
  return MeBodyMetricLog(
    id: id,
    loggedAt: at,
    weight: weight,
    height: height,
    bodyFatPercent: bodyFat,
  );
}

void main() {
  final now = DateTime.utc(2026, 10, 3);

  group('sparse empty', () {
    test('no recorded weights and no recorded visits', () {
      expect(ProgressInsights.recordedWeights(const []), isEmpty);
      expect(
        ProgressInsights.hasNoRecordedVisits([
          MeAttendanceDay(date: now, visited: false),
          MeAttendanceDay(date: now.subtract(const Duration(days: 1)), visited: false),
        ]),
        isTrue,
      );
      expect(ProgressInsights.recordedVisitCount(const []), 0);
    });

    test('does not treat grey days as visits', () {
      final days = [
        MeAttendanceDay(date: now, visited: true),
        MeAttendanceDay(date: now.subtract(const Duration(days: 1)), visited: false),
      ];
      expect(ProgressInsights.recordedVisitCount(days), 1);
    });
  });

  group('estimate labelled BMI', () {
    test('computes BMI from weight and height', () {
      final bmi = ProgressInsights.estimateBmi(weightKg: 74, heightCm: 175);
      expect(bmi, isNotNull);
      expect(bmi!, closeTo(24.2, 0.05));
    });

    test('skips BMI when height or weight missing', () {
      expect(ProgressInsights.estimateBmi(weightKg: 74, heightCm: null), isNull);
      expect(ProgressInsights.estimateBmi(weightKg: null, heightCm: 175), isNull);
      expect(ProgressInsights.estimateBmi(weightKg: 74, heightCm: 0), isNull);
    });

    test('prefers logged height over assigned height', () {
      final logs = [
        _log(id: 1, at: now.subtract(const Duration(days: 10)), weight: 80, height: 180),
        _log(id: 2, at: now, weight: 78, height: 182),
      ];
      expect(
        ProgressInsights.heightCmForBmi(logs: logs, assignedHeightCm: 170),
        182,
      );
    });
  });

  group('weight trend', () {
    test('two recorded points allow a trend', () {
      final rows = [
        _log(id: 1, at: now.subtract(const Duration(days: 14)), weight: 76),
        _log(id: 2, at: now, weight: 74),
      ];
      final points = ProgressInsights.recordedWeights(rows);
      expect(ProgressInsights.canShowTrend(points.length), isTrue);
      expect(ProgressInsights.trendEmptyMessage(points.length), isNull);
      expect(ProgressInsights.deltaKg(points), -2);
    });

    test('one recorded point is not a trend', () {
      final rows = [_log(at: now, weight: 74)];
      final points = ProgressInsights.recordedWeights(rows);
      expect(ProgressInsights.canShowTrend(points.length), isFalse);
      expect(ProgressInsights.trendEmptyMessage(points.length), ProgressInsights.notEnoughLoggedData);
      expect(ProgressInsights.deltaKg(points), isNull);
    });

    test('ignores zero and missing weights', () {
      final rows = [
        _log(id: 1, at: now.subtract(const Duration(days: 2)), weight: 0),
        _log(id: 2, at: now, weight: null),
      ];
      expect(ProgressInsights.recordedWeights(rows), isEmpty);
    });
  });

  group('date filter', () {
    test('30-day window drops older weigh-ins so one point remains', () {
      final rows = [
        _log(id: 1, at: now.subtract(const Duration(days: 80)), weight: 80),
        _log(id: 2, at: now.subtract(const Duration(days: 5)), weight: 74),
      ];
      final in30 = ProgressInsights.weightsInRange(rows, ProgressDateRange.days30, now);
      expect(in30.length, 1);
      expect(ProgressInsights.canShowTrend(in30.length), isFalse);
      final in90 = ProgressInsights.weightsInRange(rows, ProgressDateRange.days90, now);
      expect(in90.length, 2);
      expect(ProgressInsights.canShowTrend(in90.length), isTrue);
      final all = ProgressInsights.weightsInRange(rows, ProgressDateRange.all, now);
      expect(all.length, 2);
    });
  });

  group('goals', () {
    test('headline only when goal and latest logged both exist', () {
      expect(
        ProgressInsights.goalSummary(goalKg: 70, latestLoggedKg: null),
        isNull,
      );
      expect(
        ProgressInsights.goalSummary(goalKg: null, latestLoggedKg: 74),
        isNull,
      );
      final s = ProgressInsights.goalSummary(goalKg: 70, latestLoggedKg: 74);
      expect(s, isNotNull);
      expect(s!.headline, 'Goal 70 kg · latest logged 74 kg');
      expect(s.towardGoalPercent, isNull);
    });

    test('toward-goal percent is explicit and skipped without start', () {
      final s = ProgressInsights.goalSummary(
        goalKg: 70,
        latestLoggedKg: 74,
        firstLoggedKg: 78,
      );
      expect(s!.towardGoalPercent, 50);
      expect(s.towardGoalCaption, contains('start − current'));
    });

    test('projected goal date is skipped with one point', () {
      expect(
        ProgressInsights.estimateGoalDate(
          chronological: [WeightPoint(loggedAt: now, kg: 74)],
          goalKg: 70,
        ),
        isNull,
      );
    });

    test('projected goal date uses linear logged trend', () {
      final date = ProgressInsights.estimateGoalDate(
        chronological: [
          WeightPoint(loggedAt: now.subtract(const Duration(days: 10)), kg: 75),
          WeightPoint(loggedAt: now, kg: 74),
        ],
        goalKg: 70,
      );
      expect(date, isNotNull);
      expect(date!.isAfter(now), isTrue);
    });
  });
}
