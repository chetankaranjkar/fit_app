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

}

