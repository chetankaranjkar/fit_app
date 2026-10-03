import 'package:flutter_test/flutter_test.dart';
import 'package:pulsefit/core/api_exception.dart';
import 'package:pulsefit/models/workout_tracking_models.dart';
import 'package:pulsefit/workout_sync/models/local_workout_snapshot.dart';
import 'package:pulsefit/workout_sync/models/pending_sync_action.dart';
import 'package:pulsefit/workout_sync/models/workout_sync_enums.dart';
import 'package:pulsefit/workout_sync/offline/offline_workout_repository.dart';
import 'package:pulsefit/workout_sync/recovery/session_conflict_policy.dart';
import 'package:pulsefit/workout_sync/sync/sync_manager.dart';

ActiveWorkoutSession _session({
  int sessionId = 1,
  int memberId = 10,
  int completedSets = 0,
  int totalSets = 6,
  bool isOffline = false,
  bool pendingCompleteSync = false,
  String status = 'InProgress',
  List<WorkoutExerciseGroup> exercises = const [],
}) {
  return ActiveWorkoutSession(
    sessionId: sessionId,
    memberId: memberId,
    workoutPlanId: 5,
    planName: 'Push',
    status: status,
    startTimeUtc: DateTime.utc(2026, 5, 26, 10),
    completionPercent: totalSets == 0 ? 0 : 100 * completedSets / totalSets,
    completedSets: completedSets,
    totalSets: totalSets,
    totalVolume: 0,
    exercises: exercises,
    isOffline: isOffline,
    pendingCompleteSync: pendingCompleteSync,
  );
}

class FakeRemote implements WorkoutSyncRemote {
  int logSetCalls = 0;
  int logSetAttempts = 0;
  int completeCalls = 0;
  int startCalls = 0;
  int getActiveCalls = 0;
  Object? Function()? onLogSet;
  Object? Function()? onComplete;
  ActiveWorkoutSession? active;
  final loggedSetIds = <int>[];

  @override
  Future<ActiveWorkoutSession?> getActive(int memberId) async {
    getActiveCalls++;
    return active;
  }

  @override
  Future<ActiveWorkoutSession> start({
    required int memberId,
    required int workoutPlanId,
  }) async {
    startCalls++;
    active ??= _session(memberId: memberId, sessionId: 99);
    return active!;
  }

  @override
  Future<void> logSet({
    required int workoutSessionExerciseId,
    int? actualReps,
    double? actualWeight,
    required bool isCompleted,
    String? notes,
  }) async {
    logSetAttempts++;
    final err = onLogSet?.call();
    if (err != null) throw err;
    logSetCalls++;
    loggedSetIds.add(workoutSessionExerciseId);
  }

  @override
  Future<void> complete(int sessionId) async {
    final err = onComplete?.call();
    if (err != null) throw err;
    completeCalls++;
    if (active != null) {
      active = active!.copyWith(status: 'Completed', pendingCompleteSync: false);
    }
  }
}

