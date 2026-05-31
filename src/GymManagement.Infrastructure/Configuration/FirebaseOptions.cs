namespace GymManagement.Infrastructure.Configuration;

public sealed class FirebaseOptions
{
    public const string SectionName = "Firebase";

    public bool Enabled { get; set; }

    /// <summary>Firebase web API key (safe to expose to clients).</summary>
    public string? ApiKey { get; set; }

    public string? AuthDomain { get; set; }
    public string? ProjectId { get; set; }
    public string? AppId { get; set; }
    public string? MessagingSenderId { get; set; }

    /// <summary>Path to service account JSON for Firebase Admin (server only).</summary>
    public string? CredentialsPath { get; set; }

    /// <summary>Inline service account JSON (server only; prefer file or env on production).</summary>
    public string? CredentialsJson { get; set; }

    public bool HasAdminCredentials =>
        !string.IsNullOrWhiteSpace(CredentialsPath) || !string.IsNullOrWhiteSpace(CredentialsJson);

    public bool HasWebConfig =>
        !string.IsNullOrWhiteSpace(ApiKey)
        && !string.IsNullOrWhiteSpace(AuthDomain)
        && !string.IsNullOrWhiteSpace(ProjectId)
        && !string.IsNullOrWhiteSpace(AppId);
}
