using GymManagement.API.Extensions;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;

namespace GymManagement.API.Attributes;

/// <summary>
/// Requires <see cref="Permission"/> on the effective permission set from
/// <see cref="Middleware.PermissionResolutionMiddleware"/> (JWT <c>permission</c> claims, or DB when absent).
/// </summary>
[AttributeUsage(AttributeTargets.Class | AttributeTargets.Method, AllowMultiple = true)]
public sealed class HasPermissionAttribute : Attribute, IAsyncAuthorizationFilter
{
    public string Permission { get; }

    public HasPermissionAttribute(string permission)
    {
        Permission = permission ?? throw new ArgumentNullException(nameof(permission));
    }

    public Task OnAuthorizationAsync(AuthorizationFilterContext context)
    {
        var http = context.HttpContext;
        if (http.User?.Identity?.IsAuthenticated != true)
        {
            context.Result = new UnauthorizedResult();
            return Task.CompletedTask;
        }

        var required = Permission?.Trim() ?? string.Empty;
        if (string.IsNullOrEmpty(required) || !http.HasPermission(required))
            context.Result = new ForbidResult();

        return Task.CompletedTask;
    }
}
