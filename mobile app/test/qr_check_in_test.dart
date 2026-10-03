import 'dart:async';

import 'package:flutter_test/flutter_test.dart';
import 'package:geolocator/geolocator.dart';
import 'package:pulsefit/core/api_exception.dart';
import 'package:pulsefit/features/scanner/attendance_scan_mapper.dart';
import 'package:pulsefit/features/scanner/check_in_codes.dart';
import 'package:pulsefit/features/scanner/check_in_location.dart';
import 'package:pulsefit/features/scanner/check_in_presentation.dart';
import 'package:pulsefit/features/scanner/check_in_scan_gate.dart';
import 'package:pulsefit/providers/ui_banner_provider.dart';
import 'package:pulsefit/services/qr_attendance_service.dart';

Position _pos() => Position(
      longitude: 77.209,
      latitude: 28.6139,
      timestamp: DateTime.utc(2026, 10, 4, 6, 30),
      accuracy: 4,
      altitude: 0,
      altitudeAccuracy: 0,
      heading: 0,
      headingAccuracy: 0,
      speed: 0,
      speedAccuracy: 0,
    );

CheckInLocationSource _readyLocation() => CheckInLocationSource(
      isServiceEnabled: () async => true,
      checkPermission: () async => LocationPermission.whileInUse,
      requestPermission: () async => LocationPermission.whileInUse,
      getCurrentPosition: () async => _pos(),
    );

