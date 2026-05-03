using GymManagement.Core.DTOs;
using GymManagement.Core.Services;
using GymManagement.Domain.Entities;
using GymManagement.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace GymManagement.Infrastructure.Services;

public sealed class GymQrFloorWorkoutService : IGymQrFloorWorkoutService
{
    private readonly ApplicationDbContext _db;

    public GymQrFloorWorkoutService(ApplicationDbContext db)
    {
        _db = db;
    }

    public async Task<(Guid sessionId, DateTime startUtc)> EnsureSessionAfterScanAsync(
        int memberUserId,
        int branchId,
        CancellationToken cancellationToken = default)
    {
        var now = DateTime.UtcNow;
        var active = await _db.GymQrWorkoutSessions
            .FirstOrDefaultAsync(
                s => s.MemberUserId == memberUserId && s.BranchId == branchId && s.Status == "active",
                cancellationToken)
            .ConfigureAwait(false);

        if (active != null)
        {
            active.LastActivityAtUtc = now;
            await _db.SaveChangesAsync(cancellationToken).ConfigureAwait(false);
            return (active.Id, active.StartTimeUtc);
        }

        var session = new GymQrWorkoutSession
        {
            Id = Guid.NewGuid(),
            MemberUserId = memberUserId,
            BranchId = branchId,
            StartTimeUtc = now,
            LastActivityAtUtc = now,
            Status = "active",
        };
        _db.GymQrWorkoutSessions.Add(session);
        await _db.SaveChangesAsync(cancellationToken).ConfigureAwait(false);
        return (session.Id, session.StartTimeUtc);
    }

    public async Task<GymQrWorkoutLogResponseDto> AddLogAsync(
        int memberUserId,
        GymQrWorkoutLogRequestDto dto,
        CancellationToken cancellationToken = default)
    {
        var session = await _db.GymQrWorkoutSessions
            .FirstOrDefaultAsync(
                s => s.Id == dto.SessionId && s.MemberUserId == memberUserId && s.Status == "active",
                cancellationToken)
            .ConfigureAwait(false)
            ?? throw new InvalidOperationException("Active workout session was not found.");

        var name = (dto.ExerciseName ?? string.Empty).Trim();
        if (name.Length == 0) throw new InvalidOperationException("Exercise name is required.");
        if (dto.Reps < 0) throw new InvalidOperationException("Reps must be non-negative.");

        var now = DateTime.UtcNow;
        session.LastActivityAtUtc = now;

        var log = new GymQrWorkoutLog
        {
            SessionId = session.Id,
            ExerciseName = name.Length > 200 ? name[..200] : name,
            Reps = dto.Reps,
            Weight = dto.Weight,
            CreatedAtUtc = now,
        };
        _db.GymQrWorkoutLogs.Add(log);
        await _db.SaveChangesAsync(cancellationToken).ConfigureAwait(false);

        return new GymQrWorkoutLogResponseDto
        {
            LogId = log.Id,
            SessionId = session.Id,
            CreatedAtUtc = log.CreatedAtUtc,
        };
    }

    public async Task<bool> EndSessionAsync(int memberUserId, Guid sessionId, CancellationToken cancellationToken = default)
    {
        var session = await _db.GymQrWorkoutSessions
            .FirstOrDefaultAsync(
                s => s.Id == sessionId && s.MemberUserId == memberUserId && s.Status == "active",
                cancellationToken)
            .ConfigureAwait(false);
        if (session == null) return false;

        var now = DateTime.UtcNow;
        session.EndTimeUtc = now;
        session.Status = "completed";
        await _db.SaveChangesAsync(cancellationToken).ConfigureAwait(false);
        return true;
    }

    public async Task<int> ExpireInactiveSessionsAsync(CancellationToken cancellationToken = default)
    {
        var cutoff = DateTime.UtcNow.AddMinutes(-60);
        var stale = await _db.GymQrWorkoutSessions
            .Where(s => s.Status == "active" && s.LastActivityAtUtc < cutoff)
            .ToListAsync(cancellationToken)
            .ConfigureAwait(false);

        foreach (var s in stale)
        {
            s.Status = "completed";
            s.EndTimeUtc = s.LastActivityAtUtc.AddMinutes(60);
        }

        if (stale.Count == 0) return 0;
        await _db.SaveChangesAsync(cancellationToken).ConfigureAwait(false);
        return stale.Count;
    }
}
