using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using GymManagement.API.Attributes;
using GymManagement.API.Services;
using GymManagement.Core.Authorization;
using GymManagement.Core.Services;

namespace GymManagement.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class FileUploadController : ControllerBase
    {
        private readonly ILogger<FileUploadController> _logger;
        private readonly WebRootImageStorage _storage;
        private const long ProfileMaxBytes = 5 * 1024 * 1024;
        private const long BodyImageMaxBytes = 10 * 1024 * 1024;

        public FileUploadController(
            WebRootImageStorage storage,
            ILogger<FileUploadController> logger)
        {
            _storage = storage;
            _logger = logger;
        }

        [HttpPost("profile/user/{userId}")]
        [HasPermission(PermissionCodes.UsersAccess)]
        public async Task<ActionResult<string>> UploadUserProfileImage(int userId, IFormFile file, CancellationToken cancellationToken = default)
        {
            if (file == null || file.Length == 0)
                return BadRequest("No file uploaded. Use multipart form field named 'file'.");

            try
            {
                var (imageUrl, _) = await _storage.SaveAsync(
                    file,
                    Path.Combine("uploads", "profiles", "users").Replace('\\', '/'),
                    ProfileMaxBytes,
                    prefixToCleanup: $"user_{userId}_",
                    cancellationToken: cancellationToken);
                return Ok(new { imageUrl });
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(ex.Message);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error uploading user profile image for user {UserId}", userId);
                return StatusCode(500, "Error uploading file");
            }
        }

        [HttpPost("profile/trainer/{trainerId}")]
        [HasPermission(PermissionCodes.TrainerAccess)]
        public async Task<ActionResult<string>> UploadTrainerProfileImage(int trainerId, IFormFile file, CancellationToken cancellationToken = default)
        {
            try
            {
                var (imageUrl, _) = await _storage.SaveAsync(
                    file,
                    Path.Combine("uploads", "profiles", "trainers").Replace('\\', '/'),
                    ProfileMaxBytes,
                    prefixToCleanup: $"trainer_{trainerId}_",
                    cancellationToken: cancellationToken);
                return Ok(new { imageUrl });
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(ex.Message);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error uploading trainer profile image");
                return StatusCode(500, "Error uploading file");
            }
        }

        [HttpPost("body/user/{userId}")]
        [HasPermission(PermissionCodes.UsersAccess)]
        public async Task<ActionResult<string>> UploadUserBodyImage(int userId, IFormFile file, [FromForm] string imageType = "FullBody", [FromForm] string? notes = null, CancellationToken cancellationToken = default)
        {
            try
            {
                var sanitizedType = SanitizeSegment(imageType);
                var (imageUrl, _) = await _storage.SaveAsync(
                    file,
                    Path.Combine("uploads", "body", "users").Replace('\\', '/'),
                    BodyImageMaxBytes,
                    prefixToCleanup: null,
                    namePrefix: $"body_{userId}_{sanitizedType}_",
                    cancellationToken: cancellationToken);
                return Ok(new { imageUrl, imageType, notes });
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(ex.Message);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error uploading user body image");
                return StatusCode(500, "Error uploading file");
            }
        }

        /// <summary>
        /// Upload an image for a body part or body muscle. Saves to wwwroot/uploads/body-parts.
        /// </summary>
        [HttpPost("body-part/{bodyPartId}")]
        [HasPermission(PermissionCodes.TrainerAccess)]
        public async Task<ActionResult<string>> UploadBodyPartImage(int bodyPartId, IFormFile file, CancellationToken cancellationToken = default)
        {
            try
            {
                var (imageUrl, _) = await _storage.SaveAsync(
                    file,
                    "uploads/body-parts",
                    ProfileMaxBytes,
                    prefixToCleanup: $"bodypart_{bodyPartId}_",
                    cancellationToken: cancellationToken);
                return Ok(new { imageUrl });
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(ex.Message);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error uploading body part image");
                return StatusCode(500, "Error uploading file");
            }
        }

        [HttpPost("body-part-muscle/{bodyPartMuscleId}")]
        [HasPermission(PermissionCodes.TrainerAccess)]
        public async Task<ActionResult<string>> UploadBodyPartMuscleImage(int bodyPartMuscleId, IFormFile file, CancellationToken cancellationToken = default)
        {
            try
            {
                var (imageUrl, _) = await _storage.SaveAsync(
                    file,
                    "uploads/body-parts",
                    ProfileMaxBytes,
                    prefixToCleanup: $"muscle_{bodyPartMuscleId}_",
                    cancellationToken: cancellationToken);
                return Ok(new { imageUrl });
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(ex.Message);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error uploading body part muscle image");
                return StatusCode(500, "Error uploading file");
            }
        }

        private static string SanitizeSegment(string value)
        {
            var chars = value
                .Where(ch => char.IsLetterOrDigit(ch) || ch == '_' || ch == '-')
                .ToArray();
            return chars.Length == 0 ? "file" : new string(chars);
        }
    }
}
