namespace GymManagement.Domain.Entities
{
    public class UserAchievement
    {
        public int Id { get; set; }
        public int UserId { get; set; }
        public string? AchievementType { get; set; }
        public DateTime AchievementDate { get; set; }

        public User User { get; set; } = null!;
    }
}
