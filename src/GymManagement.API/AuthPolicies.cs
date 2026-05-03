using System.Linq;
using GymManagement.Core.Services;
using Microsoft.AspNetCore.Authorization;

namespace GymManagement.API;

/// <summary>Authorization policies keyed in <see cref="Microsoft.Extensions.DependencyInjection.ServiceCollection"/>.</summary>
public static class AuthPolicies
{
    /// <summary>Branch directory + QR settings: ADMIN/STAFF, or JWT permissions typically held by admins/staff.</summary>
    public const string BranchConsole = nameof(BranchConsole);

    internal static readonly string[] BranchConsolePermissionCodes =
    [
        "Config",
        "CreateUsers",
        "UsersAccess",
        "MANAGE_MEMBERS",
        "MANAGE_ATTENDANCE",
    ];

    public static void AddAppAuthorizationPolicies(this AuthorizationOptions options)
    {
        options.AddPolicy(
            BranchConsole,
            policy =>
            {
                policy.RequireAuthenticatedUser();
                policy.RequireAssertion(ctx =>
                {
                    var user = ctx.User;
                    if (user?.Identity?.IsAuthenticated != true)
                        return false;
                    if (user.IsInRole("ADMIN") || user.IsInRole("STAFF"))
                        return true;
                    var set = user
                        .FindAll(JwtClaimTypes.Permission)
                        .Select(c => c.Value?.Trim())
                        .Where(s => !string.IsNullOrEmpty(s))
                        .ToHashSet(StringComparer.OrdinalIgnoreCase);
                    return BranchConsolePermissionCodes.Any(set.Contains);
                });
            });
    }
}
