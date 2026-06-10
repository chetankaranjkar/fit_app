using GymManagement.Core.Mobility;
using Xunit;

namespace GymManagement.Core.Tests;

public sealed class WorkoutMobilityValidationTests
{
    [Fact]
    public void EnsureUniqueIds_RejectsDuplicates()
    {
        Assert.Throws<InvalidOperationException>(() =>
            WorkoutMobilityValidation.EnsureUniqueIds(new[] { 1, 2, 2 }, "warmups"));
    }

    [Fact]
    public void EnsureUniqueDisplayOrders_RejectsDuplicates()
    {
        Assert.Throws<InvalidOperationException>(() =>
            WorkoutMobilityValidation.EnsureUniqueDisplayOrders(new[] { 1, 1, 2 }, "category"));
    }

    [Fact]
    public void EnsureCategoryRequired_RejectsMissingCategory()
    {
        Assert.Throws<InvalidOperationException>(() =>
            WorkoutMobilityValidation.EnsureCategoryRequired(null));
        Assert.Throws<InvalidOperationException>(() =>
            WorkoutMobilityValidation.EnsureCategoryRequired(0));
    }

    [Fact]
    public void EnsureCategoryRequired_AcceptsValidId()
    {
        WorkoutMobilityValidation.EnsureCategoryRequired(5);
    }
}
