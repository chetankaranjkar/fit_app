using GymManagement.Core.DTOs;

namespace GymManagement.Core.Services
{
    public interface IUserProvisioningService
    {
        Task<(MemberProfileDto? Member, StaffProfileDto? Staff, TrainerDto? Trainer)> GetProfilesAsync(
            int userId,
            CancellationToken cancellationToken = default);
        Task AssignRoleAsync(int userId, string roleCode, CancellationToken cancellationToken = default);
        Task RevokeRoleAsync(int userId, string roleCode, CancellationToken cancellationToken = default);
        Task EnsureProfilesForUserAsync(int userId, CancellationToken cancellationToken = default);
        /// <summary>Maps legacy <c>UserTypes</c> to <c>UserRoles</c> and ensures profiles (idempotent).</summary>
        Task SyncFromUserTypeIdsAsync(int userId, IEnumerable<int>? userTypeIds, CancellationToken cancellationToken = default);
        Task EnsureMemberProfileAsync(int userId, CancellationToken cancellationToken = default);
        Task EnsureTrainerProfileAsync(int userId, TrainerProfileSeedDto? seed = null, CancellationToken cancellationToken = default);
        Task EnsureStaffProfileAsync(int userId, string? department = null, CancellationToken cancellationToken = default);
        Task SyncMemberProfileFromUserAsync(int userId, CancellationToken cancellationToken = default);
        Task SoftDeleteProfilesForUserAsync(int userId, CancellationToken cancellationToken = default);
    }
}
