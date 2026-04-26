using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using GymManagement.Core.Services;

namespace GymManagement.API.Middleware;

/// <summary>
/// Runs after JWT bearer authentication. Reads validated claims from <see cref="HttpContext.User"/>
/// and exposes AuthUserId, profile UserId, and role names on <see cref="HttpContext.Items"/> for convenience.
/// </summary>
public sealed class JwtUserContextMiddleware
{
    public const string AuthUserIdKey = "JwtAuthUserId";
    public const string ProfileUserIdKey = "JwtProfileUserId";
    public const string RolesKey = "JwtRoles";

    private readonly RequestDelegate _next;

    public JwtUserContextMiddleware(RequestDelegate next) => _next = next;

    public async Task InvokeAsync(HttpContext context)
    {
        if (context.User.Identity?.IsAuthenticated == true)
        {
            var sub = context.User.FindFirstValue(JwtRegisteredClaimNames.Sub)
                ?? context.User.FindFirstValue(ClaimTypes.Name);
            if (int.TryParse(sub, out var authUserId))
                context.Items[AuthUserIdKey] = authUserId;

            var userIdClaim = context.User.FindFirstValue(JwtClaimTypes.UserId);
            if (!string.IsNullOrEmpty(userIdClaim) && int.TryParse(userIdClaim, out var profileUserId))
                context.Items[ProfileUserIdKey] = profileUserId;

            var roles = context.User.FindAll(ClaimTypes.Role).Select(c => c.Value).ToArray();
            context.Items[RolesKey] = roles;
        }

        await _next(context);
    }
}

public static class JwtUserContextMiddlewareExtensions
{
    /// <summary>Registers middleware that populates JWT-derived values on <see cref="HttpContext.Items"/> after authentication.</summary>
    public static IApplicationBuilder UseJwtUserContext(this IApplicationBuilder app) =>
        app.UseMiddleware<JwtUserContextMiddleware>();
}
