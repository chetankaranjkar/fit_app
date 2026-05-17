using Microsoft.EntityFrameworkCore;
using GymManagement.Domain.Entities;
using GymManagement.Domain.Entities.GymOps;
using GymManagement.Domain.Entities.LockerMgmt;

namespace GymManagement.Infrastructure.Data
{
    /// <summary>EF Core database context for the gym application.</summary>
    /// <remarks>
    /// DbSet → SQL table: Users→Users; UserDetails→UserDetails; Trainers→Trainer; AuthUsers→AuthUsers;
    /// LoginActivities→LoginActivity; BodyParts→BodyParts; BodyPartMuscles→BodyPartMuscles; Exercises→Exercises;
    /// ExerciseSteps→ExerciseSteps; WorkoutPlans→WorkoutPlans; WorkoutPlanExercises→WorkoutPlanExercises;
    /// UserSchedules→UserSchedules; WorkoutSessions→WorkoutSessions; WorkoutLogs→WorkoutLogs;
    /// UserInstructors→UserInstructors; TrainerFeedbacks→TrainerFeedbacks; TrainerSpecializations→TrainerSpecializations;
    /// TrainerCertifications→TrainerCertifications; BodyMetricsLogs→BodyMetricsLogs; AttendanceLogs→AttendanceLogs;
    /// UserBodyImages→UserBodyImages; MembershipPlans→membership_plans; MembershipStatusLookups→membership_status;
    /// UserMemberships→user_memberships; Payments→payments; Invoices→Invoices; InvoiceItems→InvoiceItems;
    /// AppRoles→Roles; Permissions→Permissions; RolePermissions→RolePermissions; UserTypes→UserTypes;
    /// UserUserTypes→UserUserTypes; UserRoles→UserRoles; Notifications→Notifications; DietPlans→DietPlans;
    /// UserDietPlans→UserDietPlans; DietMeals→DietMeals; DietMealItems→DietMealItems; PersonalRecords→PersonalRecords;
    /// UserGoals→UserGoals; Branches→Branches; Messages→Messages; Announcements→Announcements;
    /// UserSupplements→UserSupplements; UserMedicalLogs→UserMedicalLogs; UserAchievements→UserAchievements;
    /// Organizations→Organizations; MemberActivitySummaries→MemberActivitySummary.
    /// </remarks>
    public class ApplicationDbContext : DbContext
    {
        public ApplicationDbContext(DbContextOptions<ApplicationDbContext> options)
            : base(options)
        {
        }

        public DbSet<User> Users { get; set; }
        public DbSet<UserDetail> UserDetails { get; set; }
        public DbSet<Trainer> Trainers { get; set; }
        public DbSet<AuthUser> AuthUsers { get; set; }
        public DbSet<LoginActivity> LoginActivities { get; set; }
        public DbSet<BodyPart> BodyParts { get; set; }
        public DbSet<BodyPartMuscle> BodyPartMuscles { get; set; }
        public DbSet<Exercise> Exercises { get; set; }
        public DbSet<ExerciseStep> ExerciseSteps { get; set; }
        public DbSet<WorkoutPlan> WorkoutPlans { get; set; }
        public DbSet<WorkoutPlanWeek> WorkoutPlanWeeks { get; set; }
        public DbSet<WorkoutPlanDay> WorkoutPlanDays { get; set; }
        public DbSet<WorkoutPlanExercise> WorkoutPlanExercises { get; set; }
        public DbSet<UserSchedule> UserSchedules { get; set; }
        public DbSet<WorkoutSession> WorkoutSessions { get; set; }
        public DbSet<WorkoutLog> WorkoutLogs { get; set; }
        public DbSet<UserInstructor> UserInstructors { get; set; }
        public DbSet<TrainerFeedback> TrainerFeedbacks { get; set; }
        public DbSet<TrainerSpecialization> TrainerSpecializations { get; set; }
        public DbSet<TrainerCertification> TrainerCertifications { get; set; }
        public DbSet<BodyMetricsLog> BodyMetricsLogs { get; set; }
        public DbSet<AttendanceLog> AttendanceLogs { get; set; }
        public DbSet<UserBodyImage> UserBodyImages { get; set; }
        public DbSet<MembershipPlan> MembershipPlans { get; set; }
        public DbSet<MembershipStatusLookup> MembershipStatusLookups { get; set; }
        public DbSet<UserMembership> UserMemberships { get; set; }
        public DbSet<Payment> Payments { get; set; }
        public DbSet<Invoice> Invoices { get; set; }
        public DbSet<InvoiceItem> InvoiceItems { get; set; }
        public DbSet<AppRole> AppRoles { get; set; }
        public DbSet<Permission> Permissions { get; set; }
        public DbSet<RolePermission> RolePermissions { get; set; }
        public DbSet<UserType> UserTypes { get; set; }
        public DbSet<UserUserType> UserUserTypes { get; set; }
        public DbSet<UserRole> UserRoles { get; set; }
        public DbSet<Notification> Notifications { get; set; }
        public DbSet<DietPlan> DietPlans { get; set; }
        public DbSet<UserDietPlan> UserDietPlans { get; set; }
        public DbSet<DietMeal> DietMeals { get; set; }
        public DbSet<DietMealItem> DietMealItems { get; set; }
        public DbSet<PersonalRecord> PersonalRecords { get; set; }
        public DbSet<UserGoal> UserGoals { get; set; }
        public DbSet<Branch> Branches { get; set; }
        public DbSet<Message> Messages { get; set; }
        public DbSet<Announcement> Announcements { get; set; }
        public DbSet<UserSupplement> UserSupplements { get; set; }
        public DbSet<UserMedicalLog> UserMedicalLogs { get; set; }
        public DbSet<UserAchievement> UserAchievements { get; set; }
        public DbSet<Organization> Organizations { get; set; }
        public DbSet<GymQrCode> GymQrCodes { get; set; }
        /// <summary>QR-driven gym-floor workout sessions (not plan-based <see cref="WorkoutSession"/>).</summary>
        public DbSet<GymQrWorkoutSession> GymQrWorkoutSessions { get; set; }
        public DbSet<GymQrWorkoutLog> GymQrWorkoutLogs { get; set; }
        public DbSet<MemberActivitySummary> MemberActivitySummaries { get; set; }

        // Gym Operations module (isolated in GymOps namespace, own tables).
        public DbSet<Equipment> GymOpsEquipment { get; set; }
        public DbSet<MaintenanceLog> GymOpsMaintenanceLogs { get; set; }
        public DbSet<Expense> GymOpsExpenses { get; set; }
        public DbSet<CleaningLog> GymOpsCleaningLogs { get; set; }
        public DbSet<CleaningTaskItem> GymOpsCleaningTaskItems { get; set; }
        public DbSet<Vendor> GymOpsVendors { get; set; }

        // Locker Management module (isolated in LockerMgmt namespace, own tables).
        public DbSet<Locker> LockerMgmtLockers { get; set; }
        public DbSet<LockerAssignment> LockerMgmtAssignments { get; set; }
        public DbSet<LockerAccessLog> LockerMgmtAccessLogs { get; set; }
        public DbSet<LockerMaintenance> LockerMgmtMaintenance { get; set; }

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);

