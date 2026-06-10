using GymManagement.Domain.Entities;
using Xunit;

namespace GymManagement.Core.Tests;

public sealed class WarmupStretchAuditActionTests
{
    [Theory]
    [InlineData(WorkoutPlanAuditAction.WarmupCreated, 10)]
    [InlineData(WorkoutPlanAuditAction.WarmupUpdated, 11)]
    [InlineData(WorkoutPlanAuditAction.WarmupDeleted, 12)]
    [InlineData(WorkoutPlanAuditAction.StretchCreated, 13)]
    [InlineData(WorkoutPlanAuditAction.StretchUpdated, 14)]
    [InlineData(WorkoutPlanAuditAction.StretchDeleted, 15)]
    [InlineData(WorkoutPlanAuditAction.WarmupAddedToWorkout, 16)]
    [InlineData(WorkoutPlanAuditAction.WarmupRemovedFromWorkout, 17)]
    [InlineData(WorkoutPlanAuditAction.StretchAddedToWorkout, 18)]
    [InlineData(WorkoutPlanAuditAction.StretchRemovedFromWorkout, 19)]
    public void AuditActions_KeepStableNumericValues(WorkoutPlanAuditAction action, int expected)
    {
        Assert.Equal(expected, (int)action);
    }

    [Theory]
    [InlineData(WorkoutPlanAuditAction.CategoryCreated, 20)]
    [InlineData(WorkoutPlanAuditAction.CategoryUpdated, 21)]
    [InlineData(WorkoutPlanAuditAction.CategoryDeleted, 22)]
    [InlineData(WorkoutPlanAuditAction.WarmupAddedToCategory, 23)]
    [InlineData(WorkoutPlanAuditAction.WarmupRemovedFromCategory, 24)]
    [InlineData(WorkoutPlanAuditAction.StretchAddedToCategory, 25)]
    [InlineData(WorkoutPlanAuditAction.StretchRemovedFromCategory, 26)]
    [InlineData(WorkoutPlanAuditAction.WorkoutPlanAutoAssignmentChanged, 27)]
    public void CategoryAuditActions_KeepStableNumericValues(WorkoutPlanAuditAction action, int expected)
    {
        Assert.Equal(expected, (int)action);
    }

    [Fact]
    public void LegacyAuditActions_AreUnchanged()
    {
        Assert.Equal(0, (int)WorkoutPlanAuditAction.Created);
        Assert.Equal(5, (int)WorkoutPlanAuditAction.Deleted);
    }
}
