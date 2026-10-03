import 'package:intl/intl.dart';

import '../../services/qr_attendance_service.dart';
import 'check_in_codes.dart';
import 'check_in_location.dart';

enum CheckInNextAction {
  none,
  retryScan,
  waitThenRetry,
  openAppSettings,
  openLocationSettings,
  viewMembership,
  goHome,
  close,
}

class CheckInFeedback {
  const CheckInFeedback({
    required this.title,
    required this.reason,
    required this.nextAction,
    this.nextActionLabel,
    this.code,
    this.celebratory = false,
  });

  final String title;
  final String reason;
  final CheckInNextAction nextAction;
  final String? nextActionLabel;
  final String? code;
  final bool celebratory;

  static CheckInFeedback fromResult(AttendanceResult result) {
    if (result is AttendanceSuccess) {
      return CheckInFeedback(
        title: "You're checked in!",
        reason: _successBody(result),
        nextAction: CheckInNextAction.none,
        celebratory: true,
      );
    }
    if (result is AttendanceCameraIssue) {
      return CheckInFeedback(
        title: 'Camera access needed',
        reason: result.permanentlyDenied
            ? 'Camera is blocked for this app. Open Settings, allow Camera, then return to scan the gym QR.'
            : 'Allow camera so we can read the gym QR. We will not keep asking if you decline.',
        nextAction: CheckInNextAction.openAppSettings,
        nextActionLabel: 'Open settings',
        code: CheckInErrorCodes.cameraDenied,
      );
    }
    if (result is AttendanceLocationIssue) {
      return _location(result);
    }
    if (result is AttendanceTooFar) {
      return CheckInFeedback(
        title: 'Outside gym area',
        reason: result.reason,
        nextAction: CheckInNextAction.retryScan,
        nextActionLabel: 'Move closer, then scan',
      );
    }
    if (result is AttendanceRateLimited) {
      return CheckInFeedback(
        title: 'Too many scans',
        reason: result.message,
        nextAction: CheckInNextAction.waitThenRetry,
        nextActionLabel: 'Wait, then try again',
        code: CheckInErrorCodes.rateLimited,
      );
    }
    if (result is AttendanceAlreadyScanned) {
      return CheckInFeedback(
        title: 'Already recorded',
        reason: result.detail ??
            'This visit is already on file. You do not need to scan again right now.',
        nextAction: CheckInNextAction.goHome,
        nextActionLabel: 'Home',
        code: result.fromReplay ? CheckInErrorCodes.replay : null,
      );
    }
    if (result is AttendanceMembershipExpired) {
      return _membership(result);
    }
    if (result is AttendanceSessionIssue) {
      return CheckInFeedback(
        title: 'Session expired',
        reason: result.message,
        nextAction: CheckInNextAction.close,
        nextActionLabel: 'Close',
      );
    }
    if (result is AttendanceAccessDenied) {
      return CheckInFeedback(
        title: 'Check-in not allowed',
        reason: result.message,
        nextAction: CheckInNextAction.goHome,
        nextActionLabel: 'Home',
      );
    }
    if (result is AttendanceInvalidQr) {
      return CheckInFeedback(
        title: 'Invalid QR code',
        reason: result.reason?.trim().isNotEmpty == true
            ? result.reason!
            : 'This QR is not recognised. Ask staff for the current gym code.',
        nextAction: CheckInNextAction.retryScan,
        nextActionLabel: 'Try again',
      );
    }
    final n = result as AttendanceNetworkError;
    return CheckInFeedback(
      title: 'Connection issue',
      reason: n.message,
      nextAction: CheckInNextAction.retryScan,
      nextActionLabel: 'Try again',
    );
  }

  static String _successBody(AttendanceSuccess r) {
    return '${r.memberName} • ${DateFormat('h:mm a').format(r.checkInTime.toLocal())}'
        '${r.planName != null ? '\n${r.planName}' : ''}';
  }

  static CheckInFeedback _location(AttendanceLocationIssue r) {
    switch (r.kind) {
      case LocationIssueKind.permissionDeniedForever:
        return CheckInFeedback(
          title: 'Location permission needed',
          reason: r.message,
          nextAction: CheckInNextAction.openAppSettings,
          nextActionLabel: 'Open settings',
          code: CheckInErrorCodes.locationDeniedForever,
        );
      case LocationIssueKind.permissionDenied:
        return CheckInFeedback(
          title: 'Location permission needed',
          reason: r.message,
          nextAction: CheckInNextAction.openAppSettings,
          nextActionLabel: 'Open settings',
          code: CheckInErrorCodes.locationDenied,
        );
      case LocationIssueKind.gpsOff:
        return CheckInFeedback(
          title: 'GPS is off',
          reason: r.message,
          nextAction: CheckInNextAction.openLocationSettings,
          nextActionLabel: 'Turn on GPS',
          code: CheckInErrorCodes.gpsOff,
        );
      case LocationIssueKind.noFix:
        return CheckInFeedback(
          title: 'No GPS fix yet',
          reason: r.message,
          nextAction: CheckInNextAction.retryScan,
          nextActionLabel: 'Try again',
          code: CheckInErrorCodes.gpsNoFix,
        );
    }
  }

  static CheckInFeedback _membership(AttendanceMembershipExpired r) {
    final msg = (r.message ?? '').toLowerCase();
    late final String title;
    late final String reason;
    if (msg.contains('frozen')) {
      title = 'No gym access';
      reason = r.message ??
          'Gym access is paused. Ask the front desk to restore it. Paying a balance does not unfreeze a membership.';
    } else if (msg.contains('expired') || msg.contains('ended')) {
      title = 'Membership ended';
      reason = r.message ??
          'Your membership period has ended. Ask the front desk to renew. Paying an outstanding bill does not add gym time.';
    } else if (msg.contains('pending') || msg.contains('approval') || msg.contains('review')) {
      title = 'No gym access';
      reason = r.message ??
          'Your membership is waiting on gym approval. Access stays closed until they finish.';
    } else {
      title = 'No gym access';
      reason = r.message ??
          'There is no membership that allows gym check-in. Ask the front desk to add or restore a plan.';
    }
    return CheckInFeedback(
      title: title,
      reason: reason,
      nextAction: CheckInNextAction.viewMembership,
      nextActionLabel: 'View membership',
      code: CheckInErrorCodes.membershipExpired,
    );
  }
}
