import 'package:flutter_test/flutter_test.dart';
import 'package:pulsefit/features/diet/water/water_calendar.dart';
import 'package:pulsefit/features/diet/water/water_intake_service.dart';
import 'package:pulsefit/features/diet/water/water_intake_store.dart';
import 'package:shared_preferences/shared_preferences.dart';

void main() {
  group('WaterCalendar', () {
    test('uses device local calendar date, not the UTC date field', () {
      final evening = DateTime(2026, 10, 3, 23, 59, 59);
      final afterMidnight = DateTime(2026, 10, 4, 0, 0, 0);
      expect(WaterCalendar.localDateKey(evening), '2026-10-03');
      expect(WaterCalendar.localDateKey(afterMidnight), '2026-10-04');
    });

    test('UTC instants are converted to local before bucketing', () {
      final utc = DateTime.utc(2026, 10, 3, 18, 31);
      expect(WaterCalendar.localDateKey(utc), WaterCalendar.localDateKey(utc.toLocal()));
    });
  });

  group('WaterIntakeService', () {
    late MemoryWaterIntakeStore store;
    late DateTime now;
    late WaterIntakeService service;

    setUp(() {
      store = MemoryWaterIntakeStore();
      now = DateTime(2026, 10, 3, 15, 0);
      service = WaterIntakeService(store: store, clock: () => now);
    });

    test('add accumulates recorded ml without changing goal', () async {
      await service.add(11, 250);
      final day = await service.add(11, 500);
      expect(day.totalMl, 750);
      expect(day.entries.map((e) => e.milliliters).toList(), [250, 500]);
      expect(day.localDate, '2026-10-03');
      expect(day.memberUserId, 11);
    });

    test('undo removes the last add only', () async {
      await service.add(11, 250);
      await service.add(11, 500);
      final undone = await service.undoLast(11);
      expect(undone.totalMl, 250);
      expect(undone.entries.single.milliliters, 250);
      final empty = await service.undoLast(11);
      expect(empty.totalMl, 0);
      expect(empty.entries, isEmpty);
      final stillEmpty = await service.undoLast(11);
      expect(stillEmpty.totalMl, 0);
    });

    test('midnight rollover starts recorded at 0 and keeps the previous day', () async {
      await service.add(11, 750);
      now = DateTime(2026, 10, 4, 0, 0, 1);
      final today = await service.loadToday(11);
      expect(today.localDate, '2026-10-04');
      expect(today.totalMl, 0);
      expect(today.entries, isEmpty);

      final yesterday = await service.loadForDay(11, '2026-10-03');
      expect(yesterday.totalMl, 750);
      expect(yesterday.entries.length, 1);
    });

    test('restart reloads from the same persistence', () async {
      await service.add(11, 250);
      await service.add(11, 250);
      final restarted = WaterIntakeService(store: store, clock: () => now);
      final loaded = await restarted.loadToday(11);
      expect(loaded.totalMl, 500);
      expect(loaded.entries.length, 2);
    });

    test('member A and member B records are isolated', () async {
      await service.add(11, 500);
      await service.add(22, 250);
      final a = await service.loadToday(11);
      final b = await service.loadToday(22);
      expect(a.totalMl, 500);
      expect(b.totalMl, 250);
      expect(a.memberUserId, 11);
      expect(b.memberUserId, 22);

      await service.undoLast(22);
      expect((await service.loadToday(11)).totalMl, 500);
      expect((await service.loadToday(22)).totalMl, 0);
    });

    test('unsigned member does not read or write another account', () async {
      await service.add(11, 400);
      final none = await service.add(0, 250);
      expect(none.totalMl, 0);
      expect((await service.loadToday(11)).totalMl, 400);
    });
  });

  group('SharedPreferencesWaterIntakeStore', () {
    test('survives a new service instance (app restart)', () async {
      SharedPreferences.setMockInitialValues({});
      final store = SharedPreferencesWaterIntakeStore();
      var now = DateTime(2026, 10, 3, 10);
      final first = WaterIntakeService(store: store, clock: () => now);
      await first.add(7, 750);

      final second = WaterIntakeService(store: store, clock: () => now);
      expect((await second.loadToday(7)).totalMl, 750);
      expect((await second.loadToday(8)).totalMl, 0);
    });
  });
}
