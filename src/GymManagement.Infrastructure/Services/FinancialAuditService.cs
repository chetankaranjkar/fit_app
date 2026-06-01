using GymManagement.Core.Services;
using GymManagement.Domain.Entities;
using GymManagement.Infrastructure.Data;

namespace GymManagement.Infrastructure.Services
{
    public sealed class FinancialAuditService : IFinancialAuditService
    {
        private readonly ApplicationDbContext _db;

        public FinancialAuditService(ApplicationDbContext db) => _db = db;

        public async Task LogAsync(
            string entityType,
            int entityId,
            string action,
            int? actorUserId,
            int? membershipPaymentId = null,
            int? userId = null,
            string? detailsJson = null,
            CancellationToken cancellationToken = default)
        {
            await _db.FinancialAuditLogs.AddAsync(new FinancialAuditLog
            {
                EntityType = entityType,
                EntityId = entityId,
                Action = action,
                ActorUserId = actorUserId,
                MembershipPaymentId = membershipPaymentId,
                UserId = userId,
                DetailsJson = detailsJson,
                CreatedDate = DateTime.UtcNow,
            }, cancellationToken);
            await _db.SaveChangesAsync(cancellationToken);
        }
    }
}
