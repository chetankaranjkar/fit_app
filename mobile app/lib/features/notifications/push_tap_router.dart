import 'notification_destination.dart';

enum PushOpenSource { foregroundTap, background, terminated }

enum PushTapDecisionKind {
  /// No session: stash payload and send the user to login.
  loginRequired,

  /// Logged in, but payload userId is for someone else.
  ownershipMismatch,

  /// Session matches (or legacy payload with no userId); open the destination.
  navigate,
}

class PushTapPayload {
  const PushTapPayload({
    this.type,
    this.userId,
    this.notificationId,
    this.title = '',
    this.body = '',
    this.createdAt,
  });

  final String? type;
  final int? userId;
  final int? notificationId;
  final String title;
  final String body;
  final DateTime? createdAt;

  factory PushTapPayload.fromData(Map<String, dynamic> data) {
    return PushTapPayload(
      type: _str(data['type'] ?? data['Type']),
      userId: _int(data['userId'] ?? data['UserId'] ?? data['user_id']),
      notificationId: _int(
        data['notificationId'] ?? data['NotificationId'] ?? data['notification_id'],
      ),
      title: _str(data['title'] ?? data['Title']) ?? '',
      body: _str(data['body'] ?? data['Body'] ?? data['message'] ?? data['Message']) ?? '',
      createdAt: DateTime.tryParse(
        _str(data['createdAt'] ?? data['CreatedAt']) ?? '',
      ),
    );
  }

  Map<String, dynamic> toJson() => {
        'type': type,
        'userId': userId,
        'notificationId': notificationId,
        'title': title,
        'body': body,
        if (createdAt != null) 'createdAt': createdAt!.toIso8601String(),
      };

  static PushTapPayload? tryParse(Map<String, dynamic>? data) {
    if (data == null || data.isEmpty) return null;
    return PushTapPayload.fromData(data);
  }
}

class PushTapDecision {
  const PushTapDecision._({
    required this.kind,
    this.route,
    this.payload,
  });

  final PushTapDecisionKind kind;
  final NotificationRoute? route;
  final PushTapPayload? payload;

  bool get shouldNavigate => kind == PushTapDecisionKind.navigate && route != null;

  factory PushTapDecision.evaluate({
    required PushTapPayload payload,
    required bool isLoggedIn,
    required int? sessionUserId,
    Set<String>? registeredRoutes,
  }) {
    if (!isLoggedIn) {
      return PushTapDecision._(
        kind: PushTapDecisionKind.loginRequired,
        payload: payload,
      );
    }
    if (payload.userId != null &&
        (sessionUserId == null || payload.userId != sessionUserId)) {
      return const PushTapDecision._(kind: PushTapDecisionKind.ownershipMismatch);
    }
    return PushTapDecision._(
      kind: PushTapDecisionKind.navigate,
      payload: payload,
      route: NotificationDestination.resolve(
        type: payload.type,
        title: payload.title,
        body: payload.body,
        createdAt: payload.createdAt,
        notificationId: payload.notificationId,
        registered: registeredRoutes,
      ),
    );
  }
}

int? _int(Object? value) {
  if (value == null) return null;
  if (value is int) return value;
  if (value is num) return value.toInt();
  return int.tryParse(value.toString());
}

String? _str(Object? value) {
  if (value == null) return null;
  final s = value.toString().trim();
  return s.isEmpty ? null : s;
}
