import 'dart:async';

import '../../models/workout_tracking_models.dart';
import '../models/local_workout_snapshot.dart';
import '../offline/offline_workout_repository.dart';
import 'workout_sync_log.dart';

/// Periodic persistence so crashes/OS kills do not lose workout progress.
class SessionAutosaveService {
  SessionAutosaveService._();
  static final SessionAutosaveService instance = SessionAutosaveService._();

  final _offline = OfflineWorkoutRepository.instance;
  Timer? _timer;

  static const _interval = Duration(seconds: 20);

  void bind({
    required ActiveWorkoutSession? Function() readSession,
    required int Function() readElapsedSeconds,
    required int Function() readExerciseIndex,
    required double Function() readScrollOffset,
  }) {
    stop();
    _timer = Timer.periodic(_interval, (_) async {
      final session = readSession();
      if (session == null || session.status != 'InProgress') return;
      await persist(
        session: session,
        elapsedSeconds: readElapsedSeconds(),
        currentExerciseIndex: readExerciseIndex(),
        scrollOffset: readScrollOffset(),
      );
    });
  }

  void stop() {
    _timer?.cancel();
    _timer = null;
  }

  Future<void> persist({
    required ActiveWorkoutSession session,
    int? elapsedSeconds,
    int? currentExerciseIndex,
    double? scrollOffset,
  }) async {
    final existing = await _offline.loadSnapshot();
    final snap = LocalWorkoutSnapshot(
      session: session,
      currentExerciseIndex: currentExerciseIndex ?? existing?.currentExerciseIndex ?? 0,
      elapsedSeconds: elapsedSeconds ?? existing?.elapsedSeconds ?? 0,
      scrollOffset: scrollOffset ?? existing?.scrollOffset ?? 0,
      lastUpdatedAt: DateTime.now().toUtc(),
      lastSyncedAt: existing?.lastSyncedAt,
      pendingActions: existing?.pendingActions ?? const [],
    );
    await _offline.saveSnapshot(snap);
    WorkoutSyncLog.info('Autosave · ${session.completedSets}/${session.totalSets} sets');
  }
}
