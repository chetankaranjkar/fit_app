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
        IRepository<WorkoutPlanExercise> WorkoutPlanExercises { get; }
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
        IRepository<Payment> Payments { get; }
        IRepository<Invoice> Invoices { get; }
        IRepository<InvoiceItem> InvoiceItems { get; }
        IRepository<AppRole> AppRoles { get; }
        IRepository<Permission> Permissions { get; }
        IRepository<RolePermission> RolePermissions { get; }
        IRepository<UserType> UserTypes { get; }
        IRepository<UserUserType> UserUserTypes { get; }
        IRepository<UserRole> UserRoles { get; }
        IRepository<DietPlan> DietPlans { get; }
        IRepository<GymQrCode> GymQrCodes { get; }

        Task<int> SaveChangesAsync();
        Task BeginTransactionAsync();
        Task CommitTransactionAsync();
        Task RollbackTransactionAsync();
    }
}

