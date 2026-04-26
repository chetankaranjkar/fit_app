namespace GymManagement.Domain.Entities
{
    public class UserSupplement
    {
        public int Id { get; set; }
        public int UserId { get; set; }
        public string? SupplementName { get; set; }
        public string? Dosage { get; set; }
        public string? Frequency { get; set; }
        public DateTime? StartDate { get; set; }
        public DateTime? EndDate { get; set; }

        public User User { get; set; } = null!;
    }
}
