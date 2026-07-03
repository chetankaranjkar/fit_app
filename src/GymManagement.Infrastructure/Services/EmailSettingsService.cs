using GymManagement.Core.DTOs;
using GymManagement.Core.Services;
using GymManagement.Domain.Entities;
using GymManagement.Infrastructure.Data;
using Microsoft.AspNetCore.DataProtection;
using Microsoft.EntityFrameworkCore;

namespace GymManagement.Infrastructure.Services;

public sealed class EmailSettingsService : IEmailSettingsService
{
    private const string PasswordProtectorPurpose = "GymManagement.SmtpPassword.v1";

    private readonly ApplicationDbContext _db;
    private readonly IDataProtectionProvider _dataProtection;

    public EmailSettingsService(ApplicationDbContext db, IDataProtectionProvider dataProtection)
    {
        _db = db;
        _dataProtection = dataProtection;
    }

    public async Task<EmailSettingsDto> GetAsync(CancellationToken ct = default)
    {
        var row = await EnsureRowAsync(ct);
        return MapToDto(row);
    }

    public async Task<EmailSettingsDto> UpdateAsync(UpdateEmailSettingsDto dto, CancellationToken ct = default)
    {
        var row = await EnsureRowAsync(ct);
        ApplyProviderPreset(dto);

        if (string.IsNullOrWhiteSpace(dto.SmtpHost))
            throw new ArgumentException("SMTP host is required.");
        if (dto.SmtpPort is < 1 or > 65535)
            throw new ArgumentException("SMTP port must be between 1 and 65535.");
        if (string.IsNullOrWhiteSpace(dto.SmtpUsername))
            throw new ArgumentException("SMTP username is required.");
        if (string.IsNullOrWhiteSpace(dto.FromAddress))
            throw new ArgumentException("From email address is required.");

        var password = dto.SmtpPassword?.Trim();
        if (string.IsNullOrWhiteSpace(password))
        {
            if (string.IsNullOrWhiteSpace(row.SmtpPasswordProtected))
                throw new ArgumentException("SMTP password is required.");
        }
        else
        {
            row.SmtpPasswordProtected = ProtectPassword(password);
        }

        row.EmailNotificationsEnabled = dto.Enabled;
        row.SmtpHost = dto.SmtpHost.Trim();
        row.SmtpPort = dto.SmtpPort;
        row.SmtpUseStartTls = dto.SmtpUseStartTls;
        row.SmtpUsername = dto.SmtpUsername.Trim();
        row.EmailFromAddress = dto.FromAddress.Trim();
        row.EmailFromDisplayName = string.IsNullOrWhiteSpace(dto.FromDisplayName)
            ? null
            : dto.FromDisplayName.Trim();
        row.EmailSendPaymentReceipts = dto.SendPaymentReceipts;
        row.EmailSendMembershipExpiryReminders = dto.SendMembershipExpiryReminders;
        row.EmailSendDietAssignments = dto.SendDietAssignments;
        row.EmailSettingsUpdatedDate = DateTime.UtcNow;
        row.UpdatedDate = DateTime.UtcNow;

        await _db.SaveChangesAsync(ct);
        return MapToDto(row);
    }

    public async Task<SmtpConnectionConfig> GetSmtpConfigAsync(CancellationToken ct = default)
    {
        var row = await _db.GymSettings.AsNoTracking().FirstOrDefaultAsync(s => s.Id == 1, ct);
        if (row == null || !row.EmailNotificationsEnabled)
            return new SmtpConnectionConfig();

        var hasStoredPassword = !string.IsNullOrWhiteSpace(row.SmtpPasswordProtected);
        var password = UnprotectPassword(row.SmtpPasswordProtected);
        return new SmtpConnectionConfig
        {
            Enabled = row.EmailNotificationsEnabled,
            Host = row.SmtpHost?.Trim() ?? string.Empty,
            Port = row.SmtpPort,
            UseStartTls = row.SmtpUseStartTls,
            Username = row.SmtpUsername?.Trim() ?? string.Empty,
            Password = password,
            FromAddress = row.EmailFromAddress?.Trim() ?? string.Empty,
            FromDisplayName = row.EmailFromDisplayName,
            SendPaymentReceipts = row.EmailSendPaymentReceipts,
            SendMembershipExpiryReminders = row.EmailSendMembershipExpiryReminders,
            SendDietAssignments = row.EmailSendDietAssignments,
            PasswordStoredButUnreadable = hasStoredPassword && string.IsNullOrWhiteSpace(password),
        };
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

    private EmailSettingsDto MapToDto(GymSetting row)
    {
        var hasStoredPassword = !string.IsNullOrWhiteSpace(row.SmtpPasswordProtected);
        var passwordReadable = hasStoredPassword && !string.IsNullOrWhiteSpace(UnprotectPassword(row.SmtpPasswordProtected));
        var passwordNeedsReentry = hasStoredPassword && !passwordReadable;
        var configured = row.EmailNotificationsEnabled
            && !string.IsNullOrWhiteSpace(row.SmtpHost)
            && !string.IsNullOrWhiteSpace(row.SmtpUsername)
            && passwordReadable
            && !string.IsNullOrWhiteSpace(row.EmailFromAddress);

        return new EmailSettingsDto
        {
            Enabled = row.EmailNotificationsEnabled,
            Provider = InferProvider(row.SmtpHost),
            SmtpHost = row.SmtpHost,
            SmtpPort = row.SmtpPort,
            SmtpUseStartTls = row.SmtpUseStartTls,
            SmtpUsername = row.SmtpUsername,
            HasPasswordConfigured = hasStoredPassword,
            FromAddress = row.EmailFromAddress,
            FromDisplayName = row.EmailFromDisplayName,
            SendPaymentReceipts = row.EmailSendPaymentReceipts,
            SendMembershipExpiryReminders = row.EmailSendMembershipExpiryReminders,
            SendDietAssignments = row.EmailSendDietAssignments,
            IsConfigured = configured,
            PasswordNeedsReentry = passwordNeedsReentry,
            UpdatedDateUtc = row.EmailSettingsUpdatedDate ?? row.UpdatedDate,
        };
    }

    private static void ApplyProviderPreset(UpdateEmailSettingsDto dto)
    {
        switch (dto.Provider?.Trim().ToLowerInvariant())
        {
            case "gmail":
                dto.SmtpHost = "smtp.gmail.com";
                dto.SmtpPort = 587;
                dto.SmtpUseStartTls = true;
                break;
            case "outlook":
                dto.SmtpHost = "smtp.office365.com";
                dto.SmtpPort = 587;
                dto.SmtpUseStartTls = true;
                break;
        }
    }

    private static string InferProvider(string? host)
    {
        var h = host?.Trim().ToLowerInvariant() ?? string.Empty;
        if (h.Contains("gmail"))
            return "gmail";
        if (h.Contains("office365") || h.Contains("outlook"))
            return "outlook";
        return "custom";
    }

    private string ProtectPassword(string plain) =>
        _dataProtection.CreateProtector(PasswordProtectorPurpose).Protect(plain);

    private string UnprotectPassword(string? protectedValue)
    {
        if (string.IsNullOrWhiteSpace(protectedValue))
            return string.Empty;

        try
        {
            return _dataProtection.CreateProtector(PasswordProtectorPurpose).Unprotect(protectedValue);
        }
        catch
        {
            return string.Empty;
        }
    }
}
