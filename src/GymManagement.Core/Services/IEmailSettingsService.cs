using GymManagement.Core.DTOs;

namespace GymManagement.Core.Services;

public interface IEmailSettingsService
{
    Task<EmailSettingsDto> GetAsync(CancellationToken ct = default);
    Task<EmailSettingsDto> UpdateAsync(UpdateEmailSettingsDto dto, CancellationToken ct = default);
    Task<SmtpConnectionConfig> GetSmtpConfigAsync(CancellationToken ct = default);
}
