using GymManagement.Core.Services;
using Microsoft.AspNetCore.Hosting;

namespace GymManagement.API.Services;

/// <summary>
/// Saves member-trainer-admin uploads under wwwroot with MIME/signature checks and optional cleanup of prior files.
/// </summary>
public sealed class WebRootImageStorage
{
    private static readonly HashSet<string> AllowedExtensions = new(StringComparer.OrdinalIgnoreCase)
    {
        ".jpg", ".jpeg", ".png", ".gif", ".webp"
    };

    private static readonly HashSet<string> AllowedMimeTypes = new(StringComparer.OrdinalIgnoreCase)
    {
        "image/jpeg", "image/png", "image/gif", "image/webp"
    };

    private readonly IWebHostEnvironment _environment;
    private readonly IFileMalwareScanner _malwareScanner;
    private readonly ILogger<WebRootImageStorage> _logger;

    public WebRootImageStorage(
        IWebHostEnvironment environment,
        IFileMalwareScanner malwareScanner,
        ILogger<WebRootImageStorage> logger)
    {
        _environment = environment;
        _malwareScanner = malwareScanner;
        _logger = logger;
    }

    public async Task<(string imageUrl, string filePath)> SaveAsync(
        IFormFile file,
        string relativeFolder,
        long maxBytes,
        string? prefixToCleanup,
        string? namePrefix = null,
        CancellationToken cancellationToken = default)
    {
        if (file == null || file.Length == 0)
            throw new InvalidOperationException("No file uploaded");
        if (file.Length > maxBytes)
            throw new InvalidOperationException($"File size exceeds {maxBytes / (1024 * 1024)}MB limit");

        var extension = Path.GetExtension(file.FileName).ToLowerInvariant();
        if (!AllowedExtensions.Contains(extension))
            throw new InvalidOperationException("Invalid file extension");
        if (string.IsNullOrWhiteSpace(file.ContentType) || !AllowedMimeTypes.Contains(file.ContentType))
            throw new InvalidOperationException("Invalid MIME type");

        var uploadRoot = Path.Combine(_environment.ContentRootPath, "wwwroot");
        var folderPath = Path.Combine(uploadRoot, relativeFolder.Replace('/', Path.DirectorySeparatorChar));
        Directory.CreateDirectory(folderPath);

        await using var input = file.OpenReadStream();
        if (!await IsSupportedImageSignatureAsync(input, cancellationToken).ConfigureAwait(false))
            throw new InvalidOperationException("File signature validation failed");

        var scanResult = await _malwareScanner.ScanAsync(input, file.FileName, cancellationToken).ConfigureAwait(false);
        if (!scanResult.IsSafe)
            throw new InvalidOperationException(scanResult.Reason ?? "Malware scan failed");
        input.Position = 0;

        var safePrefix = string.IsNullOrWhiteSpace(namePrefix) ? "img_" : SanitizeSegment(namePrefix);
        var randomToken = Convert.ToHexString(Guid.NewGuid().ToByteArray()).ToLowerInvariant();
        var fileName = $"{safePrefix}{randomToken}{extension}";
        var filePath = Path.Combine(folderPath, fileName);

        await using (var output = new FileStream(filePath, FileMode.CreateNew, FileAccess.Write, FileShare.None))
        {
            await input.CopyToAsync(output, cancellationToken).ConfigureAwait(false);
        }

        if (!string.IsNullOrWhiteSpace(prefixToCleanup))
            CleanupOlderFiles(folderPath, fileName, SanitizeSegment(prefixToCleanup));

        var normalizedFolder = relativeFolder.Replace('\\', '/').Trim('/');
        var imageUrl = $"/{normalizedFolder}/{fileName}";
        return (imageUrl, filePath);
    }

    private static async Task<bool> IsSupportedImageSignatureAsync(Stream stream, CancellationToken cancellationToken)
    {
        stream.Position = 0;
        var header = new byte[12];
        var read = await stream.ReadAsync(header.AsMemory(0, header.Length), cancellationToken).ConfigureAwait(false);
        stream.Position = 0;
        if (read < 4) return false;

        var isJpeg = header[0] == 0xFF && header[1] == 0xD8 && header[2] == 0xFF;
        var isPng = read >= 8 &&
                    header[0] == 0x89 && header[1] == 0x50 && header[2] == 0x4E && header[3] == 0x47 &&
                    header[4] == 0x0D && header[5] == 0x0A && header[6] == 0x1A && header[7] == 0x0A;
        var isGif = read >= 6 &&
                    header[0] == 0x47 && header[1] == 0x49 && header[2] == 0x46 &&
                    header[3] == 0x38 && (header[4] == 0x37 || header[4] == 0x39) && header[5] == 0x61;
        var isWebp = read >= 12 &&
                     header[0] == 0x52 && header[1] == 0x49 && header[2] == 0x46 && header[3] == 0x46 &&
                     header[8] == 0x57 && header[9] == 0x45 && header[10] == 0x42 && header[11] == 0x50;
        return isJpeg || isPng || isGif || isWebp;
    }

    private static string SanitizeSegment(string value)
    {
        var chars = value
            .Where(ch => char.IsLetterOrDigit(ch) || ch == '_' || ch == '-')
            .ToArray();
        var sanitized = new string(chars);
        return string.IsNullOrWhiteSpace(sanitized) ? "file" : sanitized;
    }

    private void CleanupOlderFiles(string folderPath, string currentFileName, string safePrefix)
    {
        var files = Directory.EnumerateFiles(folderPath)
            .Where(path => Path.GetFileName(path).StartsWith(safePrefix, StringComparison.OrdinalIgnoreCase))
            .Where(path => !string.Equals(Path.GetFileName(path), currentFileName, StringComparison.OrdinalIgnoreCase))
            .ToList();

        foreach (var oldFile in files)
        {
            try
            {
                System.IO.File.Delete(oldFile);
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Failed to cleanup old upload file {Path}", oldFile);
            }
        }
    }
}
