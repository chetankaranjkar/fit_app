namespace GymManagement.Core.DTOs
{
    public class TrainerFeedbackDto
    {
        public int Id { get; set; }
        public int TrainerId { get; set; }
        public string TrainerName { get; set; } = string.Empty;
        public int UserId { get; set; }
        public string UserName { get; set; } = string.Empty;
        public int Rating { get; set; }
        public string? Feedback { get; set; }
        public string? Comments { get; set; }
        public DateTime FeedbackDate { get; set; }
    }

    public class CreateTrainerFeedbackDto
    {
        public int TrainerId { get; set; }
        public int UserId { get; set; }
        public int Rating { get; set; }
        public string? Feedback { get; set; }
        public string? Comments { get; set; }
    }

    public class UpdateTrainerFeedbackDto
    {
        public int? Rating { get; set; }
        public string? Feedback { get; set; }
        public string? Comments { get; set; }
    }
}

