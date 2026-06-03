using System.ComponentModel.DataAnnotations;

namespace GymManagement.Domain.Entities
{
    public class MembershipAuditLog : BaseEntity
    {
        public int MembershipId { get; set; }
        public MembershipAuditAction Action { get; set; }

        [MaxLength(4000)]
        public string? OldValue { get; set; }

        [MaxLength(4000)]
        public string? NewValue { get; set; }

        public int PerformedByUserId { get; set; }
        public DateTime PerformedDate { get; set; } = DateTime.UtcNow;

        [MaxLength(64)]
        public string? IPAddress { get; set; }

        [MaxLength(512)]
        public string? DeviceInfo { get; set; }

        public UserMembership Membership { get; set; } = null!;
        public User PerformedBy { get; set; } = null!;
    }
}
