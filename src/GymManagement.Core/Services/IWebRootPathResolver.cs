namespace GymManagement.Core.Services;

/// <summary>Maps app-relative URLs (e.g. /uploads/...) to absolute files under wwwroot.</summary>
public interface IWebRootPathResolver
{
    string? MapToAbsolutePath(string? appRelativeOrAbsoluteUrl);
}
