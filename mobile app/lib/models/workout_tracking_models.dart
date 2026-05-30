// Models for `/api/workout/*` live tracking endpoints.

class ActiveWorkoutSession {
  final int sessionId;
  final int memberId;
  final int? workoutPlanId;
  final String? planName;
  final String status;
  final DateTime? workoutDate;
  final DateTime? startTimeUtc;
  final double completionPercent;
  final int completedSets;
  final int totalSets;
  final double totalVolume;
  final List<WorkoutExerciseGroup> exercises;
  /// True when session lives in on-device storage until sync succeeds.
  final bool isOffline;
  /// Workout marked complete locally; waiting for `POST /workout/complete`.
  final bool pendingCompleteSync;
  /// Server metadata from `GET /api/workout/active/{memberId}`.
  final DateTime? lastSyncedAt;
  final DateTime? serverTimeUtc;
  final bool pendingOfflineChanges;

  const ActiveWorkoutSession({
    required this.sessionId,
    required this.memberId,
    this.workoutPlanId,
    this.planName,
    required this.status,
    this.workoutDate,
    this.startTimeUtc,
    required this.completionPercent,
    required this.completedSets,
    required this.totalSets,
    required this.totalVolume,
    required this.exercises,
    this.isOffline = false,
    this.pendingCompleteSync = false,
    this.lastSyncedAt,
    this.serverTimeUtc,
    this.pendingOfflineChanges = false,
  });

  Map<String, dynamic> toJson() => {
        'sessionId': sessionId,
        'memberId': memberId,
        if (workoutPlanId != null) 'workoutPlanId': workoutPlanId,
        if (planName != null) 'planName': planName,
        'status': status,
        if (workoutDate != null) 'workoutDate': workoutDate!.toIso8601String(),
        if (startTimeUtc != null) 'startTimeUtc': startTimeUtc!.toIso8601String(),
        'completionPercent': completionPercent,
        'completedSets': completedSets,
        'totalSets': totalSets,
        'totalVolume': totalVolume,
        'exercises': exercises.map((e) => e.toJson()).toList(),
        'isOffline': isOffline,
        'pendingCompleteSync': pendingCompleteSync,
        if (lastSyncedAt != null) 'lastSyncedAt': lastSyncedAt!.toIso8601String(),
        if (serverTimeUtc != null) 'serverTimeUtc': serverTimeUtc!.toIso8601String(),
        'pendingOfflineChanges': pendingOfflineChanges,
      };

  ActiveWorkoutSession copyWith({
    int? sessionId,
    String? status,
    double? completionPercent,
    int? completedSets,
    int? totalSets,
    double? totalVolume,
    List<WorkoutExerciseGroup>? exercises,
    bool? isOffline,
    bool? pendingCompleteSync,
    DateTime? lastSyncedAt,
    DateTime? serverTimeUtc,
    bool? pendingOfflineChanges,
  }) =>
      ActiveWorkoutSession(
        sessionId: sessionId ?? this.sessionId,
        memberId: memberId,
        workoutPlanId: workoutPlanId,
        planName: planName,
        status: status ?? this.status,
        workoutDate: workoutDate,
        startTimeUtc: startTimeUtc,
        completionPercent: completionPercent ?? this.completionPercent,
        completedSets: completedSets ?? this.completedSets,
        totalSets: totalSets ?? this.totalSets,
        totalVolume: totalVolume ?? this.totalVolume,
        exercises: exercises ?? this.exercises,
        isOffline: isOffline ?? this.isOffline,
        pendingCompleteSync: pendingCompleteSync ?? this.pendingCompleteSync,
        lastSyncedAt: lastSyncedAt ?? this.lastSyncedAt,
        serverTimeUtc: serverTimeUtc ?? this.serverTimeUtc,
        pendingOfflineChanges: pendingOfflineChanges ?? this.pendingOfflineChanges,
      );

  factory ActiveWorkoutSession.fromJson(Map<String, dynamic> json) {
    return ActiveWorkoutSession(
      sessionId: _int(json['sessionId']) ?? 0,
      memberId: _int(json['memberId']) ?? 0,
      workoutPlanId: _int(json['workoutPlanId']),
      planName: json['planName']?.toString(),
      status: json['status']?.toString() ?? 'InProgress',
      workoutDate: _dt(json['workoutDate']),
      startTimeUtc: _dt(json['startTimeUtc']),
      completionPercent: _double(json['completionPercent']) ?? 0,
      completedSets: _int(json['completedSets']) ?? 0,
      totalSets: _int(json['totalSets']) ?? 0,
      totalVolume: _double(json['totalVolume']) ?? 0,
      exercises: (json['exercises'] as List<dynamic>? ?? const [])
          .whereType<Map>()
          .map((e) => WorkoutExerciseGroup.fromJson(e.cast<String, dynamic>()))
          .toList(),
      isOffline: json['isOffline'] == true,
      pendingCompleteSync: json['pendingCompleteSync'] == true,
      lastSyncedAt: _dt(json['lastSyncedAt']),
      serverTimeUtc: _dt(json['serverTimeUtc']),
      pendingOfflineChanges: json['pendingOfflineChanges'] == true,
    );
  }
}

