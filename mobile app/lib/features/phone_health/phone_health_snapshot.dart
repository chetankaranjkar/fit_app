import 'package:health/health.dart';

/// One local calendar day of step counts from Health Connect.
class DailyStepCount {
  const DailyStepCount({required this.day, required this.count});

  /// Local midnight of the day.
  final DateTime day;

  /// Null when Health Connect could not return a total.
  final int? count;
}

class PhoneWeightReading {
  const PhoneWeightReading({required this.kilograms, required this.recordedAt});

  final double kilograms;
  final DateTime recordedAt;
}

class PhoneWorkoutReading {
  const PhoneWorkoutReading({
    required this.activity,
    required this.start,
    required this.end,
    this.energyKcal,
  });

  final String activity;
  final DateTime start;
  final DateTime end;
  final int? energyKcal;

  Duration get duration => end.difference(start);
}

class PhoneHeartRateReading {
  const PhoneHeartRateReading({required this.bpm, required this.recordedAt});

  final int bpm;
  final DateTime recordedAt;
}

class PhoneBloodOxygenReading {
  const PhoneBloodOxygenReading({required this.percent, required this.recordedAt});

  /// SpO2 as 0–100.
  final double percent;
  final DateTime recordedAt;
}

/// Active calories from Health Connect. A long bucket is prorated onto the workout window.
class PhoneCalorieSample {
  const PhoneCalorieSample({required this.kilocalories, required this.start, required this.end});

  final double kilocalories;
  final DateTime start;
  final DateTime end;
}

class PhoneHealthSnapshot {
  const PhoneHealthSnapshot({
    required this.steps,
    required this.weights,
    required this.workouts,
    this.heartRates = const [],
    this.bloodOxygen = const [],
    this.calories = const [],
  });

  /// Oldest day first, including today.
  final List<DailyStepCount> steps;

  /// Newest first.
  final List<PhoneWeightReading> weights;

  /// Newest first.
  final List<PhoneWorkoutReading> workouts;

  /// Newest first. Empty when no wearable (e.g. Fitbit Air) shared HR into Health Connect.
  final List<PhoneHeartRateReading> heartRates;

  /// Newest first. Empty when no SpO2 samples are available.
  final List<PhoneBloodOxygenReading> bloodOxygen;

  /// Newest first.
  final List<PhoneCalorieSample> calories;

  int? get stepsToday => steps.isEmpty ? null : steps.last.count;

  PhoneWeightReading? get latestWeight => weights.isEmpty ? null : weights.first;

  PhoneHeartRateReading? get latestHeartRate => heartRates.isEmpty ? null : heartRates.first;

  PhoneBloodOxygenReading? get latestBloodOxygen => bloodOxygen.isEmpty ? null : bloodOxygen.first;

  bool get hasWearableVitals => heartRates.isNotEmpty || bloodOxygen.isNotEmpty;
}

double? weightKilograms({required num numericValue, required HealthDataUnit unit}) {
  final value = numericValue.toDouble();
  if (value <= 0) return null;
  switch (unit) {
    case HealthDataUnit.KILOGRAM:
      return value;
    case HealthDataUnit.POUND:
      return value * 0.45359237;
    case HealthDataUnit.GRAM:
      return value / 1000;
    default:
      return null;
  }
}

String workoutActivityLabel(String rawName) {
  final words = rawName
      .split('_')
      .where((part) => part.isNotEmpty)
      .map((part) {
        final lower = part.toLowerCase();
        return '${lower[0].toUpperCase()}${lower.substring(1)}';
      })
      .toList();
  if (words.isEmpty) return 'Workout';
  return words.join(' ');
}

String formatWorkoutDuration(Duration duration) {
  if (duration.isNegative || duration.inMinutes < 1) return 'Under 1 min';
  final hours = duration.inHours;
  final minutes = duration.inMinutes.remainder(60);
  if (hours == 0) return '$minutes min';
  if (minutes == 0) return '$hours h';
  return '$hours h $minutes min';
}

bool sameLocalDay(DateTime a, DateTime b) {
  final left = a.toLocal();
  final right = b.toLocal();
  return left.year == right.year && left.month == right.month && left.day == right.day;
}

/// True when a weigh-in already exists for that local day within 0.15 kg.
bool weightAlreadyRecorded({
  required Iterable<({DateTime at, num? weight})> recorded,
  required DateTime at,
  required double kilograms,
}) {
  for (final row in recorded) {
    final weight = row.weight;
    if (weight == null) continue;
    if (!sameLocalDay(row.at, at)) continue;
    if ((weight.toDouble() - kilograms).abs() < 0.15) return true;
  }
  return false;
}

