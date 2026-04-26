using Microsoft.EntityFrameworkCore.Storage;
using GymManagement.Core.Interfaces;
using GymManagement.Domain.Entities;
using GymManagement.Infrastructure.Data;

namespace GymManagement.Infrastructure.Repositories
{
    public class UnitOfWork : IUnitOfWork
    {
        private readonly ApplicationDbContext _context;
        private IDbContextTransaction? _transaction;

        private IRepository<User>? _users;
        private IRepository<UserDetail>? _userDetails;
        private IRepository<Trainer>? _trainers;
        private IRepository<AuthUser>? _authUsers;
        private IRepository<LoginActivity>? _loginActivities;
        private IRepository<BodyPart>? _bodyParts;
        private IRepository<BodyPartMuscle>? _bodyPartMuscles;
        private IRepository<Exercise>? _exercises;
        private IRepository<ExerciseStep>? _exerciseSteps;
        private IRepository<WorkoutPlan>? _workoutPlans;
        private IRepository<WorkoutPlanExercise>? _workoutPlanExercises;
        private IRepository<UserSchedule>? _userSchedules;
        private IRepository<WorkoutSession>? _workoutSessions;
        private IRepository<UserInstructor>? _userInstructors;
        private IRepository<TrainerFeedback>? _trainerFeedbacks;
        private IRepository<TrainerSpecialization>? _trainerSpecializations;
        private IRepository<TrainerCertification>? _trainerCertifications;
        private IRepository<BodyMetricsLog>? _bodyMetricsLogs;
        private IRepository<AttendanceLog>? _attendanceLogs;
        private IRepository<UserBodyImage>? _userBodyImages;
        private IRepository<MembershipPlan>? _membershipPlans;
        private IRepository<UserMembership>? _userMemberships;
        private IRepository<Payment>? _payments;
        private IRepository<Invoice>? _invoices;
        private IRepository<InvoiceItem>? _invoiceItems;
        private IRepository<AppRole>? _appRoles;
        private IRepository<Permission>? _permissions;
        private IRepository<RolePermission>? _rolePermissions;
        private IRepository<UserType>? _userTypes;
        private IRepository<UserUserType>? _userUserTypes;
        private IRepository<UserRole>? _userRoles;
        private IRepository<DietPlan>? _dietPlans;

        public UnitOfWork(ApplicationDbContext context)
        {
            _context = context;
        }

        public IRepository<User> Users => 
            _users ??= new Repository<User>(_context);

        public IRepository<UserDetail> UserDetails => 
            _userDetails ??= new Repository<UserDetail>(_context);

        public IRepository<Trainer> Trainers => 
            _trainers ??= new Repository<Trainer>(_context);

        public IRepository<AuthUser> AuthUsers => 
            _authUsers ??= new Repository<AuthUser>(_context);

        public IRepository<LoginActivity> LoginActivities =>
            _loginActivities ??= new Repository<LoginActivity>(_context);

        public IRepository<BodyPart> BodyParts => 
            _bodyParts ??= new Repository<BodyPart>(_context);

        public IRepository<BodyPartMuscle> BodyPartMuscles => 
            _bodyPartMuscles ??= new Repository<BodyPartMuscle>(_context);

        public IRepository<Exercise> Exercises => 
            _exercises ??= new Repository<Exercise>(_context);

        public IRepository<ExerciseStep> ExerciseSteps => 
            _exerciseSteps ??= new Repository<ExerciseStep>(_context);

        public IRepository<WorkoutPlan> WorkoutPlans => 
            _workoutPlans ??= new Repository<WorkoutPlan>(_context);

        public IRepository<WorkoutPlanExercise> WorkoutPlanExercises => 
            _workoutPlanExercises ??= new Repository<WorkoutPlanExercise>(_context);

        public IRepository<UserSchedule> UserSchedules => 
            _userSchedules ??= new Repository<UserSchedule>(_context);

        public IRepository<WorkoutSession> WorkoutSessions => 
            _workoutSessions ??= new Repository<WorkoutSession>(_context);

        public IRepository<UserInstructor> UserInstructors => 
            _userInstructors ??= new Repository<UserInstructor>(_context);

        public IRepository<TrainerFeedback> TrainerFeedbacks => 
            _trainerFeedbacks ??= new Repository<TrainerFeedback>(_context);

        public IRepository<TrainerSpecialization> TrainerSpecializations => 
            _trainerSpecializations ??= new Repository<TrainerSpecialization>(_context);

        public IRepository<TrainerCertification> TrainerCertifications => 
            _trainerCertifications ??= new Repository<TrainerCertification>(_context);

        public IRepository<BodyMetricsLog> BodyMetricsLogs => 
            _bodyMetricsLogs ??= new Repository<BodyMetricsLog>(_context);

        public IRepository<AttendanceLog> AttendanceLogs => 
            _attendanceLogs ??= new Repository<AttendanceLog>(_context);

        public IRepository<UserBodyImage> UserBodyImages => 
            _userBodyImages ??= new Repository<UserBodyImage>(_context);

        public IRepository<MembershipPlan> MembershipPlans => 
            _membershipPlans ??= new Repository<MembershipPlan>(_context);

        public IRepository<UserMembership> UserMemberships => 
            _userMemberships ??= new Repository<UserMembership>(_context);

        public IRepository<Payment> Payments =>
            _payments ??= new Repository<Payment>(_context);

        public IRepository<Invoice> Invoices =>
            _invoices ??= new Repository<Invoice>(_context);

        public IRepository<InvoiceItem> InvoiceItems =>
            _invoiceItems ??= new Repository<InvoiceItem>(_context);

        public IRepository<AppRole> AppRoles =>
            _appRoles ??= new Repository<AppRole>(_context);

        public IRepository<Permission> Permissions => 
            _permissions ??= new Repository<Permission>(_context);

        public IRepository<RolePermission> RolePermissions => 
            _rolePermissions ??= new Repository<RolePermission>(_context);

        public IRepository<UserType> UserTypes => 
            _userTypes ??= new Repository<UserType>(_context);

        public IRepository<UserUserType> UserUserTypes => 
            _userUserTypes ??= new Repository<UserUserType>(_context);

        public IRepository<UserRole> UserRoles =>
            _userRoles ??= new Repository<UserRole>(_context);

        public IRepository<DietPlan> DietPlans => 
            _dietPlans ??= new Repository<DietPlan>(_context);

        public async Task<int> SaveChangesAsync()
        {
            return await _context.SaveChangesAsync();
        }

        public async Task BeginTransactionAsync()
        {
            _transaction = await _context.Database.BeginTransactionAsync();
        }

        public async Task CommitTransactionAsync()
        {
            try
            {
                await _context.SaveChangesAsync();
                if (_transaction != null)
                {
                    await _transaction.CommitAsync();
                }
            }
            catch
            {
                await RollbackTransactionAsync();
                throw;
            }
            finally
            {
                if (_transaction != null)
                {
                    await _transaction.DisposeAsync();
                    _transaction = null;
                }
            }
        }

        public async Task RollbackTransactionAsync()
        {
            if (_transaction != null)
            {
                await _transaction.RollbackAsync();
                await _transaction.DisposeAsync();
                _transaction = null;
            }
        }

        public void Dispose()
        {
            _transaction?.Dispose();
            _context.Dispose();
        }
    }
}

