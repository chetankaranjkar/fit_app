using System.IdentityModel.Tokens.Jwt;
using GymManagement.Core.Services;
using GymManagement.Infrastructure.Configuration;
using Microsoft.Extensions.Options;

namespace GymManagement.API.Middleware;

/// <summary>
/// Rejects JWTs whose mobile session was revoked in <c>UserSessions</c>.
/// Web-only sessions without a <c>UserSessions</c> row continue to work.
/// </summary>
public sealed class JwtSessionValidationMiddleware
{
    private readonly RequestDelegate _next;
    private readonly DeviceSecurityOptions _options;

    public JwtSessionValidationMiddleware(RequestDelegate next, IOptions<DeviceSecurityOptions> options)
    {
        _next = next;
        _options = options.Value;
    }

    public async Task InvokeAsync(HttpContext context, IDeviceSessionService deviceSessions)
    {
        if (_options.EnableSessionValidation
            && context.User.Identity?.IsAuthenticated == true)
        {
            var sessionId = context.User.FindFirst(JwtRegisteredClaimNames.Jti)?.Value
                ?? context.User.FindFirst("jti")?.Value;

            if (!string.IsNullOrEmpty(sessionId))
            {
                var allowed = await deviceSessions.IsSessionAllowedAsync(sessionId, context.RequestAborted)
                    .ConfigureAwait(false);
                if (!allowed)
                {
                    context.Response.StatusCode = StatusCodes.Status401Unauthorized;
                    await context.Response.WriteAsJsonAsync(new { message = "Session expired or revoked." });
                    return;
                }
            }
        }

        await _next(context);
    }
}

public static class JwtSessionValidationMiddlewareExtensions
{
    public static IApplicationBuilder UseJwtSessionValidation(this IApplicationBuilder app) =>
        app.UseMiddleware<JwtSessionValidationMiddleware>();
}
