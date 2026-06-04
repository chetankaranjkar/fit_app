using GymManagement.Core.DTOs;
using GymManagement.Core.Interfaces;
using GymManagement.Core.Services;
using GymManagement.Domain.Entities;

namespace GymManagement.Infrastructure.Services;

public sealed class PersonalWorkoutPlanService : IPersonalWorkoutPlanService
{
    private readonly IUnitOfWork _unitOfWork;
    private readonly IWorkoutPlanService _workoutPlanService;
    private readonly IGymSettingsService _gymSettings;
    private readonly IWorkoutPlanAuditService _audit;

    public PersonalWorkoutPlanService(
        IUnitOfWork unitOfWork,
        IWorkoutPlanService workoutPlanService,
        IGymSettingsService gymSettings,
        IWorkoutPlanAuditService audit)
    {
        _unitOfWork = unitOfWork;
        _workoutPlanService = workoutPlanService;
        _gymSettings = gymSettings;
        _audit = audit;
    }

    public async Task<IReadOnlyList<WorkoutPlanDto>> ListForMemberAsync(int memberUserId, CancellationToken ct = default)
    {
        var plans = await _unitOfWork.WorkoutPlans.FindAsync(p =>
            p.PlanType == WorkoutPlanTypes.Personal
            && p.AssignedToUserId == memberUserId
            && !p.IsDeleted);

        var result = new List<WorkoutPlanDto>();
        foreach (var plan in plans.OrderByDescending(p => p.CreatedDate))
        {
            var dto = await _workoutPlanService.GetWorkoutPlanByIdAsync(plan.Id);
            if (dto != null)
                result.Add(dto);
        }

        return result;
    }

    public async Task<WorkoutPlanDto?> CreateForMemberAsync(
        int memberUserId,
        CreatePersonalWorkoutPlanDto dto,
        int performedByUserId,
        string performedByUserName,
        CancellationToken ct = default)
    {
        await _gymSettings.EnsureMemberCanCreatePersonalPlanAsync(memberUserId, ct);

        var createDto = new CreateWorkoutPlanDto
        {
            Name = dto.Name,
            Description = dto.Description,
            WorkoutType = dto.WorkoutType,
            Duration = dto.Duration,
            DifficultyLevel = dto.DifficultyLevel,
            Goal = dto.Goal,
            DurationDays = dto.DurationDays,
            WorkoutsPerWeek = dto.WorkoutsPerWeek,
            CreatedById = memberUserId,
            CreatorType = CreatorType.User,
            IsPublic = false,
            Status = "Active",
        };

        var plan = await _workoutPlanService.CreateWorkoutPlanAsync(createDto);
        var entity = await _unitOfWork.WorkoutPlans.GetByIdAsync(plan.Id);
        if (entity == null)
            return null;

        entity.PlanType = WorkoutPlanTypes.Personal;
        entity.AssignedToUserId = memberUserId;
        _unitOfWork.WorkoutPlans.Update(entity);
        await _unitOfWork.SaveChangesAsync();

        await _audit.LogAsync(
            WorkoutPlanAuditAction.Created,
            entity.Id,
            entity.Name,
            memberUserId,
            performedByUserId,
            performedByUserName,
            changeDetails: $"Created personal workout plan \"{entity.Name}\".",
            ct: ct);

        return await _workoutPlanService.GetWorkoutPlanByIdAsync(entity.Id);
    }
}
