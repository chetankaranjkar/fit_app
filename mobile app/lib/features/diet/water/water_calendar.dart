/// Date bucket for daily water logs.
///
/// **Rule:** days are the **device local calendar date**, not UTC.
/// `DateTime.now()` (unspecified/local) at 23:59 and 00:01 after midnight
/// belong to different [localDateKey] values even if they share a UTC hour.
///
/// Attendance on the API uses UTC dates + `utcOffsetMinutes`; water stays
/// on-device and follows the member's phone date so midnight rollover matches
/// what they see on the lock screen.
abstract final class WaterCalendar {
  static String localDateKey(DateTime localNow) {
    final local = localNow.isUtc ? localNow.toLocal() : localNow;
    final y = local.year.toString().padLeft(4, '0');
    final m = local.month.toString().padLeft(2, '0');
    final d = local.day.toString().padLeft(2, '0');
    return '$y-$m-$d';
  }
}
