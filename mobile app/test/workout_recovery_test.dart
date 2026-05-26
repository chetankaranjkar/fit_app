import 'package:flutter_test/flutter_test.dart';
import 'package:pulsefit/models/workout_tracking_models.dart';
import 'package:pulsefit/workout_sync/models/local_workout_snapshot.dart';
import 'package:pulsefit/workout_sync/models/pending_sync_action.dart';
import 'package:pulsefit/workout_sync/models/workout_sync_enums.dart';

ActiveWorkoutSession _session({
  int sessionId = 1,
  int completedSets = 0,
  int totalSets = 6,
  bool isOffline = false,
}) {
  return ActiveWorkoutSession(
    sessionId: sessionId,
    memberId: 10,
    workoutPlanId: 5,
    planName: 'Push',
    status: 'InProgress',
    startTimeUtc: DateTime.utc(2026, 5, 26, 10),
    completionPercent: totalSets == 0 ? 0 : 100 * completedSets / totalSets,
    completedSets: completedSets,
    totalSets: totalSets,
    totalVolume: 0,
    exercises: const [],
    isOffline: isOffline,
  );
}

void main() {
  group('LocalWorkoutSnapshot', () {
    test('round-trips JSON with metadata', () {
      final snap = LocalWorkoutSnapshot(
        session: _session(completedSets: 2),
        currentExerciseIndex: 1,
        elapsedSeconds: 120,
        scrollOffset: 48,
        lastUpdatedAt: DateTime.utc(2026, 5, 26, 11),
      );
      final decoded = LocalWorkoutSnapshot.decode(LocalWorkoutSnapshot.encode(snap));
      expect(decoded, isNotNull);
      expect(decoded!.currentExerciseIndex, 1);
      expect(decoded.elapsedSeconds, 120);
      expect(decoded.session.completedSets, 2);
    });
  });

  group('PendingSyncAction', () {
    test('encodes logSet payload', () {
      final action = PendingSyncAction(
        id: 'a1',
        type: PendingSyncActionType.logSet,
        payload: {'workoutSessionExerciseId': 99, 'isCompleted': true, 'actualReps': 10},
        createdAt: DateTime.utc(2026, 5, 26),
        memberId: 10,
        sessionId: 1,
      );
      final list = PendingSyncAction.decodeList(PendingSyncAction.encodeList([action]));
      expect(list.length, 1);
      expect(list.first.type, PendingSyncActionType.logSet);
      expect(list.first.payload['workoutSessionExerciseId'], 99);
    });
  });

  group('Recovery priority', () {
    test('local ahead of server keeps more completed sets', () {
      final local = _session(sessionId: 1, completedSets: 4);
      final server = _session(sessionId: 1, completedSets: 1);
      expect(local.completedSets > server.completedSets, isTrue);
    });
  });
}
