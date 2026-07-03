namespace GymManagement.Core.DTOs;

public class EmailSettingsDto
{
    public bool Enabled { get; set; }
    public string Provider { get; set; } = "custom";
    public string? SmtpHost { get; set; }
    public int SmtpPort { get; set; } = 587;
    public bool SmtpUseStartTls { get; set; } = true;
    public string? SmtpUsername { get; set; }
    public bool HasPasswordConfigured { get; set; }
    public string? FromAddress { get; set; }
    public string? FromDisplayName { get; set; }
    public bool SendPaymentReceipts { get; set; } = true;
    public bool SendMembershipExpiryReminders { get; set; } = true;
    public bool SendDietAssignments { get; set; } = true;
    public bool IsConfigured { get; set; }
    /// <summary>Stored password exists but could not be decrypted (e.g. after API restart before keys were persisted).</summary>
    public bool PasswordNeedsReentry { get; set; }
    public DateTime? UpdatedDateUtc { get; set; }
}

public class UpdateEmailSettingsDto
{
    public bool Enabled { get; set; }
    public string Provider { get; set; } = "custom";
    public string? SmtpHost { get; set; }
    public int SmtpPort { get; set; } = 587;
    public bool SmtpUseStartTls { get; set; } = true;
    public string? SmtpUsername { get; set; }
    /// <summary>When null/empty, keeps the existing stored password.</summary>
    public string? SmtpPassword { get; set; }
    public string? FromAddress { get; set; }
    public string? FromDisplayName { get; set; }
    public bool SendPaymentReceipts { get; set; } = true;
    public bool SendMembershipExpiryReminders { get; set; } = true;
    public bool SendDietAssignments { get; set; } = true;
}

public class TestEmailSettingsDto
{
    public string ToAddress { get; set; } = string.Empty;
}

public sealed class SmtpConnectionConfig
{
    public bool Enabled { get; set; }
    public string Host { get; set; } = string.Empty;
    public int Port { get; set; } = 587;
    public bool UseStartTls { get; set; } = true;
    public string Username { get; set; } = string.Empty;
    public string Password { get; set; } = string.Empty;
    public string FromAddress { get; set; } = string.Empty;
    public string? FromDisplayName { get; set; }
    public bool SendPaymentReceipts { get; set; } = true;
    public bool SendMembershipExpiryReminders { get; set; } = true;
    public bool SendDietAssignments { get; set; } = true;

    public bool PasswordStoredButUnreadable { get; set; }

    public bool IsConfigured =>
        Enabled
        && !string.IsNullOrWhiteSpace(Host)
        && Port > 0
        && !string.IsNullOrWhiteSpace(Username)
        && !string.IsNullOrWhiteSpace(Password)
        && !string.IsNullOrWhiteSpace(FromAddress);
}
