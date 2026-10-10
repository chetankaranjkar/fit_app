import 'package:flutter/cupertino.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:health/health.dart';
import 'package:pulsefit/features/phone_health/phone_health_provider.dart';
import 'package:pulsefit/features/phone_health/phone_health_screen.dart';
import 'package:pulsefit/features/phone_health/phone_health_snapshot.dart';
import 'package:pulsefit/features/phone_health/phone_health_source.dart';
import 'package:pulsefit/models/me_models.dart';
import 'package:pulsefit/providers/me_providers.dart';

void main() {
  test('converts pounds to kilograms and ignores unknown units', () {
    final kg = weightKilograms(numericValue: 154.324, unit: HealthDataUnit.POUND);
    expect(kg, closeTo(70, 0.01));
    expect(weightKilograms(numericValue: 70, unit: HealthDataUnit.KILOGRAM), 70);
    expect(weightKilograms(numericValue: 70, unit: HealthDataUnit.BEATS_PER_MINUTE), isNull);
    expect(weightKilograms(numericValue: 0, unit: HealthDataUnit.KILOGRAM), isNull);
  });

  test('labels workout activity and duration', () {
    expect(workoutActivityLabel('HIGH_INTENSITY_INTERVAL_TRAINING'), 'High Intensity Interval Training');
    expect(workoutActivityLabel(''), 'Workout');
    expect(formatWorkoutDuration(const Duration(minutes: 45)), '45 min');
    expect(formatWorkoutDuration(const Duration(hours: 1, minutes: 5)), '1 h 5 min');
    expect(formatWorkoutDuration(const Duration(seconds: 20)), 'Under 1 min');
  });

  test('treats the same local day and close weight as already recorded', () {
    final at = DateTime(2026, 10, 4, 8);
    expect(
      weightAlreadyRecorded(
        recorded: [(at: DateTime(2026, 10, 4, 21), weight: 70.1)],
        at: at,
        kilograms: 70,
      ),
      isTrue,
    );
    expect(
      weightAlreadyRecorded(
        recorded: [(at: DateTime(2026, 10, 3, 21), weight: 70)],
        at: at,
        kilograms: 70,
      ),
      isFalse,
    );
  });

  test('orders weights and workouts newest first', () {
    final snapshot = snapshotFromReadings(
      steps: [
        DailyStepCount(day: DateTime(2026, 10, 4), count: 4200),
      ],
      weights: [
        PhoneWeightReading(kilograms: 71, recordedAt: DateTime(2026, 10, 1)),
        PhoneWeightReading(kilograms: 70, recordedAt: DateTime(2026, 10, 4)),
      ],
      workouts: [
        PhoneWorkoutReading(
          activity: 'Walking',
          start: DateTime(2026, 10, 2, 7),
          end: DateTime(2026, 10, 2, 7, 40),
        ),
        PhoneWorkoutReading(
          activity: 'Running',
          start: DateTime(2026, 10, 4, 6),
          end: DateTime(2026, 10, 4, 6, 30),
        ),
      ],
    );
    expect(snapshot.stepsToday, 4200);
    expect(snapshot.latestWeight?.kilograms, 70);
    expect(snapshot.workouts.first.activity, 'Running');
  });

  testWidgets('shows steps, weight, and workouts from Health Connect', (tester) async {
    final source = _FakeHealthSource();
    await tester.pumpWidget(
      TickerMode(
        enabled: false,
        child: ProviderScope(
          overrides: [
            phoneHealthSourceProvider.overrideWithValue(source),
            bodyMetricsProvider.overrideWith((ref) async => const <MeBodyMetricLog>[]),
          ],
          child: const CupertinoApp(home: PhoneHealthScreen()),
        ),
      ),
    );
    await tester.pump();
    await tester.pump();

    expect(find.text('8421'), findsWidgets);
    expect(find.text('70.4 kg'), findsWidgets);
    expect(find.text('Strength Training'), findsOneWidget);
    expect(find.text('Save latest to weigh-ins'), findsOneWidget);
  });
}

class _FakeHealthSource implements PhoneHealthSource {
  @override
  Future<bool> hasReadAccess() async => true;

  @override
  Future<bool> isAvailable() async => true;

  @override
  Future<void> promptInstall() async {}

  @override
  Future<PhoneHealthSnapshot> read({required DateTime now}) async {
    final today = DateTime(now.year, now.month, now.day);
    return PhoneHealthSnapshot(
      steps: [DailyStepCount(day: today, count: 8421)],
      weights: [PhoneWeightReading(kilograms: 70.4, recordedAt: now)],
      workouts: [
        PhoneWorkoutReading(
          activity: 'Strength Training',
          start: now.subtract(const Duration(hours: 2)),
          end: now.subtract(const Duration(hours: 1)),
          energyKcal: 320,
        ),
      ],
    );
  }

  @override
  Future<bool> requestReadAccess() async => true;
}
