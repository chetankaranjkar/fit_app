import 'package:hive_flutter/hive_flutter.dart';

import '../../services/workout_offline_store.dart';
import '../models/local_workout_snapshot.dart';
import 'offline_workout_repository.dart';

/// Opens Hive boxes and migrates legacy SharedPreferences session once.
abstract final class HiveWorkoutInit {
  static bool _ready = false;

  static Future<void> ensureInitialized() async {
    if (_ready) return;
    await Hive.initFlutter();
    await OfflineWorkoutRepository.instance.open();
    await _migrateLegacyPrefs();
    _ready = true;
  }

  static Future<void> _migrateLegacyPrefs() async {
    final legacy = await WorkoutOfflineStore.instance.loadSession();
    if (legacy == null) return;
    final existing = await OfflineWorkoutRepository.instance.loadSnapshot();
    if (existing != null) return;
    await OfflineWorkoutRepository.instance.saveSnapshot(
      LocalWorkoutSnapshot(
        session: legacy,
        lastUpdatedAt: DateTime.now().toUtc(),
      ),
    );
    await WorkoutOfflineStore.instance.clearSession();
  }
}
