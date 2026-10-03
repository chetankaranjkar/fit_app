// Maps in-app / FCM notification types to member-app routes.
// Health and pay screens may land from parallel work: prefer those paths when
// they are registered, otherwise fall back to Profile / Membership.

class NotificationRoute {
  const NotificationRoute.go(this.location)
      : extra = null,
        isDetail = false;

  const NotificationRoute.detail({
    required this.extra,
  })  : location = NotificationDestination.detailLocation,
        isDetail = true;

  final String location;
  final NotificationDetailArgs? extra;
  final bool isDetail;
}

class NotificationDetailArgs {
  const NotificationDetailArgs({
    required this.title,
    required this.body,
    this.createdAt,
    this.type,
    this.notificationId,
  });

  final String title;
  final String body;
  final DateTime? createdAt;
  final String? type;
  final int? notificationId;
}

/// Logical targets plus the paths currently wired in [appRouter].
abstract final class NotificationDestination {
  static const detailLocation = '/notifications/detail';

  /// Routes that exist in the member app today (plus likely parallel additions).
  static const registeredRoutes = <String>{
    '/home',
    '/workouts',
    '/diet',
    '/progress',
    '/profile',
    '/membership',
    '/profile/health',
    '/profile/supplements',
    '/scanner',
    '/notifications',
    detailLocation,
  };

  static const likelyHealthRoute = '/health';
  static const profileHealthRoute = '/profile/health';
  static const likelyPayRoute = '/pay';
  static const likelyMembershipPayRoute = '/membership/pay';

  static String locationForTarget(
    MemberNotificationTarget target, {
    Set<String>? registered,
  }) {
    final routes = registered ?? registeredRoutes;
    switch (target) {
      case MemberNotificationTarget.workouts:
        return '/workouts';
      case MemberNotificationTarget.diet:
        return '/diet';
      case MemberNotificationTarget.membership:
        return '/membership';
      case MemberNotificationTarget.pay:
        if (routes.contains(likelyPayRoute)) return likelyPayRoute;
        if (routes.contains(likelyMembershipPayRoute)) {
          return likelyMembershipPayRoute;
        }
        return '/membership';
      case MemberNotificationTarget.health:
        if (routes.contains(profileHealthRoute)) return profileHealthRoute;
        if (routes.contains(likelyHealthRoute)) return likelyHealthRoute;
        return '/profile';
      case MemberNotificationTarget.progress:
        return '/progress';
      case MemberNotificationTarget.profile:
        return '/profile';
      case MemberNotificationTarget.scanner:
        return '/scanner';
      case MemberNotificationTarget.home:
        return '/home';
      case MemberNotificationTarget.detail:
        return detailLocation;
    }
  }

  static MemberNotificationTarget? targetForType(String? type) {
    final key = normalizeType(type);
    if (key.isEmpty) return null;
    return _typeTargets[key];
  }

  static NotificationRoute resolve({
    required String? type,
    required String title,
    required String body,
    DateTime? createdAt,
    int? notificationId,
    Set<String>? registered,
  }) {
    final target = targetForType(type);
    if (target == null) {
      return NotificationRoute.detail(
        extra: NotificationDetailArgs(
          title: title,
          body: body,
          createdAt: createdAt,
          type: type,
          notificationId: notificationId,
        ),
      );
    }
    return NotificationRoute.go(locationForTarget(target, registered: registered));
  }

  static String normalizeType(String? type) {
    if (type == null) return '';
    return type.trim().toLowerCase().replaceAll('-', '_');
  }
}

enum MemberNotificationTarget {
  workouts,
  diet,
  membership,
  pay,
  health,
  progress,
  profile,
  scanner,
  home,
  detail,
}

const Map<String, MemberNotificationTarget> _typeTargets = {
  'workout_today': MemberNotificationTarget.workouts,
  'workoutassigned': MemberNotificationTarget.workouts,
  'workout_assigned': MemberNotificationTarget.workouts,
  'dietassignmentassigned': MemberNotificationTarget.diet,
  'diet_assignment_assigned': MemberNotificationTarget.diet,
  'diet_assigned': MemberNotificationTarget.diet,
  'membership_expiring': MemberNotificationTarget.membership,
  'membershipexpired': MemberNotificationTarget.membership,
  'membership_expired': MemberNotificationTarget.membership,
  'membershipactivated': MemberNotificationTarget.membership,
  'membership_activated': MemberNotificationTarget.membership,
  'membershiprenewalreminder': MemberNotificationTarget.membership,
  'membership_approval_approved': MemberNotificationTarget.membership,
  'membership_approval_rejected': MemberNotificationTarget.membership,
  'membership_approval_pending': MemberNotificationTarget.membership,
  'payment_due': MemberNotificationTarget.pay,
  'paymentduereminder': MemberNotificationTarget.pay,
  'paymentsuccess': MemberNotificationTarget.pay,
  'payment_success': MemberNotificationTarget.pay,
  'invoicegenerated': MemberNotificationTarget.pay,
  'invoice_generated': MemberNotificationTarget.pay,
  'attendance': MemberNotificationTarget.home,
  'qr_expiring': MemberNotificationTarget.home,
  'trainerassigned': MemberNotificationTarget.profile,
  'trainer_assigned': MemberNotificationTarget.profile,
  'welcome': MemberNotificationTarget.home,
  'birthday': MemberNotificationTarget.home,
  'health': MemberNotificationTarget.health,
  'health_profile': MemberNotificationTarget.health,
  'progress': MemberNotificationTarget.progress,
  'ptsessionbooked': MemberNotificationTarget.home,
  'pt_session_booked': MemberNotificationTarget.home,
};
