using GymManagement.API.Services;
using GymManagement.Core.DTOs;
using GymManagement.Core.Services;
using GymManagement.Domain.Entities;
using GymManagement.Infrastructure.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace GymManagement.API.Controllers;

/// <summary>
/// Authenticated member self-service for profile and progress (transformation) photos.
/// Files are stored under wwwroot; DB rows use app-relative URLs (e.g. /uploads/...).
/// </summary>
[ApiController]
[Route("api/me")]
[Authorize]
public sealed class MeMediaController : ControllerBase
{
    private const long ProfileMaxBytes = 5 * 1024 * 1024;
    private const long BodyImageMaxBytes = 10 * 1024 * 1024;

    private readonly ApplicationDbContext _db;
    private readonly WebRootImageStorage _imageStorage;
    private readonly IUserBodyImageService _bodyImages;

    public MeMediaController(
        ApplicationDbContext db,
        WebRootImageStorage imageStorage,
        IUserBodyImageService bodyImages)
    {
        _db = db;
        _imageStorage = imageStorage;
        _bodyImages = bodyImages;
    }

    /// <summary>Upload or replace the member's profile picture; persists relative URL on Users.</summary>
    [HttpPost("profile/photo")]
    [RequestFormLimits(MultipartBodyLengthLimit = ProfileMaxBytes + 1024 * 512)]
    [RequestSizeLimit(ProfileMaxBytes + 1024 * 512)]
    public async Task<ActionResult<MeProfileDto>> UploadProfilePhoto(IFormFile file, CancellationToken cancellationToken = default)
    {
        var userId = ResolveUserIdFromClaims();
        if (userId == null) return Unauthorized();

        try
        {
            var user = await _db.Users.FirstOrDefaultAsync(u => u.Id == userId.Value, cancellationToken);
            if (user == null) return NotFound();

            var (imageUrl, _) = await _imageStorage.SaveAsync(
                file,
                relativeFolder: Path.Combine("uploads", "profiles", "users").Replace('\\', '/'),
                maxBytes: ProfileMaxBytes,
                prefixToCleanup: $"user_{userId}_",
                cancellationToken: cancellationToken);

            user.ProfilePictureUrl = imageUrl;
            await _db.SaveChangesAsync(cancellationToken);

            var auth = await _db.AuthUsers.AsNoTracking()
                .FirstOrDefaultAsync(a => a.UserId == userId.Value, cancellationToken);
            return Ok(MapProfile(user, auth?.Email));
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(ex.Message);
        }
        catch (Exception ex)
        {
            return StatusCode(500, $"Error uploading file: {ex.Message}");
        }
    }

    [HttpGet("progress-photos")]
    public async Task<ActionResult<IReadOnlyList<UserBodyImageDto>>> GetProgressPhotos([FromQuery] int take = 60)
    {
        var userId = ResolveUserIdFromClaims();
        if (userId == null) return Unauthorized();
        if (take <= 0) take = 60;
        if (take > 200) take = 200;

        var list = (await _bodyImages.GetUserBodyImagesByUserIdAsync(userId.Value)).Take(take).ToList();
        return Ok(list);
    }

    /// <summary>Upload a transformation / progress photo (Front, Side, Back, FullBody, …).</summary>
    [HttpPost("progress-photos")]
    [RequestFormLimits(MultipartBodyLengthLimit = BodyImageMaxBytes + 1024 * 512)]
    [RequestSizeLimit(BodyImageMaxBytes + 1024 * 512)]
    public async Task<ActionResult<UserBodyImageDto>> UploadProgressPhoto(
        IFormFile file,
        [FromForm] string imageType = "Front",
        [FromForm] string? notes = null,
        [FromForm] decimal? weightKg = null,
        [FromForm] decimal? bodyFatPercent = null,
        [FromForm] DateTime? imageDate = null,
        CancellationToken cancellationToken = default)
    {
        var userId = ResolveUserIdFromClaims();
        if (userId == null) return Unauthorized();

        var sanitizedType = SanitizeSegment(imageType);
        try
        {
            var (imageUrl, _) = await _imageStorage.SaveAsync(
                file,
                relativeFolder: Path.Combine("uploads", "body", "users").Replace('\\', '/'),
                maxBytes: BodyImageMaxBytes,
                prefixToCleanup: null,
                namePrefix: $"body_{userId}_{sanitizedType}_",
                cancellationToken: cancellationToken);

            var created = await _bodyImages.CreateUserBodyImageAsync(
                new CreateUserBodyImageDto
                {
                    UserId = userId.Value,
                    ImageUrl = imageUrl,
                    ImageType = sanitizedType,
                    ImageDate = imageDate ?? DateTime.UtcNow,
                    Notes = string.IsNullOrWhiteSpace(notes) ? null : notes.Trim(),
                    WeightKg = weightKg,
                    BodyFatPercent = bodyFatPercent,
                },
                uploadedById: null,
                uploadedByType: null);

            return Ok(created);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(ex.Message);
        }
        catch (Exception ex)
        {
            return StatusCode(500, $"Error uploading file: {ex.Message}");
        }
    }

    [HttpDelete("progress-photos/{id:int}")]
    public async Task<IActionResult> DeleteProgressPhoto(int id, CancellationToken cancellationToken = default)
    {
        var userId = ResolveUserIdFromClaims();
        if (userId == null) return Unauthorized();

        var row = await _db.UserBodyImages.FirstOrDefaultAsync(u => u.Id == id && !u.IsDeleted, cancellationToken);
        if (row == null) return NotFound();
        if (row.UserId != userId.Value) return Forbid();

        await _bodyImages.DeleteUserBodyImageAsync(id);
        return NoContent();
    }

    private int? ResolveUserIdFromClaims()
    {
        var profileClaim = User.FindFirst(JwtClaimTypes.UserId)?.Value;
        if (!string.IsNullOrWhiteSpace(profileClaim)
            && int.TryParse(profileClaim.Trim(), out var profileId)
            && profileId > 0)
            return profileId;

        var legacy = User.FindFirst("uid")?.Value ?? User.FindFirst("user_id")?.Value;
        if (int.TryParse(legacy, out var id) && id > 0) return id;
        return null;
    }

    private static string SanitizeSegment(string value)
    {
        var chars = value
            .Where(ch => char.IsLetterOrDigit(ch) || ch == '_' || ch == '-')
            .ToArray();
        if (chars.Length == 0) return "file";
        return new string(chars);
    }

    private static MeProfileDto MapProfile(User user, string? email)
    {
        return new MeProfileDto
        {
            UserId = user.Id,
            FirstName = user.FirstName,
            LastName = user.LastName,
            FullName = $"{user.FirstName} {user.LastName}".Trim(),
            Email = email ?? string.Empty,
            Phone = user.Phone,
            Gender = user.Gender,
            DateOfBirth = user.DateOfBirth == default ? null : user.DateOfBirth,
            ProfilePictureUrl = user.ProfilePictureUrl,
            RegistrationDate = user.RegistrationDate,
            PreferredGymTime = user.PreferredGymTime
        };
    }
}
