using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using GymManagement.API.Attributes;
using GymManagement.Core.Authorization;
using GymManagement.Core.DTOs;
using GymManagement.Core.Services;

namespace GymManagement.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class AuthController : ControllerBase
    {
        private readonly IAuthService _authService;

        public AuthController(IAuthService authService)
        {
            _authService = authService;
        }

        [HttpPost("login")]
        [ProducesResponseType(typeof(LoginResponseDto), StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        public async Task<ActionResult<LoginResponseDto>> Login([FromBody] LoginDto? loginDto)
        {
            if (loginDto == null)
                return BadRequest("Request body is required.");

            if (string.IsNullOrEmpty(loginDto.Password)
                || (string.IsNullOrWhiteSpace(loginDto.Email) && string.IsNullOrEmpty(loginDto.Username)))
            {
                return BadRequest("Email (or username) and password are required.");
            }

            var result = await _authService.LoginAsync(loginDto);

            if (result == null)
            {
                return Unauthorized("Invalid email or password.");
            }

            return Ok(result);
        }

        /// <summary>Validate refresh token against <c>AuthUsers</c>; return a new JWT (roles from <c>UserRoles</c>).</summary>
        [HttpPost("refresh")]
        [ProducesResponseType(typeof(LoginResponseDto), StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        public async Task<ActionResult<LoginResponseDto>> Refresh([FromBody] RefreshTokenDto? dto)
        {
            if (dto == null)
                return BadRequest(new { message = "Request body is required." });
            if (string.IsNullOrWhiteSpace(dto.RefreshToken))
                return Unauthorized(new { message = "Refresh token is required." });

            var result = await _authService.RefreshAsync(dto);
            if (result == null)
                return Unauthorized(new { message = "Invalid or expired refresh token." });

            return Ok(result);
        }

        [HttpPost("register")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        public async Task<IActionResult> Register([FromBody] RegisterDto? registerDto)
        {
            if (registerDto == null)
                return BadRequest("Request body is required.");

            if ((string.IsNullOrEmpty(registerDto.Email) && string.IsNullOrEmpty(registerDto.Username)) ||
                string.IsNullOrEmpty(registerDto.Password))
            {
                return BadRequest("Email and password are required.");
            }

            var result = await _authService.RegisterAsync(registerDto);

            if (!result)
            {
                return BadRequest("Email already exists.");
            }

            return Ok(new { message = "Registration successful." });
        }

        /// <summary>Clears stored refresh token on <c>AuthUsers</c>; sets <c>LogoutTime</c> on <c>LoginActivity</c> when session matches.</summary>
        [Authorize]
        [HttpPost("logout")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        public async Task<IActionResult> Logout()
        {
            var ok = await _authService.LogoutAsync();
            if (!ok)
                return BadRequest(new { message = "Could not update login session (unknown session or already logged out)." });
            return Ok(new { message = "Logged out." });
        }

        /// <summary>Returns accounts where refresh-token reuse was detected and sessions were revoked.</summary>
        [Authorize]
        [HasPermission(PermissionCodes.Reports)]
        [HttpGet("compromised-sessions")]
        [ProducesResponseType(typeof(IReadOnlyList<CompromisedSessionDto>), StatusCodes.Status200OK)]
        public async Task<ActionResult<IReadOnlyList<CompromisedSessionDto>>> GetCompromisedSessions()
        {
            var result = await _authService.GetCompromisedSessionsAsync();
            return Ok(result);
        }
    }
}

