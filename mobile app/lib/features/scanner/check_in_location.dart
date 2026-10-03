import 'dart:async';

import 'package:geolocator/geolocator.dart';

import 'check_in_codes.dart';

enum LocationIssueKind {
  permissionDenied,
  permissionDeniedForever,
  gpsOff,
  noFix,
}

class CheckInLocationReady {
  const CheckInLocationReady(this.position);
  final Position position;
}

class CheckInLocationFailed {
  const CheckInLocationFailed({
    required this.kind,
    required this.code,
    required this.message,
  });

  final LocationIssueKind kind;
  final String code;
  final String message;
}

/// GPS / permission preflight before check-in. Does not treat a missing
/// fix as “too far from the gym”.
class CheckInLocationSource {
  const CheckInLocationSource({
    this.isServiceEnabled,
    this.checkPermission,
    this.requestPermission,
    this.getCurrentPosition,
  });

  final Future<bool> Function()? isServiceEnabled;
  final Future<LocationPermission> Function()? checkPermission;
  final Future<LocationPermission> Function()? requestPermission;
  final Future<Position> Function()? getCurrentPosition;

  Future<bool> _enabled() =>
      (isServiceEnabled ?? Geolocator.isLocationServiceEnabled)();

  Future<LocationPermission> _check() =>
      (checkPermission ?? Geolocator.checkPermission)();

  Future<LocationPermission> _request() =>
      (requestPermission ?? Geolocator.requestPermission)();

  Future<Position> _position() {
    final custom = getCurrentPosition;
    if (custom != null) return custom();
    return Geolocator.getCurrentPosition(
      locationSettings: const LocationSettings(
        accuracy: LocationAccuracy.high,
        timeLimit: Duration(seconds: 25),
      ),
    );
  }

  /// [requestIfDenied] is true on an explicit scan/retry. Preview and
  /// permanently-denied paths must not loop the system dialog.
  Future<Object> resolve({required bool requestIfDenied}) async {
    try {
      if (!await _enabled()) {
        return const CheckInLocationFailed(
          kind: LocationIssueKind.gpsOff,
          code: CheckInErrorCodes.gpsOff,
          message:
              'GPS is turned off. Turn on Location / GPS, then try check-in again.',
        );
      }

      var permission = await _check();
      if (permission == LocationPermission.denied && requestIfDenied) {
        permission = await _request();
      }

      if (permission == LocationPermission.deniedForever) {
        return const CheckInLocationFailed(
          kind: LocationIssueKind.permissionDeniedForever,
          code: CheckInErrorCodes.locationDeniedForever,
          message:
              'Location is blocked for this app. Open Settings, allow Location while using the app, then return here.',
        );
      }

      if (permission == LocationPermission.denied ||
          permission == LocationPermission.unableToDetermine) {
        return const CheckInLocationFailed(
          kind: LocationIssueKind.permissionDenied,
          code: CheckInErrorCodes.locationDenied,
          message:
              'Location permission is required so the gym can confirm you are at the venue.',
        );
      }

      final position = await _position();
      return CheckInLocationReady(position);
    } on TimeoutException {
      return const CheckInLocationFailed(
        kind: LocationIssueKind.noFix,
        code: CheckInErrorCodes.gpsNoFix,
        message:
            'Could not get a GPS fix. Move to a clearer view of the sky and try again. This is not a distance check.',
      );
    } on LocationServiceDisabledException {
      return const CheckInLocationFailed(
        kind: LocationIssueKind.gpsOff,
        code: CheckInErrorCodes.gpsOff,
        message:
            'GPS is turned off. Turn on Location / GPS, then try check-in again.',
      );
    } catch (_) {
      return const CheckInLocationFailed(
        kind: LocationIssueKind.noFix,
        code: CheckInErrorCodes.gpsNoFix,
        message:
            'Could not read your location. Enable GPS and wait for a fix — you are not being marked as too far yet.',
      );
    }
  }
}
