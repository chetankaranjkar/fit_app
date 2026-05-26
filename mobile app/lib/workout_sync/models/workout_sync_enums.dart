/// App-wide sync indicator states.
enum WorkoutSyncDisplayState {
  synced,
  pending,
  offline,
  failed,
}

/// Queued mutation types replayed by [SyncManager].
enum PendingSyncActionType {
  logSet,
  completeWorkout,
  updateExercise,
}

enum PendingSyncStatus {
  pending,
  syncing,
  synced,
  failed,
}
