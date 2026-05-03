namespace GymManagement.Core.Options;

/// <summary>Maps to <c>DoorDevice</c> configuration section.</summary>
public sealed class DoorDeviceOptions
{
    public const string SectionName = "DoorDevice";

    public string Esp32BaseUrl { get; set; } = string.Empty;

    /// <summary>When false, scan still succeeds but no HTTP unlock is attempted.</summary>
    public bool Enabled { get; set; } = true;

    public int TimeoutSeconds { get; set; } = 5;

    /// <summary>SECURITY: Only allow overriding device URL when true (e.g. local dev).</summary>
    public bool AllowOverrideBaseUrl { get; set; }
}
