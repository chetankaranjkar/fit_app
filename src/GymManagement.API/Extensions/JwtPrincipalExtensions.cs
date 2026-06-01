using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;

namespace GymManagement.API.Extensions;

/// <summary>Resolve JWT subject (AuthUsers.Id) from <see cref="ClaimsPrincipal"/> with inbound-claim mapping fallbacks.</summary>
public static class JwtPrincipalExtensions
{
    public static int? GetAuthUserId(this ClaimsPrincipal? user)
    {
        if (user?.Identity?.IsAuthenticated != true)
            return null;

        var sub =
            user.FindFirstValue(JwtRegisteredClaimNames.Sub)
            ?? user.FindFirstValue(ClaimTypes.NameIdentifier)
            ?? user.FindFirstValue(ClaimTypes.Name)
            ?? user.Identity?.Name;

        return int.TryParse(sub, out var authUserId) && authUserId > 0 ? authUserId : null;
    }
}