class WorkoutExerciseGroup {
  final int exerciseId;
  final String exerciseName;
  final List<TrackedWorkoutSet> sets;

  const WorkoutExerciseGroup({
    required this.exerciseId,
    required this.exerciseName,
    required this.sets,
  });

  Map<String, dynamic> toJson() => {
        'exerciseId': exerciseId,
        'exerciseName': exerciseName,
        'sets': sets.map((s) => s.toJson()).toList(),
      };

  factory WorkoutExerciseGroup.fromJson(Map<String, dynamic> json) {
    return WorkoutExerciseGroup(
      exerciseId: _int(json['exerciseId']) ?? 0,
      exerciseName: json['exerciseName']?.toString() ?? 'Exercise',
      sets: (json['sets'] as List<dynamic>? ?? const [])
          .whereType<Map>()
          .map((e) => TrackedWorkoutSet.fromJson(e.cast<String, dynamic>()))
          .toList(),
    );
  }
}

class TrackedWorkoutSet {
  final int id;
  final int exerciseId;
  final String exerciseName;
  final int setNumber;
  final int targetReps;
  final int? actualReps;
  final double? targetWeight;
  final double? actualWeight;
  final int? durationSeconds;
  final int? restSeconds;
  final bool isCompleted;
  final String? notes;
  final double? setVolume;
  final DateTime? completedAt;
  final int? completedByUserId;

  const TrackedWorkoutSet({
    required this.id,
    required this.exerciseId,
    required this.exerciseName,
    required this.setNumber,
    required this.targetReps,
    this.actualReps,
    this.targetWeight,
    this.actualWeight,
    this.durationSeconds,
    this.restSeconds,
    required this.isCompleted,
    this.notes,
    this.setVolume,
    this.completedAt,
    this.completedByUserId,
  });

  Map<String, dynamic> toJson() => {
        'id': id,
        'exerciseId': exerciseId,
        'exerciseName': exerciseName,
        'setNumber': setNumber,
        'targetReps': targetReps,
        if (actualReps != null) 'actualReps': actualReps,
        if (targetWeight != null) 'targetWeight': targetWeight,
        if (actualWeight != null) 'actualWeight': actualWeight,
        if (durationSeconds != null) 'durationSeconds': durationSeconds,
        if (restSeconds != null) 'restSeconds': restSeconds,
        'isCompleted': isCompleted,
        if (notes != null) 'notes': notes,
        if (setVolume != null) 'setVolume': setVolume,
        if (completedAt != null) 'completedAt': completedAt!.toIso8601String(),
        if (completedByUserId != null) 'completedByUserId': completedByUserId,
      };

  TrackedWorkoutSet copyWith({
    int? actualReps,
    double? actualWeight,
    bool? isCompleted,
    String? notes,
    double? setVolume,
    DateTime? completedAt,
    int? completedByUserId,
  }) =>
      TrackedWorkoutSet(
        id: id,
        exerciseId: exerciseId,
        exerciseName: exerciseName,
        setNumber: setNumber,
        targetReps: targetReps,
        actualReps: actualReps ?? this.actualReps,
        targetWeight: targetWeight,
        actualWeight: actualWeight ?? this.actualWeight,
        durationSeconds: durationSeconds,
        restSeconds: restSeconds,
        isCompleted: isCompleted ?? this.isCompleted,
        notes: notes ?? this.notes,
        setVolume: setVolume ?? this.setVolume,
        completedAt: completedAt ?? this.completedAt,
        completedByUserId: completedByUserId ?? this.completedByUserId,
      );

