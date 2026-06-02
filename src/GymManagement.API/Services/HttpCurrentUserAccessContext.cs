using System.Security.Claims;
using GymManagement.Core.Authorization;
using GymManagement.Core.Security;
using GymManagement.Core.Services;

namespace GymManagement.API.Services;

public sealed class HttpCurrentUserAccessContext : ICurrentUserAccessContext
{
    private readonly IHttpContextAccessor _httpContextAccessor;

    public HttpCurrentUserAccessContext(IHttpContextAccessor httpContextAccessor)
    {
        _httpContextAccessor = httpContextAccessor;
    }

    public int? ActorProfileUserId
    {
        get
        {
            var user = _httpContextAccessor.HttpContext?.User;
            if (user == null)
                return null;

            var claim =
                user.FindFirstValue(JwtClaimTypes.UserId)
                ?? user.FindFirstValue(ClaimTypes.NameIdentifier);

            return int.TryParse(claim, out var id) && id > 0 ? id : null;
        }
    }

    public bool CanViewFullAadhaar
    {
        get
        {
            var user = _httpContextAccessor.HttpContext?.User;
            if (user == null)
                return false;

            var roles = user.FindAll(ClaimTypes.Role).Select(c => c.Value);
            return AadhaarDisplayHelper.CanViewFullAadhaar(roles);
        }
    }
}
