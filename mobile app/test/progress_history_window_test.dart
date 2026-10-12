import 'package:flutter_test/flutter_test.dart';
import 'package:pulsefit/features/progress/progress_insights.dart';

void main() {
  final now = DateTime(2026, 10, 12, 12);

  test('30, 90, and all windows use the requested start', () {
    expect(ProgressInsights.rangeStart(ProgressDateRange.days30, now), DateTime(2026, 9, 12, 12));
    expect(ProgressInsights.rangeStart(ProgressDateRange.days90, now), DateTime(2026, 7, 14, 12));
    expect(ProgressInsights.rangeStart(ProgressDateRange.all, now), isNull);
  });

  test('a truncated page is not described as complete history', () {
    final caption = ProgressInsights.historyScopeCaption(
      returned: 40,
      totalMatching: 80,
      truncated: true,
    );
    expect(caption, contains('40 of 80'));
    expect(caption, contains('only the workouts loaded'));
  });

  test('a complete page states the full matching count', () {
    expect(
      ProgressInsights.historyScopeCaption(returned: 3, totalMatching: 3, truncated: false),
      '3 recorded workouts',
    );
  });
}
