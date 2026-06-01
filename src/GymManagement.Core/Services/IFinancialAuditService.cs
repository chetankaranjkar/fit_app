namespace GymManagement.Core.Services
{
    public interface IFinancialAuditService
    {
        Task LogAsync(
            string entityType,
            int entityId,
            string action,
            int? actorUserId,
            int? membershipPaymentId = null,
            int? userId = null,
            string? detailsJson = null,
            CancellationToken cancellationToken = default);
    }
}
