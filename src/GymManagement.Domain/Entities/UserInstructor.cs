namespace GymManagement.Domain.Entities
{
    public class UserInstructor : BaseEntity
    {
        public int UserId { get; set; }
        public int TrainerId { get; set; }
        public DateTime AssignmentDate { get; set; } = DateTime.UtcNow;
        public DateTime? EndDate { get; set; }
        public bool IsActive { get; set; } = true;
        public string? Notes { get; set; }

        // Navigation properties
        public User User { get; set; } = null!;
        public Trainer Trainer { get; set; } = null!;
    }
}

