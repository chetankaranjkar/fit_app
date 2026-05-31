namespace GymManagement.Core.DTOs
{
    public class RefreshTokenDto
    {
        /// <summary>Opaque refresh token returned from <see cref="LoginResponseDto.RefreshToken"/>.</summary>
        public string RefreshToken { get; set; } = string.Empty;

        /// <summary>Mobile client hardware id (optional; enables per-device session refresh).</summary>
        public string? DeviceUniqueId { get; set; }

        /// <summary>Current JWT session id (jti) when known.</summary>
        public string? SessionId { get; set; }
    }
}