/// Normalizes SpO2 from Health Connect (fraction 0–1 or percent 0–100).
double? bloodOxygenPercent(num numericValue) {
  final value = numericValue.toDouble();
  if (value <= 0) return null;
  if (value <= 1) {
    final asPercent = value * 100;
    if (asPercent < 50 || asPercent > 100) return null;
    return asPercent;
  }
  if (value > 100) return null;
  if (value < 50) return null;
  return value;
}

int? heartRateBpm(num numericValue) {
  final bpm = numericValue.round();
  if (bpm < 30 || bpm > 250) return null;
  return bpm;
}

PhoneHealthSnapshot snapshotFromReadings({
  required List<DailyStepCount> steps,
  required List<PhoneWeightReading> weights,
  required List<PhoneWorkoutReading> workouts,
  List<PhoneHeartRateReading> heartRates = const [],
  List<PhoneBloodOxygenReading> bloodOxygen = const [],
  List<PhoneCalorieSample> calories = const [],
  int heartRateLimit = 24,
}) {
  final sortedWeights = [...weights]..sort((a, b) => b.recordedAt.compareTo(a.recordedAt));
  final sortedWorkouts = [...workouts]..sort((a, b) => b.start.compareTo(a.start));
  final sortedHr = [...heartRates]..sort((a, b) => b.recordedAt.compareTo(a.recordedAt));
  final sortedO2 = [...bloodOxygen]..sort((a, b) => b.recordedAt.compareTo(a.recordedAt));
  final sortedKcal = [...calories]..sort((a, b) => b.start.compareTo(a.start));
  return PhoneHealthSnapshot(
    steps: steps,
    weights: sortedWeights.take(12).toList(),
    workouts: sortedWorkouts.take(20).toList(),
    heartRates: sortedHr.take(heartRateLimit).toList(),
    bloodOxygen: sortedO2.take(heartRateLimit).toList(),
    calories: sortedKcal.take(heartRateLimit).toList(),
  );
}

class BandSessionMeasures {
  const BandSessionMeasures({
    this.averageBpm,
    this.maxBpm,
    this.oxygenPercent,
    this.activeKcal,
  });

  final int? averageBpm;
  final int? maxBpm;
  final double? oxygenPercent;
  final int? activeKcal;

  bool get hasAny => averageBpm != null || oxygenPercent != null || (activeKcal != null && activeKcal! > 0);
}

bool _inWindow(DateTime at, DateTime start, DateTime end) {
  final t = at.toUtc();
  return !t.isBefore(start.toUtc()) && !t.isAfter(end.toUtc());
}

double _overlapKcal(PhoneCalorieSample sample, DateTime start, DateTime end) {
  final sampleStart = sample.start.toUtc();
  var sampleEnd = sample.end.toUtc();
  if (!sampleEnd.isAfter(sampleStart)) {
    sampleEnd = sampleStart.add(const Duration(minutes: 1));
  }
  final windowStart = start.toUtc();
  final windowEnd = end.toUtc();
  final overlapStart = sampleStart.isAfter(windowStart) ? sampleStart : windowStart;
  final overlapEnd = sampleEnd.isBefore(windowEnd) ? sampleEnd : windowEnd;
  if (!overlapEnd.isAfter(overlapStart)) return 0;
  final sampleMs = sampleEnd.difference(sampleStart).inMilliseconds;
  final overlapMs = overlapEnd.difference(overlapStart).inMilliseconds;
  if (sampleMs <= 0) return sample.kilocalories;
  return sample.kilocalories * overlapMs / sampleMs;
}

/// Heart rate, SpO2, and active calories that fall inside [start]–[end].
BandSessionMeasures measuresDuring({
  required DateTime start,
  required DateTime end,
  required List<PhoneHeartRateReading> heartRates,
  required List<PhoneBloodOxygenReading> bloodOxygen,
  required List<PhoneCalorieSample> calories,
}) {
  final hr = heartRates.where((row) => _inWindow(row.recordedAt, start, end)).toList();
  final oxygen = bloodOxygen.where((row) => _inWindow(row.recordedAt, start, end)).toList()
    ..sort((a, b) => b.recordedAt.compareTo(a.recordedAt));
  final kcal = calories.fold<double>(0, (sum, sample) => sum + _overlapKcal(sample, start, end));
  return BandSessionMeasures(
    averageBpm: hr.isEmpty ? null : (hr.map((row) => row.bpm).reduce((a, b) => a + b) / hr.length).round(),
    maxBpm: hr.isEmpty ? null : hr.map((row) => row.bpm).reduce((a, b) => a > b ? a : b),
    oxygenPercent: oxygen.isEmpty ? null : oxygen.first.percent,
    activeKcal: kcal < 1 ? null : kcal.round(),
  );
}
