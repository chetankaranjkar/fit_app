using FirebaseAdmin;
using FirebaseAdmin.Auth;
using Google.Apis.Auth.OAuth2;
using GymManagement.Core.DTOs;
using GymManagement.Core.Services;
using GymManagement.Infrastructure.Configuration;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace GymManagement.Infrastructure.Services;

public sealed class FirebaseAuthService : IFirebaseAuthService
{
    private readonly FirebaseOptions _options;
    private readonly ILogger<FirebaseAuthService> _logger;

    public FirebaseAuthService(IOptions<FirebaseOptions> options, ILogger<FirebaseAuthService> logger)
    {
        _options = options.Value;
        _logger = logger;
        EnsureFirebaseApp();
    }

    public bool IsEnabled => _options.Enabled && _options.HasAdminCredentials && FirebaseApp.DefaultInstance != null;

    public FirebasePublicConfigDto GetPublicConfig() => new()
    {
        Enabled = IsEnabled && _options.HasWebConfig,
        ApiKey = _options.ApiKey,
        AuthDomain = _options.AuthDomain,
        ProjectId = _options.ProjectId,
        AppId = _options.AppId,
        MessagingSenderId = _options.MessagingSenderId,
    };

    public async Task<FirebaseTokenPayload?> VerifyIdTokenAsync(string idToken, CancellationToken cancellationToken = default)
    {
        if (!IsEnabled || string.IsNullOrWhiteSpace(idToken))
            return null;

        try
        {
            var decoded = await FirebaseAuth.DefaultInstance
                .VerifyIdTokenAsync(idToken, cancellationToken)
                .ConfigureAwait(false);

            decoded.Claims.TryGetValue("phone_number", out var phoneObj);
            decoded.Claims.TryGetValue("email", out var emailObj);

            return new FirebaseTokenPayload
            {
                Uid = decoded.Uid,
                PhoneNumber = phoneObj?.ToString(),
                Email = emailObj?.ToString(),
            };
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Firebase ID token verification failed.");
            return null;
        }
    }

    private void EnsureFirebaseApp()
    {
        if (!_options.Enabled || !_options.HasAdminCredentials)
            return;
        if (FirebaseApp.DefaultInstance != null)
            return;

        try
        {
            GoogleCredential credential;
            if (!string.IsNullOrWhiteSpace(_options.CredentialsJson))
            {
                credential = GoogleCredential.FromJson(_options.CredentialsJson);
            }
            else
            {
                var path = _options.CredentialsPath!.Trim();
                if (!Path.IsPathRooted(path))
                {
                    path = Path.Combine(AppContext.BaseDirectory, path);
                }
                credential = GoogleCredential.FromFile(path);
            }

            FirebaseApp.Create(new AppOptions
            {
                Credential = credential,
                ProjectId = _options.ProjectId,
            });
            _logger.LogInformation("Firebase Admin initialized for project {ProjectId}.", _options.ProjectId);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to initialize Firebase Admin SDK.");
        }
    }
}