            // Configure User
            modelBuilder.Entity<User>(entity =>
            {
                entity.HasKey(e => e.Id);
                entity.Property(e => e.FirstName).IsRequired().HasMaxLength(100);
                entity.Property(e => e.LastName).IsRequired().HasMaxLength(100);
                entity.Property(e => e.QrCode).HasMaxLength(500);
                entity.Property(e => e.MembershipStatus).HasMaxLength(50);
                entity.Property(e => e.Phone).HasMaxLength(100);
                entity.HasIndex(e => e.Phone).IsUnique().HasFilter("[Phone] IS NOT NULL");
                entity.HasOne(e => e.Organization)
                    .WithMany(o => o.Users)
                    .HasForeignKey(e => e.OrganizationId)
                    .OnDelete(DeleteBehavior.SetNull);
            });

            // Configure UserDetail
            modelBuilder.Entity<UserDetail>(entity =>
            {
                entity.HasKey(e => e.Id);
                entity.Property(e => e.Height).HasPrecision(10, 2);
                entity.Property(e => e.Weight).HasPrecision(10, 2);
                entity.Property(e => e.BMI).HasPrecision(10, 2);
                entity.Property(e => e.BMR).HasPrecision(10, 2);
                entity.Property(e => e.BodyFatPercentage).HasPrecision(5, 2);
                entity.Property(e => e.MuscleMass).HasPrecision(10, 2);
                entity.Property(e => e.TargetWeight).HasPrecision(10, 2);
                entity.HasOne(e => e.User)
                    .WithMany(u => u.UserDetails)
                    .HasForeignKey(e => e.UserId)
                    .OnDelete(DeleteBehavior.Cascade);
            });

            // Configure Trainer (linked to User; only trainer-specific columns)
            modelBuilder.Entity<Trainer>(entity =>
            {
                entity.HasKey(e => e.Id);
                entity.ToTable("Trainer");
                entity.HasIndex(e => e.UserId).IsUnique();
                entity.Property(e => e.EmployeeCode).HasMaxLength(50);
                entity.HasIndex(e => e.EmployeeCode).IsUnique().HasFilter("[EmployeeCode] IS NOT NULL");
                entity.Property(e => e.Specialization).HasMaxLength(200);
                entity.Property(e => e.CertificationDetails);
                entity.Property(e => e.Salary).HasPrecision(18, 2);
                entity.Property(e => e.CommissionPercentage).HasPrecision(5, 2);
                entity.Property(e => e.Rating).HasPrecision(3, 2);
                entity.Property(e => e.MaxActiveClients);
                entity.Property(e => e.AvailabilityStatus).HasMaxLength(50);
                entity.Property(e => e.JoiningDate).HasColumnType("date");
                entity.HasOne(e => e.User)
                    .WithOne(u => u.Trainer)
                    .HasForeignKey<Trainer>(e => e.UserId)
                    .OnDelete(DeleteBehavior.Restrict);
                entity.HasOne(e => e.Organization)
                    .WithMany(o => o.Trainers)
                    .HasForeignKey(e => e.OrganizationId)
                    .OnDelete(DeleteBehavior.SetNull);
            });

            // Configure BodyPart (top-level only; muscles are in BodyPartMuscles)
            modelBuilder.Entity<BodyPart>(entity =>
            {
                entity.HasKey(e => e.Id);
                entity.Property(e => e.Name).IsRequired().HasMaxLength(100);
            });

            // Configure BodyPartMuscle (e.g. Upper Chest under Chest)
            modelBuilder.Entity<BodyPartMuscle>(entity =>
            {
                entity.HasKey(e => e.Id);
                entity.Property(e => e.Name).IsRequired().HasMaxLength(100);
                entity.HasOne(e => e.BodyPart)
                    .WithMany(bp => bp.BodyPartMuscles)
                    .HasForeignKey(e => e.BodyPartId)
                    .OnDelete(DeleteBehavior.Cascade);
                entity.HasIndex(e => new { e.BodyPartId, e.Name }).IsUnique();
            });

            // Configure Exercise
            modelBuilder.Entity<Exercise>(entity =>
            {
                entity.HasKey(e => e.Id);
                entity.Property(e => e.Name).IsRequired().HasMaxLength(200);
                entity.Property(e => e.Steps).IsRequired();
                entity.HasOne(e => e.BodyPart)
                    .WithMany(bp => bp.Exercises)
                    .HasForeignKey(e => e.BodyPartId)
                    .OnDelete(DeleteBehavior.Restrict);
            });

            // Configure ExerciseStep
            modelBuilder.Entity<ExerciseStep>(entity =>
            {
                entity.HasKey(e => e.Id);
                entity.Property(e => e.Description).IsRequired().HasMaxLength(1000);
                entity.Property(e => e.StepNumber).IsRequired();
                entity.HasOne(e => e.Exercise)
                    .WithMany(ex => ex.ExerciseSteps)
                    .HasForeignKey(e => e.ExerciseId)
                    .OnDelete(DeleteBehavior.Cascade);
                entity.HasIndex(e => new { e.ExerciseId, e.StepNumber }).IsUnique();
            });

            // Configure WorkoutPlan
            modelBuilder.Entity<WorkoutPlan>(entity =>
            {
                entity.HasKey(e => e.Id);
                entity.Property(e => e.Name).IsRequired().HasMaxLength(200);
                entity.Property(e => e.Goal).HasMaxLength(120);
                entity.Property(e => e.Thumbnail).HasMaxLength(500);
                entity.Property(e => e.Tags).HasMaxLength(1000);
                entity.Property(e => e.Status).HasMaxLength(32);
                entity.HasOne(e => e.Trainer)
                    .WithMany(i => i.WorkoutPlans)
                    .HasForeignKey(e => e.TrainerId)
                    .OnDelete(DeleteBehavior.SetNull);
                entity.HasOne(e => e.Organization)
                    .WithMany(o => o.WorkoutPlans)
                    .HasForeignKey(e => e.OrganizationId)
                    .OnDelete(DeleteBehavior.SetNull);
                entity.HasMany(e => e.Weeks)
                    .WithOne(w => w.WorkoutPlan)
                    .HasForeignKey(w => w.WorkoutPlanId)
                    .OnDelete(DeleteBehavior.Cascade);
            });

            // Configure WorkoutPlanWeek (program template week)
            modelBuilder.Entity<WorkoutPlanWeek>(entity =>
            {
                entity.HasKey(e => e.Id);
                entity.Property(e => e.Name).HasMaxLength(120);
                entity.HasIndex(e => new { e.WorkoutPlanId, e.WeekNumber }).IsUnique();
            });

            // Configure WorkoutPlanExercise
            modelBuilder.Entity<WorkoutPlanExercise>(entity =>
            {
                entity.HasKey(e => e.Id);
                entity.Property(e => e.Weight).HasPrecision(10, 2);
                entity.Property(e => e.Tempo).HasMaxLength(32);
                entity.Property(e => e.Intensity).HasMaxLength(64);
                entity.Property(e => e.Notes).HasMaxLength(500);
                entity.HasOne(e => e.WorkoutPlan)
                    .WithMany(wp => wp.WorkoutPlanExercises)
                    .HasForeignKey(e => e.WorkoutPlanId)
                    .OnDelete(DeleteBehavior.Cascade);
                entity.HasOne(e => e.Exercise)
                    .WithMany(ex => ex.WorkoutPlanExercises)
                    .HasForeignKey(e => e.ExerciseId)
                    .OnDelete(DeleteBehavior.Restrict);
                entity.HasOne(e => e.WorkoutPlanDay)
                    .WithMany(d => d.WorkoutPlanExercises)
                    .HasForeignKey(e => e.WorkoutPlanDayId)
                    .OnDelete(DeleteBehavior.NoAction);
            });

