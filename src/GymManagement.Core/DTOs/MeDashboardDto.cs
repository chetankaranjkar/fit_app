using System;
using System.Collections.Generic;

namespace GymManagement.Core.DTOs
{
    /// <summary>Aggregate dashboard payload for the logged-in member's mobile app.</summary>
    public class MeDashboardDto
    {
        public MeProfileDto Profile { get; set; } = new();
        public MeMembershipDto? Membership { get; set; }
        public MeAttendanceSummaryDto Attendance { get; set; } = new();
        public MeBodyMetricSummaryDto? LatestBodyMetric { get; set; }
        public IReadOnlyList<MeUpcomingScheduleDto> UpcomingSchedule { get; set; } = Array.Empty<MeUpcomingScheduleDto>();
        public IReadOnlyList<MeNotificationDto> RecentNotifications { get; set; } = Array.Empty<MeNotificationDto>();
    }

    public class MeProfileDto
    {
        public int UserId { get; set; }
        public string FirstName { get; set; } = string.Empty;
        public string LastName { get; set; } = string.Empty;
        public string FullName { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public string? Phone { get; set; }
        public string? Gender { get; set; }
        public DateTime? DateOfBirth { get; set; }
        public string? ProfilePictureUrl { get; set; }
        public DateTime RegistrationDate { get; set; }
        public string? PreferredGymTime { get; set; }
    }

    public class MeMembershipDto
    {
        public int Id { get; set; }
        public int PlanId { get; set; }
        public string PlanName { get; set; } = string.Empty;
        public DateTime StartDate { get; set; }
        public DateTime EndDate { get; set; }
        public string Status { get; set; } = string.Empty;
        public int DaysRemaining { get; set; }
        public bool IsExpiringSoon { get; set; }
        public decimal? Price { get; set; }
        public int? DurationDays { get; set; }
    }

    public class MeAttendanceSummaryDto
    {
        public int TotalThisMonth { get; set; }
        public int TotalThisWeek { get; set; }
        public int CurrentStreakDays { get; set; }
        public DateTime? LastVisitUtc { get; set; }
        public IReadOnlyList<MeAttendanceDayDto> Last30Days { get; set; } = Array.Empty<MeAttendanceDayDto>();
    }

    public class MeAttendanceDayDto
    {
        public DateTime Date { get; set; }
        public bool Visited { get; set; }
    }

    public class MeBodyMetricSummaryDto
    {
        public DateTime LoggedAt { get; set; }
        public decimal? Weight { get; set; }
        public decimal? Height { get; set; }
        public decimal? BodyFatPercent { get; set; }
        public decimal? MuscleMass { get; set; }
        public decimal? Bmi { get; set; }
    }

    public class MeUpcomingScheduleDto
    {
        public int Id { get; set; }
        public string Title { get; set; } = string.Empty;
        public string? DayOfWeek { get; set; }
        public string? StartTime { get; set; }
        public string? EndTime { get; set; }
        public string? TrainerName { get; set; }
    }

    public class MeNotificationDto
    {
        public int Id { get; set; }
        public string Title { get; set; } = string.Empty;
        public string Message { get; set; } = string.Empty;
        public DateTime CreatedAt { get; set; }
        public bool IsRead { get; set; }
        public string? Type { get; set; }
    }

    public class MeWorkoutPlanSummaryDto
    {
        public int Id { get; set; }
        public string PlanName { get; set; } = string.Empty;
        public string WorkoutType { get; set; } = string.Empty;
        public string? DifficultyLevel { get; set; }
        public int? DurationMinutes { get; set; }
        public string? Description { get; set; }
        public int ExerciseCount { get; set; }
    }

    public class MeBodyMetricLogDto
    {
        public int Id { get; set; }
        public DateTime LoggedAt { get; set; }
        public decimal? Weight { get; set; }
        public decimal? Height { get; set; }
        public decimal? BodyFatPercent { get; set; }
        public decimal? MuscleMass { get; set; }
        public decimal? Bmi { get; set; }
        public string? Notes { get; set; }
    }

