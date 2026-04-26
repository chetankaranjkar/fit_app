using GymManagement.Core.DTOs;
using GymManagement.Domain.Entities;

namespace GymManagement.Core.Services
{
    /// <summary>
    /// Authentication against <c>AuthUsers</c>: BCrypt passwords, JWT + refresh token stored on <c>AuthUsers</c>,
    /// application roles from <c>UserRoles</c>, audit rows in <see cref="LoginActivity"/>.
    /// </summary>
    public interface IAuthService
    {
        /// <summary>
        /// Validates email + password (BCrypt), issues JWT and refresh token, persists <c>RefreshToken</c> and <c>RefreshTokenExpiry</c> on <see cref="AuthUser"/>,
        /// writes success to <see cref="LoginActivity"/>.
        /// </summary>
        Task<LoginResponseDto?> LoginAsync(LoginDto loginDto);

        /// <summary>
        /// Validates refresh token and expiry against <see cref="AuthUser"/>; issues a new JWT using roles from <c>UserRoles</c> and rotates refresh token.
        /// </summary>
        Task<LoginResponseDto?> RefreshAsync(RefreshTokenDto dto);

        Task<bool> RegisterAsync(RegisterDto registerDto);

        /// <summary>Clears refresh token fields on <see cref="AuthUser"/>; sets <c>LogoutTime</c> on matching <see cref="LoginActivity"/> when the JWT session id is known.</summary>
        Task<bool> LogoutAsync();

        /// <summary>Returns accounts where refresh token reuse was detected and session was revoked.</summary>
        Task<IReadOnlyList<CompromisedSessionDto>> GetCompromisedSessionsAsync();
    }
}
