namespace GymManagement.Core.Services;

/// <summary>Proximity unlock via local ESP32 HTTP endpoint (<c>/unlock</c>).</summary>
public interface IDoorUnlockService
{
    /// <summary>
    /// POST <c>{resolvedBase}/unlock</c>. Resolution: request override (if allowed by config), then
    /// <paramref name="branchDoorBaseUrl"/> (from DB), then global <c>DoorDevice:Esp32BaseUrl</c>.
    /// </summary>
    Task<bool> TryUnlockAsync(
        string? requestOverrideUrl,
        string? branchDoorBaseUrl,
        CancellationToken cancellationToken = default);
}
