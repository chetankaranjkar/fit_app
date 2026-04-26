using System.Linq;
using GymManagement.Core.DTOs;
using GymManagement.Core.Services;

namespace GymManagement.API.Middleware;

/// <summary>
/// After JWT authentication: attaches effective permissions to <see cref="HttpContext.Items"/>.
/// Prefer <see cref="JwtClaimTypes.Permission"/> claims on the token (no DB); if no such claims exist (legacy tokens),
/// loads from <see cref="IRbacService"/> using profile <c>Users.Id</c>.
/// </summary>
public sealed class PermissionResolutionMiddleware
{
    public const string EffectivePermissionsKey = "EffectivePermissions";
    public const string EffectivePermissionCodesKey = "EffectivePermissionCodes";

    private readonly RequestDelegate _next;

    public PermissionResolutionMiddleware(RequestDelegate next) => _next = next;

    public async Task InvokeAsync(HttpContext context, IRbacService rbac)
    {
        if (context.User?.Identity?.IsAuthenticated == true)
        {
            var fromClaims = context.User
                .FindAll(JwtClaimTypes.Permission)
                .Select(c => c.Value)
                .Where(s => !string.IsNullOrWhiteSpace(s))
                .Select(s => s.Trim())
                .Distinct(StringComparer.OrdinalIgnoreCase)
                .OrderBy(c => c, StringComparer.OrdinalIgnoreCase)
                .ToList();

            if (fromClaims.Count > 0)
            {
                context.Items[EffectivePermissionCodesKey] = new HashSet<string>(fromClaims, StringComparer.OrdinalIgnoreCase);
                context.Items[EffectivePermissionsKey] = fromClaims
                    .Select(code => new PermissionDto { Id = 0, Code = code, Name = code })
                    .ToList();
            }
            else
            {
                var profileUserId = ResolveProfileUserId(context);

                IReadOnlyList<PermissionDto> list;
                if (profileUserId.HasValue)
                    list = await rbac.GetUserPermissionsAsync(profileUserId.Value);
                else
                    list = Array.Empty<PermissionDto>();

                context.Items[EffectivePermissionsKey] = list;
                context.Items[EffectivePermissionCodesKey] = new HashSet<string>(
                    list.Select(p => p.Code), StringComparer.OrdinalIgnoreCase);
            }
        }

        await _next(context);
    }

    private static int? ResolveProfileUserId(HttpContext context)
    {
        if (context.Items.TryGetValue(JwtUserContextMiddleware.ProfileUserIdKey, out var item) && item is int id)
            return id;

        var claim = context.User?.FindFirst(JwtClaimTypes.UserId)?.Value;
        if (!string.IsNullOrEmpty(claim) && int.TryParse(claim, out var fromClaim))
            return fromClaim;

        return null;
    }
}

public static class PermissionResolutionMiddlewareExtensions
{
    /// <summary>Loads RBAC permissions for the authenticated user and stores them on <see cref="HttpContext.Items"/>.</summary>
    public static IApplicationBuilder UsePermissionResolution(this IApplicationBuilder app) =>
        app.UseMiddleware<PermissionResolutionMiddleware>();
}
