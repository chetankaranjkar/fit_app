import 'dart:async';

import 'package:flutter/foundation.dart';

import '../offline/hive_workout_init.dart';
import 'connectivity_service.dart';
import 'sync_manager.dart';

/// Lazy startup for Hive + sync — avoids OOM/ANR on splash (emulator + Samsung).
abstract final class WorkoutSyncBootstrap {
  static bool _ready = false;
  static bool _starting = false;
  static Future<void>? _initFuture;

  static bool get isReady => _ready;

  /// Call from [main]: no I/O until the UI has painted.
  static void scheduleDelayedStart() {
    Future<void>.delayed(const Duration(seconds: 12), () {
      unawaited(ensureStarted());
    });
  }

  /// Returns true when offline storage and sync are available.
  static Future<bool> ensureStarted() async {
    if (_ready) return true;
    if (_initFuture != null) {
      try {
        await _initFuture!.timeout(const Duration(seconds: 15));
        return _ready;
      } catch (e) {
        debugPrint('WorkoutSyncBootstrap: init failed: $e');
        return false;
      }
    }
    if (_starting) return false;
    _starting = true;
    _initFuture = _init();
    try {
      await _initFuture!.timeout(const Duration(seconds: 15));
      return _ready;
    } catch (e, st) {
      debugPrint('WorkoutSyncBootstrap: $e\n$st');
      return false;
    } finally {
      _starting = false;
    }
  }

  static Future<void> _init() async {
    await HiveWorkoutInit.ensureInitialized();
    SyncManager.instance.startPeriodicSync();
    ConnectivityService.instance.onConnectivityChanged.listen((_) {
      unawaited(SyncManager.instance.syncAll(reason: 'connectivity'));
    });
    _ready = true;
    debugPrint('WorkoutSyncBootstrap: ready');
  }
}
