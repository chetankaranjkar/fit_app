namespace GymManagement.Core.DTOs
{
    public class CompromisedSessionDto
    {
        public int AuthUserId { get; set; }
        public int? UserId { get; set; }
        public string Email { get; set; } = string.Empty;
        public string FullName { get; set; } = string.Empty;
        public DateTime CompromisedAt { get; set; }
        public DateTime? LastLoginTime { get; set; }
        public string? LastLoginIpAddress { get; set; }
    }
}
