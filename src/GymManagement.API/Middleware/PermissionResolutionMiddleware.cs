using System.Linq;
using GymManagement.Core.DTOs;
using GymManagement.Core.Services;

namespace GymManagement.API.Middleware;

/// <summary>
/// After JWT authentication: attaches effective permissions to <see cref="HttpContext.Items"/>.
/// Merges <see cref="JwtClaimTypes.Permission"/> claims with live DB permissions so new grants apply without re-login.
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
                .ToList();

            var profileUserId = ResolveProfileUserId(context);
            IReadOnlyList<PermissionDto> fromDb = Array.Empty<PermissionDto>();
            if (profileUserId.HasValue)
                fromDb = await rbac.GetUserPermissionsAsync(profileUserId.Value);

            var mergedCodes = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
            foreach (var code in fromClaims)
                mergedCodes.Add(code);
            foreach (var p in fromDb)
            {
                if (!string.IsNullOrWhiteSpace(p.Code))
                    mergedCodes.Add(p.Code.Trim());
            }

            // ADMIN role: allow any permission that exists in the system (covers newly added codes).
            if (context.User.IsInRole("ADMIN"))
            {
                var allCodes = await rbac.GetAllPermissionCodesAsync();
                foreach (var code in allCodes)
                    mergedCodes.Add(code);
            }

            context.Items[EffectivePermissionCodesKey] = mergedCodes;
            context.Items[EffectivePermissionsKey] = mergedCodes
                .OrderBy(c => c, StringComparer.OrdinalIgnoreCase)
                .Select(code =>
                {
                    var dto = fromDb.FirstOrDefault(p =>
                        string.Equals(p.Code, code, StringComparison.OrdinalIgnoreCase));
                    return dto ?? new PermissionDto { Id = 0, Code = code, Name = code };
                })
                .ToList();
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
