using System.ComponentModel.DataAnnotations;

namespace GymManagement.Domain.Entities
{
    /// <summary>Immutable audit trail for billing, payments, waive-offs, voids, and refunds.</summary>
    public class FinancialAuditLog : BaseEntity
    {
        [Required]
        [MaxLength(80)]
        public string EntityType { get; set; } = string.Empty;

        public int EntityId { get; set; }

        [Required]
        [MaxLength(80)]
        public string Action { get; set; } = string.Empty;

        public int? ActorUserId { get; set; }

        [MaxLength(4000)]
        public string? DetailsJson { get; set; }

        public int? MembershipPaymentId { get; set; }
        public int? UserId { get; set; }
    }
}
