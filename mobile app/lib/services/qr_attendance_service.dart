import 'package:dio/dio.dart';
import 'package:geolocator/geolocator.dart';
import 'package:uuid/uuid.dart';

import '../core/api_client.dart';
import '../core/api_exception.dart';

/// Sealed result of a QR attendance attempt.
///
/// All five UX states the scanner needs to render are encoded here so the
/// view layer can pattern-match without knowing about HTTP details.
sealed class AttendanceResult {
  const AttendanceResult();
}

class AttendanceSuccess extends AttendanceResult {
  const AttendanceSuccess({
    required this.memberName,
    required this.checkInTime,
    this.planName,
  });
  final String memberName;
  final DateTime checkInTime;
  final String? planName;
}

class AttendanceMembershipExpired extends AttendanceResult {
  const AttendanceMembershipExpired({this.endDate});
  final DateTime? endDate;
}

class AttendanceAlreadyScanned extends AttendanceResult {
  const AttendanceAlreadyScanned({required this.previousCheckIn});
  final DateTime previousCheckIn;
}

class AttendanceInvalidQr extends AttendanceResult {
  const AttendanceInvalidQr({
    this.reason,
    this.deviceLatitude,
    this.deviceLongitude,
  });

  /// Server or client message (e.g. geo “100 meters” rule).
  final String? reason;

  /// WGS84 coordinates **sent to the API** with this scan (for debugging vs branch lat/lng in admin).
  final double? deviceLatitude;
  final double? deviceLongitude;
}

/// GPS off, permission denied, or fix timeout — not a server connectivity failure.
class AttendanceLocationIssue extends AttendanceResult {
  const AttendanceLocationIssue({required this.message});
  final String message;
}

/// Expired or invalid token for [Authorize] on scan — login works until scan calls API.
class AttendanceSessionIssue extends AttendanceResult {
  const AttendanceSessionIssue({required this.message});
  final String message;
}

class AttendanceNetworkError extends AttendanceResult {
  const AttendanceNetworkError({required this.message});
  final String message;
}

/// Calls [POST /api/Attendance/scan] — same contract as
/// [GymManagement.API.Controllers.AttendanceController].
class QrAttendanceService {
  QrAttendanceService._();
  static final QrAttendanceService instance = QrAttendanceService._();

  static const _uuid = Uuid();

  /// Path relative to [AppConfig.apiRoot] (`.../api`).
  static const String _endpoint = '/Attendance/scan';

  Future<AttendanceResult> submit(String qrToken) async {
    final token = qrToken.trim();
    if (token.isEmpty) {
      return const AttendanceInvalidQr(reason: 'Empty QR payload.');
    }

    Position? position;
    try {
      var permission = await Geolocator.checkPermission();
      if (permission == LocationPermission.denied) {
        permission = await Geolocator.requestPermission();
      }
      if (permission == LocationPermission.denied ||
          permission == LocationPermission.deniedForever) {
        return const AttendanceLocationIssue(
          message:
              'Location permission is required for check-in (the gym verifies you are at the venue).',
        );
      }
      position = await Geolocator.getCurrentPosition(
        locationSettings: const LocationSettings(
          accuracy: LocationAccuracy.high,
          timeLimit: Duration(seconds: 25),
        ),
      );
    } catch (_) {
      return const AttendanceLocationIssue(
        message: 'Could not read your location. Enable GPS and try again.',
      );
    }

    final clientScanId = _uuid.v4();

    try {
      final res = await ApiClient.instance.post<Map<String, dynamic>>(
        _endpoint,
        body: {
          'qrToken': token,
          'latitude': position.latitude,
          'longitude': position.longitude,
          'clientScanId': clientScanId,
        },
      );

      final data = res.data ?? const <String, dynamic>{};
      return _mapAttendanceScanSuccess(data, position);
    } on ApiException catch (e) {
      return _mapApiException(e, position);
    } on DioException catch (e) {
      return AttendanceNetworkError(
        message: e.message ?? 'Network problem. Please try again.',
      );
    } catch (_) {
      return const AttendanceNetworkError(
        message: 'Something went wrong. Please try again.',
      );
    }
  }

  AttendanceResult _mapAttendanceScanSuccess(
    Map<String, dynamic> data,
    Position position,
  ) {
    final success = data['success'] == true;
    if (!success) {
      final msg = (data['message'] as String?)?.trim();
      return AttendanceInvalidQr(
        reason: msg ?? 'Check-in failed.',
        deviceLatitude: position.latitude,
        deviceLongitude: position.longitude,
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

  /// Stub mode — exercise UI without the backend.
  Future<AttendanceResult> submitStub(String qrToken) async {
    await Future<void>.delayed(const Duration(milliseconds: 650));
    final tag = qrToken.toLowerCase();
    if (tag.contains('expired')) {
      return AttendanceMembershipExpired(
        endDate: DateTime.now().subtract(const Duration(days: 12)),
      );
    }
    if (tag.contains('already')) {
      return AttendanceAlreadyScanned(
        previousCheckIn: DateTime.now().subtract(const Duration(hours: 3)),
      );
    }
    if (tag.contains('invalid')) {
      return const AttendanceInvalidQr(reason: 'This QR code is not valid.');
    }
    if (tag.contains('net')) {
      return const AttendanceNetworkError(message: 'No internet connection.');
    }
    return AttendanceSuccess(
      memberName: 'Demo Member',
      checkInTime: DateTime.now(),
      planName: 'Premium Annual',
    );
  }

  AttendanceResult _mapApiException(ApiException e, Position position) {
    final status = e.statusCode;
    final body = e.data is Map ? Map<String, dynamic>.from(e.data as Map) : const <String, dynamic>{};
    final message =
        (body['message'] as String?)?.trim() ?? (e.message.isNotEmpty ? e.message : null);

    if (status == 404) {
      return const AttendanceNetworkError(
        message: 'Check-in service not found (404). Update the app or API.',
      );
    }

    if (status == 429) {
      return AttendanceNetworkError(
        message: message ?? 'Too many scans. Try again in a moment.',
      );
    }

    if (status == 409) {
      return AttendanceAlreadyScanned(previousCheckIn: DateTime.now());
    }

    if (status == 400 || status == 422) {
      return AttendanceInvalidQr(
        reason: message ?? 'Could not validate this QR code.',
        deviceLatitude: position.latitude,
        deviceLongitude: position.longitude,
      );
    }

    if (status == 401 || status == 403) {
      return AttendanceSessionIssue(
        message: message ?? 'Session expired. Sign in again.',
      );
    }

    return AttendanceNetworkError(
      message: message ?? 'Could not check you in.',
    );
  }

  DateTime? _parseDate(Object? v) {
    if (v is String) return DateTime.tryParse(v)?.toLocal();
    if (v is DateTime) return v.toLocal();
    return null;
  }
}
