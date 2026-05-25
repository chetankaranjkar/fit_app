using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace GymManagement.API.Controllers;

/// <summary>Anonymous deploy probe — compare with <c>git rev-parse --short HEAD</c> on the VPS after update.</summary>
[ApiController]
[Route("api/deploy-info")]
[AllowAnonymous]
public sealed class DeployInfoController : ControllerBase
{
    [HttpGet]
    public IActionResult Get()
    {
        var sha = Environment.GetEnvironmentVariable("GIT_COMMIT_SHA");
        if (string.IsNullOrWhiteSpace(sha))
            sha = "unknown";

        return Ok(new DeployInfoResponse
        {
            GitCommit = sha.Trim(),
            Environment = Environment.GetEnvironmentVariable("ASPNETCORE_ENVIRONMENT") ?? "Production",
        });
    }
}

public sealed class DeployInfoResponse
{
    public string GitCommit { get; set; } = string.Empty;

    public string Environment { get; set; } = string.Empty;
}
