namespace GymManagement.Infrastructure.Configuration;

public sealed class DeviceSecurityOptions
{
    public const string SectionName = "DeviceSecurity";

    public int MaxActiveDevices { get; set; } = 3;
    public bool EnableSessionValidation { get; set; } = true;
}
