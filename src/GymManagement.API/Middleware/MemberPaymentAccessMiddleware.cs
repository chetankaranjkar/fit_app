using System.Net;
using System.Security.Claims;
using System.Text.Json;
using GymManagement.Core.DTOs;
using GymManagement.Core.Services;

namespace GymManagement.API.Middleware
{
    /// <summary>
    /// Blocks API access for pure gym members when membership billing is overdue (staff/admin/trainers exempt).
    /// </summary>
    public sealed class MemberPaymentAccessMiddleware
    {
        private readonly RequestDelegate _next;
        private static readonly HashSet<string> AllowedPrefixes = new(StringComparer.OrdinalIgnoreCase)
        {
            "/api/Auth",
            "/swagger",
            "/health",
            "/api/me/membership-billing",
        };

        public MemberPaymentAccessMiddleware(RequestDelegate next) => _next = next;

        public async Task InvokeAsync(HttpContext context, IMembershipPaymentService billing)
        {
            if (context.Request.Method.Equals("OPTIONS", StringComparison.OrdinalIgnoreCase))
            {
                await _next(context);
                return;
            }

            var path = context.Request.Path.Value ?? "";
            if (AllowedPrefixes.Any(p => path.StartsWith(p, StringComparison.OrdinalIgnoreCase)))
            {
                await _next(context);
                return;
            }

            if (context.User?.Identity?.IsAuthenticated != true)
            {
                await _next(context);
                return;
            }

            var roles = context.User.FindAll(ClaimTypes.Role).Select(c => c.Value.Trim().ToUpperInvariant()).ToHashSet();
            var elevated = roles.Contains("ADMIN") || roles.Contains("STAFF") || roles.Contains("TRAINER");
            if (elevated)
            {
                await _next(context);
                return;
            }

            var userIdRaw = context.User.FindFirstValue(JwtClaimTypes.UserId);
            if (!int.TryParse(userIdRaw, out var userId))
            {
                await _next(context);
                return;
            }

            if (!path.StartsWith("/api/", StringComparison.OrdinalIgnoreCase))
            {
                await _next(context);
                return;
            }

            var access = await billing.GetMemberBillingAccessAsync(userId, context.RequestAborted);
            if (!access.AccessBlocked)
            {
                await _next(context);
                return;
            }

            context.Response.StatusCode = (int)HttpStatusCode.Forbidden;
            context.Response.ContentType = "application/json";
            var payload = new PaymentAccessBlockedResponse
            {
                Message = access.Message ?? "Membership payment is overdue.",
                PendingAmount = access.PendingAmount,
                DueDate = access.NextDueDate,
            };
            await context.Response.WriteAsync(JsonSerializer.Serialize(payload, JsonSerializerOptions.Web));
        }
    }
}
