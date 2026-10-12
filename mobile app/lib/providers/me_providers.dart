import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../core/app_config.dart';
import '../core/external_links.dart';
import '../features/profile/in_app_web_types.dart';
import '../models/me_models.dart';
import '../models/online_payment_models.dart';
import '../models/support_models.dart';
import '../features/progress/progress_insights.dart';
import '../services/me_service.dart';
import '../services/online_payment_service.dart';
import '../services/support_service.dart';

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
  return MeService.instance.getNotifications(take: 100);
});

final invoicesProvider = FutureProvider.autoDispose<List<MeInvoiceSummary>>((ref) async {
  return MeService.instance.getInvoices();
});

final billingAccessProvider = FutureProvider.autoDispose<MeBillingAccess>((ref) async {
  return MeService.instance.getBillingAccess();
});

final onlinePaymentSummaryProvider =
    FutureProvider.autoDispose<MemberOnlinePaymentSummary>((ref) async {
  return OnlinePaymentService.instance.getSummary();
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

final notificationPreferencesProvider =
    FutureProvider.autoDispose<MeNotificationPreferences>((ref) async {
  return MeService.instance.getNotificationPreferences();
});

final dietPlanProvider = FutureProvider.autoDispose<MeDietPlan?>((ref) async {
  return MeService.instance.getDietPlan();
});

final workoutSessionHistoryProvider =
    FutureProvider.autoDispose.family<MeWorkoutHistoryPage, ProgressDateRange>((ref, range) async {
  final from = ProgressInsights.rangeStart(range, DateTime.now());
  return MeService.instance.getWorkoutHistoryPage(fromLocal: from);
});

final progressPhotosProvider = FutureProvider.autoDispose<List<MeProgressPhoto>>((ref) async {
  return MeService.instance.getProgressPhotos();
});

final memberSupportProvider = FutureProvider.autoDispose<MemberSupport>((ref) async {
  return SupportService.instance.getSupport();
});

final helpArticlesProvider = FutureProvider.autoDispose<List<HelpArticleSummary>>((ref) async {
  return SupportService.instance.getArticles();
});

/// Compile-time legal URLs. Tests override this instead of dart-defines.
final compileTimeLegalLinksProvider = Provider<ResolvedLegalLinks>((ref) {
  return ResolvedLegalLinks(
    helpCenterUrl: AppConfig.helpCenterUrl,
    privacyPolicyUrl: AppConfig.privacyPolicyUrl,
  );
});

final externalLinkOpenerProvider = Provider<ExternalLinkOpener>((ref) {
  return const ExternalLinkOpener();
});

/// Optional test double for the in-app browser (avoids a real WebView in widget tests).
final inAppWebEmbedBuilderProvider = Provider<InAppWebEmbedBuilder?>((ref) => null);
