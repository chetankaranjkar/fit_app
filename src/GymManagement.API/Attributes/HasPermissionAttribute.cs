using System.Linq;
using GymManagement.Core.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;

namespace GymManagement.API.Attributes;

/// <summary>
/// Authorization filter: requires a JWT <see cref="JwtClaimTypes.Permission"/> claim whose value matches
/// <see cref="Permission"/> (case-insensitive). Does not query the database.
/// </summary>
[AttributeUsage(AttributeTargets.Class | AttributeTargets.Method, AllowMultiple = true)]
public sealed class HasPermissionAttribute : Attribute, IAsyncAuthorizationFilter
{
    /// <summary>Required permission code (must appear as a <c>permission</c> claim on the token).</summary>
    public string Permission { get; }

    public HasPermissionAttribute(string permission)
    {
        Permission = permission ?? throw new ArgumentNullException(nameof(permission));
    }

    /// <inheritdoc />
    public Task OnAuthorizationAsync(AuthorizationFilterContext context)
    {
        var user = context.HttpContext.User;
        if (user?.Identity?.IsAuthenticated != true)
        {
            context.Result = new UnauthorizedResult();
            return Task.CompletedTask;
        }

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
