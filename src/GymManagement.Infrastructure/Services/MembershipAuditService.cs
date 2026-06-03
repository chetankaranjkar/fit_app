using GymManagement.Core.DTOs;
using GymManagement.Core.Services;
using GymManagement.Domain.Entities;
using GymManagement.Infrastructure.Data;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;

namespace GymManagement.Infrastructure.Services
{
    public sealed class MembershipAuditService : IMembershipAuditService
    {
        private readonly ApplicationDbContext _db;
        private readonly IHttpContextAccessor _http;

        public MembershipAuditService(ApplicationDbContext db, IHttpContextAccessor http)
        {
            _db = db;
            _http = http;
        }

        public async Task LogAsync(
            int membershipId,
            MembershipAuditAction action,
            int performedByUserId,
            string? oldValue = null,
            string? newValue = null,
            CancellationToken ct = default)
        {
            var ctx = _http.HttpContext;
            var ip = ctx?.Connection.RemoteIpAddress?.ToString();
            var device = ctx?.Request.Headers.UserAgent.ToString();
            if (device?.Length > 512)
                device = device[..512];

            await _db.MembershipAuditLogs.AddAsync(new MembershipAuditLog
            {
                MembershipId = membershipId,
                Action = action,
                OldValue = oldValue,
                NewValue = newValue,
                PerformedByUserId = performedByUserId,
                PerformedDate = DateTime.UtcNow,
                IPAddress = ip,
                DeviceInfo = device,
                CreatedDate = DateTime.UtcNow,
            }, ct);
            await _db.SaveChangesAsync(ct);
        }

        public async Task<IReadOnlyList<MembershipAuditLogDto>> ListAsync(
            int? membershipId = null,
            int? userId = null,
            CancellationToken ct = default)
        {
            var q = _db.MembershipAuditLogs.AsNoTracking().AsQueryable();
            if (membershipId.HasValue)
                q = q.Where(l => l.MembershipId == membershipId.Value);
            else if (userId.HasValue)
            {
                var membershipIds = _db.UserMemberships.AsNoTracking()
                    .Where(m => m.UserId == userId.Value && !m.IsDeleted)
                    .Select(m => m.Id);
                q = q.Where(l => membershipIds.Contains(l.MembershipId));
            }

            var rows = await q
                .OrderByDescending(l => l.PerformedDate)
                .Take(500)
                .ToListAsync(ct);

            var userIds = rows.Select(r => r.PerformedByUserId).Distinct().ToList();
            var names = await _db.Users.AsNoTracking()
                .Where(u => userIds.Contains(u.Id))
                .Select(u => new { u.Id, Name = (u.FirstName + " " + u.LastName).Trim() })
                .ToDictionaryAsync(x => x.Id, x => x.Name, ct);

            return rows.Select(r => new MembershipAuditLogDto
            {
                Id = r.Id,
                MembershipId = r.MembershipId,
                Action = r.Action,
                OldValue = r.OldValue,
                NewValue = r.NewValue,
                PerformedByUserId = r.PerformedByUserId,
                PerformedByName = names.GetValueOrDefault(r.PerformedByUserId),
                PerformedDate = r.PerformedDate,
                IPAddress = r.IPAddress,
                DeviceInfo = r.DeviceInfo,
            }).ToList();
        }
    }
}
