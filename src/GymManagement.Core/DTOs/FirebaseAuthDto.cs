namespace GymManagement.Core.DTOs;

public class FirebaseLoginDto
{
    /// <summary>Firebase ID token from phone OTP (or email) sign-in on the client.</summary>
    public string IdToken { get; set; } = string.Empty;

    /// <summary>Optional device metadata for session tracking (mobile / PWA).</summary>
    public DeviceContextDto? Device { get; set; }
}

public class FirebaseTokenPayload
{
    public string Uid { get; set; } = string.Empty;
    public string? PhoneNumber { get; set; }
    public string? Email { get; set; }
}

public class FirebasePublicConfigDto
{
    public bool Enabled { get; set; }
    public string? ApiKey { get; set; }
    public string? AuthDomain { get; set; }
    public string? ProjectId { get; set; }
    public string? AppId { get; set; }
    public string? MessagingSenderId { get; set; }
}
