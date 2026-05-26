import '../core/api_client.dart';
import '../core/api_exception.dart';
import '../models/me_models.dart';
import '../workout_sync/sync/sync_manager.dart';
import 'workout_template_cache.dart';

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

  Future<MeProfile> updateProfile({
    String? firstName,
    String? lastName,
    String? phone,
    String? profilePictureUrl,
  }) async {
    final body = <String, dynamic>{};
    if (firstName != null) body['firstName'] = firstName;
    if (lastName != null) body['lastName'] = lastName;
    if (phone != null) body['phone'] = phone;
    if (profilePictureUrl != null) body['profilePictureUrl'] = profilePictureUrl;
    final res = await ApiClient.instance.put<Map<String, dynamic>>('/me/profile', body: body);
    return MeProfile.fromJson(res.data ?? {});
  }

  Future<List<MeWorkoutSessionSummary>> getWorkoutSessions({int take = 40}) async {
    final res = await ApiClient.instance.get<List<dynamic>>(
      '/me/workout-sessions',
      query: {'take': take},
    );
    return (res.data ?? const [])
        .whereType<Map>()
        .map((e) => MeWorkoutSessionSummary.fromJson(e.cast<String, dynamic>()))
        .toList();
  }

  /// Retries offline live workouts, sync queue, and legacy batch completions.
  Future<int> flushPendingWorkoutSessions() async {
    final result = await SyncManager.instance.syncAll(reason: 'flush');
    return result.syncedCount;
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
    final template = MeWorkoutSessionTemplate.fromJson(res.data ?? {});
    await WorkoutTemplateCache.instance.save(planId, template);
    return template;
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

  Future<MeProfile> uploadProfilePhoto(
    List<int> bytes,
    String fileName, {
    void Function(int sent, int total)? onSendProgress,
  }) async {
    final res = await ApiClient.instance.postMultipart<Map<String, dynamic>>(
      '/me/profile/photo',
      fileBytes: bytes,
      fileName: fileName,
      onSendProgress: onSendProgress,
    );
    return MeProfile.fromJson(res.data ?? {});
  }

  Future<List<MeProgressPhoto>> getProgressPhotos({int take = 60}) async {
    final res = await ApiClient.instance.get<List<dynamic>>(
      '/me/progress-photos',
      query: {'take': take},
    );
    return (res.data ?? const [])
        .whereType<Map>()
        .map((e) => MeProgressPhoto.fromJson(e.cast<String, dynamic>()))
        .toList();
  }

  Future<MeProgressPhoto> uploadProgressPhoto(
    List<int> bytes,
    String fileName, {
    required String imageType,
    String? notes,
    double? weightKg,
    double? bodyFatPercent,
    DateTime? imageDate,
    void Function(int sent, int total)? onSendProgress,
  }) async {
    final fields = <String, dynamic>{
      'imageType': imageType,
      if (notes != null && notes.isNotEmpty) 'notes': notes,
      if (weightKg != null) 'weightKg': weightKg.toString(),
      if (bodyFatPercent != null) 'bodyFatPercent': bodyFatPercent.toString(),
      if (imageDate != null) 'imageDate': imageDate.toUtc().toIso8601String(),
    };
    final res = await ApiClient.instance.postMultipart<Map<String, dynamic>>(
      '/me/progress-photos',
      fileBytes: bytes,
      fileName: fileName,
      formFields: fields,
      onSendProgress: onSendProgress,
    );
    return MeProgressPhoto.fromJson(res.data ?? {});
  }

  Future<void> deleteProgressPhoto(int id) async {
    await ApiClient.instance.delete<void>('/me/progress-photos/$id');
  }
}
