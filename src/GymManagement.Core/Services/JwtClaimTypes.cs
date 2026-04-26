namespace GymManagement.Core.Services
{
    /// <summary>Custom JWT claim type names (in addition to <c>sub</c>, <c>jti</c>, and standard role claims).</summary>
    public static class JwtClaimTypes
    {
        /// <summary>Profile <c>Users.Id</c> when the auth account is linked; empty string otherwise.</summary>
        public const string UserId = "userId";

        /// <summary>Effective permission code (one claim per code). Matches authorization middleware / policy checks.</summary>
        public const string Permission = "permission";
    }
}
