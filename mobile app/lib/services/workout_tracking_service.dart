import '../core/api_client.dart';
import '../core/api_exception.dart';
import '../models/workout_tracking_models.dart';

/// Live workout tracking — `/api/workout/*` (Strong/Hevy-style set logging).
class WorkoutTrackingService {
  WorkoutTrackingService._();
  static final WorkoutTrackingService instance = WorkoutTrackingService._();

  Future<int> resolveMemberId() async {
    try {
      final res = await ApiClient.instance.get<Map<String, dynamic>>('/workout/my-member-id');
      final id = res.data?['memberId'];
      if (id is int && id > 0) return id;
      if (id is num && id > 0) return id.toInt();
    } on ApiException catch (e) {
      if (e.statusCode != 404) rethrow;
    }
    throw const ApiException('Member profile not found. Contact your gym.');
  }

  Future<ActiveWorkoutSession> start({
    required int memberId,
    required int workoutPlanId,
  }) async {
    final offset = DateTime.now().timeZoneOffset.inMinutes;
    final res = await ApiClient.instance.post<Map<String, dynamic>>(
      '/workout/start',
      body: {
        'memberId': memberId,
        'workoutPlanId': workoutPlanId,
        'utcOffsetMinutes': offset,
      },
    );
    return ActiveWorkoutSession.fromJson(res.data ?? {});
  }

  /// Returns null when no active session (404). Supports envelope + legacy flat JSON.
  Future<ActiveWorkoutSession?> getActive(int memberId) async {
    try {
      final res = await ApiClient.instance.get<Map<String, dynamic>>(
        '/workout/active/$memberId',
      );
      final data = res.data ?? {};
      final sessionMap = data['session'] is Map
          ? Map<String, dynamic>.from(data['session'] as Map)
          : Map<String, dynamic>.from(data);
      final session = ActiveWorkoutSession.fromJson(sessionMap);
      return session.copyWith(
        lastSyncedAt: _parseDt(data['lastSyncedAt']) ?? _parseDt(sessionMap['lastSyncedAt']),
        serverTimeUtc: _parseDt(data['serverTimeUtc']) ?? _parseDt(sessionMap['serverTimeUtc']),
        pendingOfflineChanges: data['pendingOfflineChanges'] == true ||
            sessionMap['pendingOfflineChanges'] == true,
      );
    } on ApiException catch (e) {
      if (e.statusCode == 404) return null;
      rethrow;
    }
  }

  static DateTime? _parseDt(dynamic v) {
    if (v == null) return null;
    if (v is String) return DateTime.tryParse(v);
    return null;
  }

  Future<TrackedWorkoutSet> logSet({
    required int workoutSessionExerciseId,
    int? actualReps,
    double? actualWeight,
    required bool isCompleted,
    String? notes,
  }) async {
    final res = await ApiClient.instance.post<Map<String, dynamic>>(
      '/workout/log-set',
      body: {
        'workoutSessionExerciseId': workoutSessionExerciseId,
        if (actualReps != null) 'actualReps': actualReps,
        if (actualWeight != null) 'actualWeight': actualWeight,
        'isCompleted': isCompleted,
        if (notes != null && notes.isNotEmpty) 'notes': notes,
      },
    );
    return TrackedWorkoutSet.fromJson(res.data ?? {});
  }

  Future<ActiveWorkoutSession> complete(int sessionId, {double? caloriesBurned}) async {
    final res = await ApiClient.instance.post<Map<String, dynamic>>(
      '/workout/complete/$sessionId',
      query: caloriesBurned != null ? {'caloriesBurned': caloriesBurned} : null,
    );
    return ActiveWorkoutSession.fromJson(res.data ?? {});
  }

  Future<WorkoutExerciseHistory> exerciseHistory({
    required int memberId,
    required int exerciseId,
    int take = 50,
  }) async {
    final res = await ApiClient.instance.get<Map<String, dynamic>>(
      '/workout/exercise-history/$memberId/$exerciseId',
      query: {'take': take},
    );
    return WorkoutExerciseHistory.fromJson(res.data ?? {});
  }

  Future<WorkoutTrackingDashboard> dashboard(int memberId) async {
    final res = await ApiClient.instance.get<Map<String, dynamic>>(
      '/workout/dashboard/$memberId',
    );
    return WorkoutTrackingDashboard.fromJson(res.data ?? {});
  }
}
