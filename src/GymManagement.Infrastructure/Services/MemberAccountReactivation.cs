using GymManagement.Core.Interfaces;

namespace GymManagement.Infrastructure.Services;

/// <summary>
/// When a member receives a new membership, their user account should be active again.
/// </summary>
internal static class MemberAccountReactivation
{
    public static async Task EnsureActiveForNewMembershipAsync(IUnitOfWork unitOfWork, int userId)
    {
        var user = await unitOfWork.Users.GetByIdAsync(userId);
        if (user == null || user.IsDeleted || user.IsActive)
            return;

        user.IsActive = true;
        unitOfWork.Users.Update(user);
        await unitOfWork.SaveChangesAsync();
    }
}
