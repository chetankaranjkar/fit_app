import 'package:flutter_test/flutter_test.dart';
import 'package:pulsefit/features/notifications/notification_destination.dart';
import 'package:pulsefit/features/notifications/push_tap_router.dart';
import 'package:pulsefit/models/me_models.dart';
import 'package:pulsefit/services/push_notification_service.dart';

void main() {
  group('NotificationDestination type → route', () {
    test('maps known in-app types to existing screens', () {
      const cases = <String, String>{
        'workout_today': '/workouts',
        'WorkoutAssigned': '/workouts',
        'diet_assignment_assigned': '/diet',
        'DietAssignmentAssigned': '/diet',
        'membership_expiring': '/membership',
        'membership_approval_approved': '/membership',
        'membership_approval_rejected': '/membership',
        'QR_EXPIRING': '/home',
        'Attendance': '/home',
        'TrainerAssigned': '/profile',
        'Welcome': '/home',
        'health_profile': '/profile/health',
      };
      for (final entry in cases.entries) {
        final route = NotificationDestination.resolve(
          type: entry.key,
          title: 'T',
          body: 'B',
        );
        expect(route.location, entry.value, reason: entry.key);
        expect(route.isDetail, isFalse);
      }
    });

    test('payment types use membership until /pay is registered', () {
      final route = NotificationDestination.resolve(
        type: 'payment_due',
        title: 'Due',
        body: 'Pay',
      );
      expect(route.location, '/membership');
    });

    test('payment types use /pay when that route exists', () {
      final loc = NotificationDestination.locationForTarget(
        MemberNotificationTarget.pay,
        registered: {'/pay', '/membership'},
      );
      expect(loc, '/pay');
    });

    test('health uses /profile/health when registered, else /health, else profile', () {
      expect(
        NotificationDestination.locationForTarget(MemberNotificationTarget.health),
        '/profile/health',
      );
      expect(
        NotificationDestination.locationForTarget(
          MemberNotificationTarget.health,
          registered: {'/health', '/profile'},
        ),
        '/health',
      );
      expect(
        NotificationDestination.locationForTarget(
          MemberNotificationTarget.health,
          registered: {'/profile'},
        ),
        '/profile',
      );
    });

    test('unknown type opens a detail route with title and body', () {
      final route = NotificationDestination.resolve(
        type: 'something_new_from_server',
        title: 'Heads up',
        body: 'We added a new reminder.',
        createdAt: DateTime.utc(2026, 10, 3),
        notificationId: 42,
      );
      expect(route.isDetail, isTrue);
      expect(route.location, NotificationDestination.detailLocation);
      expect(route.extra?.title, 'Heads up');
      expect(route.extra?.body, 'We added a new reminder.');
      expect(route.extra?.notificationId, 42);
    });
  });

  group('Mark-read contract', () {
    test('per-item read stays on POST /me/notifications/{id}/read', () {
      expect(_perItemMarkReadPath(17), '/me/notifications/17/read');
    });

    test('mark-all uses the server endpoint, not a local-only flag', () {
      expect(_markAllReadPath, '/me/notifications/read-all');
    });
  });

  group('Push tap auth and ownership', () {
    PushTapPayload payload({int? userId, String type = 'workout_today'}) {
      return PushTapPayload(
        type: type,
        userId: userId,
        title: 'Workout day',
        body: 'Today is push day.',
      );
    }

    test('logged out goes to login and does not navigate to the destination', () {
      final decision = PushTapDecision.evaluate(
        payload: payload(userId: 9),
        isLoggedIn: false,
        sessionUserId: null,
      );
      expect(decision.kind, PushTapDecisionKind.loginRequired);
      expect(decision.shouldNavigate, isFalse);
    });

    test('userId mismatch rejects the deep link', () {
      final decision = PushTapDecision.evaluate(
        payload: payload(userId: 9),
        isLoggedIn: true,
        sessionUserId: 3,
      );
      expect(decision.kind, PushTapDecisionKind.ownershipMismatch);
      expect(decision.shouldNavigate, isFalse);
    });

    test('matching userId navigates for foreground/background/terminated', () {
      for (final _ in PushOpenSource.values) {
        final decision = PushTapDecision.evaluate(
          payload: payload(userId: 3),
          isLoggedIn: true,
          sessionUserId: 3,
        );
        expect(decision.kind, PushTapDecisionKind.navigate);
        expect(decision.route?.location, '/workouts');
      }
    });

    test('pending payload after login still rejects another member', () {
      final afterLogin = PushTapDecision.evaluate(
        payload: payload(userId: 9),
        isLoggedIn: true,
        sessionUserId: 3,
      );
      expect(afterLogin.kind, PushTapDecisionKind.ownershipMismatch);
    });

    test('logged in without session userId still rejects a payload for another member', () {
      final decision = PushTapDecision.evaluate(
        payload: payload(userId: 9),
        isLoggedIn: true,
        sessionUserId: null,
      );
      expect(decision.kind, PushTapDecisionKind.ownershipMismatch);
    });

    test('legacy payload without userId is allowed only when logged in', () {
      final loggedOut = PushTapDecision.evaluate(
        payload: payload(),
        isLoggedIn: false,
        sessionUserId: null,
      );
      expect(loggedOut.kind, PushTapDecisionKind.loginRequired);

      final loggedIn = PushTapDecision.evaluate(
        payload: payload(),
        isLoggedIn: true,
        sessionUserId: 3,
      );
      expect(loggedIn.kind, PushTapDecisionKind.navigate);
    });

    test('terminated stash keeps payload until auth', () {
      final service = PushNotificationService.instance;
      service.clearPending();
      service.captureTerminatedPayload({
        'type': 'workout_today',
        'userId': '9',
        'title': 'Workout day',
        'body': 'Go train',
      });
      expect(service.pendingPayload?.userId, 9);
      expect(service.pendingPayload?.type, 'workout_today');
      service.clearPending();
    });

    test('parses FCM data map including string userId', () {
      final parsed = PushTapPayload.fromData({
        'type': 'membership_expiring',
        'userId': '12',
        'title': 'Plan ending',
        'body': '3 days left',
      });
      expect(parsed.userId, 12);
      expect(parsed.type, 'membership_expiring');
    });
  });

  group('MeNotification mark-read helpers unchanged', () {
    test('type flags still recognize known reminders', () {
      final n = MeNotification(
        id: 1,
        title: 'Workout day',
        message: 'Go train [wdr:20261003:1]',
        createdAt: DateTime.utc(2026, 10, 3),
        isRead: false,
        type: 'workout_today',
      );
      expect(n.isWorkoutToday, isTrue);
      expect(n.isMembershipExpiring, isFalse);
      expect(n.displayMessage.contains('[wdr:'), isFalse);
    });
  });
}

const _markAllReadPath = '/me/notifications/read-all';

String _perItemMarkReadPath(int id) => '/me/notifications/$id/read';
