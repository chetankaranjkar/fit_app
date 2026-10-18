using GymManagement.Core.DTOs.LockerMgmt;
using GymManagement.Core.Services;
using GymManagement.Core.Services.LockerMgmt;
using GymManagement.Domain.Entities.LockerMgmt;
using GymManagement.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace GymManagement.Infrastructure.Services.LockerMgmt
{
    public class LockerAssignmentService : ILockerAssignmentService
    {
        private readonly ApplicationDbContext _db;
        private readonly IBranchAssignmentService _branches;
        private readonly IBranchScopeService _scope;

        public LockerAssignmentService(ApplicationDbContext db, IBranchAssignmentService branches, IBranchScopeService scope)
        {
            _db = db;
            _branches = branches;
            _scope = scope;
        }

        public async Task<IEnumerable<LockerAssignmentDto>> GetAllAsync()
        {
            var scope = await _scope.CurrentAsync();
            var list = await _db.Set<LockerAssignment>()
                .AsNoTracking()
                .Include(a => a.Locker)
                .OrderByDescending(a => a.AssignedDate)
                .ToListAsync();
            return list.Where(a => scope.Includes(a.BranchId)).Select(Map);
        }

        public async Task<IEnumerable<LockerAssignmentDto>> GetByUserIdAsync(int userId)
        {
            var user = await _db.Users.AsNoTracking()
                .Where(u => u.Id == userId && !u.IsDeleted)
                .Select(u => new { u.FirstName, u.LastName })
                .FirstOrDefaultAsync();
            if (user == null)
                return Array.Empty<LockerAssignmentDto>();

            var fullName = $"{user.FirstName} {user.LastName}".Trim();
            var normalizedName = fullName.ToLowerInvariant();

            var list = await _db.Set<LockerAssignment>()
                .AsNoTracking()
                .Include(a => a.Locker)
                .Where(a =>
                    a.UserId == userId
                    || (a.UserId == null
                        && normalizedName.Length > 0
                        && a.MemberName.ToLower() == normalizedName))
                .OrderByDescending(a => a.AssignedDate)
                .ToListAsync();

            var scope = await _scope.CurrentAsync();
            if (!scope.IsUnrestricted && userId != scope.ActorUserId)
                list = list.Where(a => scope.Includes(a.BranchId)).ToList();
            return list.Select(Map);
        }

        public async Task<LockerAssignmentDto?> GetByIdAsync(int id)
        {
            var entity = await _db.Set<LockerAssignment>()
                .AsNoTracking()
                .Include(a => a.Locker)
                .FirstOrDefaultAsync(a => a.Id == id);
            if (entity == null)
                return null;
            var scope = await _scope.CurrentAsync();
            if (!scope.IsUnrestricted && entity.UserId != scope.ActorUserId && !scope.Includes(entity.BranchId))
                return null;
            return Map(entity);
        }

        public async Task<LockerAssignmentDto> CreateAsync(CreateLockerAssignmentDto dto)
        {
            var locker = await _db.Set<Locker>().FirstOrDefaultAsync(l => l.Id == dto.LockerId)
                ?? throw new InvalidOperationException("Locker not found.");
            if (!(await _scope.CurrentAsync()).Includes(locker.BranchId))
                throw new InvalidOperationException("Locker not found.");

            string memberName;
            int? userId = null;
            if (dto.UserId is > 0)
            {
                var user = await _db.Users.AsNoTracking()
                    .FirstOrDefaultAsync(u => u.Id == dto.UserId.Value && !u.IsDeleted)
                    ?? throw new InvalidOperationException("Member not found.");
                userId = user.Id;
                memberName = $"{user.FirstName} {user.LastName}".Trim();
                if (string.IsNullOrWhiteSpace(memberName))
                    throw new InvalidOperationException("Member name is required.");
            }
            else
            {
                memberName = dto.MemberName?.Trim() ?? string.Empty;
                if (string.IsNullOrWhiteSpace(memberName))
                    throw new InvalidOperationException("Member name or user id is required.");
            }

            if (locker.BranchId is int lockerBranch && userId is int memberId && !await _branches.MembershipAllowsBranchAsync(memberId, lockerBranch))
                throw new InvalidOperationException("This member is not allowed to use a locker at that branch.");

            var entity = new LockerAssignment
            {
                LockerId = dto.LockerId,
                UserId = userId,
                MemberName = memberName,
                AssignedDate = dto.AssignedDate,
                ExpiryDate = dto.ExpiryDate,
                BranchId = locker.BranchId
            };
            _db.Set<LockerAssignment>().Add(entity);

            // Auto-transition the locker to OCCUPIED (unless under maintenance).
            if (locker.Status != "MAINTENANCE")
            {
                locker.Status = "OCCUPIED";
            }

            await _db.SaveChangesAsync();

            entity.Locker = locker;
            return Map(entity);
        }

        public async Task<bool> DeleteAsync(int id)
        {
            var entity = await _db.Set<LockerAssignment>()
                .Include(a => a.Locker)
                .FirstOrDefaultAsync(a => a.Id == id);
            if (entity == null || !(await _scope.CurrentAsync()).Includes(entity.BranchId)) return false;

            entity.IsDeleted = true;

            // If this was the last active (non-deleted) assignment on the locker and the
            // locker is not under maintenance, free it back up.
            var stillAssigned = await _db.Set<LockerAssignment>()
                .AnyAsync(a => a.LockerId == entity.LockerId && a.Id != entity.Id && !a.IsDeleted);
            if (!stillAssigned && entity.Locker != null && entity.Locker.Status == "OCCUPIED")
            {
                entity.Locker.Status = "AVAILABLE";
            }

            await _db.SaveChangesAsync();
            return true;
        }

        private static LockerAssignmentDto Map(LockerAssignment a)
        {
            var today = DateTime.UtcNow.Date;
            var expiryDate = a.ExpiryDate.Date;
            return new LockerAssignmentDto
            {
                Id = a.Id,
                LockerId = a.LockerId,
                LockerNumber = a.Locker?.LockerNumber ?? string.Empty,
                UserId = a.UserId,
                MemberName = a.MemberName,
                AssignedDate = a.AssignedDate,
                ExpiryDate = a.ExpiryDate,
                LockerStatus = a.Locker?.Status ?? string.Empty,
                AssignmentStatus = expiryDate >= today ? "Active" : "Expired",
            };
        }
    }
}
