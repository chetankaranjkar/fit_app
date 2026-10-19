import 'dart:io';

import 'package:health/health.dart';
import 'package:permission_handler/permission_handler.dart';

import 'phone_health_snapshot.dart';

abstract class PhoneHealthSource {
  Future<bool> isAvailable();

  Future<void> promptInstall();

  Future<bool> hasReadAccess();

  Future<bool> requestReadAccess();

  /// [vitalsFrom] and [vitalsTo] limit heart rate, oxygen, and active calories.
  /// The Google Fit screen omits them and reads the last 30 days.
  Future<PhoneHealthSnapshot> read({
    required DateTime now,
    DateTime? vitalsFrom,
    DateTime? vitalsTo,
  });
}

class HealthConnectSource implements PhoneHealthSource {
  HealthConnectSource({Health? health}) : _health = health ?? Health();

  final Health _health;
  var _configured = false;

  static const readTypes = <HealthDataType>[
    HealthDataType.STEPS,
    HealthDataType.WEIGHT,
    HealthDataType.WORKOUT,
    HealthDataType.HEART_RATE,
    HealthDataType.BLOOD_OXYGEN,
    HealthDataType.ACTIVE_ENERGY_BURNED,
  ];

  static const readAccess = <HealthDataAccess>[
    HealthDataAccess.READ,
    HealthDataAccess.READ,
    HealthDataAccess.READ,
    HealthDataAccess.READ,
    HealthDataAccess.READ,
    HealthDataAccess.READ,
  ];

  Future<void> _ensureConfigured() async {
    if (_configured) return;
    await _health.configure();
    _configured = true;
  }

  @override
  Future<bool> isAvailable() async {
    await _ensureConfigured();
    return _health.isHealthConnectAvailable();
  }

  @override
  Future<void> promptInstall() => _health.installHealthConnect();

  @override
  Future<bool> hasReadAccess() async {
    await _ensureConfigured();
    final granted = await _health.hasPermissions(readTypes, permissions: readAccess);
    return granted == true;
  }

  @override
  Future<bool> requestReadAccess() async {
    await _ensureConfigured();
    if (Platform.isAndroid) {
      await Permission.activityRecognition.request();
    }
    return _health.requestAuthorization(readTypes, permissions: readAccess);
  }

  @override
  Future<PhoneHealthSnapshot> read({
    required DateTime now,
    DateTime? vitalsFrom,
    DateTime? vitalsTo,
  }) async {
    await _ensureConfigured();
    final local = now.toLocal();
    final todayStart = DateTime(local.year, local.month, local.day);
    final windowed = vitalsFrom != null && vitalsTo != null;
    final steps = <DailyStepCount>[];
    if (!windowed) {
      for (var offset = 6; offset >= 0; offset--) {
        final start = todayStart.subtract(Duration(days: offset));
        final end = offset == 0 ? local : start.add(const Duration(days: 1));
        final count = await _health.getTotalStepsInInterval(start, end);
        steps.add(DailyStepCount(day: start, count: count));
      }
    }

    final points = await _health.getHealthDataFromTypes(
      types: [
        if (!windowed) HealthDataType.WEIGHT,
        if (!windowed) HealthDataType.WORKOUT,
        HealthDataType.HEART_RATE,
        HealthDataType.BLOOD_OXYGEN,
        HealthDataType.ACTIVE_ENERGY_BURNED,
      ],
      startTime: windowed ? vitalsFrom : todayStart.subtract(const Duration(days: 30)),
      endTime: windowed ? vitalsTo : local,
    );

    final weights = <PhoneWeightReading>[];
    final workouts = <PhoneWorkoutReading>[];
    final heartRates = <PhoneHeartRateReading>[];
    final bloodOxygen = <PhoneBloodOxygenReading>[];
    final calories = <PhoneCalorieSample>[];
    for (final point in points) {
      if (point.type == HealthDataType.WEIGHT && point.value is NumericHealthValue) {
        final numeric = (point.value as NumericHealthValue).numericValue;
        final kg = weightKilograms(numericValue: numeric, unit: point.unit);
        if (kg == null) continue;
        weights.add(PhoneWeightReading(kilograms: kg, recordedAt: point.dateFrom));
      } else if (point.type == HealthDataType.WORKOUT && point.value is WorkoutHealthValue) {
        final workout = point.value as WorkoutHealthValue;
        workouts.add(
          PhoneWorkoutReading(
            activity: workoutActivityLabel(workout.workoutActivityType.name),
            start: point.dateFrom,
            end: point.dateTo,
            energyKcal: workout.totalEnergyBurned,
          ),
        );
      } else if (point.type == HealthDataType.HEART_RATE && point.value is NumericHealthValue) {
        final bpm = heartRateBpm((point.value as NumericHealthValue).numericValue);
        if (bpm == null) continue;
        heartRates.add(PhoneHeartRateReading(bpm: bpm, recordedAt: point.dateFrom));
      } else if (point.type == HealthDataType.BLOOD_OXYGEN && point.value is NumericHealthValue) {
        final percent = bloodOxygenPercent((point.value as NumericHealthValue).numericValue);
        if (percent == null) continue;
        bloodOxygen.add(PhoneBloodOxygenReading(percent: percent, recordedAt: point.dateFrom));
      } else if (point.type == HealthDataType.ACTIVE_ENERGY_BURNED && point.value is NumericHealthValue) {
        final kcal = (point.value as NumericHealthValue).numericValue.toDouble();
        if (kcal <= 0) continue;
        calories.add(PhoneCalorieSample(kilocalories: kcal, start: point.dateFrom, end: point.dateTo));
      }
    }

    return snapshotFromReadings(
      steps: steps,
      weights: weights,
      workouts: workouts,
      heartRates: heartRates,
      bloodOxygen: bloodOxygen,
      calories: calories,
      heartRateLimit: windowed ? 800 : 24,
    );
  }
}