    /// <summary>Template for logging a workout: plan summary + each exercise with prescription and last performance.</summary>
    public sealed class MeWorkoutSessionTemplateDto
    {
        public MeWorkoutPlanSummaryDto Plan { get; set; } = new();
        public IReadOnlyList<MeWorkoutExerciseLineDto> Exercises { get; set; } = Array.Empty<MeWorkoutExerciseLineDto>();

        /// <summary>
        /// True when exercises were limited to today's <see cref="GymManagement.Domain.Entities.WorkoutPlanDay"/>
        /// (ISO weekday Mon=1…Sun=7 aligned with <c>DayNumber</c>).
        /// </summary>
        public bool FilteredToToday { get; set; }

        /// <summary>True when today's plan day is a programmed rest day (no lifts).</summary>
        public bool IsRestDay { get; set; }

        /// <summary>Display name of the matched plan day (e.g. Push), when <see cref="FilteredToToday"/> applies.</summary>
        public string? TodayDayName { get; set; }

        /// <summary>No weekly <c>UserSchedule</c> for this plan, or one exists for the user's local weekday.</summary>
        public bool IsScheduledToday { get; set; } = true;
    }

    public sealed class MeWorkoutExerciseLineDto
    {
        public int PlanExerciseId { get; set; }
        public int ExerciseId { get; set; }
        public string ExerciseName { get; set; } = string.Empty;
        public string? BodyPartName { get; set; }
        public int Order { get; set; }
        public int TargetSets { get; set; }
        public int TargetReps { get; set; }
        public int RestSeconds { get; set; }
        public decimal? SuggestedWeight { get; set; }
        public DateTime? LastSessionDateUtc { get; set; }
        public decimal? LastWeightUsed { get; set; }
        public int? LastRepsDone { get; set; }
    }

    public sealed class MeCompleteWorkoutSessionDto
    {
        public int WorkoutPlanId { get; set; }
        public int? DurationMinutes { get; set; }
        public IReadOnlyList<MeWorkoutSetEntryDto> Sets { get; set; } = Array.Empty<MeWorkoutSetEntryDto>();
    }

    public sealed class MeWorkoutSetEntryDto
    {
        public int ExerciseId { get; set; }
        public int SetNumber { get; set; }
        public int RepsDone { get; set; }
        public decimal? WeightUsed { get; set; }
    }

    public sealed class MeWorkoutSessionCompletedDto
    {
        public int SessionId { get; set; }
        public int SetsLogged { get; set; }
    }

    /// <summary>Member's currently active assigned diet plan.</summary>
    public sealed class MeDietPlanDto
    {
        public int AssignmentId { get; set; }
        public int DietPlanId { get; set; }
        public string PlanName { get; set; } = string.Empty;
        public string GoalType { get; set; } = string.Empty;
        public int Calories { get; set; }
        public int? ProteinGrams { get; set; }
        public int? CarbsGrams { get; set; }
        public int? FatsGrams { get; set; }
        public string? Description { get; set; }
        public DateTime StartDate { get; set; }
        public DateTime? EndDate { get; set; }
        public IReadOnlyList<MeDietMealDto> Meals { get; set; } = Array.Empty<MeDietMealDto>();
    }

    public sealed class MeDietMealDto
    {
        public int Id { get; set; }
        public string MealName { get; set; } = string.Empty;
        public int MealOrder { get; set; }
        public IReadOnlyList<MeDietMealItemDto> Items { get; set; } = Array.Empty<MeDietMealItemDto>();
    }

    public sealed class MeDietMealItemDto
    {
        public int Id { get; set; }
        public string FoodName { get; set; } = string.Empty;
        public string Quantity { get; set; } = string.Empty;
        public int? Calories { get; set; }
        public decimal? ProteinGrams { get; set; }
        public decimal? CarbsGrams { get; set; }
        public decimal? FatsGrams { get; set; }
    }
}
