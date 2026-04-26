namespace GymManagement.Domain.Entities
{
    public class TrainerFeedback : BaseEntity
    {
        public int TrainerId { get; set; }
        public int UserId { get; set; }
        public int Rating { get; set; } // 1-5 scale
        public string? Feedback { get; set; }
        public string? Comments { get; set; }
        public DateTime FeedbackDate { get; set; } = DateTime.UtcNow;

        // Navigation properties
        public Trainer Trainer { get; set; } = null!;
        public User User { get; set; } = null!;
    }
}