            // Configure WorkoutPlanDay
            modelBuilder.Entity<WorkoutPlanDay>(entity =>
            {
                entity.HasKey(e => e.Id);
                entity.Property(e => e.Name).IsRequired().HasMaxLength(80);
                entity.Property(e => e.FocusArea).HasMaxLength(120);
                entity.Property(e => e.Notes).HasMaxLength(500);
                entity.HasOne(e => e.WorkoutPlan)
                    .WithMany(wp => wp.WorkoutPlanDays)
                    .HasForeignKey(e => e.WorkoutPlanId)
                    .OnDelete(DeleteBehavior.Cascade);
                entity.HasOne(e => e.Week)
                    .WithMany(w => w.Days)
                    .HasForeignKey(e => e.WorkoutPlanWeekId)
                    .OnDelete(DeleteBehavior.NoAction);
                entity.HasIndex(e => new { e.WorkoutPlanId, e.OrderIndex });
                entity.HasIndex(e => new { e.WorkoutPlanId, e.DayNumber });
                entity.HasIndex(e => e.WorkoutPlanWeekId);
            });

            // Configure UserSchedule
            modelBuilder.Entity<UserSchedule>(entity =>
            {
                entity.HasKey(e => e.Id);
                entity.HasOne(e => e.User)
                    .WithMany(u => u.Schedules)
                    .HasForeignKey(e => e.UserId)
                    .OnDelete(DeleteBehavior.Cascade);
                entity.HasOne(e => e.Trainer)
                    .WithMany(i => i.Schedules)
                    .HasForeignKey(e => e.TrainerId)
                    .OnDelete(DeleteBehavior.SetNull);
                entity.HasOne(e => e.WorkoutPlan)
                    .WithMany(wp => wp.UserSchedules)
                    .HasForeignKey(e => e.WorkoutPlanId)
                    .OnDelete(DeleteBehavior.Restrict);
            });

            // Configure WorkoutSession (User optional to avoid query filter conflict with User's HasQueryFilter)
            modelBuilder.Entity<WorkoutSession>(entity =>
            {
                entity.HasKey(e => e.Id);
                entity.HasOne(e => e.User)
                    .WithMany()
                    .HasForeignKey(e => e.UserId)
                    .IsRequired(false)
                    .OnDelete(DeleteBehavior.SetNull);
                entity.HasOne(e => e.WorkoutPlan)
                    .WithMany()
                    .HasForeignKey(e => e.WorkoutPlanId)
                    .OnDelete(DeleteBehavior.Restrict);
            });

            // Configure WorkoutLog (per-set log: session, exercise, set number, reps, weight, notes)
            modelBuilder.Entity<WorkoutLog>(entity =>
            {
                entity.HasKey(e => e.Id);
                entity.Property(e => e.WeightUsed).HasPrecision(10, 2);
                entity.Property(e => e.CreatedDate).IsRequired();
                entity.HasOne(e => e.WorkoutSession)
                    .WithMany(s => s.WorkoutLogs)
                    .HasForeignKey(e => e.WorkoutSessionId)
                    .OnDelete(DeleteBehavior.Cascade);
                entity.HasOne(e => e.Exercise)
                    .WithMany(ex => ex.WorkoutLogs)
                    .HasForeignKey(e => e.ExerciseId)
                    .OnDelete(DeleteBehavior.Restrict);
                entity.ToTable("WorkoutLogs");
            });

            // Configure UserInstructor (User-Trainer assignments)
            modelBuilder.Entity<UserInstructor>(entity =>
            {
                entity.HasKey(e => e.Id);
                entity.HasOne(e => e.User)
                    .WithMany(u => u.InstructorAssignments)
                    .HasForeignKey(e => e.UserId)
                    .OnDelete(DeleteBehavior.Cascade);
                entity.HasOne(e => e.Trainer)
                    .WithMany(i => i.UserAssignments)
                    .HasForeignKey(e => e.TrainerId)
                    .OnDelete(DeleteBehavior.Restrict);
            });

            // Configure UserType
            modelBuilder.Entity<UserType>(entity =>
            {
                entity.HasKey(e => e.Id);
                entity.Property(e => e.Name).IsRequired().HasMaxLength(100);
                entity.HasIndex(e => e.Name).IsUnique().HasFilter("[IsDeleted] = 0");
                entity.ToTable("UserTypes");
            });

            // Configure UserUserType (many-to-many: User <-> UserType)
            modelBuilder.Entity<UserUserType>(entity =>
            {
                entity.HasKey(e => e.Id);
                entity.HasOne(e => e.User)
                    .WithMany(u => u.UserUserTypes)
                    .HasForeignKey(e => e.UserId)
                    .OnDelete(DeleteBehavior.Cascade);
                entity.HasOne(e => e.UserType)
                    .WithMany(ut => ut.UserUserTypes)
                    .HasForeignKey(e => e.UserTypeId)
                    .OnDelete(DeleteBehavior.Restrict);
                entity.HasIndex(e => new { e.UserId, e.UserTypeId }).IsUnique();
                entity.ToTable("UserUserTypes");
            });

            // User <-> AppRole (Roles): explicit UserRoles junction table
            modelBuilder.Entity<UserRole>(entity =>
            {
                entity.HasKey(e => e.Id);
                entity.HasOne(e => e.User)
                    .WithMany(u => u.UserRoles)
                    .HasForeignKey(e => e.UserId)
                    .OnDelete(DeleteBehavior.Cascade);
                entity.HasOne(e => e.Role)
                    .WithMany(r => r.UserRoles)
                    .HasForeignKey(e => e.RoleId)
                    .OnDelete(DeleteBehavior.Restrict);
                entity.HasIndex(e => new { e.UserId, e.RoleId })
                    .IsUnique()
                    .HasDatabaseName("IX_UserRoles_UserId_RoleId")
                    .HasFilter(null);
                entity.ToTable("UserRoles");
            });

            // Configure TrainerFeedback
            modelBuilder.Entity<TrainerFeedback>(entity =>
            {
                entity.HasKey(e => e.Id);
                entity.ToTable("TrainerFeedbacks");
                entity.Property(e => e.Rating).IsRequired();
                entity.Property(e => e.Rating).HasAnnotation("CheckConstraint", "Rating >= 1 AND Rating <= 5");
                entity.HasOne(e => e.Trainer)
                    .WithMany(i => i.Feedbacks)
                    .HasForeignKey(e => e.TrainerId)
                    .OnDelete(DeleteBehavior.Restrict);
                entity.HasOne(e => e.User)
                    .WithMany(u => u.Feedbacks)
                    .HasForeignKey(e => e.UserId)
                    .OnDelete(DeleteBehavior.Restrict);
            });

            // Configure TrainerSpecialization
            modelBuilder.Entity<TrainerSpecialization>(entity =>
            {
                entity.HasKey(e => e.Id);
                entity.Property(e => e.SpecializationName).IsRequired().HasMaxLength(200);
                entity.HasOne(e => e.Trainer)
                    .WithMany(i => i.Specializations)
                    .HasForeignKey(e => e.TrainerId)
                    .OnDelete(DeleteBehavior.Cascade);
                entity.ToTable("TrainerSpecializations");
            });

            // Configure TrainerCertification
            modelBuilder.Entity<TrainerCertification>(entity =>
            {
                entity.HasKey(e => e.Id);
                entity.Property(e => e.CertificateName).IsRequired().HasMaxLength(200);
                entity.Property(e => e.IssuedBy).HasMaxLength(200);
                entity.Property(e => e.IssueDate).HasColumnType("date");
                entity.Property(e => e.ExpiryDate).HasColumnType("date");
                entity.HasOne(e => e.Trainer)
                    .WithMany(i => i.Certifications)
                    .HasForeignKey(e => e.TrainerId)
                    .OnDelete(DeleteBehavior.Cascade);
                entity.ToTable("TrainerCertifications");
            });

