import 'package:dio/dio.dart';
import 'package:uuid/uuid.dart';

import '../core/api_client.dart';
import '../core/api_exception.dart';
import '../features/scanner/attendance_scan_mapper.dart';
import '../features/scanner/check_in_location.dart';

/// Sealed result of a QR attendance attempt.
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

/// Membership gate (`errorCode: membership_expired`). Paying outstanding does
/// not by itself restore Frozen / Pending / expired rows; ActivePendingPayment
/// with a valid end date still allows check-in on the server.
class AttendanceMembershipExpired extends AttendanceResult {
  const AttendanceMembershipExpired({this.endDate, this.message});
  final DateTime? endDate;
  final String? message;
}

class AttendanceAlreadyScanned extends AttendanceResult {
  const AttendanceAlreadyScanned({
    required this.previousCheckIn,
    this.detail,
    this.fromReplay = false,
  });
  final DateTime previousCheckIn;
  final String? detail;
  final bool fromReplay;
}

class AttendanceInvalidQr extends AttendanceResult {
  const AttendanceInvalidQr({
    this.reason,
    this.deviceLatitude,
    this.deviceLongitude,
  });

  final String? reason;
  final double? deviceLatitude;
  final double? deviceLongitude;
}

class AttendanceTooFar extends AttendanceResult {
  const AttendanceTooFar({
    required this.reason,
    this.deviceLatitude,
    this.deviceLongitude,
  });
  final String reason;
  final double? deviceLatitude;
  final double? deviceLongitude;
}

class AttendanceRateLimited extends AttendanceResult {
  const AttendanceRateLimited({required this.message});
  final String message;
}

class AttendanceCameraIssue extends AttendanceResult {
  const AttendanceCameraIssue({this.permanentlyDenied = true});
  final bool permanentlyDenied;
}

class AttendanceAccessDenied extends AttendanceResult {
  const AttendanceAccessDenied({required this.message});
  final String message;
}

class AttendanceLocationIssue extends AttendanceResult {
  const AttendanceLocationIssue({
    required this.message,
    this.kind = LocationIssueKind.noFix,
    this.code,
  });
  final String message;
  final LocationIssueKind kind;
  final String? code;
}

class AttendanceSessionIssue extends AttendanceResult {
  const AttendanceSessionIssue({required this.message});
  final String message;
}

class AttendanceNetworkError extends AttendanceResult {
  const AttendanceNetworkError({required this.message});
  final String message;
}

typedef AttendanceScanTransport = Future<Map<String, dynamic>> Function(
  Map<String, dynamic> body,
);

/// Calls [POST /api/Attendance/scan] — same contract as
/// [GymManagement.API.Controllers.AttendanceController].
class QrAttendanceService {
  QrAttendanceService._({
    CheckInLocationSource? location,
    AttendanceScanTransport? transport,
    AttendanceScanMapper mapper = const AttendanceScanMapper(),
  })  : _location = location ?? const CheckInLocationSource(),
        _transport = transport,
        _mapper = mapper;

  static final QrAttendanceService instance = QrAttendanceService._();

  factory QrAttendanceService.forTest({
    CheckInLocationSource? location,
    AttendanceScanTransport? transport,
    AttendanceScanMapper mapper = const AttendanceScanMapper(),
  }) {
    return QrAttendanceService._(
      location: location,
      transport: transport,
      mapper: mapper,
    );
  }

  static const _uuid = Uuid();
  static const String _endpoint = '/Attendance/scan';

  final CheckInLocationSource _location;
  final AttendanceScanTransport? _transport;
  final AttendanceScanMapper _mapper;

  Future<AttendanceResult> submit(String qrToken) async {
    final token = qrToken.trim();
    if (token.isEmpty) {
      return const AttendanceInvalidQr(reason: 'Empty QR payload.');
    }

    final geo = await _location.resolve(requestIfDenied: true);
    if (geo is CheckInLocationFailed) {
      return locationIssueFrom(geo);
    }
    final position = (geo as CheckInLocationReady).position;

    final clientScanId = _uuid.v4();
    final body = {
      'qrToken': token,
      'latitude': position.latitude,
      'longitude': position.longitude,
      'clientScanId': clientScanId,
    };

    try {
      final data = await _post(body);
      return _mapper.fromSuccessBody(data, position);
    } on ApiException catch (e) {
      return _mapper.fromApiException(e, position);
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

  Future<Map<String, dynamic>> _post(Map<String, dynamic> body) async {
    final transport = _transport;
    if (transport != null) return transport(body);
    final res = await ApiClient.instance.post<Map<String, dynamic>>(
      _endpoint,
      body: body,
    );
    return res.data ?? const <String, dynamic>{};
  }

  /// Stub mode — exercise UI without the backend.
  Future<AttendanceResult> submitStub(String qrToken) async {
    await Future<void>.delayed(const Duration(milliseconds: 650));
    final tag = qrToken.toLowerCase();
    if (tag.contains('expired')) {
      return AttendanceMembershipExpired(
        endDate: DateTime.now().subtract(const Duration(days: 12)),
        message: 'Your membership expired. Renew at reception to check in.',
      );
    }
    if (tag.contains('already')) {
      return AttendanceAlreadyScanned(
        previousCheckIn: DateTime.now().subtract(const Duration(hours: 3)),
        detail: 'You already checked in today.',
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
}
