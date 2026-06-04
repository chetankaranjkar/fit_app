using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using GymManagement.Core.Services;

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

    public static int? GetProfileUserId(this ClaimsPrincipal? user)
    {
        if (user?.Identity?.IsAuthenticated != true)
            return null;

        var profileClaim = user.FindFirst(JwtClaimTypes.UserId)?.Value;
        if (!string.IsNullOrWhiteSpace(profileClaim)
            && int.TryParse(profileClaim.Trim(), out var profileId)
            && profileId > 0)
            return profileId;

        var legacy = user.FindFirst("uid")?.Value ?? user.FindFirst("user_id")?.Value;
        if (int.TryParse(legacy, out var id) && id > 0)
            return id;

        return null;
    }

    public static IReadOnlyList<string> GetAppRoleNames(this ClaimsPrincipal? user)
    {
        if (user?.Identity?.IsAuthenticated != true)
            return Array.Empty<string>();

        return user.FindAll(ClaimTypes.Role)
            .Select(c => c.Value)
            .Where(v => !string.IsNullOrWhiteSpace(v))
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .ToList();
    }
}