            // Configure BodyMetricsLog (history; latest snapshot is in UserDetails)
            modelBuilder.Entity<BodyMetricsLog>(entity =>
            {
                entity.HasKey(e => e.Id);
                entity.Property(e => e.WeightKg).IsRequired().HasPrecision(10, 2);
                entity.Property(e => e.HeightCm).HasPrecision(10, 2);
                entity.Property(e => e.BodyFatPct).HasPrecision(5, 2);
                entity.Property(e => e.MuscleMassKg).HasPrecision(10, 2);
                entity.Property(e => e.BicepsCm).HasPrecision(10, 2);
                entity.Property(e => e.CalvesCm).HasPrecision(10, 2);
                entity.Property(e => e.ChestCm).HasPrecision(10, 2);
                entity.Property(e => e.ForearmsCm).HasPrecision(10, 2);
                entity.Property(e => e.HipsCm).HasPrecision(10, 2);
                entity.Property(e => e.NeckCm).HasPrecision(10, 2);
                entity.Property(e => e.ShouldersCm).HasPrecision(10, 2);
                entity.Property(e => e.ThighsCm).HasPrecision(10, 2);
                entity.Property(e => e.WaistCm).HasPrecision(10, 2);
                entity.Property(e => e.MeasurementDate).IsRequired();
                entity.HasOne(e => e.User)
                    .WithMany()
                    .HasForeignKey(e => e.UserId)
                    .OnDelete(DeleteBehavior.Cascade);
                entity.HasIndex(e => e.UserId);
                entity.ToTable("BodyMetricsLogs");
            });

            // Configure AttendanceLog
            modelBuilder.Entity<AttendanceLog>(entity =>
            {
                entity.HasKey(e => e.Id);
                entity.Property(e => e.CheckInTime).IsRequired();
                entity.Property(e => e.AttendanceDate).IsRequired();
                entity.Property(e => e.ExceptionReason).HasMaxLength(250);
                entity.Property(e => e.CorrectionAuditNote).HasMaxLength(1000);
                entity.HasOne(e => e.User)
                    .WithMany(u => u.AttendanceLogs)
                    .HasForeignKey(e => e.UserId)
                    .OnDelete(DeleteBehavior.Cascade);
                entity.HasOne(e => e.LoggedByUser)
                    .WithMany()
                    .HasForeignKey(e => e.LoggedByUserId)
                    .OnDelete(DeleteBehavior.NoAction);
                entity.HasIndex(e => new { e.UserId, e.AttendanceDate });
            });

            // Configure UserBodyImage
            modelBuilder.Entity<UserBodyImage>(entity =>
            {
                entity.HasKey(e => e.Id);
                entity.Property(e => e.ImageUrl).IsRequired();
                entity.Property(e => e.ImageType).IsRequired();
                entity.Property(e => e.ImageDate).IsRequired();
                entity.HasOne(e => e.User)
                    .WithMany(u => u.BodyImages)
                    .HasForeignKey(e => e.UserId)
                    .OnDelete(DeleteBehavior.Cascade);
                entity.HasIndex(e => e.UserId);
            });

            // Configure MembershipPlan
            modelBuilder.Entity<MembershipPlan>(entity =>
            {
                entity.HasKey(e => e.Id);
                entity.Property(e => e.PlanName).IsRequired().HasMaxLength(50);
                entity.Property(e => e.DurationDays).IsRequired();
                entity.Property(e => e.Price).HasPrecision(10, 2);
                entity.HasOne(e => e.Organization)
                    .WithMany(o => o.MembershipPlans)
                    .HasForeignKey(e => e.OrganizationId)
                    .OnDelete(DeleteBehavior.SetNull);
                entity.ToTable("membership_plans");
            });

            // Configure MembershipStatusLookup (allowed values: Active, Expired, Frozen, Cancelled, Pending)
            modelBuilder.Entity<MembershipStatusLookup>(entity =>
            {
                entity.HasKey(e => e.Id);
                entity.Property(e => e.Name).IsRequired().HasMaxLength(50);
                entity.ToTable("membership_status");
            });

            // Configure UserMembership
            modelBuilder.Entity<UserMembership>(entity =>
            {
                entity.HasKey(e => e.Id);
                entity.Property(e => e.StartDate).IsRequired();
                entity.Property(e => e.EndDate).IsRequired();
                entity.Property(e => e.Status).IsRequired().HasConversion<string>().HasMaxLength(50);
                entity.Property(e => e.FreezeReason).HasMaxLength(500);
                entity.HasOne(e => e.User)
                    .WithMany(u => u.UserMemberships)
                    .HasForeignKey(e => e.UserId)
                    .OnDelete(DeleteBehavior.Cascade);
                entity.HasOne(e => e.Plan)
                    .WithMany(p => p.UserMemberships)
                    .HasForeignKey(e => e.PlanId)
                    .OnDelete(DeleteBehavior.Restrict);
                entity.ToTable("user_memberships");
            });

            // Configure Payment
            modelBuilder.Entity<Payment>(entity =>
            {
                entity.HasKey(e => e.Id);
                entity.Property(e => e.Amount).HasPrecision(10, 2);
                entity.Property(e => e.PaymentDate).IsRequired();
                entity.Property(e => e.PaymentMode).IsRequired().HasConversion<string>();
                entity.Property(e => e.ReceiptNo).HasMaxLength(50);
                entity.HasIndex(e => e.ReceiptNo)
                    .IsUnique()
                    .HasFilter("[ReceiptNo] IS NOT NULL AND [IsDeleted] = 0");
                entity.HasOne(e => e.Membership)
                    .WithMany(m => m.Payments)
                    .HasForeignKey(e => e.MembershipId)
                    .OnDelete(DeleteBehavior.Restrict);
                entity.HasOne(e => e.Organization)
                    .WithMany(o => o.Payments)
                    .HasForeignKey(e => e.OrganizationId)
                    .OnDelete(DeleteBehavior.SetNull);
                entity.ToTable("payments");
            });

            // Configure Invoice
            modelBuilder.Entity<Invoice>(entity =>
            {
                entity.HasKey(e => e.Id);
                entity.Property(e => e.InvoiceNumber).IsRequired().HasMaxLength(50);
                entity.HasIndex(e => e.InvoiceNumber)
                    .IsUnique()
                    .HasFilter("[IsDeleted] = 0");
                entity.Property(e => e.Subtotal).HasPrecision(10, 2);
                entity.Property(e => e.TaxAmount).HasPrecision(10, 2);
                entity.Property(e => e.DiscountAmount).HasPrecision(10, 2);
                entity.Property(e => e.TotalAmount).HasPrecision(10, 2);
                entity.Property(e => e.Currency).HasMaxLength(10);
                entity.Property(e => e.Notes).HasMaxLength(1000);
                entity.Property(e => e.BillingAddress).HasMaxLength(100);
                entity.Property(e => e.BillingCity).HasMaxLength(100);
                entity.Property(e => e.BillingState).HasMaxLength(100);
                entity.Property(e => e.BillingZip).HasMaxLength(20);
                entity.Property(e => e.BillingCountry).HasMaxLength(100);

                entity.HasOne(e => e.UserMembership)
                    .WithMany(um => um.Invoices)
                    .HasForeignKey(e => e.UserMembershipId)
                    .OnDelete(DeleteBehavior.Restrict);

                entity.HasOne(e => e.Payment)
                    .WithMany(p => p.Invoices)
                    .HasForeignKey(e => e.PaymentId)
                    .OnDelete(DeleteBehavior.SetNull);

                entity.HasOne(e => e.Organization)
                    .WithMany(o => o.Invoices)
                    .HasForeignKey(e => e.OrganizationId)
                    .OnDelete(DeleteBehavior.SetNull);

                entity.ToTable("Invoices");
            });

