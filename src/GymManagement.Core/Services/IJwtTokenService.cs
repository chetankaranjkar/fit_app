namespace GymManagement.Core.Services
{
    /// <summary>Creates signed JWT access tokens (HMAC-SHA256) using application configuration.</summary>
    public interface IJwtTokenService
    {
        /// <summary>
        /// Issues an access token: <c>sub</c> = <paramref name="authUserId"/>;
        /// <see cref="JwtClaimTypes.UserId"/> = profile id; <c>jti</c> = <paramref name="sessionId"/>;
        /// one <c>role</c> claim per entry in <paramref name="roles"/>;
        /// one <see cref="JwtClaimTypes.Permission"/> claim per distinct permission code in <paramref name="permissionCodes"/>.
        /// </summary>
        string CreateAccessToken(
            int authUserId,
            int? userId,
            IReadOnlyList<string> roles,
            IReadOnlyList<string> permissionCodes,
            string sessionId);
    }
}
