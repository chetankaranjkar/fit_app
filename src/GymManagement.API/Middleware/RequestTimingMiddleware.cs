using System.Diagnostics;

namespace GymManagement.API.Middleware;

/// <summary>Logs requests slower than the configured threshold (default 500ms).</summary>
public sealed class RequestTimingMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ILogger<RequestTimingMiddleware> _logger;
    private readonly long _slowRequestMs;

    public RequestTimingMiddleware(RequestDelegate next, ILogger<RequestTimingMiddleware> logger, IConfiguration configuration)
    {
        _next = next;
        _logger = logger;
        _slowRequestMs = configuration.GetValue("Performance:SlowRequestThresholdMs", 500);
    }

    public async Task InvokeAsync(HttpContext context)
    {
        var sw = Stopwatch.StartNew();
        try
        {
            await _next(context);
        }
        finally
        {
            sw.Stop();
            if (sw.ElapsedMilliseconds >= _slowRequestMs)
            {
                _logger.LogWarning(
                    "Slow request {Method} {Path} responded {StatusCode} in {ElapsedMs}ms",
                    context.Request.Method,
                    context.Request.Path,
                    context.Response.StatusCode,
                    sw.ElapsedMilliseconds);
            }
        }
    }
}

public static class RequestTimingMiddlewareExtensions
{
    public static IApplicationBuilder UseRequestTiming(this IApplicationBuilder app) =>
        app.UseMiddleware<RequestTimingMiddleware>();
}
