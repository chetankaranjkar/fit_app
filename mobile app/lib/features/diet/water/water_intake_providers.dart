import 'dart:async';

import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../providers/auth_providers.dart';
import 'water_calendar.dart';
import 'water_intake_models.dart';
import 'water_intake_service.dart';
import 'water_intake_store.dart';

final waterIntakeStoreProvider = Provider<WaterIntakeStore>((ref) {
  return SharedPreferencesWaterIntakeStore();
});

final waterIntakeServiceProvider = Provider<WaterIntakeService>((ref) {
  return WaterIntakeService(store: ref.watch(waterIntakeStoreProvider));
});

/// Reloads when the login account changes so member B never sees member A's ml.
final waterTodayControllerProvider =
    StateNotifierProvider.autoDispose<WaterTodayController, WaterDayRecord>((ref) {
  final userId = ref.watch(authControllerProvider).session?.userId ?? 0;
  return WaterTodayController(
    service: ref.read(waterIntakeServiceProvider),
    memberUserId: userId,
  );
});

class WaterTodayController extends StateNotifier<WaterDayRecord> {
  WaterTodayController({
    required WaterIntakeService service,
    required this.memberUserId,
    WaterClock? clock,
  })  : _service = service,
        _clock = clock ?? DateTime.now,
        super(WaterDayRecord.empty(memberUserId, WaterCalendar.localDateKey((clock ?? DateTime.now)()))) {
    unawaited(reload());
  }

  final WaterIntakeService _service;
  final int memberUserId;
  final WaterClock _clock;

  Future<void> reload() async {
    state = await _service.loadToday(memberUserId, now: _clock());
  }

  Future<void> add(int milliliters) async {
    state = await _service.add(memberUserId, milliliters, now: _clock());
  }

  Future<void> undoLast() async {
    state = await _service.undoLast(memberUserId, now: _clock());
  }
}
