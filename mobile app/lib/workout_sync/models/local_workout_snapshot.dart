import 'dart:convert';

import '../../models/workout_tracking_models.dart';
import 'pending_sync_action.dart';

/// On-device workout state: session + UI progress + sync metadata.
class LocalWorkoutSnapshot {
  const LocalWorkoutSnapshot({
    required this.session,
    this.currentExerciseIndex = 0,
    this.elapsedSeconds = 0,
    this.scrollOffset = 0,
    this.lastUpdatedAt,
    this.lastSyncedAt,
    this.pendingActions = const [],
  });

  final ActiveWorkoutSession session;
  final int currentExerciseIndex;
  final int elapsedSeconds;
  final double scrollOffset;
  final DateTime? lastUpdatedAt;
  final DateTime? lastSyncedAt;
  final List<PendingSyncAction> pendingActions;

  bool get isInProgress =>
      session.status == 'InProgress' && !session.pendingCompleteSync;

  LocalWorkoutSnapshot copyWith({
    ActiveWorkoutSession? session,
    int? currentExerciseIndex,
    int? elapsedSeconds,
    double? scrollOffset,
    DateTime? lastUpdatedAt,
    DateTime? lastSyncedAt,
    List<PendingSyncAction>? pendingActions,
  }) =>
      LocalWorkoutSnapshot(
        session: session ?? this.session,
        currentExerciseIndex: currentExerciseIndex ?? this.currentExerciseIndex,
        elapsedSeconds: elapsedSeconds ?? this.elapsedSeconds,
        scrollOffset: scrollOffset ?? this.scrollOffset,
        lastUpdatedAt: lastUpdatedAt ?? this.lastUpdatedAt,
        lastSyncedAt: lastSyncedAt ?? this.lastSyncedAt,
        pendingActions: pendingActions ?? this.pendingActions,
      );

  Map<String, dynamic> toJson() => {
        'session': session.toJson(),
        'currentExerciseIndex': currentExerciseIndex,
        'elapsedSeconds': elapsedSeconds,
        'scrollOffset': scrollOffset,
        if (lastUpdatedAt != null) 'lastUpdatedAt': lastUpdatedAt!.toIso8601String(),
        if (lastSyncedAt != null) 'lastSyncedAt': lastSyncedAt!.toIso8601String(),
        'pendingActions': pendingActions.map((a) => a.toJson()).toList(),
      };

  factory LocalWorkoutSnapshot.fromJson(Map<String, dynamic> json) {
    return LocalWorkoutSnapshot(
      session: ActiveWorkoutSession.fromJson(
        Map<String, dynamic>.from(json['session'] as Map),
      ),
      currentExerciseIndex: json['currentExerciseIndex'] as int? ?? 0,
      elapsedSeconds: json['elapsedSeconds'] as int? ?? 0,
      scrollOffset: (json['scrollOffset'] as num?)?.toDouble() ?? 0,
      lastUpdatedAt: json['lastUpdatedAt'] != null
          ? DateTime.parse(json['lastUpdatedAt'] as String)
          : null,
      lastSyncedAt: json['lastSyncedAt'] != null
          ? DateTime.parse(json['lastSyncedAt'] as String)
          : null,
      pendingActions: (json['pendingActions'] as List<dynamic>? ?? const [])
          .whereType<Map>()
          .map((e) => PendingSyncAction.fromJson(e.cast<String, dynamic>()))
          .toList(),
    );
  }

  static String encode(LocalWorkoutSnapshot s) => jsonEncode(s.toJson());

  static LocalWorkoutSnapshot? decode(String? raw) {
    if (raw == null || raw.isEmpty) return null;
    try {
      final map = jsonDecode(raw);
      if (map is! Map) return null;
      return LocalWorkoutSnapshot.fromJson(map.cast<String, dynamic>());
    } catch (_) {
      return null;
    }
  }
}
