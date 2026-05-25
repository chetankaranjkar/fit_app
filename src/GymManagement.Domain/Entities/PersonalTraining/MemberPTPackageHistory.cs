using System.ComponentModel.DataAnnotations;

namespace GymManagement.Domain.Entities.PersonalTraining
{
    public class MemberPTPackageHistory : BaseEntity
    {
        public int MemberPTPackageId { get; set; }
        public MemberPTPackageHistoryAction Action { get; set; }
        public int? SessionsDelta { get; set; }
        public int? RemainingSessionsAfter { get; set; }
        public DateTime? ExpiryDateAfter { get; set; }

        [MaxLength(2000)]
        public string? Notes { get; set; }

        public int? PerformedByUserId { get; set; }

        public MemberPTPackage MemberPTPackage { get; set; } = null!;
    }
}
