import 'package:hive_flutter/hive_flutter.dart';

import '../../models/workout_tracking_models.dart';
import '../models/local_workout_snapshot.dart';
import '../models/pending_sync_action.dart';
import '../models/workout_sync_enums.dart';
import '../sync/workout_sync_log.dart';

/// Hive-backed persistence for live workouts, sync queue, and metadata.
class OfflineWorkoutRepository {
  OfflineWorkoutRepository._();
  static final OfflineWorkoutRepository instance = OfflineWorkoutRepository._();

  static const _snapshotBox = 'pulsefit_workout_snapshot_v1';
  static const _queueBox = 'pulsefit_workout_sync_queue_v1';
  static const _metaBox = 'pulsefit_workout_meta_v1';

  static const _keySnapshot = 'active';
  static const _keyQueue = 'actions';
  static const _keyLastSyncAttempt = 'lastSyncAttemptUtc';

  Box<String>? _snapshot;
  Box<String>? _queue;
  Box<String>? _meta;

  Future<void> open() async {
    _snapshot ??= await Hive.openBox<String>(_snapshotBox);
    _queue ??= await Hive.openBox<String>(_queueBox);
    _meta ??= await Hive.openBox<String>(_metaBox);
  }

  Future<LocalWorkoutSnapshot?> loadSnapshot() async {
    await open();
    final raw = _snapshot!.get(_keySnapshot);
    return LocalWorkoutSnapshot.decode(raw);
  }

  Future<void> saveSnapshot(LocalWorkoutSnapshot snapshot) async {
    await open();
    await _snapshot!.put(_keySnapshot, LocalWorkoutSnapshot.encode(snapshot));
    WorkoutSyncLog.info(
      'Snapshot saved · session=${snapshot.session.sessionId} '
      'sets=${snapshot.session.completedSets}/${snapshot.session.totalSets}',
    );
  }

  Future<void> clearSnapshot() async {
    await open();
    await _snapshot!.delete(_keySnapshot);
    WorkoutSyncLog.info('Active snapshot cleared');
  }

  /// Convenience for callers still using [ActiveWorkoutSession].
  Future<ActiveWorkoutSession?> loadSession() async {
    final snap = await loadSnapshot();
    return snap?.session;
  }

  Future<void> saveSession(
    ActiveWorkoutSession session, {
    int? currentExerciseIndex,
    int? elapsedSeconds,
    double? scrollOffset,
    List<PendingSyncAction>? pendingActions,
  }) async {
    final existing = await loadSnapshot();
    final snap = LocalWorkoutSnapshot(
      session: session,
      currentExerciseIndex: currentExerciseIndex ?? existing?.currentExerciseIndex ?? 0,
      elapsedSeconds: elapsedSeconds ?? existing?.elapsedSeconds ?? 0,
      scrollOffset: scrollOffset ?? existing?.scrollOffset ?? 0,
      lastUpdatedAt: DateTime.now().toUtc(),
      lastSyncedAt: existing?.lastSyncedAt,
      pendingActions: pendingActions ?? existing?.pendingActions ?? const [],
    );
    await saveSnapshot(snap);
  }

  Future<List<PendingSyncAction>> loadQueue() async {
    await open();
    final raw = _queue!.get(_keyQueue);
    if (raw == null || raw.isEmpty) return [];
    return PendingSyncAction.decodeList(raw);
  }

  Future<void> saveQueue(List<PendingSyncAction> actions) async {
    await open();
    if (actions.isEmpty) {
      await _queue!.delete(_keyQueue);
    } else {
      await _queue!.put(_keyQueue, PendingSyncAction.encodeList(actions));
    }
  }

  Future<void> enqueueAction(PendingSyncAction action) async {
    final list = await loadQueue();
    list.add(action);
    await saveQueue(list);
    WorkoutSyncLog.info('Queued ${action.type.name} (${list.length} pending)');
  }

  Future<DateTime?> lastSyncAttemptUtc() async {
    await open();
    final raw = _meta!.get(_keyLastSyncAttempt);
    return raw == null ? null : DateTime.tryParse(raw);
  }

  Future<void> markSyncAttempt() async {
    await open();
    await _meta!.put(_keyLastSyncAttempt, DateTime.now().toUtc().toIso8601String());
  }

  Future<bool> hasPendingSession() async {
    final snap = await loadSnapshot();
    if (snap == null) return false;
    return snap.session.isOffline ||
        snap.session.pendingCompleteSync ||
        snap.pendingActions.isNotEmpty;
  }

  Future<SyncQueueStats> queueStats() async {
    final q = await loadQueue();
    var pending = 0;
    var failed = 0;
    var synced = 0;
    for (final a in q) {
      switch (a.syncStatus) {
        case PendingSyncStatus.pending:
        case PendingSyncStatus.syncing:
          pending++;
        case PendingSyncStatus.failed:
          failed++;
        case PendingSyncStatus.synced:
          synced++;
      }
    }
    return SyncQueueStats(pending: pending, failed: failed, synced: synced);
  }
}

class SyncQueueStats {
  const SyncQueueStats({
    required this.pending,
    required this.failed,
    required this.synced,
  });

  final int pending;
  final int failed;
  final int synced;
}
