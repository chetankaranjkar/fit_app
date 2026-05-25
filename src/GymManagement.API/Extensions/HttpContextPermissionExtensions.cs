using GymManagement.API.Middleware;
using GymManagement.Core.DTOs;
using Microsoft.AspNetCore.Http;

namespace GymManagement.API.Extensions;

/// <summary>Access to effective permissions attached by <see cref="PermissionResolutionMiddleware"/> (JWT + live DB merge).</summary>
public static class HttpContextPermissionExtensions
{
    public static IReadOnlyList<PermissionDto> GetEffectivePermissions(this HttpContext httpContext)
    {
        if (httpContext.Items.TryGetValue(PermissionResolutionMiddleware.EffectivePermissionsKey, out var v)
            && v is IReadOnlyList<PermissionDto> list)
            return list;
        return Array.Empty<PermissionDto>();
    }

    /// <summary>Whether the current request has the given permission code (case-insensitive).</summary>
    public static bool HasPermission(this HttpContext httpContext, string permissionCode)
    {
        if (string.IsNullOrWhiteSpace(permissionCode))
            return false;
        if (httpContext.Items.TryGetValue(PermissionResolutionMiddleware.EffectivePermissionCodesKey, out var v)
            && v is HashSet<string> codes)
            return codes.Contains(permissionCode);
        return false;
    }
}
