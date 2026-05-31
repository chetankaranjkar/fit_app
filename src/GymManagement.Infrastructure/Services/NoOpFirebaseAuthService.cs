using GymManagement.Core.DTOs;
using GymManagement.Core.Services;
using GymManagement.Infrastructure.Configuration;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace GymManagement.Infrastructure.Services;

public sealed class NoOpFirebaseAuthService : IFirebaseAuthService
{
    private readonly FirebaseOptions _options;

    public NoOpFirebaseAuthService(IOptions<FirebaseOptions> options)
    {
        _options = options.Value;
    }

    public bool IsEnabled => false;

    public FirebasePublicConfigDto GetPublicConfig() => new()
    {
        Enabled = false,
        ApiKey = _options.ApiKey,
        AuthDomain = _options.AuthDomain,
        ProjectId = _options.ProjectId,
        AppId = _options.AppId,
        MessagingSenderId = _options.MessagingSenderId,
    };

    public Task<FirebaseTokenPayload?> VerifyIdTokenAsync(string idToken, CancellationToken cancellationToken = default) =>
        Task.FromResult<FirebaseTokenPayload?>(null);
}
