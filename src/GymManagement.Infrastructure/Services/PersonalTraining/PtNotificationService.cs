using GymManagement.Core.DTOs.PersonalTraining;
using GymManagement.Core.Services.PersonalTraining;
using GymManagement.Domain.Entities.PersonalTraining;
using GymManagement.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace GymManagement.Infrastructure.Services.PersonalTraining
{
    public sealed class PtNotificationService : IPtNotificationService
    {
        private readonly ApplicationDbContext _db;

        public PtNotificationService(ApplicationDbContext db) => _db = db;

        public async Task<IReadOnlyList<PTNotificationDto>> GetForUserAsync(int? userId, int? trainerId, bool unreadOnly, CancellationToken ct = default)
        {
            var query = _db.PTNotifications.AsNoTracking().Where(n => !n.IsDeleted);
            if (userId.HasValue) query = query.Where(n => n.UserId == userId);
            if (trainerId.HasValue) query = query.Where(n => n.TrainerId == trainerId);
            if (unreadOnly) query = query.Where(n => !n.IsRead);
            var list = await query.OrderByDescending(n => n.CreatedDate).Take(100).ToListAsync(ct);
            return list.Select(n => new PTNotificationDto
            {
                Id = n.Id,
                NotificationType = n.NotificationType,
                Title = n.Title,
                Body = n.Body,
                IsRead = n.IsRead,
                ScheduledForUtc = n.ScheduledForUtc,
                CreatedDate = n.CreatedDate,
            }).ToList();
        }

        public async Task MarkReadAsync(int id, CancellationToken ct = default)
        {
            var n = await _db.PTNotifications.FirstOrDefaultAsync(x => x.Id == id && !x.IsDeleted, ct);
            if (n == null) return;
            n.IsRead = true;
            n.UpdatedDate = DateTime.UtcNow;
            await _db.SaveChangesAsync(ct);
        }

        public static async Task EnqueueAsync(ApplicationDbContext db, PTNotificationType type, string title, string? body, int? userId, int? trainerId, int? sessionId, int? packageId, DateTime? scheduledFor, CancellationToken ct)
        {
            await db.PTNotifications.AddAsync(new PTNotification
            {
                NotificationType = type,
                Title = title,
                Body = body,
                UserId = userId,
                TrainerId = trainerId,
                PTSessionId = sessionId,
                MemberPTPackageId = packageId,
                ScheduledForUtc = scheduledFor,
                Channel = "InApp",
            }, ct);
            await db.SaveChangesAsync(ct);
        }
    }
}
