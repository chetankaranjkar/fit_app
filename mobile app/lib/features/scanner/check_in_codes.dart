/// Machine codes for QR check-in. Backend codes match
/// `AttendanceScanResponseDto.ErrorCode` / `GymQrService`.
/// Client-only codes are used before `POST /api/Attendance/scan`.
abstract final class CheckInErrorCodes {
  static const membershipExpired = 'membership_expired';
  static const rateLimited = 'rate_limited';
  static const replay = 'replay';

  /// Camera permission denied or permanently denied (no HTTP).
  static const cameraDenied = 'camera_denied';

  /// Location permission denied (not yet forever).
  static const locationDenied = 'location_denied';

  /// Location permission permanently denied — open settings, do not re-prompt.
  static const locationDeniedForever = 'location_denied_forever';

  /// OS location services / GPS disabled.
  static const gpsOff = 'gps_off';

  /// Permission granted and GPS on, but no usable fix (timeout / unavailable).
  static const gpsNoFix = 'gps_no_fix';
}
