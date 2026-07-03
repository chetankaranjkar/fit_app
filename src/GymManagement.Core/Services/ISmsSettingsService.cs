using GymManagement.Core.DTOs;

namespace GymManagement.Core.Services;

public interface ISmsSettingsService
{
    Task<SmsSettingsDto> GetAsync(CancellationToken ct = default);
    Task<SmsSettingsDto> UpdateAsync(UpdateSmsSettingsDto dto, CancellationToken ct = default);

    /// <summary>Resolved SMS channel config.</summary>
    Task<SmsConnectionConfig> GetSmsConfigAsync(CancellationToken ct = default);

    /// <summary>Resolved WhatsApp channel config.</summary>
    Task<SmsConnectionConfig> GetWhatsAppConfigAsync(CancellationToken ct = default);
}
