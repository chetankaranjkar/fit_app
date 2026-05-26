import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../workout_sync/sync/connectivity_service.dart';
import '../workout_sync/sync/sync_manager.dart';
import '../workout_sync/sync/workout_sync_bootstrap.dart';

/// Live sync state for Home / Profile / Live workout chips.
final syncStatusProvider = StreamProvider.autoDispose<AppSyncSnapshot>((ref) async* {
  try {
    final ready = await WorkoutSyncBootstrap.ensureStarted()
        .timeout(const Duration(seconds: 8), onTimeout: () => false);
    if (!ready) {
      yield SyncManager.idleSnapshot;
      return;
    }
    yield await SyncManager.instance.statusSnapshot();
    await for (final _ in ConnectivityService.instance.onConnectivityChanged) {
      yield await SyncManager.instance.statusSnapshot();
    }
  } catch (_) {
    yield SyncManager.idleSnapshot;
  }
});

void invalidateSyncStatus(WidgetRef ref) {
  ref.invalidate(syncStatusProvider);
}

/// Triggers background sync (pull-to-refresh).
final syncNowProvider = FutureProvider.autoDispose<int>((ref) async {
  final ready = await WorkoutSyncBootstrap.ensureStarted();
  if (!ready) return 0;
  final result = await SyncManager.instance.syncAll(reason: 'provider');
  ref.invalidate(syncStatusProvider);
  return result.syncedCount;
});
