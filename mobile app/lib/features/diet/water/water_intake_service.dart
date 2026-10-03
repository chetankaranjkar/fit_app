import 'water_calendar.dart';
import 'water_intake_models.dart';
import 'water_intake_store.dart';

typedef WaterClock = DateTime Function();

/// Durable daily water intake keyed by member [Users.Id] + local calendar date.
class WaterIntakeService {
  WaterIntakeService({
    required WaterIntakeStore store,
    WaterClock? clock,
  })  : _store = store,
        _clock = clock ?? DateTime.now;

  final WaterIntakeStore _store;
  final WaterClock _clock;

  Future<WaterDayRecord> loadToday(int memberUserId, {DateTime? now}) async {
    return loadForDay(memberUserId, WaterCalendar.localDateKey(now ?? _clock()));
  }

  Future<WaterDayRecord> loadForDay(int memberUserId, String localDate) async {
    if (memberUserId <= 0) {
      return WaterDayRecord.empty(0, localDate);
    }
    final existing = await _store.load(memberUserId: memberUserId, localDate: localDate);
    if (existing == null) {
      return WaterDayRecord.empty(memberUserId, localDate);
    }
    return existing;
  }

  /// Append an add. Previous days are untouched (rollover starts at 0 recorded).
  Future<WaterDayRecord> add(int memberUserId, int milliliters, {DateTime? now}) async {
    final at = now ?? _clock();
    final date = WaterCalendar.localDateKey(at);
    if (memberUserId <= 0 || milliliters <= 0) {
      return loadForDay(memberUserId, date);
    }
    final day = await loadForDay(memberUserId, date);
    final next = day.copyWith(
      entries: [
        ...day.entries,
        WaterIntakeEntry(
          id: '${at.microsecondsSinceEpoch}-$milliliters',
          milliliters: milliliters,
          recordedAt: at,
        ),
      ],
    );
    await _store.save(next);
    return next;
  }

  /// Removes the last add for that local day only.
  Future<WaterDayRecord> undoLast(int memberUserId, {DateTime? now}) async {
    final date = WaterCalendar.localDateKey(now ?? _clock());
    if (memberUserId <= 0) {
      return WaterDayRecord.empty(0, date);
    }
    final day = await loadForDay(memberUserId, date);
    if (day.entries.isEmpty) return day;
    final next = day.copyWith(entries: day.entries.sublist(0, day.entries.length - 1));
    await _store.save(next);
    return next;
  }
}
