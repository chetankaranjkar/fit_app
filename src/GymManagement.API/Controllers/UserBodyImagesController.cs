using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using GymManagement.API.Attributes;
using GymManagement.Core.Authorization;
using GymManagement.Core.DTOs;
using GymManagement.Core.Services;
using GymManagement.Domain.Entities;
using System.Security.Claims;

namespace GymManagement.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    [HasPermission(PermissionCodes.UsersAccess)]
    public class UserBodyImagesController : ControllerBase
    {
        private readonly IUserBodyImageService _userBodyImageService;

        public UserBodyImagesController(IUserBodyImageService userBodyImageService)
        {
            _userBodyImageService = userBodyImageService;
        }

        [HttpGet]
        public async Task<ActionResult<IEnumerable<UserBodyImageDto>>> GetAllUserBodyImages()
        {
            var images = await _userBodyImageService.GetAllUserBodyImagesAsync();
            return Ok(images);
        }

        [HttpGet("user/{userId}")]
        public async Task<ActionResult<IEnumerable<UserBodyImageDto>>> GetUserBodyImagesByUserId(int userId)
        {
            var images = await _userBodyImageService.GetUserBodyImagesByUserIdAsync(userId);
            return Ok(images);
        }

        [HttpGet("{id}")]
        public async Task<ActionResult<UserBodyImageDto>> GetUserBodyImage(int id)
        {
            var image = await _userBodyImageService.GetUserBodyImageByIdAsync(id);
            if (image == null)
                return NotFound();
            return Ok(image);
        }

        [HttpPost]
        public async Task<ActionResult<UserBodyImageDto>> CreateUserBodyImage(CreateUserBodyImageDto createDto)
        {
            // Get current user info from claims (short names: uid, role)
            var userIdClaim = User.FindFirst("uid")?.Value;
            var roleClaim = User.FindFirst("role")?.Value;

            int? uploadedById = null;
            string? uploadedByType = null;

            if (int.TryParse(userIdClaim, out var userId))
            {
                uploadedById = userId;
                uploadedByType = roleClaim == "Admin" ? "Admin" : (roleClaim == "Instructor" ? "Instructor" : null);
            }

            var image = await _userBodyImageService.CreateUserBodyImageAsync(createDto, uploadedById, uploadedByType);
            return CreatedAtAction(nameof(GetUserBodyImage), new { id = image.Id }, image);
        }

        [HttpPut("{id}")]
        public async Task<ActionResult<UserBodyImageDto>> UpdateUserBodyImage(int id, UpdateUserBodyImageDto updateDto)
        {
            var image = await _userBodyImageService.UpdateUserBodyImageAsync(id, updateDto);
            if (image == null)
                return NotFound();
            return Ok(image);
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteUserBodyImage(int id)
        {
            var result = await _userBodyImageService.DeleteUserBodyImageAsync(id);
            if (!result)
                return NotFound();
            return NoContent();
        }
    }
}

