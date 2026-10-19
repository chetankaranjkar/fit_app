/// Minutes from the first logged set to the last.
/// Opening the workout, or looking at it after it is saved, does not extend this.
int? trainingDurationMinutes(Iterable<DateTime?> completedAt) {
  final stamps = <DateTime>[
    for (final at in completedAt)
      if (at != null) at.toUtc(),
  ]..sort();
  if (stamps.isEmpty) return null;
  final mins = stamps.last.difference(stamps.first).inMinutes;
  return mins < 1 ? 1 : mins;
}