void main() {
  const mapper = AttendanceScanMapper();

  CheckInFeedback feedback(AttendanceResult r) => CheckInFeedback.fromResult(r);

  test('scan gate blocks a second submit until reset', () {
    final gate = CheckInScanGate();
    expect(gate.begin(), isTrue);
    expect(gate.begin(), isFalse);
    gate.finishLocked();
    expect(gate.begin(), isFalse);
    gate.reset();
    expect(gate.begin(), isTrue);
  });

  test('in-flight gate plus service posts only once', () async {
    var posts = 0;
    final service = QrAttendanceService.forTest(
      location: _readyLocation(),
      transport: (body) async {
        posts++;
        await Future<void>.delayed(const Duration(milliseconds: 30));
        return {
          'success': true,
          'message': 'Checked in successfully.',
          'sessionStartTimeUtc': '2026-10-04T06:30:00Z',
        };
      },
    );
    final gate = CheckInScanGate();

    Future<AttendanceResult?> detect() async {
      if (!gate.begin()) return null;
      final result = await service.submit('gym-qr');
      gate.finishLocked();
      return result;
    }

    final results = await Future.wait([detect(), detect()]);
    expect(posts, 1);
    expect(results.whereType<AttendanceSuccess>(), hasLength(1));
    expect(results.where((r) => r == null), hasLength(1));
  });

  test('success path still produces celebratory feedback and home banner copy', () {
    final result = AttendanceSuccess(
      memberName: 'Member',
      checkInTime: DateTime.utc(2026, 10, 4, 6, 30),
      planName: 'Checked in successfully.',
    );
    final view = feedback(result);
    expect(view.celebratory, isTrue);
    expect(view.nextAction, CheckInNextAction.none);
    expect(view.title, contains('checked in'));
    final banner = CheckInBannerState(
      title: 'Checked in',
      subtitle: view.reason,
    );
    expect(banner.title, 'Checked in');
    expect(banner.subtitle, contains('Member'));
  });

  test('empty QR never posts', () async {
    var posts = 0;
    final service = QrAttendanceService.forTest(
      location: _readyLocation(),
      transport: (_) async {
        posts++;
        return {'success': true};
      },
    );
    final result = await service.submit('  ');
    expect(posts, 0);
    expect(result, isA<AttendanceInvalidQr>());
  });

  group('client location — no POST, never “too far”', () {
    test('permission denied', () async {
      var posts = 0;
      var requested = 0;
      final service = QrAttendanceService.forTest(
        location: CheckInLocationSource(
          isServiceEnabled: () async => true,
          checkPermission: () async => LocationPermission.denied,
          requestPermission: () async {
            requested++;
            return LocationPermission.denied;
          },
          getCurrentPosition: () async => _pos(),
        ),
        transport: (_) async {
          posts++;
          return {'success': true};
        },
      );
      final result = await service.submit('token');
      expect(posts, 0);
      expect(requested, 1);
      expect(result, isA<AttendanceLocationIssue>());
      final view = feedback(result);
      expect(view.code, CheckInErrorCodes.locationDenied);
      expect(view.reason.toLowerCase(), isNot(contains('too far')));
      expect(view.nextAction, CheckInNextAction.openAppSettings);
      expect(view.nextActionLabel, 'Open settings');
    });

    test('permission denied forever does not re-request', () async {
      var requested = 0;
      final source = CheckInLocationSource(
        isServiceEnabled: () async => true,
        checkPermission: () async => LocationPermission.deniedForever,
        requestPermission: () async {
          requested++;
          return LocationPermission.deniedForever;
        },
        getCurrentPosition: () async => _pos(),
      );
      final failed =
          await source.resolve(requestIfDenied: true) as CheckInLocationFailed;
      expect(requested, 0);
      expect(failed.code, CheckInErrorCodes.locationDeniedForever);
      final view = feedback(locationIssueFrom(failed));
      expect(view.nextAction, CheckInNextAction.openAppSettings);
    });

    test('GPS off', () async {
      var posts = 0;
      final service = QrAttendanceService.forTest(
        location: CheckInLocationSource(
          isServiceEnabled: () async => false,
          checkPermission: () async => LocationPermission.whileInUse,
          requestPermission: () async => LocationPermission.whileInUse,
          getCurrentPosition: () async => _pos(),
        ),
        transport: (_) async {
          posts++;
          return {'success': true};
        },
      );
      final result = await service.submit('token');
      expect(posts, 0);
      final view = feedback(result);
      expect(view.code, CheckInErrorCodes.gpsOff);
      expect(view.title.toLowerCase(), contains('gps'));
      expect(view.nextAction, CheckInNextAction.openLocationSettings);
      expect(view.reason.toLowerCase(), isNot(contains('too far')));
    });

    test('no GPS fix', () async {
      final service = QrAttendanceService.forTest(
        location: CheckInLocationSource(
          isServiceEnabled: () async => true,
          checkPermission: () async => LocationPermission.whileInUse,
          requestPermission: () async => LocationPermission.whileInUse,
          getCurrentPosition: () async =>
              throw TimeoutException('timed out', const Duration(seconds: 25)),
        ),
        transport: (_) async => {'success': true},
      );
      final result = await service.submit('token');
      final view = feedback(result);
      expect(view.code, CheckInErrorCodes.gpsNoFix);
      expect(view.nextAction, CheckInNextAction.retryScan);
      expect(view.reason.toLowerCase(), contains('not a distance'));
    });
  });

  test('camera denied maps to settings, not a second permission loop', () {
    final view = feedback(const AttendanceCameraIssue(permanentlyDenied: true));
    expect(view.code, CheckInErrorCodes.cameraDenied);
    expect(view.nextAction, CheckInNextAction.openAppSettings);
    expect(view.nextActionLabel, 'Open settings');
  });

  test('distance uses server radius copy, not missing GPS', () {
    final mapped = mapper.fromFailure(
      message: 'You must be within 100 meters of the branch to check in.',
      statusCode: 400,
      position: _pos(),
    );
    expect(mapped, isA<AttendanceTooFar>());
    final view = feedback(mapped);
    expect(view.title, 'Outside gym area');
    expect(view.reason, contains('100 meters'));
    expect(view.nextActionLabel, 'Move closer, then scan');
  });

  test('rate_limited waits; does not look like a connection drop', () {
    final mapped = mapper.fromFailure(
      message: 'Too many QR scans. Try again in a minute.',
      errorCode: CheckInErrorCodes.rateLimited,
      statusCode: 429,
      position: _pos(),
    );
    expect(mapped, isA<AttendanceRateLimited>());
    final view = feedback(mapped);
    expect(view.code, CheckInErrorCodes.rateLimited);
    expect(view.nextAction, CheckInNextAction.waitThenRetry);
    expect(view.title.toLowerCase(), isNot(contains('connection')));
  });

  test('replay / duplicate already recorded — Home, not a second scan CTA', () {
    final replay = mapper.fromFailure(
      message: 'This scan was already processed.',
      errorCode: CheckInErrorCodes.replay,
      statusCode: 409,
      position: _pos(),
    );
    final view = feedback(replay);
    expect(view.nextAction, CheckInNextAction.goHome);
    expect(view.title, 'Already recorded');

    final window = mapper.fromFailure(
      message: 'A QR check-in was already recorded in the last 5 minutes.',
      statusCode: 400,
      position: _pos(),
    );
    expect(window, isA<AttendanceAlreadyScanned>());
    expect(feedback(window).nextAction, CheckInNextAction.goHome);
  });

  test('membership_expired on 400 and 403 shows standing copy, not sign-out', () {
    for (final status in [400, 403]) {
      final mapped = mapper.fromFailure(
        message: 'Your membership expired on 01 Jan 2026. Renew at reception to check in.',
        errorCode: CheckInErrorCodes.membershipExpired,
        statusCode: status,
        position: _pos(),
      );
      expect(mapped, isA<AttendanceMembershipExpired>());
      final view = feedback(mapped);
      expect(view.code, CheckInErrorCodes.membershipExpired);
      expect(view.nextAction, CheckInNextAction.viewMembership);
      expect(view.nextActionLabel, 'View membership');
      expect(view.reason.toLowerCase(), isNot(contains('sign in')));
    }
  });

  test('frozen membership is no gym access, not pay-to-enter', () {
    final mapped = mapper.fromFailure(
      message:
          'Your membership is frozen. Contact reception to reactivate before checking in.',
      errorCode: CheckInErrorCodes.membershipExpired,
      statusCode: 400,
      position: _pos(),
    );
    final view = feedback(mapped);
    expect(view.title, 'No gym access');
    expect(view.nextAction, CheckInNextAction.viewMembership);
    expect(view.nextActionLabel, isNot('Pay outstanding'));
  });

  test('HTTP 403 without membership code is access denied, not logout copy', () {
    final mapped = mapper.fromApiException(
      const ApiException(
        'You can only open records on your own account.',
        statusCode: 403,
        data: {'message': 'You can only open records on your own account.'},
      ),
      _pos(),
    );
    expect(mapped, isA<AttendanceAccessDenied>());
    final view = feedback(mapped);
    expect(view.nextAction, CheckInNextAction.goHome);
    expect(view.reason.toLowerCase(), isNot(contains('sign in')));
  });

  test('HTTP 401 stays a session issue', () {
    final mapped = mapper.fromApiException(
      const ApiException('Session expired. Sign in again.', statusCode: 401),
      _pos(),
    );
    expect(mapped, isA<AttendanceSessionIssue>());
    expect(feedback(mapped).nextAction, CheckInNextAction.close);
  });
}
