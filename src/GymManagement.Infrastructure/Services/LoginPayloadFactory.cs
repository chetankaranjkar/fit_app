using GymManagement.Core.DTOs;
using GymManagement.Core.Interfaces;
using GymManagement.Core.Services;
using GymManagement.Domain.Entities;

namespace GymManagement.Infrastructure.Services
{
    public sealed class LoginPayloadFactory : ILoginPayloadFactory
    {
        private readonly IUnitOfWork _unitOfWork;
        private readonly IRbacService _rbacService;

        public LoginPayloadFactory(IUnitOfWork unitOfWork, IRbacService rbacService)
        {
            _unitOfWork = unitOfWork;
            _rbacService = rbacService;
        }

        /// <inheritdoc />
        public async Task<LoginRbacPayload> BuildProfileAndRbacAsync(AuthUser authUser)
        {
            var profileUserId = await AuthUserRoleHelper.GetProfileUserIdAsync(_unitOfWork, authUser);
            if (!profileUserId.HasValue)
            {
                return new LoginRbacPayload
                {
                    Profile = null,
                    Roles = Array.Empty<AppRoleDto>(),
                    Permissions = Array.Empty<PermissionDto>()
                };
            }

            var user = await _unitOfWork.Users.GetByIdAsync(profileUserId.Value);
            if (user == null)
            {
                return new LoginRbacPayload
                {
                    Profile = null,
                    Roles = Array.Empty<AppRoleDto>(),
                    Permissions = Array.Empty<PermissionDto>()
                };
            }

            // Must run sequentially: both RBAC calls use the same scoped ApplicationDbContext (not safe in parallel).
            var roles = await _rbacService.GetUserAppRolesAsync(profileUserId.Value);
            var permissions = await _rbacService.GetUserPermissionsAsync(profileUserId.Value);

            var profile = MapUserProfile(user, authUser);

            return new LoginRbacPayload
            {
                Profile = profile,
                Roles = roles,
                Permissions = permissions
            };
        }

        private static UserProfileDto MapUserProfile(User user, AuthUser authUser)
        {
            return new UserProfileDto
            {
                Id = user.Id,
                FirstName = user.FirstName,
                LastName = user.LastName,
                Email = authUser.Email,
                Phone = user.Phone,
                DateOfBirth = user.DateOfBirth,
                Gender = user.Gender,
                RegistrationDate = user.RegistrationDate,
                IsActive = user.IsActive,
                OrganizationId = user.OrganizationId
            };
        }
    }
}
