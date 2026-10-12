namespace GymManagement.Core.Workouts;

public readonly record struct PerformedSet(decimal? Weight, int? Reps);

/// <summary>
/// Volume is actual weight × actual reps on completed sets only.
/// When a tracked session has set rows, legacy <c>WorkoutLogs</c> copies are ignored
/// so the same work is not counted twice.
/// </summary>
public readonly record struct RecordedWork(int CompletedSets, int TotalSets, decimal? Volume, bool VolumeComplete)
{
    public static RecordedWork FromSources(
        bool hasTrackedRows,
        int trackedTotal,
        IReadOnlyList<PerformedSet> trackedCompleted,
        IReadOnlyList<PerformedSet> legacyLogs)
    {
        if (hasTrackedRows)
            return Score(trackedTotal, trackedCompleted);
        return Score(legacyLogs.Count, legacyLogs);
    }

    public static RecordedWork Score(int totalSets, IReadOnlyList<PerformedSet> completed)
    {
        decimal sum = 0;
        var missing = false;
        var anyKnown = false;
        foreach (var set in completed)
        {
            if (set.Weight is null || set.Reps is null)
            {
                missing = true;
                continue;
            }

            anyKnown = true;
            sum += set.Weight.Value * set.Reps.Value;
        }

        var volume = anyKnown ? sum : (decimal?)null;
        var complete = completed.Count == 0 || !missing;
        return new RecordedWork(completed.Count, totalSets, volume, complete);
    }
}
