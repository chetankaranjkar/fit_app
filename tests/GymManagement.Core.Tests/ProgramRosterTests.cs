using System.Reflection;
using GymManagement.Core.DTOs;
using GymManagement.Core.Programs;
using Xunit;

namespace GymManagement.Core.Tests;

public sealed class ProgramRosterTests
{
    private static readonly DateTime Monday = new(2026, 10, 5, 8, 0, 0, DateTimeKind.Utc);
    private static readonly DateTime Wednesday = new(2026, 10, 7, 8, 0, 0, DateTimeKind.Utc);

    [Fact]
    public void Duplicate_schedule_slots_collapse_to_one_member_with_the_earliest_start()
    {
        var rows = ProgramRoster.Build(
            new[]
            {
                Slot(10, "Chetan Karanjkar", Wednesday),
                Slot(10, "Chetan Karanjkar", Monday),
                Slot(11, "Asha Rao", Wednesday),
            },
            Array.Empty<ProgramRosterCoach>(),
            hasFullUsersAccess: true,
            callerTrainerProfileId: 4);

        Assert.Equal(2, rows.Count);
        var chetan = Assert.Single(rows, r => r.UserId == 10);
        Assert.Equal(Monday, chetan.AssignmentStartedAt);
        Assert.Null(chetan.AssignmentEndedAt);
        Assert.Equal("Chetan Karanjkar", chetan.MemberName);
    }

    [Fact]
    public void Ended_deleted_and_replaced_assignments_are_excluded()
    {
        var rows = ProgramRoster.Build(
            new[]
            {
                Slot(10, "Current", Monday, isActive: true),
                Slot(20, "Replaced", Monday, isActive: false),
                Slot(30, "Deleted", Monday, isDeleted: true),
            },
            Array.Empty<ProgramRosterCoach>(),
            hasFullUsersAccess: true,
            callerTrainerProfileId: null);

        var only = Assert.Single(rows);
        Assert.Equal(10, only.UserId);
    }

    [Fact]
    public void Full_access_opens_every_profile_even_when_the_caller_also_has_a_trainer_profile()
    {
        var rows = ProgramRoster.Build(
            new[] { Slot(10, "Own", Monday), Slot(11, "Other", Monday), Slot(12, "None", Monday) },
            new[]
            {
                Coach(10, trainerId: 4, "Sam Williams"),
                Coach(11, trainerId: 9, "Priya Shah"),
            },
            hasFullUsersAccess: true,
            callerTrainerProfileId: 4);

        Assert.All(rows, r => Assert.True(r.CanOpenProfile));
        Assert.Equal("Sam Williams", rows.Single(r => r.UserId == 10).CoachLabel);
        Assert.Equal("Priya Shah", rows.Single(r => r.UserId == 11).CoachLabel);
        Assert.Equal(ProgramRoster.NoCoachAssigned, rows.Single(r => r.UserId == 12).CoachLabel);
    }

    [Fact]
    public void Restricted_trainer_opens_only_actively_assigned_members_and_hides_other_coach_names()
    {
        var rows = ProgramRoster.Build(
            new[] { Slot(10, "Own", Monday), Slot(11, "Other", Monday), Slot(12, "None", Monday), Slot(13, "Ended", Monday) },
            new[]
            {
                Coach(10, trainerId: 4, "Sam Williams"),
                Coach(11, trainerId: 9, "Priya Shah"),
                Coach(13, trainerId: 4, "Sam Williams", endDate: Monday.AddDays(1), isActive: false),
            },
            hasFullUsersAccess: false,
            callerTrainerProfileId: 4);

        var own = rows.Single(r => r.UserId == 10);
        Assert.True(own.CanOpenProfile);
        Assert.Equal("Sam Williams", own.CoachLabel);

        var other = rows.Single(r => r.UserId == 11);
        Assert.False(other.CanOpenProfile);
        Assert.Equal(ProgramRoster.AssignedToAnotherCoach, other.CoachLabel);
        Assert.DoesNotContain("Priya", other.CoachLabel);

        Assert.False(rows.Single(r => r.UserId == 12).CanOpenProfile);
        Assert.Equal(ProgramRoster.NoCoachAssigned, rows.Single(r => r.UserId == 12).CoachLabel);

        var ended = rows.Single(r => r.UserId == 13);
        Assert.False(ended.CanOpenProfile);
        Assert.Equal(ProgramRoster.NoCoachAssigned, ended.CoachLabel);
    }

    [Fact]
    public void Shared_program_membership_does_not_grant_profile_access()
    {
        var rows = ProgramRoster.Build(
            new[] { Slot(10, "Peer", Monday), Slot(11, "Caller client", Monday) },
            new[] { Coach(11, trainerId: 4, "Sam Williams") },
            hasFullUsersAccess: false,
            callerTrainerProfileId: 4);

        Assert.False(rows.Single(r => r.UserId == 10).CanOpenProfile);
        Assert.True(rows.Single(r => r.UserId == 11).CanOpenProfile);
    }

    [Fact]
    public void Roster_member_dto_exposes_only_basic_assignment_fields()
    {
        var names = typeof(ProgramRosterMemberDto)
            .GetProperties(BindingFlags.Public | BindingFlags.Instance)
            .Select(p => p.Name)
            .OrderBy(n => n, StringComparer.Ordinal)
            .ToArray();

        Assert.Equal(
            new[]
            {
                "AssignmentEndedAt",
                "AssignmentStartedAt",
                "CanOpenProfile",
                "CoachLabel",
                "MemberName",
                "UserId",
            },
            names);
    }

    private static ProgramRosterSlot Slot(
        int userId,
        string name,
        DateTime createdAt,
        bool isActive = true,
        bool isDeleted = false) =>
        new()
        {
            UserId = userId,
            MemberName = name,
            CreatedAt = createdAt,
            IsActive = isActive,
            IsDeleted = isDeleted,
        };

    private static ProgramRosterCoach Coach(
        int userId,
        int trainerId,
        string name,
        DateTime? endDate = null,
        bool isActive = true) =>
        new()
        {
            UserId = userId,
            TrainerId = trainerId,
            CoachName = name,
            AssignmentDate = Monday,
            EndDate = endDate,
            IsActive = isActive,
            IsDeleted = false,
        };
}
