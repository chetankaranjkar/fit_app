namespace GymManagement.Domain.Entities
{
    public class WorkoutPlan : BaseEntity
    {
        public string Name { get; set; } = string.Empty;
        public string? Description { get; set; }
        public WorkoutType WorkoutType { get; set; }
        public int Duration { get; set; } // in minutes
        public string DifficultyLevel { get; set; } = "Beginner"; // Beginner, Intermediate, Advanced
        public int? TrainerId { get; set; }
        public bool IsActive { get; set; } = true;
        public int? CreatedById { get; set; }
        public CreatorType? CreatorType { get; set; }
        public bool IsPublic { get; set; } = false;
        public int? OrganizationId { get; set; }

        /// <summary>Program goal label (e.g. Muscle Gain, Fat Loss).</summary>
        public string? Goal { get; set; }
        /// <summary>Total programmed length in days (e.g. 30, 60, 90, 120).</summary>
        public int DurationDays { get; set; } = 30;
        /// <summary>Target training days per week (3–6).</summary>
        public int WorkoutsPerWeek { get; set; } = 3;
        public string? Thumbnail { get; set; }
        public int? EstimatedCaloriesBurn { get; set; }
        /// <summary>JSON array of tag strings.</summary>
        public string? Tags { get; set; }
        /// <summary>Draft | Active | Archived</summary>
        public string Status { get; set; } = "Active";

        /// <summary><see cref="WorkoutPlanTypes.Program"/> or <see cref="WorkoutPlanTypes.Personal"/>.</summary>
        public string PlanType { get; set; } = WorkoutPlanTypes.Program;

        /// <summary>Owner member for personal plans only.</summary>
        public int? AssignedToUserId { get; set; }

        public int? WorkoutCategoryId { get; set; }
        public bool UseDefaultWarmups { get; set; } = true;
        public bool UseDefaultStretches { get; set; } = true;

        public User? AssignedToUser { get; set; }
        public WorkoutCategory? WorkoutCategory { get; set; }

        // Navigation properties
        public Trainer? Trainer { get; set; }
        public Organization? Organization { get; set; }
        public ICollection<WorkoutPlanWeek> Weeks { get; set; } = new List<WorkoutPlanWeek>();
        public ICollection<WorkoutPlanDay> WorkoutPlanDays { get; set; } = new List<WorkoutPlanDay>();
        public ICollection<WorkoutPlanExercise> WorkoutPlanExercises { get; set; } = new List<WorkoutPlanExercise>();
        public ICollection<WorkoutPlanWarmup> WorkoutPlanWarmups { get; set; } = new List<WorkoutPlanWarmup>();
        public ICollection<WorkoutPlanStretch> WorkoutPlanStretches { get; set; } = new List<WorkoutPlanStretch>();
        public ICollection<UserSchedule> UserSchedules { get; set; } = new List<UserSchedule>();
    }
}
