namespace GymManagement.Core.DTOs
{
    public class UserInstructorDto
    {
        public int Id { get; set; }
        public int UserId { get; set; }
        public string UserName { get; set; } = string.Empty;
        public int TrainerId { get; set; }
        public string TrainerName { get; set; } = string.Empty;
        public DateTime AssignmentDate { get; set; }
        public DateTime? EndDate { get; set; }
        public bool IsActive { get; set; }
        public string? Notes { get; set; }
    }

    public class CreateUserInstructorDto
    {
        public int UserId { get; set; }
        public int TrainerId { get; set; }
        public DateTime? AssignmentDate { get; set; }
        public string? Notes { get; set; }
    }

    public class UpdateUserInstructorDto
    {
        public DateTime? EndDate { get; set; }
        public bool? IsActive { get; set; }
        public string? Notes { get; set; }
    }

    public class TrainerAssignmentRecommendationDto
    {
        public int TrainerId { get; set; }
        public string TrainerName { get; set; } = string.Empty;
        public string AvailabilityStatus { get; set; } = "Unknown";
        public int ActiveClients { get; set; }
        public int MaxActiveClients { get; set; }
        public int RemainingCapacity { get; set; }
        public int ConflictCount { get; set; }
        public bool IsRecommended { get; set; }
        public List<string> Warnings { get; set; } = new();
    }
}

