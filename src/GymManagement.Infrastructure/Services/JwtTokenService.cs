using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using Microsoft.IdentityModel.Tokens;
using GymManagement.Core.Services;

namespace GymManagement.Infrastructure.Services
{
    /// <summary>
    /// Symmetric HMAC-SHA256 JWT issuer; reads signing key, issuer, audience, and lifetime from <see cref="IConfiguration"/> (<c>Jwt:*</c>).
    /// </summary>
    public sealed class JwtTokenService : IJwtTokenService
    {
        private readonly IConfiguration _configuration;
        private readonly ILogger<JwtTokenService> _logger;

        public JwtTokenService(IConfiguration configuration, ILogger<JwtTokenService> logger)
        {
            _configuration = configuration;
            _logger = logger;
        }

        /// <inheritdoc />
        public string CreateAccessToken(
            int authUserId,
            int? userId,
            IReadOnlyList<string> roles,
            IReadOnlyList<string> permissionCodes,
            string sessionId)
        {
            var keyBytes = Encoding.UTF8.GetBytes(GetSigningKey());
            var key = new SymmetricSecurityKey(keyBytes);
            var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

            var claims = new List<Claim>
            {
                new Claim(JwtRegisteredClaimNames.Sub, authUserId.ToString(), ClaimValueTypes.String),
                new Claim(JwtClaimTypes.UserId, userId?.ToString() ?? "", ClaimValueTypes.String),
                new Claim(JwtRegisteredClaimNames.Jti, sessionId, ClaimValueTypes.String)
            };

            foreach (var role in roles)
            {
                if (string.IsNullOrWhiteSpace(role))
                    continue;
                claims.Add(new Claim(ClaimTypes.Role, role.Trim(), ClaimValueTypes.String));
            }

            AddPermissionClaims(claims, permissionCodes);

            var token = new JwtSecurityToken(
                issuer: GetIssuer(),
                audience: GetAudience(),
                claims: claims,
                expires: DateTime.UtcNow.AddMinutes(GetAccessTokenMinutes()),
                signingCredentials: creds);

            return new JwtSecurityTokenHandler().WriteToken(token);
        }

        /// <summary>
        /// One <see cref="JwtClaimTypes.Permission"/> per distinct code; caps total claims via <c>Jwt:MaxPermissionClaims</c> to keep tokens small.
        /// </summary>
        private void AddPermissionClaims(List<Claim> claims, IReadOnlyList<string> permissionCodes)
        {
            if (permissionCodes == null || permissionCodes.Count == 0)
                return;

            var max = _configuration.GetValue("Jwt:MaxPermissionClaims", 128);
            var ordered = permissionCodes
                .Where(c => !string.IsNullOrWhiteSpace(c))
                .Select(c => c.Trim())
                .Distinct(StringComparer.OrdinalIgnoreCase)
                .OrderBy(c => c, StringComparer.OrdinalIgnoreCase)
                .ToList();

            if (ordered.Count > max)
            {
                _logger.LogWarning(
                    "Distinct permission codes ({Count}) exceed Jwt:MaxPermissionClaims ({Max}); only the first {Max} (alphabetically) are embedded in the JWT.",
                    ordered.Count,
                    max,
                    max);
                ordered = ordered.Take(max).ToList();
            }

            foreach (var code in ordered)
                claims.Add(new Claim(JwtClaimTypes.Permission, code, ClaimValueTypes.String));
        }

        private string GetSigningKey() =>
            _configuration["Jwt:Key"]
            ?? "YourSuperSecretKeyThatShouldBeAtLeast32CharactersLongForSecurity!";

        private string GetIssuer() =>
            _configuration["Jwt:Issuer"] ?? "GymManagement";

        private string GetAudience() =>
            _configuration["Jwt:Audience"] ?? "GymManagement";

        private int GetAccessTokenMinutes() =>
            _configuration.GetValue("Jwt:AccessTokenMinutes", 30);
    }
}
