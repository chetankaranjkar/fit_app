import '../core/api_client.dart';
import '../core/api_exception.dart';
import '../models/me_models.dart';

/// Calls into the backend `/api/me/*` self-service endpoints.
class MeService {
  MeService._();
  static final MeService instance = MeService._();

  Future<MeDashboard> getDashboard() async {
    final res = await ApiClient.instance.get<Map<String, dynamic>>('/me/dashboard');
    return MeDashboard.fromJson(res.data ?? {});
  }

  Future<MeProfile> getProfile() async {
    final res = await ApiClient.instance.get<Map<String, dynamic>>('/me/profile');
    return MeProfile.fromJson(res.data ?? {});
  }

  Future<MeMembership?> getMembership() async {
    final res = await ApiClient.instance.get<dynamic>('/me/membership');
    final data = res.data;
    if (data is Map<String, dynamic>) return MeMembership.fromJson(data);
    return null;
  }

  Future<MeAttendanceSummary> getAttendance() async {
    final res = await ApiClient.instance.get<Map<String, dynamic>>('/me/attendance');
    return MeAttendanceSummary.fromJson(res.data ?? {});
  }

  Future<List<MeBodyMetricLog>> getBodyMetrics({int take = 60}) async {
    final res = await ApiClient.instance.get<List<dynamic>>(
      '/me/body-metrics',
      query: {'take': take},
    );
    return (res.data ?? const [])
        .whereType<Map<String, dynamic>>()
        .map(MeBodyMetricLog.fromJson)
        .toList();
  }

  Future<List<MeNotification>> getNotifications({int take = 30}) async {
    final res = await ApiClient.instance.get<List<dynamic>>(
      '/me/notifications',
      query: {'take': take},
    );
    return (res.data ?? const [])
        .whereType<Map<String, dynamic>>()
        .map(MeNotification.fromJson)
        .toList();
  }

  Future<List<MeWorkoutPlanSummary>> getWorkoutPlans() async {
    final res = await ApiClient.instance.get<List<dynamic>>('/me/workout-plans');
    return (res.data ?? const [])
        .whereType<Map<String, dynamic>>()
        .map(MeWorkoutPlanSummary.fromJson)
        .toList();
  }

  Future<MeWorkoutSessionTemplate> getWorkoutSessionTemplate(int planId) async {
    final offset = DateTime.now().timeZoneOffset.inMinutes;
    final res = await ApiClient.instance.get<Map<String, dynamic>>(
      '/me/workout-plans/$planId/session',
      query: {'utcOffsetMinutes': offset},
    );
    return MeWorkoutSessionTemplate.fromJson(res.data ?? {});
  }

  Future<MeDietPlan?> getDietPlan() async {
    try {
      final res = await ApiClient.instance.get<Map<String, dynamic>>('/me/diet-plan');
      return MeDietPlan.fromJson(res.data ?? {});
    } on ApiException catch (e) {
      if (e.statusCode == 404) return null;
      rethrow;
    }
  }

  Future<MeWorkoutSessionCompleted> completeWorkoutSession({
    required int workoutPlanId,
    int? durationMinutes,
    required List<MeWorkoutSetEntry> sets,
  }) async {
    final res = await ApiClient.instance.post<Map<String, dynamic>>(
      '/me/workout-sessions/complete',
      body: {
        'workoutPlanId': workoutPlanId,
        if (durationMinutes != null) 'durationMinutes': durationMinutes,
        'sets': sets.map((e) => e.toJson()).toList(),
      },
    );
    return MeWorkoutSessionCompleted.fromJson(res.data ?? {});
  }
}
