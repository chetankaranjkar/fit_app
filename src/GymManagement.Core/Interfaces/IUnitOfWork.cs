using GymManagement.Domain.Entities;

namespace GymManagement.Core.Interfaces
{
    public interface IUnitOfWork : IDisposable
    {
        IRepository<User> Users { get; }
        IRepository<UserDetail> UserDetails { get; }
        IRepository<Trainer> Trainers { get; }
        IRepository<AuthUser> AuthUsers { get; }
        IRepository<LoginActivity> LoginActivities { get; }
        IRepository<BodyPart> BodyParts { get; }
        IRepository<BodyPartMuscle> BodyPartMuscles { get; }
        IRepository<Exercise> Exercises { get; }
        IRepository<ExerciseStep> ExerciseSteps { get; }
        IRepository<WorkoutPlan> WorkoutPlans { get; }
        IRepository<WorkoutPlanWeek> WorkoutPlanWeeks { get; }
        IRepository<WorkoutPlanDay> WorkoutPlanDays { get; }
        IRepository<WorkoutPlanExercise> WorkoutPlanExercises { get; }
        IRepository<Warmup> Warmups { get; }
        IRepository<Stretch> Stretches { get; }
        IRepository<WorkoutPlanWarmup> WorkoutPlanWarmups { get; }
        IRepository<WorkoutPlanStretch> WorkoutPlanStretches { get; }
        IRepository<WorkoutCategory> WorkoutCategories { get; }
        IRepository<WorkoutCategoryWarmup> WorkoutCategoryWarmups { get; }
        IRepository<WorkoutCategoryStretch> WorkoutCategoryStretches { get; }
        IRepository<UserSchedule> UserSchedules { get; }
        IRepository<WorkoutSession> WorkoutSessions { get; }
        IRepository<UserInstructor> UserInstructors { get; }
        IRepository<TrainerFeedback> TrainerFeedbacks { get; }
        IRepository<TrainerSpecialization> TrainerSpecializations { get; }
        IRepository<TrainerCertification> TrainerCertifications { get; }
        IRepository<BodyMetricsLog> BodyMetricsLogs { get; }
        IRepository<AttendanceLog> AttendanceLogs { get; }
        IRepository<UserBodyImage> UserBodyImages { get; }
        IRepository<MembershipPlan> MembershipPlans { get; }
        IRepository<UserMembership> UserMemberships { get; }
        IRepository<MembershipPayment> MembershipPayments { get; }
        IRepository<MembershipPaymentTransaction> MembershipPaymentTransactions { get; }
        IRepository<Payment> Payments { get; }
        IRepository<Invoice> Invoices { get; }
        IRepository<InvoiceItem> InvoiceItems { get; }
        IRepository<AppRole> AppRoles { get; }
        IRepository<Permission> Permissions { get; }
        IRepository<RolePermission> RolePermissions { get; }
        IRepository<UserType> UserTypes { get; }
        IRepository<UserUserType> UserUserTypes { get; }
        IRepository<UserRole> UserRoles { get; }
        IRepository<Member> Members { get; }
        IRepository<Staff> Staff { get; }
        IRepository<DietPlan> DietPlans { get; }
        IRepository<GymQrCode> GymQrCodes { get; }
        IRepository<GymLead> GymLeads { get; }
        IRepository<LeadFollowup> LeadFollowups { get; }
        IRepository<LeadTrial> LeadTrials { get; }

        Task<int> SaveChangesAsync();

        /// <summary>
        /// Sets a user's type assignments to match <paramref name="userTypeIds"/> (active rows only).
        /// Revives soft-deleted junction rows when re-assigning the same pair (unfiltered unique index).
        /// </summary>
        Task SyncUserUserTypesAsync(int userId, IReadOnlyCollection<int> userTypeIds);

        /// <summary>
        /// Sets role permission assignments to match <paramref name="permissionIds"/> (active rows only).
        /// Revives soft-deleted junction rows when re-assigning the same pair (unique index on RoleId + PermissionId).
        /// </summary>
        Task SyncRolePermissionsAsync(int roleId, IReadOnlyCollection<int> permissionIds);

        /// <summary>
        /// Ensures an active <see cref="UserRole"/> row exists (revives soft-deleted row if present).
        /// </summary>
        Task EnsureUserRoleAsync(int userId, int roleId);

        Task BeginTransactionAsync();
        Task CommitTransactionAsync();
        Task RollbackTransactionAsync();
    }
}

