using GymManagement.Core.DTOs;
using GymManagement.Domain.Entities;

namespace GymManagement.Core.Validation;



/// <summary>

/// At most one <see cref="MembershipStatus.Active"/> row per member (enforced in app + database).

/// Expired, Cancelled, and Voided do not block a new Active membership.

/// </summary>

public static class UserMembershipRules

{

    public const string DuplicateActiveMembershipMessage = UserMembershipConflictCodes.Message;



    /// <summary>True when assigning this status would occupy the single Active slot.</summary>

    public static bool RequiresExclusiveActiveSlot(MembershipStatus status) =>

        status == MembershipStatus.Active;



    public static int ComputeRemainingDays(DateTime endDate, DateTime? asOfUtc = null)

    {

        var today = (asOfUtc ?? DateTime.UtcNow).Date;

        return Math.Max(0, (endDate.Date - today).Days);

    }



    public static readonly MembershipStatus[] OccupyingStatuses =

    {

        MembershipStatus.Active,

        MembershipStatus.ActivePendingPayment,

        MembershipStatus.PartialPayment,

        MembershipStatus.Frozen,

        MembershipStatus.Pending,

        MembershipStatus.VoidPending,

    };



    /// <summary>True when this status counts as an in-flight membership (blocks another create).</summary>

    public static bool OccupiesMembershipSlot(MembershipStatus status) =>

        OccupyingStatuses.Contains(status);



    /// <summary>Statuses excluded from active-member KPIs and revenue attribution.</summary>

    public static bool IsTerminalForReporting(MembershipStatus status) =>

        status is MembershipStatus.Voided

            or MembershipStatus.Cancelled

            or MembershipStatus.Transferred;

    /// <summary>Machine-readable scan denial when membership does not allow gym entry.</summary>
    public const string GymCheckInDeniedErrorCode = "membership_expired";

    /// <summary>Statuses that allow QR / venue check-in when end date is still valid.</summary>
    public static readonly MembershipStatus[] GymCheckInAllowedStatuses =
    {
        MembershipStatus.Active,
        MembershipStatus.ActivePendingPayment,
        MembershipStatus.PartialPayment,
    };

    /// <summary>
    /// True when the member may check in: valid end date and paid / in-progress membership.
    /// </summary>
    public static bool AllowsGymCheckIn(MembershipStatus status, DateTime endDate, DateTime? asOfUtc = null)
    {
        var today = (asOfUtc ?? DateTime.UtcNow).Date;
        if (endDate.Date < today)
            return false;
        return GymCheckInAllowedStatuses.Contains(status);
    }

}