            // Configure InvoiceItem
            modelBuilder.Entity<InvoiceItem>(entity =>
            {
                entity.HasKey(e => e.Id);
                entity.Property(e => e.Description).IsRequired().HasMaxLength(200);
                entity.Property(e => e.Quantity).HasPrecision(10, 2);
                entity.Property(e => e.Unit).IsRequired().HasMaxLength(50);
                entity.Property(e => e.UnitPrice).HasPrecision(10, 2);
                entity.Property(e => e.Total).HasPrecision(10, 2);
                entity.Property(e => e.Notes).HasMaxLength(500);

                entity.HasOne(e => e.Invoice)
                    .WithMany(i => i.InvoiceItems)
                    .HasForeignKey(e => e.InvoiceId)
                    .OnDelete(DeleteBehavior.Cascade);

                entity.ToTable("InvoiceItems");
            });

            // Configure Notification
            modelBuilder.Entity<Notification>(entity =>
            {
                entity.HasKey(e => e.Id);
                entity.Property(e => e.Title).IsRequired().HasMaxLength(200);
                entity.Property(e => e.Message).IsRequired();
                entity.Property(e => e.NotificationType).HasMaxLength(50);
                entity.Property(e => e.CreatedDate).IsRequired();
                entity.HasOne(e => e.User)
                    .WithMany(u => u.Notifications)
                    .HasForeignKey(e => e.UserId)
                    .OnDelete(DeleteBehavior.Cascade);
                entity.ToTable("Notifications");
            });

            // Configure DietPlan
            modelBuilder.Entity<DietPlan>(entity =>
            {
                entity.HasKey(e => e.Id);
                entity.Property(e => e.PlanName).IsRequired().HasMaxLength(200);
                entity.Property(e => e.GoalType).IsRequired().HasMaxLength(50);
                entity.Property(e => e.CreatorType).HasMaxLength(50);
                entity.HasOne(e => e.Organization)
                    .WithMany(o => o.DietPlans)
                    .HasForeignKey(e => e.OrganizationId)
                    .OnDelete(DeleteBehavior.SetNull);
                entity.ToTable("DietPlans");
            });

            // Configure UserDietPlan
            modelBuilder.Entity<UserDietPlan>(entity =>
            {
                entity.HasKey(e => e.Id);
                entity.Property(e => e.StartDate).IsRequired();
                entity.HasOne(e => e.User)
                    .WithMany(u => u.UserDietPlans)
                    .HasForeignKey(e => e.UserId)
                    .OnDelete(DeleteBehavior.Cascade);
                entity.HasOne(e => e.DietPlan)
                    .WithMany(d => d.UserDietPlans)
                    .HasForeignKey(e => e.DietPlanId)
                    .OnDelete(DeleteBehavior.Restrict);
                entity.HasOne(e => e.AssignedByTrainer)
                    .WithMany(t => t.AssignedUserDietPlans)
                    .HasForeignKey(e => e.AssignedByTrainerId)
                    .OnDelete(DeleteBehavior.SetNull);
                entity.ToTable("UserDietPlans");
            });

            // Configure DietMeal
            modelBuilder.Entity<DietMeal>(entity =>
            {
                entity.HasKey(e => e.Id);
                entity.Property(e => e.MealName).IsRequired().HasMaxLength(100);
                entity.Property(e => e.CreatedDate).IsRequired();
                entity.HasOne(e => e.DietPlan)
                    .WithMany(d => d.DietMeals)
                    .HasForeignKey(e => e.DietPlanId)
                    .OnDelete(DeleteBehavior.Cascade);
                entity.ToTable("DietMeals");
            });

            // Configure DietMealItem
            modelBuilder.Entity<DietMealItem>(entity =>
            {
                entity.HasKey(e => e.Id);
                entity.Property(e => e.FoodName).IsRequired().HasMaxLength(200);
                entity.Property(e => e.Quantity).IsRequired().HasMaxLength(100);
                entity.Property(e => e.ProteinGrams).HasPrecision(6, 2);
                entity.Property(e => e.CarbsGrams).HasPrecision(6, 2);
                entity.Property(e => e.FatsGrams).HasPrecision(6, 2);
                entity.Property(e => e.CreatedDate).IsRequired();
                entity.HasOne(e => e.DietMeal)
                    .WithMany(m => m.DietMealItems)
                    .HasForeignKey(e => e.DietMealId)
                    .OnDelete(DeleteBehavior.Cascade);
                entity.ToTable("DietMealItems");
            });

            // Configure PersonalRecord
            modelBuilder.Entity<PersonalRecord>(entity =>
            {
                entity.HasKey(e => e.Id);
                entity.Property(e => e.MaxWeight).HasPrecision(10, 2);
                entity.Property(e => e.RecordDate).IsRequired();
                entity.HasOne(e => e.User)
                    .WithMany(u => u.PersonalRecords)
                    .HasForeignKey(e => e.UserId)
                    .OnDelete(DeleteBehavior.Restrict);
                entity.HasOne(e => e.Exercise)
                    .WithMany(ex => ex.PersonalRecords)
                    .HasForeignKey(e => e.ExerciseId)
                    .OnDelete(DeleteBehavior.Restrict);
                entity.ToTable("PersonalRecords");
            });

            // Configure UserGoal
            modelBuilder.Entity<UserGoal>(entity =>
            {
                entity.HasKey(e => e.Id);
                entity.Property(e => e.GoalType).IsRequired().HasMaxLength(50);
                entity.Property(e => e.Status).IsRequired().HasMaxLength(50);
                entity.Property(e => e.TargetValue).HasPrecision(10, 2);
                entity.Property(e => e.CurrentValue).HasPrecision(10, 2);
                entity.HasOne(e => e.User)
                    .WithMany(u => u.UserGoals)
                    .HasForeignKey(e => e.UserId)
                    .OnDelete(DeleteBehavior.Restrict);
                entity.ToTable("UserGoals");
            });

            // Configure MemberActivitySummary
            modelBuilder.Entity<MemberActivitySummary>(entity =>
            {
                entity.HasKey(e => e.Id);
                entity.Property(e => e.ComplianceScore).HasPrecision(5, 2);
                entity.HasOne(e => e.User)
                    .WithMany()
                    .HasForeignKey(e => e.UserId)
                    .OnDelete(DeleteBehavior.SetNull);
                entity.ToTable("MemberActivitySummary");
            });

            // Configure Organization
            modelBuilder.Entity<Organization>(entity =>
            {
                entity.HasKey(e => e.Id);
                entity.Property(e => e.Name).IsRequired().HasMaxLength(200);
                entity.Property(e => e.OrganizationType).HasMaxLength(100);
                entity.Property(e => e.CreatedDate).IsRequired();
                entity.ToTable("Organizations");
            });

            // Configure Branch (belongs to Organization)
            modelBuilder.Entity<Branch>(entity =>
            {
                entity.HasKey(e => e.Id);
                entity.Property(e => e.BranchName).IsRequired().HasMaxLength(200);
                entity.Property(e => e.ContactNumber).HasMaxLength(50);
                entity.Property(e => e.Latitude).HasPrecision(12, 8);
                entity.Property(e => e.Longitude).HasPrecision(12, 8);
                entity.Property(e => e.Esp32DoorBaseUrl).HasMaxLength(500);
                entity.HasOne(e => e.Organization)
                    .WithMany(o => o.Branches)
                    .HasForeignKey(e => e.OrganizationId)
                    .OnDelete(DeleteBehavior.SetNull);
                entity.ToTable("Branches");
            });

