using GymManagement.Core.DTOs;
using GymManagement.Core.Services;
using GymManagement.Domain.Entities;
using GymManagement.Infrastructure.Data;
using Microsoft.AspNetCore.DataProtection;
using Microsoft.EntityFrameworkCore;

namespace GymManagement.Infrastructure.Services;

public sealed class SmsSettingsService : ISmsSettingsService
{
    private const string SmsAuthHeaderPurpose = "GymManagement.SmsAuthHeader.v1";
    private const string WhatsAppAuthHeaderPurpose = "GymManagement.WhatsAppAuthHeader.v1";

    private readonly ApplicationDbContext _db;
    private readonly IDataProtectionProvider _dataProtection;

    public SmsSettingsService(ApplicationDbContext db, IDataProtectionProvider dataProtection)
    {
        _db = db;
        _dataProtection = dataProtection;
    }

    public async Task<SmsSettingsDto> GetAsync(CancellationToken ct = default)
    {
        var row = await EnsureRowAsync(ct);
        return MapToDto(row);
    }

    public async Task<SmsSettingsDto> UpdateAsync(UpdateSmsSettingsDto dto, CancellationToken ct = default)
    {
        var row = await EnsureRowAsync(ct);

        ValidateChannel("SMS", dto.Sms);
        ValidateChannel("WhatsApp", dto.WhatsApp);

        // SMS channel
        row.SmsAuthHeaderProtected = ResolveAuthHeader(
            row.SmsAuthHeaderProtected, dto.Sms, SmsAuthHeaderPurpose);
        row.SmsNotificationsEnabled = dto.Sms.Enabled;
        row.SmsWebhookUrl = NullableTrim(dto.Sms.WebhookUrl);
        row.SmsSenderId = NullableTrim(dto.Sms.SenderId);
        row.SmsSendPaymentReceipts = dto.Sms.SendPaymentReceipts;
        row.SmsSendMembershipExpiryReminders = dto.Sms.SendMembershipExpiryReminders;

        // WhatsApp channel
        row.WhatsAppAuthHeaderProtected = ResolveAuthHeader(
            row.WhatsAppAuthHeaderProtected, dto.WhatsApp, WhatsAppAuthHeaderPurpose);
        row.WhatsAppNotificationsEnabled = dto.WhatsApp.Enabled;
        row.WhatsAppWebhookUrl = NullableTrim(dto.WhatsApp.WebhookUrl);
        row.WhatsAppSenderId = NullableTrim(dto.WhatsApp.SenderId);
        row.WhatsAppSendPaymentReceipts = dto.WhatsApp.SendPaymentReceipts;
        row.WhatsAppSendMembershipExpiryReminders = dto.WhatsApp.SendMembershipExpiryReminders;

        row.SmsSettingsUpdatedDate = DateTime.UtcNow;
        row.UpdatedDate = DateTime.UtcNow;

        await _db.SaveChangesAsync(ct);
        return MapToDto(row);
    }

    public async Task<SmsConnectionConfig> GetSmsConfigAsync(CancellationToken ct = default)
    {
        var row = await _db.GymSettings.AsNoTracking().FirstOrDefaultAsync(s => s.Id == 1, ct);
        if (row == null || !row.SmsNotificationsEnabled)
            return new SmsConnectionConfig { Channel = TextMessageChannels.Sms };

        return new SmsConnectionConfig
        {
            Channel = TextMessageChannels.Sms,
            Enabled = row.SmsNotificationsEnabled,
            WebhookUrl = row.SmsWebhookUrl?.Trim() ?? string.Empty,
            SenderId = row.SmsSenderId,
            AuthHeader = UnprotectSecret(row.SmsAuthHeaderProtected, SmsAuthHeaderPurpose),
            SendPaymentReceipts = row.SmsSendPaymentReceipts,
            SendMembershipExpiryReminders = row.SmsSendMembershipExpiryReminders,
        };
    }

