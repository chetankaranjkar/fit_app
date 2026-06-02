namespace GymManagement.Core.Services;

/// <summary>Per-request viewer context for field-level visibility (e.g. Aadhaar masking).</summary>
public interface ICurrentUserAccessContext
{
    /// <summary>Profile <see cref="Domain.Entities.User"/> id of the authenticated actor, when linked.</summary>
    int? ActorProfileUserId { get; }

    /// <summary>True when the actor may receive unmasked Aadhaar values in API responses.</summary>
    bool CanViewFullAadhaar { get; }
}
