import 'package:flutter_test/flutter_test.dart';
import 'package:pulsefit/features/workouts/logic/session_duration.dart';

void main() {
  test('saved workout duration is the span of logged sets', () {
    final first = DateTime.utc(2026, 10, 19, 6, 4);
    final last = first.add(const Duration(minutes: 68));

    expect(trainingDurationMinutes(const [null]), isNull);
    expect(trainingDurationMinutes([first]), 1);
    expect(trainingDurationMinutes([last, null, first]), 68);
  });
}
