import 'dart:convert';

import 'package:hive_flutter/hive_flutter.dart';

import '../../models/workout_tracking_models.dart';
import '../models/local_workout_snapshot.dart';
import '../models/pending_sync_action.dart';
import '../models/workout_sync_enums.dart';
import '../sync/workout_sync_log.dart';

/// Hive-backed persistence for live workouts, sync queue, and metadata.
///
/// Snapshots and queues are **namespaced by memberId** so account switch never
/// replays another member's mutations. Use [OfflineWorkoutRepository.memory]
/// in unit tests (no Hive).
class OfflineWorkoutRepository {
  OfflineWorkoutRepository._({Map<String, String>? memory}) : _memory = memory;

  static final OfflineWorkoutRepository instance = OfflineWorkoutRepository._();

  factory OfflineWorkoutRepository.memory([Map<String, String>? shared]) =>
      OfflineWorkoutRepository._(memory: shared ?? <String, String>{});

  static const _snapshotBox = 'pulsefit_workout_snapshot_v1';
  static const _queueBox = 'pulsefit_workout_sync_queue_v1';
  static const _metaBox = 'pulsefit_workout_meta_v1';

  static const _legacySnapshotKey = 'active';
  static const _legacyQueueKey = 'actions';
  static const _keyLastSyncAttempt = 'lastSyncAttemptUtc';
  static const _keyBoundMember = 'boundMemberId';

  final Map<String, String>? _memory;

  Box<String>? _snapshot;
  Box<String>? _queue;
  Box<String>? _meta;

  bool get isMemory => _memory != null;

  Future<void> open() async {
    if (_memory != null) return;
    _snapshot ??= await Hive.openBox<String>(_snapshotBox);
    _queue ??= await Hive.openBox<String>(_queueBox);
    _meta ??= await Hive.openBox<String>(_metaBox);
    await _migrateLegacyKeys();
  }

  Future<void> _migrateLegacyKeys() async {
    final legacySnap = await _read(_snapshotBox, _legacySnapshotKey);
    if (legacySnap != null) {
      final decoded = LocalWorkoutSnapshot.decode(legacySnap);
      final memberId = decoded?.session.memberId;
      if (memberId != null && memberId > 0) {
        if (await _read(_snapshotBox, _snapshotKey(memberId)) == null) {
          await _write(_snapshotBox, _snapshotKey(memberId), legacySnap);
        }
      }
      await _delete(_snapshotBox, _legacySnapshotKey);
    }

    final legacyQueue = await _read(_queueBox, _legacyQueueKey);
    if (legacyQueue != null) {
      final actions = PendingSyncAction.decodeList(legacyQueue);
      final byMember = <int, List<PendingSyncAction>>{};
      for (final a in actions) {
        final mid = a.memberId;
        if (mid == null || mid <= 0) continue;
        byMember.putIfAbsent(mid, () => []).add(a);
      }
      for (final entry in byMember.entries) {
        final existing = await loadQueue(memberId: entry.key);
        existing.addAll(entry.value);
        await saveQueue(existing, memberId: entry.key);
      }
      await _delete(_queueBox, _legacyQueueKey);
    }
  }

  String _snapshotKey(int memberId) => 'active:$memberId';
  String _queueKey(int memberId) => 'actions:$memberId';
  String _processedKey(int memberId) => 'processed:$memberId';

  Future<int?> boundMemberId() async {
    await open();
    final raw = await _read(_metaBox, _keyBoundMember);
    return raw == null ? null : int.tryParse(raw);
  }

  Future<void> setBoundMember(int? memberId) async {
    await open();
    if (memberId == null || memberId <= 0) {
      await _delete(_metaBox, _keyBoundMember);
    } else {
      await _write(_metaBox, _keyBoundMember, '$memberId');
    }
  }

  Future<LocalWorkoutSnapshot?> loadSnapshot({int? memberId}) async {
    await open();
    final id = memberId ?? await boundMemberId();
    if (id != null && id > 0) {
      final scoped = LocalWorkoutSnapshot.decode(await _read(_snapshotBox, _snapshotKey(id)));
      if (scoped != null) return scoped;
    }
    return LocalWorkoutSnapshot.decode(await _read(_snapshotBox, _legacySnapshotKey));
  }

  Future<void> saveSnapshot(LocalWorkoutSnapshot snapshot) async {
    await open();
    final memberId = snapshot.session.memberId;
    final encoded = LocalWorkoutSnapshot.encode(snapshot);
    if (memberId > 0) {
      await _write(_snapshotBox, _snapshotKey(memberId), encoded);
    } else {
      await _write(_snapshotBox, _legacySnapshotKey, encoded);
    }
    WorkoutSyncLog.info(
      'Snapshot saved · session=${snapshot.session.sessionId} '
      'sets=${snapshot.session.completedSets}/${snapshot.session.totalSets}',
    );
  }

  Future<void> clearSnapshot({int? memberId}) async {
    await open();
    final id = memberId ?? await boundMemberId();
    if (id != null && id > 0) {
      await _delete(_snapshotBox, _snapshotKey(id));
    }
    await _delete(_snapshotBox, _legacySnapshotKey);
    WorkoutSyncLog.info('Active snapshot cleared');
  }

  Future<ActiveWorkoutSession?> loadSession({int? memberId}) async {
    final snap = await loadSnapshot(memberId: memberId);
    return snap?.session;
  }

