using GymManagement.API.Extensions;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;

namespace GymManagement.API.Attributes;

/// <summary>
/// Requires at least one of the given permission codes on the effective permission set.
/// </summary>
[AttributeUsage(AttributeTargets.Class | AttributeTargets.Method, AllowMultiple = false)]
public sealed class HasAnyPermissionAttribute : Attribute, IAsyncAuthorizationFilter
{
    private readonly string[] _permissions;

    public HasAnyPermissionAttribute(params string[] permissions)
    {
        if (permissions == null || permissions.Length == 0)
            throw new ArgumentException("At least one permission is required.", nameof(permissions));
        _permissions = permissions;
    }

    public Task OnAuthorizationAsync(AuthorizationFilterContext context)
    {
        var http = context.HttpContext;
        if (http.User?.Identity?.IsAuthenticated != true)
        {
            context.Result = new UnauthorizedResult();
            return Task.CompletedTask;
        }

        var allowed = _permissions.Any(p => !string.IsNullOrWhiteSpace(p) && http.HasPermission(p.Trim()));
        if (!allowed)
            context.Result = new ForbidResult();

        return Task.CompletedTask;
    }
}
