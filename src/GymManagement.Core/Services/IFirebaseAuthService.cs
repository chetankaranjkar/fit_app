using GymManagement.Core.DTOs;

namespace GymManagement.Core.Services;

public interface IFirebaseAuthService
{
    bool IsEnabled { get; }

    FirebasePublicConfigDto GetPublicConfig();

    Task<FirebaseTokenPayload?> VerifyIdTokenAsync(string idToken, CancellationToken cancellationToken = default);
}
