using GymManagement.Core.Services;
using Microsoft.AspNetCore.Hosting;

namespace GymManagement.Infrastructure.Services;

public sealed class WebRootPathResolver : IWebRootPathResolver
{
    private readonly string _webRoot;

    public WebRootPathResolver(IWebHostEnvironment environment)
    {
        _webRoot = Path.Combine(environment.ContentRootPath, "wwwroot");
    }

    public string? MapToAbsolutePath(string? appRelativeOrAbsoluteUrl)
    {
        if (string.IsNullOrWhiteSpace(appRelativeOrAbsoluteUrl))
            return null;

        var value = appRelativeOrAbsoluteUrl.Trim();
        if (value.StartsWith("http://", StringComparison.OrdinalIgnoreCase)
            || value.StartsWith("https://", StringComparison.OrdinalIgnoreCase))
        {
            if (!Uri.TryCreate(value, UriKind.Absolute, out var uri))
                return null;
            value = uri.AbsolutePath;
        }

        var relative = value.TrimStart('/').Replace('/', Path.DirectorySeparatorChar);
        var fullPath = Path.GetFullPath(Path.Combine(_webRoot, relative));
        if (!fullPath.StartsWith(_webRoot, StringComparison.OrdinalIgnoreCase))
            return null;

        return File.Exists(fullPath) ? fullPath : null;
    }
}