            modelBuilder.Entity<GymQrCode>(entity =>
            {
                entity.HasKey(e => e.Id);
                entity.Property(e => e.QrToken).IsRequired().HasMaxLength(64);
                entity.HasIndex(e => e.QrToken).IsUnique();
                entity.Property(e => e.ExpiryDate).IsRequired();
                entity.HasOne(e => e.Branch)
                    .WithMany(b => b.GymQrCodes)
                    .HasForeignKey(e => e.BranchId)
                    .OnDelete(DeleteBehavior.Cascade);
                entity.HasIndex(e => new { e.BranchId, e.IsActive });
                entity.ToTable("GymQrCodes");
            });

            // Configure Message
            modelBuilder.Entity<Message>(entity =>
            {
                entity.HasKey(e => e.Id);
                entity.Property(e => e.MessageText).IsRequired();
                entity.Property(e => e.SentDate).IsRequired();
                entity.HasOne(e => e.Sender)
                    .WithMany(u => u.MessagesSent)
                    .HasForeignKey(e => e.SenderId)
                    .OnDelete(DeleteBehavior.Restrict);
                entity.HasOne(e => e.Receiver)
                    .WithMany(u => u.MessagesReceived)
                    .HasForeignKey(e => e.ReceiverId)
                    .OnDelete(DeleteBehavior.Restrict);
                entity.ToTable("Messages");
            });

            // Configure Announcement
            modelBuilder.Entity<Announcement>(entity =>
            {
                entity.HasKey(e => e.Id);
                entity.Property(e => e.Title).HasMaxLength(200);
                entity.Property(e => e.CreatedDate).IsRequired();
                entity.HasOne(e => e.Branch)
                    .WithMany(b => b.Announcements)
                    .HasForeignKey(e => e.BranchId)
                    .OnDelete(DeleteBehavior.SetNull);
                entity.HasOne(e => e.Organization)
                    .WithMany(o => o.Announcements)
                    .HasForeignKey(e => e.OrganizationId)
                    .OnDelete(DeleteBehavior.SetNull);
                entity.ToTable("Announcements");
            });

            // Configure UserSupplement
            modelBuilder.Entity<UserSupplement>(entity =>
            {
                entity.HasKey(e => e.Id);
                entity.Property(e => e.SupplementName).HasMaxLength(200);
                entity.Property(e => e.Dosage).HasMaxLength(100);
                entity.Property(e => e.Frequency).HasMaxLength(100);
                entity.HasOne(e => e.User)
                    .WithMany(u => u.UserSupplements)
                    .HasForeignKey(e => e.UserId)
                    .OnDelete(DeleteBehavior.Restrict);
                entity.ToTable("UserSupplements");
            });

            // Configure UserMedicalLog
            modelBuilder.Entity<UserMedicalLog>(entity =>
            {
                entity.HasKey(e => e.Id);
                entity.Property(e => e.ConditionName).HasMaxLength(200);
                entity.Property(e => e.Severity).HasMaxLength(100);
                entity.Property(e => e.ReportedDate).IsRequired();
                entity.HasOne(e => e.User)
                    .WithMany(u => u.UserMedicalLogs)
                    .HasForeignKey(e => e.UserId)
                    .OnDelete(DeleteBehavior.Restrict);
                entity.ToTable("UserMedicalLogs");
            });

            // Configure UserAchievement
            modelBuilder.Entity<UserAchievement>(entity =>
            {
                entity.HasKey(e => e.Id);
                entity.Property(e => e.AchievementType).HasMaxLength(100);
                entity.Property(e => e.AchievementDate).IsRequired();
                entity.HasOne(e => e.User)
                    .WithMany(u => u.UserAchievements)
                    .HasForeignKey(e => e.UserId)
                    .OnDelete(DeleteBehavior.Restrict);
                entity.ToTable("UserAchievements");
            });

            // LoginActivity (auth audit)
            modelBuilder.Entity<LoginActivity>(entity =>
            {
                entity.HasKey(e => e.Id);
                entity.Property(e => e.IPAddress).HasMaxLength(50);
                entity.Property(e => e.DeviceInfo).HasMaxLength(255);
                entity.Property(e => e.Status).HasMaxLength(20);
                entity.Property(e => e.FailureReason).HasMaxLength(255);
                entity.Property(e => e.SessionId).HasMaxLength(100);
                entity.Property(e => e.LoginTime).IsRequired();
                entity.HasIndex(e => e.AuthUserId);
                entity.HasIndex(e => e.LoginTime);
                entity.HasIndex(e => e.SessionId);
                entity.HasOne(e => e.AuthUser)
                    .WithMany(a => a.LoginActivities)
                    .HasForeignKey(e => e.AuthUserId)
                    .IsRequired(false)
                    .OnDelete(DeleteBehavior.Cascade);
                entity.HasOne(e => e.User)
                    .WithMany(u => u.LoginActivities)
                    .HasForeignKey(e => e.UserId)
                    .OnDelete(DeleteBehavior.Restrict);
                entity.ToTable("LoginActivity");
            });

            // Configure AuthUser (single auth table for all roles)
            modelBuilder.Entity<AuthUser>(entity =>
            {
                entity.HasKey(e => e.Id);
                entity.Property(e => e.Email).IsRequired().HasMaxLength(255);
                entity.HasIndex(e => e.Email).IsUnique().HasFilter("[IsDeleted] = 0");
                entity.Property(e => e.PasswordHash).IsRequired();
                entity.Property(e => e.RefreshToken);
                entity.Property(e => e.RefreshTokenExpiry);
                entity.Property(e => e.PreviousRefreshTokenHash).HasMaxLength(128);
                entity.Property(e => e.RefreshTokenCompromisedAt);
                entity.Property(e => e.FailedLoginAttempts);
                entity.Property(e => e.LockoutEnd);
                entity.HasOne(e => e.User)
                    .WithOne(u => u.AuthUser)
                    .HasForeignKey<AuthUser>(e => e.UserId)
                    .OnDelete(DeleteBehavior.Cascade);
                entity.ToTable("AuthUsers");
            });

            modelBuilder.Entity<AuthUser>().HasQueryFilter(e => !e.IsDeleted);

            // Soft delete query filter
            modelBuilder.Entity<User>().HasQueryFilter(e => !e.IsDeleted);
            modelBuilder.Entity<Trainer>().HasQueryFilter(e => !e.IsDeleted);

            // Role & Permission (role_tbl, permissions, role_permissions)
            modelBuilder.Entity<AppRole>(entity =>
            {
                entity.HasKey(e => e.Id);
                entity.Property(e => e.Name).IsRequired().HasMaxLength(100);
                entity.HasIndex(e => e.Name).IsUnique().HasFilter("[IsDeleted] = 0");
                entity.ToTable("Roles");
            });
            modelBuilder.Entity<Permission>(entity =>
            {
                entity.HasKey(e => e.Id);
                entity.Property(e => e.Code).IsRequired().HasMaxLength(50);
                entity.Property(e => e.Name).IsRequired().HasMaxLength(100);
                entity.HasIndex(e => e.Code).IsUnique();
                entity.ToTable("Permissions");
            });
            modelBuilder.Entity<RolePermission>(entity =>
            {
                entity.HasKey(e => e.Id);
                entity.HasOne(e => e.Role)
                    .WithMany(r => r.RolePermissions)
                    .HasForeignKey(e => e.RoleId)
                    .OnDelete(DeleteBehavior.Cascade);
                entity.HasOne(e => e.Permission)
                    .WithMany(p => p.RolePermissions)
                    .HasForeignKey(e => e.PermissionId)
                    .OnDelete(DeleteBehavior.Cascade);
                entity.HasIndex(e => new { e.RoleId, e.PermissionId }).IsUnique();
                entity.ToTable("RolePermissions");
            });

