namespace GymManagement.Core.DTOs;

public class UsernameAvailabilityDto
{
    public bool IsAvailable { get; set; }
    public string? ValidationError { get; set; }
    public int? ExistingUserId { get; set; }
    public string? ExistingUserName { get; set; }
}