    public async Task<SmsConnectionConfig> GetWhatsAppConfigAsync(CancellationToken ct = default)
    {
        var row = await _db.GymSettings.AsNoTracking().FirstOrDefaultAsync(s => s.Id == 1, ct);
        if (row == null || !row.WhatsAppNotificationsEnabled)
            return new SmsConnectionConfig { Channel = TextMessageChannels.WhatsApp };

        return new SmsConnectionConfig
        {
            Channel = TextMessageChannels.WhatsApp,
            Enabled = row.WhatsAppNotificationsEnabled,
            WebhookUrl = row.WhatsAppWebhookUrl?.Trim() ?? string.Empty,
            SenderId = row.WhatsAppSenderId,
            AuthHeader = UnprotectSecret(row.WhatsAppAuthHeaderProtected, WhatsAppAuthHeaderPurpose),
            SendPaymentReceipts = row.WhatsAppSendPaymentReceipts,
            SendMembershipExpiryReminders = row.WhatsAppSendMembershipExpiryReminders,
        };
    }

    private static void ValidateChannel(string label, UpdateSmsChannelDto dto)
    {
        var url = dto.WebhookUrl?.Trim();
        if (!dto.Enabled)
            return;
        if (string.IsNullOrWhiteSpace(url))
            throw new ArgumentException($"Webhook URL is required to enable {label}.");
        if (!Uri.TryCreate(url, UriKind.Absolute, out var parsed)
            || (parsed.Scheme != Uri.UriSchemeHttp && parsed.Scheme != Uri.UriSchemeHttps))
            throw new ArgumentException($"{label} webhook URL must be a valid http(s) URL.");
    }

    private string? ResolveAuthHeader(string? current, UpdateSmsChannelDto dto, string purpose)
    {
        if (dto.ClearAuthHeader)
            return null;
        if (!string.IsNullOrWhiteSpace(dto.AuthHeader))
            return ProtectSecret(dto.AuthHeader.Trim(), purpose);
        return current;
    }

    private async Task<GymSetting> EnsureRowAsync(CancellationToken ct)
    {
        var row = await _db.GymSettings.FirstOrDefaultAsync(s => s.Id == 1, ct);
        if (row != null)
            return row;

        row = new GymSetting { Id = 1 };
        _db.GymSettings.Add(row);
        await _db.SaveChangesAsync(ct);
        return row;
    }

    private SmsSettingsDto MapToDto(GymSetting row) => new()
    {
        Sms = new SmsChannelSettingsDto
        {
            Enabled = row.SmsNotificationsEnabled,
            WebhookUrl = row.SmsWebhookUrl,
            SenderId = row.SmsSenderId,
            HasAuthHeaderConfigured = !string.IsNullOrWhiteSpace(row.SmsAuthHeaderProtected),
            SendPaymentReceipts = row.SmsSendPaymentReceipts,
            SendMembershipExpiryReminders = row.SmsSendMembershipExpiryReminders,
            IsConfigured = row.SmsNotificationsEnabled && !string.IsNullOrWhiteSpace(row.SmsWebhookUrl),
        },
        WhatsApp = new SmsChannelSettingsDto
        {
            Enabled = row.WhatsAppNotificationsEnabled,
            WebhookUrl = row.WhatsAppWebhookUrl,
            SenderId = row.WhatsAppSenderId,
            HasAuthHeaderConfigured = !string.IsNullOrWhiteSpace(row.WhatsAppAuthHeaderProtected),
            SendPaymentReceipts = row.WhatsAppSendPaymentReceipts,
            SendMembershipExpiryReminders = row.WhatsAppSendMembershipExpiryReminders,
            IsConfigured = row.WhatsAppNotificationsEnabled && !string.IsNullOrWhiteSpace(row.WhatsAppWebhookUrl),
        },
        UpdatedDateUtc = row.SmsSettingsUpdatedDate ?? row.UpdatedDate,
    };

    private static string? NullableTrim(string? value) =>
        string.IsNullOrWhiteSpace(value) ? null : value.Trim();

    private string ProtectSecret(string plain, string purpose) =>
        _dataProtection.CreateProtector(purpose).Protect(plain);

    private string? UnprotectSecret(string? protectedValue, string purpose)
    {
        if (string.IsNullOrWhiteSpace(protectedValue))
            return null;

        try
        {
            return _dataProtection.CreateProtector(purpose).Unprotect(protectedValue);
        }
        catch
        {
            return null;
        }
    }
}
