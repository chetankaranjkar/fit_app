using GymManagement.API.Middleware;
using Microsoft.AspNetCore.Http;

namespace GymManagement.API.Extensions;

/// <summary>Typed access to JWT context attached by <see cref="JwtUserContextMiddleware"/>.</summary>
public static class HttpContextJwtExtensions
{
    public static int? GetJwtAuthUserId(this HttpContext httpContext) =>
        httpContext.Items.TryGetValue(JwtUserContextMiddleware.AuthUserIdKey, out var v) && v is int id ? id : null;

    public static int? GetJwtProfileUserId(this HttpContext httpContext) =>
        httpContext.Items.TryGetValue(JwtUserContextMiddleware.ProfileUserIdKey, out var v) && v is int id ? id : null;

    public static IReadOnlyList<string> GetJwtRoles(this HttpContext httpContext) =>
        httpContext.Items.TryGetValue(JwtUserContextMiddleware.RolesKey, out var v) && v is string[] arr
            ? arr
            : Array.Empty<string>();
}
