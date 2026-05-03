using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Diagnostics.HealthChecks;

namespace GymManagement.API.Controllers;

/// <summary>Operational probes exposed in Swagger. Same readiness checks as <c>GET /health/ready</c> (includes Redis when configured).</summary>
[ApiController]
[Route("api/diagnostics")]
[AllowAnonymous]
public sealed class DiagnosticsController : ControllerBase
{
    /// <summary>Runs all checks tagged <c>ready</c>: database + Redis (live PING when <c>Redis:ConnectionString</c> is set).</summary>
    [HttpGet("ready")]
    [ProducesResponseType(typeof(ReadinessDetailResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ReadinessDetailResponse), StatusCodes.Status503ServiceUnavailable)]
    public async Task<IActionResult> Ready(
        [FromServices] HealthCheckService healthChecks,
        CancellationToken cancellationToken)
    {
        var report = await healthChecks
            .CheckHealthAsync(reg => reg.Tags.Contains("ready"), cancellationToken)
            .ConfigureAwait(false);

        var checks = report.Entries.ToDictionary(
            static e => e.Key,
            static e => new ReadinessCheckItem
            {
                Status = e.Value.Status.ToString(),
                Description = e.Value.Description,
                Error = e.Value.Exception?.Message,
            });

        var body = new ReadinessDetailResponse
        {
            Status = report.Status.ToString(),
            Checks = checks,
        };

        return report.Status == HealthStatus.Healthy
            ? Ok(body)
            : StatusCode(StatusCodes.Status503ServiceUnavailable, body);
    }

    /// <summary>Redis-only slice of readiness (easier to spot in Swagger than the full report).</summary>
    [HttpGet("redis")]
    [ProducesResponseType(typeof(RedisHealthResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(RedisHealthResponse), StatusCodes.Status503ServiceUnavailable)]
    public async Task<IActionResult> Redis(
        [FromServices] HealthCheckService healthChecks,
        CancellationToken cancellationToken)
    {
        var report = await healthChecks.CheckHealthAsync(
            static reg => reg.Name == "redis",
            cancellationToken).ConfigureAwait(false);

        RedisHealthReportEntry? redis = report.Entries.TryGetValue("redis", out var e)
            ? new RedisHealthReportEntry
            {
                Status = e.Status.ToString(),
                Description = e.Description,
                Error = e.Exception?.Message,
            }
            : null;

        var body = new RedisHealthResponse
        {
            OverallStatus = report.Status.ToString(),
            Redis = redis,
        };

        return redis?.Status == nameof(HealthStatus.Healthy)
            ? Ok(body)
            : StatusCode(StatusCodes.Status503ServiceUnavailable, body);
    }
}

public sealed class ReadinessDetailResponse
{
    public string Status { get; set; } = string.Empty;

    public IReadOnlyDictionary<string, ReadinessCheckItem>? Checks { get; set; }
}

public sealed class ReadinessCheckItem
{
    public string Status { get; set; } = string.Empty;

    public string? Description { get; set; }

    public string? Error { get; set; }
}

public sealed class RedisHealthResponse
{
    public string OverallStatus { get; set; } = string.Empty;

    public RedisHealthReportEntry? Redis { get; set; }
}

public sealed class RedisHealthReportEntry
{
    public string Status { get; set; } = string.Empty;

    public string? Description { get; set; }

    public string? Error { get; set; }
}
