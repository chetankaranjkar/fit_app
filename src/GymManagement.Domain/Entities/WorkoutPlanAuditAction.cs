namespace GymManagement.Domain.Entities;

public enum WorkoutPlanAuditAction
{
    Created = 0,
    Updated = 1,
    ExerciseAdded = 2,
    ExerciseUpdated = 3,
    ExerciseRemoved = 4,
    Deleted = 5,
}
