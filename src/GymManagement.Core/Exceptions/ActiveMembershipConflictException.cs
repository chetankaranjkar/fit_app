using GymManagement.Core.DTOs;

namespace GymManagement.Core.Exceptions;

/// <summary>409 — member already has a row with <c>Status = Active</c>.</summary>
public sealed class ActiveMembershipConflictException : DomainException
{
    public ActiveMembershipConflictException(ActiveMembershipConflictDto details)
        : base(details.Message)
    {
        Details = details;
    }

    public ActiveMembershipConflictDto Details { get; }
}
