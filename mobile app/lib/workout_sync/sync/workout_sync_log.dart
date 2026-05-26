import 'dart:developer' as developer;

/// Lightweight diagnostics for recovery and sync (visible in debug console).
abstract final class WorkoutSyncLog {
  static const _name = 'PulseFit.WorkoutSync';

  static void info(String message, [Object? detail]) {
    developer.log(message, name: _name, error: detail);
  }

  static void warn(String message, [Object? detail]) {
    developer.log(message, name: _name, level: 900, error: detail);
  }

  static void error(String message, [Object? err, StackTrace? stack]) {
    developer.log(message, name: _name, level: 1000, error: err, stackTrace: stack);
  }
}
