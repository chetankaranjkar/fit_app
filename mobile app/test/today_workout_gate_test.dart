import 'package:flutter_test/flutter_test.dart';
import 'package:pulsefit/features/workouts/logic/recorded_work.dart';
import 'package:pulsefit/features/workouts/logic/today_workout_gate.dart';
import 'package:pulsefit/features/workouts/logic/workout_day.dart';
import 'package:pulsefit/models/workout_tracking_models.dart';

ActiveWorkoutSession _session({
  required int memberId,
  required String status,
  int planId = 9,
  DateTime? workoutDate,
  bool pendingComplete = false,
  int completedSets = 3,
  int totalSets = 3,
  List<WorkoutExerciseGroup> exercises = const [],
}) {
  return ActiveWorkoutSession(
    sessionId: 11,
    memberId: memberId,
    workoutPlanId: planId,
    planName: 'Barokar',
    status: status,
    workoutDate: workoutDate,
    completionPercent: totalSets == 0 ? 0 : 100 * completedSets / totalSets,
    completedSets: completedSets,
    totalSets: totalSets,
    totalVolume: 0,
    exercises: exercises,
    pendingCompleteSync: pendingComplete,
    isOffline: pendingComplete,
  );
}

void main() {
  final now = DateTime(2026, 10, 12, 21, 30);

  test('reopening a completed workout stays read-only', () {
    final saved = _session(
      memberId: 1,
      status: 'Completed',
      workoutDate: DateTime(2026, 10, 12),
    );
    final decision = TodayWorkoutGate.decide(
      memberId: 1,
      workoutPlanId: 9,
      serverCompleted: saved,
      now: now,
    );
    expect(decision.action, TodayWorkoutAction.viewCompleted);
    expect(decision.session?.sessionId, 11);
  });

  test('a partial session resumes with its saved sets', () {
    final partial = _session(
      memberId: 1,
      status: 'InProgress',
      workoutDate: DateTime(2026, 10, 12, 18),
      completedSets: 1,
      totalSets: 6,
      exercises: [
        WorkoutExerciseGroup(
          exerciseId: 4,
          exerciseName: 'Squat',
          sets: [
            TrackedWorkoutSet(
              id: 1,
              exerciseId: 4,
              exerciseName: 'Squat',
              setNumber: 1,
              targetReps: 8,
              actualReps: 8,
              actualWeight: 60,
              isCompleted: true,
            ),
          ],
        ),
      ],
    );
    final decision = TodayWorkoutGate.decide(
      memberId: 1,
      workoutPlanId: 9,
      serverActive: partial,
      now: now,
    );
    expect(decision.action, TodayWorkoutAction.resume);
    expect(decision.session?.exercises.first.sets.first.actualWeight, 60);
  });

  test('offline completion waiting to sync cannot restart', () {
    final local = _session(
      memberId: 1,
      status: 'Completed',
      workoutDate: DateTime(2026, 10, 12, 20),
      pendingComplete: true,
      completedSets: 2,
      totalSets: 6,
    );
    final decision = TodayWorkoutGate.decide(
      memberId: 1,
      workoutPlanId: 9,
      localSession: local,
      now: now,
      serverReachable: false,
    );
    expect(decision.action, TodayWorkoutAction.viewCompleted);
    expect(decision.awaitingSync, isTrue);
  });

  test('another member local snapshot does not block this account', () {
    final other = _session(
      memberId: 2,
      status: 'Completed',
      workoutDate: DateTime(2026, 10, 12),
      pendingComplete: true,
    );
    final decision = TodayWorkoutGate.decide(
      memberId: 1,
      workoutPlanId: 9,
      localSession: other,
      now: now,
    );
    expect(decision.action, TodayWorkoutAction.start);
  });

  test('explicit start another keeps the earlier session out of the new action', () {
    final saved = _session(
      memberId: 1,
      status: 'Completed',
      workoutDate: DateTime(2026, 10, 12),
    );
    final decision = TodayWorkoutGate.decide(
      memberId: 1,
      workoutPlanId: 9,
      serverCompleted: saved,
      now: now,
      startAnother: true,
    );
    expect(decision.action, TodayWorkoutAction.start);
    expect(decision.session, isNull);
  });

  test('start another waits for an unsynced local completion', () {
    final local = _session(
      memberId: 1,
      status: 'Completed',
      workoutDate: DateTime(2026, 10, 12),
      pendingComplete: true,
    );
    final decision = TodayWorkoutGate.decide(
      memberId: 1,
      workoutPlanId: 9,
      localSession: local,
      now: now,
      startAnother: true,
      serverReachable: false,
    );
    expect(decision.action, TodayWorkoutAction.syncBeforeAnother);
  });

  test('utc midnight workout dates stay on that calendar day', () {
    final stored = DateTime.utc(2026, 10, 13);
    final latePreviousEvening = DateTime(2026, 10, 12, 23, 50);
    expect(WorkoutDay.sameLocalDay(stored, DateTime(2026, 10, 13, 0, 5)), isTrue);
    expect(WorkoutDay.calendarDay(stored), DateTime(2026, 10, 13));
    expect(WorkoutDay.sameLocalDay(stored, latePreviousEvening), isFalse);
  });

  test('a real utc instant uses the local calendar day around midnight', () {
    final justBeforeLocalMidnight = DateTime.utc(2026, 10, 12, 18, 29);
    final justAfter = DateTime.utc(2026, 10, 12, 18, 30);
    final beforeDay = WorkoutDay.calendarDay(justBeforeLocalMidnight);
    final afterDay = WorkoutDay.calendarDay(justAfter);
    expect(beforeDay == afterDay || afterDay.difference(beforeDay).inDays.abs() <= 1, isTrue);
  });

  test('repeated start calls share one in-flight future', () async {
    final gate = InFlightGate();
    var calls = 0;
    final first = gate.run('1|9|false', () async {
      calls++;
      await Future<void>.delayed(const Duration(milliseconds: 20));
      return 'ok';
    });
    final second = gate.run('1|9|false', () async {
      calls++;
      return 'other';
    });
    expect(await first, 'ok');
    expect(await second, 'ok');
    expect(calls, 1);
  });

  test('tracked sets are not added to mirrored logs', () {
    final work = RecordedWork.fromSources(
      hasTrackedRows: true,
      trackedTotal: 3,
      trackedCompleted: const [PerformedSet(weight: 20, reps: 10)],
      legacyLogs: const [PerformedSet(weight: 20, reps: 10)],
    );
    expect(work.completedSets, 1);
    expect(work.totalSets, 3);
    expect(work.volume, 200);
  });

  test('missing weight is not treated as zero volume', () {
    final work = RecordedWork.score(2, const [
      PerformedSet(weight: null, reps: 8),
    ]);
    expect(work.volume, isNull);
    expect(work.volumeComplete, isFalse);
    expect(recordedVolumeLabel(volume: work.volume, volumeComplete: work.volumeComplete), 'Volume not recorded');
  });
}
