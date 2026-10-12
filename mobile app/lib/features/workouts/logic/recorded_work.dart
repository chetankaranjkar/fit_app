class PerformedSet {
  const PerformedSet({this.weight, this.reps});
  final double? weight;
  final int? reps;
}

class RecordedWork {
  const RecordedWork({
    required this.completedSets,
    required this.totalSets,
    required this.volume,
    required this.volumeComplete,
  });

  final int completedSets;
  final int totalSets;
  final double? volume;
  final bool volumeComplete;

  static RecordedWork fromSources({
    required bool hasTrackedRows,
    required int trackedTotal,
    required List<PerformedSet> trackedCompleted,
    required List<PerformedSet> legacyLogs,
  }) {
    if (hasTrackedRows) return score(trackedTotal, trackedCompleted);
    return score(legacyLogs.length, legacyLogs);
  }

  static RecordedWork score(int totalSets, List<PerformedSet> completed) {
    var sum = 0.0;
    var missing = false;
    var anyKnown = false;
    for (final set in completed) {
      if (set.weight == null || set.reps == null) {
        missing = true;
        continue;
      }
      anyKnown = true;
      sum += set.weight! * set.reps!;
    }
    return RecordedWork(
      completedSets: completed.length,
      totalSets: totalSets,
      volume: anyKnown ? sum : null,
      volumeComplete: completed.isEmpty || !missing,
    );
  }
}

String recordedVolumeLabel({double? volume, required bool volumeComplete}) {
  if (volume == null) return 'Volume not recorded';
  final text = volume == volume.roundToDouble() ? volume.toStringAsFixed(0) : volume.toStringAsFixed(1);
  if (!volumeComplete) return '$text kg · some sets missing weight or reps';
  return '$text kg';
}
