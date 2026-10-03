import '../core/api_exception.dart';
import '../features/notifications/notification_destination.dart';
import '../features/notifications/push_tap_router.dart';
import '../services/auth_service.dart';
import '../services/device_tracking_service.dart';
import '../services/me_service.dart';

typedef PushNavigate = void Function(String location, {Object? extra});

/// Registers FCM tokens and routes notification taps (foreground / background / terminated).
///
/// Firebase Messaging is not a compile-time dependency (Production may have Firebase off).
/// When `firebase_messaging` is added, call [handleOpenedPayload] from:
/// - foreground tap
/// - `onMessageOpenedApp` (background)
/// - `getInitialMessage` (terminated)
class PushNotificationService {
  PushNotificationService._();
  static final PushNotificationService instance = PushNotificationService._();

  String? _lastRegisteredToken;
  PushTapPayload? _pending;
  PushNavigate? _navigate;
  PushOpenSource? _pendingSource;

  void attachNavigator(PushNavigate navigate) {
    _navigate = navigate;
  }

  PushTapPayload? get pendingPayload => _pending;

  /// Cold-start / terminated: stash until splash/login completes.
  void captureTerminatedPayload(Map<String, dynamic>? data) {
    final payload = PushTapPayload.tryParse(data);
    if (payload == null) return;
    _pending = payload;
    _pendingSource = PushOpenSource.terminated;
  }

  void clearPending() {
    _pending = null;
    _pendingSource = null;
  }

  Future<void> syncAfterLogin({String? fcmToken}) async {
    final token = fcmToken?.trim();
    if (token == null || token.isEmpty) return;
    if (token == _lastRegisteredToken) return;

    final deviceId = await DeviceTrackingService.instance.getOrCreateDeviceUniqueId();
    await MeService.instance.registerPushToken(token: token, deviceUniqueId: deviceId);
    _lastRegisteredToken = token;
  }

  /// Shared entry for all notification-open states.
  Future<PushTapDecision> handleOpenedPayload(
    Map<String, dynamic> data, {
    required PushOpenSource source,
    bool? isLoggedIn,
    int? sessionUserId,
    Set<String>? registeredRoutes,
  }) async {
    final payload = PushTapPayload.fromData(data);
    final session = await AuthService.instance.readCachedSession();
    final loggedIn = isLoggedIn ?? (session != null && session.token.isNotEmpty);
    final userId = sessionUserId ?? session?.userId;

    final decision = PushTapDecision.evaluate(
      payload: payload,
      isLoggedIn: loggedIn,
      sessionUserId: userId,
      registeredRoutes: registeredRoutes,
    );

    switch (decision.kind) {
      case PushTapDecisionKind.loginRequired:
        _pending = payload;
        _pendingSource = source;
        _navigate?.call('/login');
        return decision;
      case PushTapDecisionKind.ownershipMismatch:
        _pending = null;
        _pendingSource = null;
        return decision;
      case PushTapDecisionKind.navigate:
        _pending = null;
        _pendingSource = null;
        await _markReadIfPossible(payload.notificationId);
        _go(decision.route!);
        return decision;
    }
  }

  /// After a successful login (or splash with a cached session), open a stashed tap if owned.
  Future<PushTapDecision?> consumePendingAfterAuth({
    required int? sessionUserId,
    Set<String>? registeredRoutes,
  }) async {
    final pending = _pending;
    if (pending == null) return null;
    final session = await AuthService.instance.readCachedSession();
    final loggedIn = session != null && session.token.isNotEmpty;
    return handleOpenedPayload(
      pending.toJson(),
      source: _pendingSource ?? PushOpenSource.terminated,
      isLoggedIn: loggedIn,
      sessionUserId: sessionUserId ?? session?.userId,
      registeredRoutes: registeredRoutes,
    );
  }

  Future<void> _markReadIfPossible(int? id) async {
    if (id == null || id <= 0) return;
    try {
      await MeService.instance.markNotificationRead(id);
    } on ApiException {
      // Navigation still proceeds.
    }
  }

  void _go(NotificationRoute route) {
    _navigate?.call(route.location, extra: route.extra);
  }
}