SyncManager _manager({
  required OfflineWorkoutRepository store,
  required FakeRemote remote,
  bool online = true,
  Future<int> Function(int memberId)? legacyDrain,
}) {
  return SyncManager(
    offline: store,
    remote: remote,
    requireBootstrap: false,
    legacyDrain: legacyDrain ?? (_) async => 0,
    isOnline: () async => online,
    hasDeviceNetwork: () async => online,
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
      expect(list.first.effectiveKey, 'logSet:1:99');
    });
  });

  group('SessionConflictPolicy', () {
    test('local ahead of server keeps more completed sets', () {
      final local = LocalWorkoutSnapshot(session: _session(sessionId: 1, completedSets: 4));
      final server = _session(sessionId: 1, completedSets: 1);
      final merged = SessionConflictPolicy.mergeLive(server, local, 10);
      expect(merged.completedSets, 4);
      expect(merged.sessionId, 1);
    });

    test('different session ids: server wins', () {
      final local = LocalWorkoutSnapshot(session: _session(sessionId: 1, completedSets: 4));
      final server = _session(sessionId: 2, completedSets: 1);
      expect(SessionConflictPolicy.mergeLive(server, local, 10).sessionId, 2);
    });

    test('completed local is not live-resumable', () {
      final snap = LocalWorkoutSnapshot(
        session: _session(pendingCompleteSync: true, status: 'Completed'),
      );
      expect(SessionConflictPolicy.isLiveResumable(snap, 10), isFalse);
      expect(SessionConflictPolicy.isPendingComplete(snap, 10), isTrue);
    });

    test('other member snapshot is ignored', () {
      final snap = LocalWorkoutSnapshot(session: _session(memberId: 99, completedSets: 3));
      expect(SessionConflictPolicy.isLiveResumable(snap, 10), isFalse);
    });
  });

  group('Queue persistence and replay', () {
    test('recover-after-kill reloads snapshot and unsent queue for same member', () async {
      final shared = <String, String>{};
      final storeA = OfflineWorkoutRepository.memory(shared);
      await storeA.setBoundMember(10);
      await storeA.saveSnapshot(LocalWorkoutSnapshot(
        session: _session(completedSets: 2, isOffline: true),
        elapsedSeconds: 45,
      ));
      await storeA.enqueueAction(PendingSyncAction(
        id: 'q1',
        type: PendingSyncActionType.logSet,
        payload: {'workoutSessionExerciseId': 44, 'isCompleted': true, 'actualReps': 8},
        createdAt: DateTime.utc(2026, 5, 26),
        memberId: 10,
        sessionId: 1,
      ));

      final storeB = OfflineWorkoutRepository.memory(shared);
      await storeB.setBoundMember(10);
      final snap = await storeB.loadSnapshot(memberId: 10);
      final queue = await storeB.loadQueue(memberId: 10);
      expect(snap, isNotNull);
      expect(snap!.elapsedSeconds, 45);
      expect(snap.session.completedSets, 2);
      expect(queue, hasLength(1));
      expect(queue.first.payload['workoutSessionExerciseId'], 44);
    });

    test('duplicate enqueue of the same set keeps one action (last payload)', () async {
      final store = OfflineWorkoutRepository.memory();
      final mgr = _manager(store: store, remote: FakeRemote());
      await mgr.bindMember(10);
      final session = _session();
      await mgr.enqueueLogSet(
        session: session,
        workoutSessionExerciseId: 44,
        actualReps: 8,
        isCompleted: true,
      );
      await mgr.enqueueLogSet(
        session: session,
        workoutSessionExerciseId: 44,
        actualReps: 10,
        isCompleted: true,
      );
      final queue = await store.loadQueue(memberId: 10);
      expect(queue, hasLength(1));
      expect(queue.first.payload['actualReps'], 10);
    });

    test('failed HTTP then success uploads once and drops the action', () async {
      final store = OfflineWorkoutRepository.memory();
      final remote = FakeRemote();
      var fails = 1;
      remote.onLogSet = () {
        if (fails > 0) {
          fails--;
          return const ApiException('offline');
        }
        return null;
      };
      final mgr = _manager(store: store, remote: remote);
      await mgr.bindMember(10);
      await mgr.enqueueLogSet(
        session: _session(),
        workoutSessionExerciseId: 44,
        actualReps: 8,
        isCompleted: true,
      );

      final first = await mgr.syncAll(reason: 'fail');
      expect(first.syncedCount, 0);
      expect(await store.loadQueue(memberId: 10), hasLength(1));
      expect((await store.loadQueue(memberId: 10)).first.retryCount, 1);

      final second = await mgr.syncAll(reason: 'ok');
      expect(second.syncedCount, 1);
      expect(remote.logSetCalls, 1);
      expect(await store.loadQueue(memberId: 10), isEmpty);
    });

    test('repeated replay does not call logSet twice', () async {
      final store = OfflineWorkoutRepository.memory();
      final remote = FakeRemote();
      final mgr = _manager(store: store, remote: remote);
      await mgr.bindMember(10);
      await mgr.enqueueLogSet(
        session: _session(),
        workoutSessionExerciseId: 44,
        actualReps: 8,
        isCompleted: true,
      );
      await mgr.syncAll(reason: 'first');
      await mgr.enqueueLogSet(
        session: _session(),
        workoutSessionExerciseId: 44,
        actualReps: 8,
        isCompleted: true,
      );
      await mgr.syncAll(reason: 'second');
      expect(remote.logSetCalls, 1);
    });

    test('retry exhaustion stops looping, keeps data, records last error', () async {
      final store = OfflineWorkoutRepository.memory();
      final remote = FakeRemote();
      remote.onLogSet = () => const ApiException('server 500', statusCode: 500);
      final mgr = _manager(store: store, remote: remote);
      await mgr.bindMember(10);
      await mgr.enqueueLogSet(
        session: _session(),
        workoutSessionExerciseId: 44,
        actualReps: 8,
        isCompleted: true,
      );

      for (var i = 0; i < 10; i++) {
        await mgr.syncAll(reason: 'loop');
      }
      expect(remote.logSetAttempts, 8);
      expect(remote.logSetCalls, 0);
      final queue = await store.loadQueue(memberId: 10);
      expect(queue, hasLength(1));
      expect(queue.first.syncStatus, PendingSyncStatus.failed);
      expect(queue.first.lastError, contains('500'));
      expect(queue.first.retryCount, 8);
      final extraAttempts = remote.logSetAttempts;
      await mgr.syncAll(reason: 'after-fail');
      expect(remote.logSetAttempts, extraAttempts);
    });

    test('network loss leaves queue untouched', () async {
      final store = OfflineWorkoutRepository.memory();
      final remote = FakeRemote();
      final mgr = _manager(store: store, remote: remote, online: false);
      await mgr.bindMember(10);
      await mgr.enqueueLogSet(
        session: _session(),
        workoutSessionExerciseId: 44,
        actualReps: 8,
        isCompleted: true,
      );
      final result = await mgr.syncAll(reason: 'offline');
      expect(result.offline, isTrue);
      expect(remote.logSetCalls, 0);
      expect(await store.loadQueue(memberId: 10), hasLength(1));
    });

    test('account switch does not replay member A queue as member B', () async {
      final store = OfflineWorkoutRepository.memory();
      final remote = FakeRemote();
      final mgr = _manager(store: store, remote: remote);
      await mgr.bindMember(10);
      await mgr.enqueueLogSet(
        session: _session(memberId: 10),
        workoutSessionExerciseId: 44,
        actualReps: 8,
        isCompleted: true,
      );
      await mgr.onAccountSignedOut();
      await mgr.bindMember(20);
      final result = await mgr.syncAll(reason: 'b');
      expect(remote.logSetCalls, 0);
      expect(await store.loadQueue(memberId: 10), hasLength(1));
      expect(await store.loadQueue(memberId: 20), isEmpty);
      expect(result.syncedCount, 0);
    });

    test('complete 409 is treated as already applied', () async {
      final store = OfflineWorkoutRepository.memory();
      final remote = FakeRemote();
      remote.onComplete = () =>
          const ApiException('Session is not in progress.', statusCode: 409);
      final mgr = _manager(store: store, remote: remote);
      await mgr.bindMember(10);
      await mgr.enqueueComplete(_session(sessionId: 3));
      final result = await mgr.syncAll(reason: 'complete');
      expect(result.failed, isFalse);
      expect(await store.loadQueue(memberId: 10), isEmpty);
    });

    test('pending complete snapshot is flushed and not left as live', () async {
      final store = OfflineWorkoutRepository.memory();
      final remote = FakeRemote();
      remote.active = null;
      final mgr = _manager(store: store, remote: remote);
      await mgr.bindMember(10);
      await store.saveSnapshot(LocalWorkoutSnapshot(
        session: _session(
          sessionId: 3,
          status: 'Completed',
          pendingCompleteSync: true,
        ),
      ));
      await mgr.syncAll(reason: 'flush-complete');
      expect(remote.completeCalls, 1);
      expect(remote.startCalls, 0);
      expect(await store.loadSnapshot(memberId: 10), isNull);
      expect(
        SessionConflictPolicy.isLiveResumable(
          LocalWorkoutSnapshot(
            session: _session(pendingCompleteSync: true, status: 'Completed'),
          ),
          10,
        ),
        isFalse,
      );
    });

    test('retryFailed resets exhausted items and uploads', () async {
      final store = OfflineWorkoutRepository.memory();
      final remote = FakeRemote();
      remote.onLogSet = () => const ApiException('500', statusCode: 500);
      final mgr = _manager(store: store, remote: remote);
      await mgr.bindMember(10);
      await mgr.enqueueLogSet(
        session: _session(),
        workoutSessionExerciseId: 44,
        actualReps: 8,
        isCompleted: true,
      );
      for (var i = 0; i < 8; i++) {
        await mgr.syncAll(reason: 'ex');
      }
      expect((await store.loadQueue(memberId: 10)).first.syncStatus, PendingSyncStatus.failed);

      remote.onLogSet = null;
      await mgr.retryFailed(reason: 'user');
      expect(remote.logSetCalls, 1);
      expect(await store.loadQueue(memberId: 10), isEmpty);
    });
  });
}
