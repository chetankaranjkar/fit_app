namespace GymManagement.Core.DTOs
{
    public class RefreshTokenDto
    {
        /// <summary>Opaque refresh token returned from <see cref="LoginResponseDto.RefreshToken"/>.</summary>
        public string RefreshToken { get; set; } = string.Empty;
    }
}
