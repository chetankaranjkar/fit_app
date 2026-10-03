import '../core/api_client.dart';
import '../core/api_exception.dart';
import '../models/me_models.dart';
import '../workout_sync/sync/sync_manager.dart';
import 'me_response_cache.dart';
import 'workout_template_cache.dart';

/// Calls into the backend `/api/me/*` self-service endpoints.
class MeService {
  MeService._();
  static final MeService instance = MeService._();

  Future<MeDashboard> getDashboard() async {
    try {
      final res = await ApiClient.instance.get<Map<String, dynamic>>('/me/dashboard');
      final data = res.data ?? <String, dynamic>{};
      await MeResponseCache.instance.saveMap(MeResponseCache.dashboardKey, data);
      return MeDashboard.fromJson(data);
    } on ApiException catch (e) {
      if (e.isNetwork) {
        final cached = await MeResponseCache.instance.loadMap(MeResponseCache.dashboardKey);
        if (cached != null) return MeDashboard.fromJson(cached).asStale();
      }
      rethrow;
    }
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

  Future<MeNotificationPreferences> getNotificationPreferences() async {
    final res = await ApiClient.instance.get<Map<String, dynamic>>('/me/notification-preferences');
    return MeNotificationPreferences.fromJson(res.data ?? {});
  }

  Future<MeNotificationPreferences> updateNotificationPreferences({
    required bool receiveEmailNotifications,
    required bool receiveSmsNotifications,
  }) async {
    final res = await ApiClient.instance.put<Map<String, dynamic>>(
      '/me/notification-preferences',
      body: {
        'receiveEmailNotifications': receiveEmailNotifications,
        'receiveSmsNotifications': receiveSmsNotifications,
      },
    );
    return MeNotificationPreferences.fromJson(res.data ?? {});
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

  Future<MeBodyMetricLog> createBodyMetric({
    required double weightKg,
    double? bodyFatPct,
    String? notes,
    DateTime? measurementDate,
  }) async {
    final res = await ApiClient.instance.post<Map<String, dynamic>>(
      '/me/body-metrics',
      body: {
        'weightKg': weightKg,
        if (bodyFatPct != null) 'bodyFatPct': bodyFatPct,
        if (notes != null && notes.isNotEmpty) 'notes': notes,
        if (measurementDate != null) 'measurementDate': measurementDate.toUtc().toIso8601String(),
      },
    );
    return MeBodyMetricLog.fromJson(res.data ?? {});
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

  Future<void> markNotificationRead(int id) async {
    await ApiClient.instance.post<void>('/me/notifications/$id/read');
  }

  /// Server-side mark-all; inbox is the source of truth.
  Future<void> markAllNotificationsRead() async {
    await ApiClient.instance.post<void>('/me/notifications/read-all');
  }

  Future<List<MeInvoiceSummary>> getInvoices() async {
    final res = await ApiClient.instance.get<List<dynamic>>('/me/invoices');
    return (res.data ?? const [])
        .whereType<Map<String, dynamic>>()
        .map(MeInvoiceSummary.fromJson)
        .toList();
  }

  Future<MeBillingAccess> getBillingAccess() async {
    try {
      final res = await ApiClient.instance.get<Map<String, dynamic>>('/me/membership-billing/access');
      final data = res.data ?? <String, dynamic>{};
      await MeResponseCache.instance.saveMap(MeResponseCache.billingKey, data);
      return MeBillingAccess.fromJson(data);
    } on ApiException catch (e) {
      if (e.isNetwork) {
        final cached = await MeResponseCache.instance.loadMap(MeResponseCache.billingKey);
        if (cached != null) return MeBillingAccess.fromJson(cached);
      }
      rethrow;
    }
  }

  Future<List<int>> downloadInvoicePdf(int membershipPaymentId) async {
    return ApiClient.instance.downloadBytes('/me/invoices/$membershipPaymentId/pdf');
  }

  Future<void> registerPushToken({
    required String token,
    required String deviceUniqueId,
  }) async {
    await ApiClient.instance.post(
      '/me/push-token',
      body: {
        'token': token,
        'deviceUniqueId': deviceUniqueId,
      },
    );
  }

  Future<List<MeWorkoutPlanSummary>> getWorkoutPlans() async {
    try {
      final res = await ApiClient.instance.get<List<dynamic>>('/me/workout-plans');
      final data = res.data ?? const [];
      await MeResponseCache.instance.saveList(MeResponseCache.plansKey, data);
      return data.whereType<Map<String, dynamic>>().map(MeWorkoutPlanSummary.fromJson).toList();
    } on ApiException catch (e) {
      if (e.isNetwork) {
        final cached = await MeResponseCache.instance.loadList(MeResponseCache.plansKey);
        if (cached != null) {
          return cached
              .whereType<Map>()
              .map((e) => MeWorkoutPlanSummary.fromJson(e.cast<String, dynamic>()))
              .toList();
        }
      }
      rethrow;
    }
  }

  Future<MeWorkoutSessionTemplate> getWorkoutSessionTemplate(int planId) async {
    try {
      final offset = DateTime.now().timeZoneOffset.inMinutes;
      final res = await ApiClient.instance.get<Map<String, dynamic>>(
        '/me/workout-plans/$planId/session',
        query: {'utcOffsetMinutes': offset},
      );
      final template = MeWorkoutSessionTemplate.fromJson(res.data ?? {});
      await WorkoutTemplateCache.instance.save(planId, template);
      return template;
    } on ApiException catch (e) {
      if (e.isNetwork) {
        final cached = await WorkoutTemplateCache.instance.load(planId);
        if (cached != null) return cached;
      }
      rethrow;
    }
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