  Future<void> saveSession(
    ActiveWorkoutSession session, {
    int? currentExerciseIndex,
    int? elapsedSeconds,
    double? scrollOffset,
    List<PendingSyncAction>? pendingActions,
  }) async {
    final existing = await loadSnapshot(memberId: session.memberId);
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

  Future<List<PendingSyncAction>> loadQueue({int? memberId}) async {
    await open();
    final id = memberId ?? await boundMemberId();
    if (id == null || id <= 0) return [];
    final raw = await _read(_queueBox, _queueKey(id));
    if (raw == null || raw.isEmpty) return [];
    return PendingSyncAction.decodeList(raw)
        .where((a) => a.memberId == null || a.memberId == id)
        .toList();
  }

  Future<void> saveQueue(List<PendingSyncAction> actions, {int? memberId}) async {
    await open();
    var id = memberId;
    if (id == null || id <= 0) {
      for (final a in actions) {
        if (a.memberId != null && a.memberId! > 0) {
          id = a.memberId;
          break;
        }
      }
    }
    id ??= await boundMemberId();
    if (id == null || id <= 0) return;
    if (actions.isEmpty) {
      await _delete(_queueBox, _queueKey(id));
    } else {
      await _write(_queueBox, _queueKey(id), PendingSyncAction.encodeList(actions));
    }
  }

  Future<void> enqueueAction(PendingSyncAction action) async {
    final memberId = action.memberId;
    if (memberId == null || memberId <= 0) {
      WorkoutSyncLog.warn('Refusing to enqueue action without memberId');
      return;
    }
    final list = await loadQueue(memberId: memberId);
    final key = action.effectiveKey;
    list.removeWhere((a) => a.effectiveKey == key);
    list.add(action);
    await saveQueue(list, memberId: memberId);
    WorkoutSyncLog.info('Queued ${action.type.name} (${list.length} pending)');
  }

  Future<void> removeQueueWhere(int memberId, bool Function(PendingSyncAction a) test) async {
    final list = await loadQueue(memberId: memberId);
    list.removeWhere(test);
    await saveQueue(list, memberId: memberId);
  }

  Future<Set<String>> loadProcessedKeys(int memberId) async {
    await open();
    final raw = await _read(_metaBox, _processedKey(memberId));
    if (raw == null || raw.isEmpty) return {};
    try {
      final decoded = jsonDecode(raw);
      if (decoded is! List) return {};
      return decoded.map((e) => e.toString()).toSet();
    } catch (_) {
      return {};
    }
  }

  Future<void> addProcessedKeys(int memberId, Iterable<String> keys) async {
    if (keys.isEmpty) return;
    final set = await loadProcessedKeys(memberId);
    set.addAll(keys);
    final trimmed = set.length > 800 ? set.skip(set.length - 800).toSet() : set;
    await open();
    await _write(_metaBox, _processedKey(memberId), jsonEncode(trimmed.toList()));
  }

  Future<DateTime?> lastSyncAttemptUtc() async {
    await open();
    final raw = await _read(_metaBox, _keyLastSyncAttempt);
    return raw == null ? null : DateTime.tryParse(raw);
  }

  Future<void> markSyncAttempt() async {
    await open();
    await _write(_metaBox, _keyLastSyncAttempt, DateTime.now().toUtc().toIso8601String());
  }

  Future<bool> hasPendingSession({int? memberId}) async {
    final snap = await loadSnapshot(memberId: memberId);
    if (snap == null) return false;
    final q = await loadQueue(memberId: memberId ?? snap.session.memberId);
    return snap.session.isOffline ||
        snap.session.pendingCompleteSync ||
        snap.pendingActions.isNotEmpty ||
        q.isNotEmpty;
  }

  Future<SyncQueueStats> queueStats({int? memberId}) async {
    final q = await loadQueue(memberId: memberId);
    var pending = 0;
    var failed = 0;
    var synced = 0;
    String? lastError;
    for (final a in q) {
      switch (a.syncStatus) {
        case PendingSyncStatus.pending:
        case PendingSyncStatus.syncing:
          pending++;
        case PendingSyncStatus.failed:
          failed++;
          lastError ??= a.lastError;
        case PendingSyncStatus.synced:
          synced++;
      }
    }
    return SyncQueueStats(
      pending: pending,
      failed: failed,
      synced: synced,
      lastError: lastError,
    );
  }

  Future<String?> _read(String box, String key) async {
    if (_memory != null) return _memory['$box|$key'];
    return _hive(box).get(key);
  }

  Future<void> _write(String box, String key, String value) async {
    if (_memory != null) {
      _memory['$box|$key'] = value;
      return;
    }
    await _hive(box).put(key, value);
  }

  Future<void> _delete(String box, String key) async {
    if (_memory != null) {
      _memory.remove('$box|$key');
      return;
    }
    await _hive(box).delete(key);
  }

  Box<String> _hive(String box) {
    switch (box) {
      case _snapshotBox:
        return _snapshot!;
      case _queueBox:
        return _queue!;
      default:
        return _meta!;
    }
  }
}

class SyncQueueStats {
  const SyncQueueStats({
    required this.pending,
    required this.failed,
    required this.synced,
    this.lastError,
  });

  final int pending;
  final int failed;
  final int synced;
  final String? lastError;
}
