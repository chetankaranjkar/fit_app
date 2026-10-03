import 'package:geolocator/geolocator.dart';

import '../../core/api_exception.dart';
import '../../services/qr_attendance_service.dart';
import 'check_in_codes.dart';
import 'check_in_location.dart';

/// Maps `POST /api/Attendance/scan` bodies and HTTP errors onto
/// [AttendanceResult] using existing backend `errorCode` values.
class AttendanceScanMapper {
  const AttendanceScanMapper();

  AttendanceResult fromSuccessBody(Map<String, dynamic> data, Position position) {
    final success = data['success'] == true;
    if (!success) {
      final msg = (data['message'] as String?)?.trim();
      return fromFailure(
        message: msg ?? 'Check-in failed.',
        errorCode: data['errorCode']?.toString(),
        statusCode: null,
        position: position,
      );
    }

    final msg = (data['message'] as String?)?.trim();
    final sessionStart = _parseDate(data['sessionStartTimeUtc']);
    return AttendanceSuccess(
      memberName: 'Member',
      checkInTime: sessionStart ?? DateTime.now(),
      planName: msg,
    );
  }

  AttendanceResult fromApiException(ApiException e, Position position) {
    final status = e.statusCode;
    final body = e.data is Map ? Map<String, dynamic>.from(e.data as Map) : const <String, dynamic>{};
    final message =
        (body['message'] as String?)?.trim() ?? (e.message.isNotEmpty ? e.message : null);
    final errorCode = body['errorCode']?.toString();
    return fromFailure(
      message: message ?? 'Could not check you in.',
      errorCode: errorCode,
      statusCode: status,
      position: position,
    );
  }

  AttendanceResult fromFailure({
    required String message,
    String? errorCode,
    int? statusCode,
    Position? position,
  }) {
    final lower = message.toLowerCase();
    final code = errorCode?.trim();

    if (statusCode == 404) {
      return const AttendanceNetworkError(
        message: 'Check-in service not found (404). Update the app or API.',
      );
    }

    if (statusCode == 429 || code == CheckInErrorCodes.rateLimited) {
      return AttendanceRateLimited(
        message: message.trim().isEmpty
            ? 'Too many QR scans. Wait a minute, then try again.'
            : message,
      );
    }

    if (code == CheckInErrorCodes.membershipExpired || _isMembershipMessage(lower)) {
      return AttendanceMembershipExpired(message: message);
    }

    if (statusCode == 409 || code == CheckInErrorCodes.replay) {
      return AttendanceAlreadyScanned(
        previousCheckIn: DateTime.now(),
        fromReplay: code == CheckInErrorCodes.replay || statusCode == 409,
        detail: code == CheckInErrorCodes.replay || (statusCode == 409 && !_isDuplicateWindow(lower))
            ? 'This scan was already processed. Your visit is on file.'
            : (message.trim().isEmpty
                ? 'A check-in was already recorded. You do not need to scan again right now.'
                : message),
      );
    }

    if (_isDistanceMessage(lower)) {
      return AttendanceTooFar(
        reason: message,
        deviceLatitude: position?.latitude,
        deviceLongitude: position?.longitude,
      );
    }

    if (_isDuplicateWindow(lower) ||
        lower.contains('already recorded') ||
        lower.contains('already checked') ||
        lower.contains('duplicate')) {
      return AttendanceAlreadyScanned(
        previousCheckIn: DateTime.now(),
        detail: message,
      );
    }

    if (lower.contains('expired') && lower.contains('qr')) {
      return const AttendanceInvalidQr(
        reason: 'This gym QR code has expired. Ask staff for a new code.',
      );
    }

    if (statusCode == 401) {
      return AttendanceSessionIssue(
        message: message.trim().isEmpty ? 'Session expired. Sign in again.' : message,
      );
    }

    if (statusCode == 403) {
      return AttendanceAccessDenied(
        message: message.trim().isEmpty
            ? 'You cannot check in with this account right now.'
            : message,
      );
    }

    if (statusCode == 400 || statusCode == 422 || statusCode == null) {
      return AttendanceInvalidQr(
        reason: message,
        deviceLatitude: position?.latitude,
        deviceLongitude: position?.longitude,
      );
    }

    return AttendanceNetworkError(message: message);
  }

  bool _isMembershipMessage(String lower) =>
      lower.contains('membership') &&
      (lower.contains('expired') ||
          lower.contains('inactive') ||
          lower.contains('no active') ||
          lower.contains('not active') ||
          lower.contains('frozen') ||
          lower.contains('no longer active') ||
          lower.contains('renew'));

  bool _isDistanceMessage(String lower) =>
      (lower.contains('within') && lower.contains('meter')) ||
      lower.contains('too far') ||
      lower.contains('outside gym');

  bool _isDuplicateWindow(String lower) =>
      lower.contains('last 5 minutes') || lower.contains('already recorded in the last');

  DateTime? _parseDate(Object? v) {
    if (v is String) return DateTime.tryParse(v)?.toLocal();
    if (v is DateTime) return v.toLocal();
    return null;
  }
}

AttendanceLocationIssue locationIssueFrom(CheckInLocationFailed failed) {
  return AttendanceLocationIssue(
    message: failed.message,
    kind: failed.kind,
    code: failed.code,
  );
}
