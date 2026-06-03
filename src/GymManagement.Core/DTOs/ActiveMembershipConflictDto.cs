using GymManagement.Domain.Entities;

namespace GymManagement.Core.DTOs;

/// <summary>Returned when a member already has an occupying membership (Active, pending payment, etc.).</summary>
public sealed class ActiveMembershipConflictDto
{
    public const string ErrorCode = "ACTIVE_MEMBERSHIP_EXISTS";

    public string Message { get; set; } = UserMembershipConflictCodes.Message;

    public int MembershipId { get; set; }
    public int UserId { get; set; }
    public string? PlanName { get; set; }
    public MembershipStatus ExistingStatus { get; set; }
    public DateTime StartDate { get; set; }
    public DateTime EndDate { get; set; }
    public int RemainingDays { get; set; }
}

public static class UserMembershipConflictCodes
{
    public const string Message = "Member already has an active or pending membership.";
}
