import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../models/me_models.dart';
import '../services/me_service.dart';

final dashboardProvider = FutureProvider.autoDispose<MeDashboard>((ref) async {
  return MeService.instance.getDashboard();
});

final membershipProvider = FutureProvider.autoDispose<MeMembership?>((ref) async {
  return MeService.instance.getMembership();
});

final attendanceProvider = FutureProvider.autoDispose<MeAttendanceSummary>((ref) async {
  return MeService.instance.getAttendance();
});

final bodyMetricsProvider = FutureProvider.autoDispose<List<MeBodyMetricLog>>((ref) async {
  return MeService.instance.getBodyMetrics();
});

final notificationsProvider = FutureProvider.autoDispose<List<MeNotification>>((ref) async {
  return MeService.instance.getNotifications();
});

final workoutPlansProvider = FutureProvider.autoDispose<List<MeWorkoutPlanSummary>>((ref) async {
  return MeService.instance.getWorkoutPlans();
});

final workoutSessionTemplateProvider =
    FutureProvider.autoDispose.family<MeWorkoutSessionTemplate, int>((ref, planId) async {
  return MeService.instance.getWorkoutSessionTemplate(planId);
});

final profileProvider = FutureProvider.autoDispose<MeProfile>((ref) async {
  return MeService.instance.getProfile();
});

final dietPlanProvider = FutureProvider.autoDispose<MeDietPlan?>((ref) async {
  return MeService.instance.getDietPlan();
});

final workoutSessionHistoryProvider =
    FutureProvider.autoDispose<List<MeWorkoutSessionSummary>>((ref) async {
  return MeService.instance.getWorkoutSessions();
});

final progressPhotosProvider = FutureProvider.autoDispose<List<MeProgressPhoto>>((ref) async {
  return MeService.instance.getProgressPhotos();
});