            modelBuilder.Entity<Exercise>().HasQueryFilter(e => !e.IsDeleted);
            // Matching filters for dependents of User/Exercise so 10622 warnings are resolved
            modelBuilder.Entity<UserDetail>().HasQueryFilter(ud => ud.User != null && !ud.User.IsDeleted);
            modelBuilder.Entity<UserSchedule>().HasQueryFilter(us => !us.IsDeleted && us.User != null && !us.User.IsDeleted);
            modelBuilder.Entity<WorkoutPlanExercise>().HasQueryFilter(wpe => wpe.Exercise != null && !wpe.Exercise.IsDeleted);
            modelBuilder.Entity<WorkoutPlanDay>().HasQueryFilter(e => !e.IsDeleted);
            modelBuilder.Entity<WorkoutPlanWeek>().HasQueryFilter(e => !e.IsDeleted);
            modelBuilder.Entity<ExerciseStep>().HasQueryFilter(e => !e.IsDeleted);
            modelBuilder.Entity<WorkoutSession>().HasQueryFilter(e => !e.IsDeleted);
            modelBuilder.Entity<WorkoutPlan>().HasQueryFilter(e => !e.IsDeleted);
            modelBuilder.Entity<BodyPart>().HasQueryFilter(e => !e.IsDeleted);
            modelBuilder.Entity<BodyPartMuscle>().HasQueryFilter(e => !e.IsDeleted);
            modelBuilder.Entity<UserInstructor>().HasQueryFilter(e => !e.IsDeleted);
            modelBuilder.Entity<TrainerFeedback>().HasQueryFilter(e => !e.IsDeleted);
            modelBuilder.Entity<TrainerSpecialization>().HasQueryFilter(e => !e.IsDeleted);
            modelBuilder.Entity<TrainerCertification>().HasQueryFilter(e => !e.IsDeleted);
            modelBuilder.Entity<BodyMetricsLog>().HasQueryFilter(e => !e.IsDeleted);
            modelBuilder.Entity<AttendanceLog>().HasQueryFilter(e => !e.IsDeleted);
            modelBuilder.Entity<GymQrCode>().HasQueryFilter(e => !e.IsDeleted);
            modelBuilder.Entity<LoginActivity>().HasQueryFilter(e => !e.IsDeleted);
            modelBuilder.Entity<UserBodyImage>().HasQueryFilter(e => !e.IsDeleted);
            modelBuilder.Entity<MembershipPlan>().HasQueryFilter(e => !e.IsDeleted);
            modelBuilder.Entity<UserMembership>().HasQueryFilter(e => !e.IsDeleted);
            modelBuilder.Entity<Payment>().HasQueryFilter(e => !e.IsDeleted);
            modelBuilder.Entity<Invoice>().HasQueryFilter(e => !e.IsDeleted);
            modelBuilder.Entity<InvoiceItem>().HasQueryFilter(ii => ii.Invoice != null && !ii.Invoice.IsDeleted && !ii.IsDeleted);
            modelBuilder.Entity<AppRole>().HasQueryFilter(e => !e.IsDeleted);
            modelBuilder.Entity<Permission>().HasQueryFilter(e => !e.IsDeleted);
            modelBuilder.Entity<RolePermission>().HasQueryFilter(e => !e.IsDeleted);
            modelBuilder.Entity<UserType>().HasQueryFilter(e => !e.IsDeleted);
            modelBuilder.Entity<UserUserType>().HasQueryFilter(e => !e.IsDeleted);
            modelBuilder.Entity<UserRole>().HasQueryFilter(e => !e.IsDeleted);
            modelBuilder.Entity<DietPlan>().HasQueryFilter(e => !e.IsDeleted);
            modelBuilder.Entity<UserDietPlan>().HasQueryFilter(e => !e.IsDeleted);

            // -----------------------------------------------------------------
            // Gym Operations module (isolated; own tables under GymOps_* prefix)
            // -----------------------------------------------------------------
            modelBuilder.Entity<Equipment>(entity =>
            {
                entity.HasKey(e => e.Id);
                entity.Property(e => e.Name).IsRequired().HasMaxLength(200);
                entity.Property(e => e.Category).IsRequired().HasMaxLength(50);
                entity.Property(e => e.Brand).HasMaxLength(100);
                entity.Property(e => e.SerialNumber).HasMaxLength(100);
                entity.Property(e => e.Location).IsRequired().HasMaxLength(200);
                entity.Property(e => e.Status).IsRequired().HasMaxLength(50);
                entity.Property(e => e.PurchaseCost).HasPrecision(18, 2);
                entity.Property(e => e.Notes).HasMaxLength(2000);
                entity.HasIndex(e => e.Status);
                entity.HasIndex(e => e.Category);
                entity.ToTable("GymOps_Equipment");
            });

            modelBuilder.Entity<MaintenanceLog>(entity =>
            {
                entity.HasKey(e => e.Id);
                entity.Property(e => e.Type).IsRequired().HasMaxLength(50);
                entity.Property(e => e.PerformedBy).IsRequired().HasMaxLength(150);
                entity.Property(e => e.Description).IsRequired().HasMaxLength(1000);
                entity.Property(e => e.Cost).HasPrecision(18, 2);
                entity.HasOne(e => e.Equipment)
                    .WithMany(eq => eq.MaintenanceLogs)
                    .HasForeignKey(e => e.EquipmentId)
                    .OnDelete(DeleteBehavior.Cascade);
                entity.HasIndex(e => e.EquipmentId);
                entity.HasIndex(e => e.PerformedAt);
                entity.ToTable("GymOps_MaintenanceLogs");
            });

            modelBuilder.Entity<Expense>(entity =>
            {
                entity.HasKey(e => e.Id);
                entity.Property(e => e.Category).IsRequired().HasMaxLength(50);
                entity.Property(e => e.Description).IsRequired().HasMaxLength(500);
                entity.Property(e => e.Amount).HasPrecision(18, 2);
                entity.Property(e => e.PaymentStatus).IsRequired().HasMaxLength(30);
                entity.Property(e => e.Vendor).HasMaxLength(200);
                entity.Property(e => e.ReceiptUrl).HasMaxLength(500);
                entity.Property(e => e.Notes).HasMaxLength(2000);
                entity.HasIndex(e => e.ExpenseDate);
                entity.HasIndex(e => e.Category);
                entity.ToTable("GymOps_Expenses");
            });

            modelBuilder.Entity<CleaningLog>(entity =>
            {
                entity.HasKey(e => e.Id);
                entity.Property(e => e.Area).IsRequired().HasMaxLength(100);
                entity.Property(e => e.Shift).IsRequired().HasMaxLength(50);
                entity.Property(e => e.PerformedBy).HasMaxLength(150);
                entity.Property(e => e.Notes).HasMaxLength(1000);
                entity.HasIndex(e => e.LogDate);
                entity.ToTable("GymOps_CleaningLogs");
            });