  factory TrackedWorkoutSet.fromJson(Map<String, dynamic> json) {
    return TrackedWorkoutSet(
      id: _int(json['id']) ?? 0,
      exerciseId: _int(json['exerciseId']) ?? 0,
      exerciseName: json['exerciseName']?.toString() ?? '',
      setNumber: _int(json['setNumber']) ?? 1,
      targetReps: _int(json['targetReps']) ?? 0,
      actualReps: _int(json['actualReps']),
      targetWeight: _double(json['targetWeight']),
      actualWeight: _double(json['actualWeight']),
      durationSeconds: _int(json['durationSeconds']),
      restSeconds: _int(json['restSeconds']),
      isCompleted: json['isCompleted'] == true,
      notes: json['notes']?.toString(),
      setVolume: _double(json['setVolume']),
      completedAt: _dt(json['completedAt']),
      completedByUserId: _int(json['completedByUserId']),
    );
  }
}

class WorkoutTrackingDashboard {
  final int memberId;
  final int currentStreakDays;
  final int totalWorkouts;
  final int workoutsThisWeek;
  final DateTime? lastWorkoutDateUtc;
  final double averageCompletionPercent;
  final ActiveWorkoutSession? activeSession;

  const WorkoutTrackingDashboard({
    required this.memberId,
    required this.currentStreakDays,
    required this.totalWorkouts,
    required this.workoutsThisWeek,
    this.lastWorkoutDateUtc,
    required this.averageCompletionPercent,
    this.activeSession,
  });

  factory WorkoutTrackingDashboard.fromJson(Map<String, dynamic> json) {
    final active = json['activeSession'];
    return WorkoutTrackingDashboard(
      memberId: _int(json['memberId']) ?? 0,
      currentStreakDays: _int(json['currentStreakDays']) ?? 0,
      totalWorkouts: _int(json['totalWorkouts']) ?? 0,
      workoutsThisWeek: _int(json['workoutsThisWeek']) ?? 0,
      lastWorkoutDateUtc: _dt(json['lastWorkoutDateUtc']),
      averageCompletionPercent: _double(json['averageCompletionPercent']) ?? 0,
      activeSession: active is Map<String, dynamic>
          ? ActiveWorkoutSession.fromJson(active)
          : null,
    );
  }
}

class WorkoutExerciseHistory {
  final int exerciseId;
  final String exerciseName;
  final double? bestWeight;
  final int? bestReps;
  final double? bestVolume;
  final List<WorkoutHistoryEntry> entries;

  const WorkoutExerciseHistory({
    required this.exerciseId,
    required this.exerciseName,
    this.bestWeight,
    this.bestReps,
    this.bestVolume,
    required this.entries,
  });

  factory WorkoutExerciseHistory.fromJson(Map<String, dynamic> json) {
    return WorkoutExerciseHistory(
      exerciseId: _int(json['exerciseId']) ?? 0,
      exerciseName: json['exerciseName']?.toString() ?? 'Exercise',
      bestWeight: _double(json['bestWeight']),
      bestReps: _int(json['bestReps']),
      bestVolume: _double(json['bestVolume']),
      entries: (json['entries'] as List<dynamic>? ?? const [])
          .whereType<Map>()
          .map((e) => WorkoutHistoryEntry.fromJson(e.cast<String, dynamic>()))
          .toList(),
    );
  }
}

class WorkoutHistoryEntry {
  final int sessionId;
  final DateTime workoutDateUtc;
  final int setNumber;
  final double? weight;
  final int? reps;
  final double volume;
  final bool isPersonalRecord;
  final bool isImprovement;

  const WorkoutHistoryEntry({
    required this.sessionId,
    required this.workoutDateUtc,
    required this.setNumber,
    this.weight,
    this.reps,
    required this.volume,
    required this.isPersonalRecord,
    required this.isImprovement,
  });

  factory WorkoutHistoryEntry.fromJson(Map<String, dynamic> json) {
    return WorkoutHistoryEntry(
      sessionId: _int(json['sessionId']) ?? 0,
      workoutDateUtc: _dt(json['workoutDateUtc']) ?? DateTime.now(),
      setNumber: _int(json['setNumber']) ?? 1,
      weight: _double(json['weight']),
      reps: _int(json['reps']),
      volume: _double(json['volume']) ?? 0,
      isPersonalRecord: json['isPersonalRecord'] == true,
      isImprovement: json['isImprovement'] == true,
    );
  }
}

int? _int(dynamic v) {
  if (v == null) return null;
  if (v is int) return v;
  if (v is num) return v.toInt();
  return int.tryParse(v.toString());
}

double? _double(dynamic v) {
  if (v == null) return null;
  if (v is double) return v;
  if (v is num) return v.toDouble();
  return double.tryParse(v.toString());
}

DateTime? _dt(dynamic v) {
  if (v == null) return null;
  if (v is DateTime) return v;
  return DateTime.tryParse(v.toString());
}
