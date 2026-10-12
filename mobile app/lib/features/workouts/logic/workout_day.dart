/// Calendar day for a stored workout timestamp.
///
/// A UTC midnight value is a stored calendar date and is not shifted into the
/// previous local evening. Any other instant uses the device's local calendar day.
class WorkoutDay {
  WorkoutDay._();

  static DateTime calendarDay(DateTime value) {
    final isUtcMidnight = value.isUtc &&
        value.hour == 0 &&
        value.minute == 0 &&
        value.second == 0 &&
        value.millisecond == 0 &&
        value.microsecond == 0;
    if (isUtcMidnight) {
      return DateTime(value.year, value.month, value.day);
    }
    final local = value.toLocal();
    return DateTime(local.year, local.month, local.day);
  }

  static bool sameLocalDay(DateTime stored, DateTime now) {
    final left = calendarDay(stored);
    final right = DateTime(now.year, now.month, now.day);
    return left == right;
  }
}