            modelBuilder.Entity<CleaningTaskItem>(entity =>
            {
                entity.HasKey(e => e.Id);
                entity.Property(e => e.Label).IsRequired().HasMaxLength(200);
                entity.HasOne(e => e.CleaningLog)
                    .WithMany(l => l.Tasks)
                    .HasForeignKey(e => e.CleaningLogId)
                    .OnDelete(DeleteBehavior.Cascade);
                entity.ToTable("GymOps_CleaningTaskItems");
            });

            modelBuilder.Entity<Vendor>(entity =>
            {
                entity.HasKey(e => e.Id);
                entity.Property(e => e.Name).IsRequired().HasMaxLength(200);
                entity.Property(e => e.Category).IsRequired().HasMaxLength(50);
                entity.Property(e => e.ContactPerson).HasMaxLength(150);
                entity.Property(e => e.Phone).HasMaxLength(50);
                entity.Property(e => e.Email).HasMaxLength(255);
                entity.Property(e => e.Address).HasMaxLength(500);
                entity.Property(e => e.Rating).HasPrecision(3, 2);
                entity.Property(e => e.ContractStatus).IsRequired().HasMaxLength(30);
                entity.Property(e => e.Notes).HasMaxLength(2000);
                entity.HasIndex(e => e.Category);
                entity.HasIndex(e => e.ContractStatus);
                entity.ToTable("GymOps_Vendors");
            });

            modelBuilder.Entity<Equipment>().HasQueryFilter(e => !e.IsDeleted);
            modelBuilder.Entity<MaintenanceLog>().HasQueryFilter(e => !e.IsDeleted);
            modelBuilder.Entity<Expense>().HasQueryFilter(e => !e.IsDeleted);
            modelBuilder.Entity<CleaningLog>().HasQueryFilter(e => !e.IsDeleted);
            modelBuilder.Entity<CleaningTaskItem>().HasQueryFilter(t => !t.IsDeleted && t.CleaningLog != null && !t.CleaningLog.IsDeleted);
            modelBuilder.Entity<Vendor>().HasQueryFilter(e => !e.IsDeleted);

            // -----------------------------------------------------------------
            // Locker Management module (isolated; own tables under LockerMgmt_* prefix)
            // -----------------------------------------------------------------
            modelBuilder.Entity<Locker>(entity =>
            {
                entity.HasKey(e => e.Id);
                entity.Property(e => e.LockerNumber).IsRequired().HasMaxLength(50);
                entity.Property(e => e.Size).IsRequired().HasMaxLength(20);
                entity.Property(e => e.Status).IsRequired().HasMaxLength(30);
                entity.Property(e => e.Location).HasMaxLength(150);
                entity.HasIndex(e => e.LockerNumber).IsUnique();
                entity.HasIndex(e => e.Status);
                entity.ToTable("LockerMgmt_Lockers");
            });

            modelBuilder.Entity<LockerAssignment>(entity =>
            {
                entity.HasKey(e => e.Id);
                entity.Property(e => e.MemberName).IsRequired().HasMaxLength(150);
                entity.HasOne(e => e.Locker)
                    .WithMany(l => l.Assignments)
                    .HasForeignKey(e => e.LockerId)
                    .OnDelete(DeleteBehavior.Cascade);
                entity.HasIndex(e => e.LockerId);
                entity.HasIndex(e => e.ExpiryDate);
                entity.ToTable("LockerMgmt_Assignments");
            });

            modelBuilder.Entity<LockerAccessLog>(entity =>
            {
                entity.HasKey(e => e.Id);
                entity.Property(e => e.MemberName).IsRequired().HasMaxLength(150);
                entity.Property(e => e.Action).IsRequired().HasMaxLength(10);
                entity.HasOne(e => e.Locker)
                    .WithMany(l => l.AccessLogs)
                    .HasForeignKey(e => e.LockerId)
                    .OnDelete(DeleteBehavior.Cascade);
                entity.HasIndex(e => e.LockerId);
                entity.HasIndex(e => e.AccessTime);
                entity.ToTable("LockerMgmt_AccessLogs");
            });

            modelBuilder.Entity<LockerMaintenance>(entity =>
            {
                entity.HasKey(e => e.Id);
                entity.Property(e => e.Issue).IsRequired().HasMaxLength(1000);
                entity.Property(e => e.Status).IsRequired().HasMaxLength(20);
                entity.HasOne(e => e.Locker)
                    .WithMany(l => l.MaintenanceRecords)
                    .HasForeignKey(e => e.LockerId)
                    .OnDelete(DeleteBehavior.Cascade);
                entity.HasIndex(e => e.LockerId);
                entity.HasIndex(e => e.Status);
                entity.ToTable("LockerMgmt_Maintenance");
            });

            modelBuilder.Entity<Locker>().HasQueryFilter(e => !e.IsDeleted);
            modelBuilder.Entity<LockerAssignment>().HasQueryFilter(e => !e.IsDeleted && e.Locker != null && !e.Locker.IsDeleted);
            modelBuilder.Entity<LockerAccessLog>().HasQueryFilter(e => !e.IsDeleted && e.Locker != null && !e.Locker.IsDeleted);
            modelBuilder.Entity<LockerMaintenance>().HasQueryFilter(e => !e.IsDeleted && e.Locker != null && !e.Locker.IsDeleted);

            modelBuilder.Entity<GymQrWorkoutSession>(entity =>
            {
                entity.ToTable("GymQrWorkoutSessions");
                entity.HasKey(e => e.Id);
                entity.Property(e => e.Status).HasMaxLength(32).IsRequired();
                entity.Property(e => e.StartTimeUtc).HasColumnName("StartTimeUtc");
                entity.Property(e => e.EndTimeUtc).HasColumnName("EndTimeUtc");
                entity.Property(e => e.LastActivityAtUtc).HasColumnName("LastActivityAtUtc");
                entity.HasIndex(e => new { e.MemberUserId, e.BranchId, e.Status });
                entity.HasIndex(e => e.LastActivityAtUtc);
                entity.HasOne(e => e.Member)
                    .WithMany()
                    .HasForeignKey(e => e.MemberUserId)
                    .OnDelete(DeleteBehavior.Restrict);
                entity.HasOne(e => e.Branch)
                    .WithMany()
                    .HasForeignKey(e => e.BranchId)
                    .OnDelete(DeleteBehavior.Restrict);
            });

            modelBuilder.Entity<GymQrWorkoutLog>(entity =>
            {
                entity.ToTable("GymQrWorkoutLogs");
                entity.HasKey(e => e.Id);
                entity.Property(e => e.ExerciseName).HasMaxLength(200).IsRequired();
                entity.Property(e => e.Weight).HasPrecision(12, 3);
                entity.HasOne(e => e.Session)
                    .WithMany(s => s.Logs)
                    .HasForeignKey(e => e.SessionId)
                    .OnDelete(DeleteBehavior.Cascade);
                entity.HasIndex(e => e.SessionId);
            });
        }

        public override int SaveChanges()
        {
            UpdateTimestamps();
            return base.SaveChanges();
        }

        public override Task<int> SaveChangesAsync(CancellationToken cancellationToken = default)
        {
            UpdateTimestamps();
            return base.SaveChangesAsync(cancellationToken);
        }

        private void UpdateTimestamps()
        {
            var entries = ChangeTracker.Entries()
                .Where(e => e.Entity is BaseEntity && (e.State == EntityState.Added || e.State == EntityState.Modified));

            foreach (var entry in entries)
            {
                var entity = (BaseEntity)entry.Entity;
                
                if (entry.State == EntityState.Added)
                {
                    entity.CreatedDate = DateTime.UtcNow;
                }
                else if (entry.State == EntityState.Modified)
                {
                    entity.UpdatedDate = DateTime.UtcNow;
                }
            }
        }
    }
}

