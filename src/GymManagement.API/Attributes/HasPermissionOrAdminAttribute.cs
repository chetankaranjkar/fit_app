using System.Linq;
using GymManagement.Core.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;

namespace GymManagement.API.Attributes;

/// <summary>
/// Like <see cref="HasPermissionAttribute"/>, but allows users in the <c>ADMIN</c> app role without requiring the permission claim
/// (useful for configuration APIs where the role alone should suffice).
/// </summary>
[AttributeUsage(AttributeTargets.Class | AttributeTargets.Method, AllowMultiple = true)]
public sealed class HasPermissionOrAdminAttribute : Attribute, IAsyncAuthorizationFilter
{
    public string Permission { get; }

    public HasPermissionOrAdminAttribute(string permission)
    {
        Permission = permission ?? throw new ArgumentNullException(nameof(permission));
    }

    public Task OnAuthorizationAsync(AuthorizationFilterContext context)
    {
        var user = context.HttpContext.User;
        if (user?.Identity?.IsAuthenticated != true)
        {
            context.Result = new UnauthorizedResult();
            return Task.CompletedTask;
        }

        if (user.IsInRole("ADMIN"))
            return Task.CompletedTask;

        var required = Permission?.Trim() ?? string.Empty;
        if (string.IsNullOrEmpty(required))
        {
            context.Result = new ForbidResult();
            return Task.CompletedTask;
        }

        var hasClaim = user.FindAll(JwtClaimTypes.Permission)
            .Any(c => string.Equals(c.Value?.Trim(), required, StringComparison.OrdinalIgnoreCase));

        if (!hasClaim)
            context.Result = new ForbidResult();

        return Task.CompletedTask;
    }
}
