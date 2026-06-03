using GymManagement.Core.DTOs;
using GymManagement.Domain.Entities;

namespace GymManagement.Core.Services
{
    public interface IMembershipAuditService
    {
        Task LogAsync(
            int membershipId,
            MembershipAuditAction action,
            int performedByUserId,
            string? oldValue = null,
            string? newValue = null,
            CancellationToken ct = default);

        Task<IReadOnlyList<MembershipAuditLogDto>> ListAsync(
            int? membershipId = null,
            int? userId = null,
            CancellationToken ct = default);
    }
}
