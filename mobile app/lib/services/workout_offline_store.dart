import '../models/workout_tracking_models.dart';
import '../workout_sync/sync/workout_sync_bootstrap.dart';
import '../workout_sync/offline/offline_workout_repository.dart';

/// Back-compat facade — delegates to [OfflineWorkoutRepository] (Hive).
class WorkoutOfflineStore {
  WorkoutOfflineStore._();
  static final WorkoutOfflineStore instance = WorkoutOfflineStore._();

  final _repo = OfflineWorkoutRepository.instance;

  Future<ActiveWorkoutSession?> loadSession() async {
    await WorkoutSyncBootstrap.ensureStarted();
    return _repo.loadSession();
  }

  Future<void> saveSession(ActiveWorkoutSession session) async {
    await WorkoutSyncBootstrap.ensureStarted();
    await _repo.saveSession(session);
  }

  Future<void> clearSession() async {
    await WorkoutSyncBootstrap.ensureStarted();
    await _repo.clearSnapshot();
  }

  Future<bool> hasPendingSession() async {
    await WorkoutSyncBootstrap.ensureStarted();
    return _repo.hasPendingSession();
  }
}
