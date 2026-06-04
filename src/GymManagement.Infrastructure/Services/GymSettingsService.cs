using GymManagement.Core.DTOs;
using GymManagement.Core.Services;
using GymManagement.Domain.Entities;
using GymManagement.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace GymManagement.Infrastructure.Services;

public sealed class GymSettingsService : IGymSettingsService
{
    private readonly ApplicationDbContext _db;

    public GymSettingsService(ApplicationDbContext db) => _db = db;

    public async Task<GymSettingsDto> GetAsync(CancellationToken ct = default)
    {
        var row = await _db.GymSettings.AsNoTracking().FirstOrDefaultAsync(s => s.Id == 1, ct);
        if (row == null)
            return new GymSettingsDto();

        return new GymSettingsDto
        {
            AllowMemberWorkoutPlanCreation = row.AllowMemberWorkoutPlanCreation,
            MaxPersonalWorkoutPlansPerMember = row.MaxPersonalWorkoutPlansPerMember,
        };
    }

    public async Task EnsureMemberCanCreatePersonalPlanAsync(int memberUserId, CancellationToken ct = default)
    {
        var settings = await GetAsync(ct);
        if (!settings.AllowMemberWorkoutPlanCreation)
            throw new InvalidOperationException("Personal workout plan creation is disabled for this gym.");

        if (settings.MaxPersonalWorkoutPlansPerMember < 0)
            return;

        var count = await _db.WorkoutPlans.AsNoTracking()
            .CountAsync(
                p => p.PlanType == WorkoutPlanTypes.Personal
                    && p.AssignedToUserId == memberUserId
                    && !p.IsDeleted,
                ct);

        if (count >= settings.MaxPersonalWorkoutPlansPerMember)
        {
            throw new InvalidOperationException(
                settings.MaxPersonalWorkoutPlansPerMember == 1
                    ? "This member already has a personal workout plan."
                    : $"Member cannot have more than {settings.MaxPersonalWorkoutPlansPerMember} personal workout plan(s).");
        }
    }
}
