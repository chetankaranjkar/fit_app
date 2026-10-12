namespace GymManagement.Core.DTOs;

/// <summary>
/// One current member on a program roster. Only basic assignment fields — no contact, billing, or health data.
/// </summary>
public sealed class ProgramRosterMemberDto
{
    public int UserId { get; set; }
    public string MemberName { get; set; } = string.Empty;
    /// <summary>Coach display name, "No coach assigned", or "Assigned to another coach".</summary>
    public string CoachLabel { get; set; } = string.Empty;
    public DateTime AssignmentStartedAt { get; set; }
    /// <summary>Null while the assignment is current. Ended or replaced assignments are omitted.</summary>
    public DateTime? AssignmentEndedAt { get; set; }
    public bool CanOpenProfile { get; set; }
}

public sealed class ProgramAssignedMembersDto
{
    public IReadOnlyList<ProgramRosterMemberDto> Items { get; set; } = Array.Empty<ProgramRosterMemberDto>();
    public int TotalCount { get; set; }
    public int Page { get; set; }
    public int PageSize { get; set; }
    public int TotalPages { get; set; }
    /// <summary>True when the caller lacks UsersAccess, so profile links are limited to their active clients.</summary>
    public bool ProfileAccessLimited { get; set; }
}
