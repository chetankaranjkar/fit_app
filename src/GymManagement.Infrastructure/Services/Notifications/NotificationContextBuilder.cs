using GymManagement.Core.DTOs;
using GymManagement.Core.Notifications;
using GymManagement.Core.Services;
using GymManagement.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace GymManagement.Infrastructure.Services.Notifications;

public sealed class NotificationContextBuilder : INotificationContextBuilder
{
    private readonly ApplicationDbContext _db;
    private readonly IEmailSettingsService _emailSettings;

    public NotificationContextBuilder(ApplicationDbContext db, IEmailSettingsService emailSettings)
    {
        _db = db;
        _emailSettings = emailSettings;
    }

    public async Task<IReadOnlyDictionary<string, string?>> BuildCommonAsync(CancellationToken ct = default)
    {
        var settings = await _emailSettings.GetAsync(ct);
        var gymRow = await _db.GymSettings.AsNoTracking().FirstOrDefaultAsync(s => s.Id == 1, ct);
        var org = await _db.Organizations.AsNoTracking().OrderBy(o => o.Id).FirstOrDefaultAsync(ct);
        var gymName = gymRow?.GymName?.Trim();
        if (string.IsNullOrWhiteSpace(gymName))
            gymName = settings.FromDisplayName ?? org?.Name ?? "Gym Management";
        var logoUrl = gymRow?.GymLogoUrl?.Trim();
        if (string.IsNullOrWhiteSpace(logoUrl))
            logoUrl = gymRow?.InvoiceLogoUrl?.Trim();

        return new Dictionary<string, string?>(StringComparer.OrdinalIgnoreCase)
        {
            ["GymName"] = gymName,
            ["LogoUrl"] = logoUrl ?? string.Empty,
            ["PrimaryColor"] = "#2563eb",
            ["SupportEmail"] = settings.FromAddress ?? "support@gym.local",
            ["SupportPhone"] = string.Empty,
            ["Website"] = string.Empty,
            ["CurrentYear"] = DateTime.UtcNow.Year.ToString(),
        };
    }

    public IReadOnlyDictionary<string, string?> FromPaymentReceipt(PaymentReceiptNotificationDto dto)
    {
        var receipt = dto.ReceiptNo ?? dto.InvoiceNumber;
        return new Dictionary<string, string?>(StringComparer.OrdinalIgnoreCase)
        {
            ["MemberName"] = dto.CustomerName ?? "Member",
            ["MemberId"] = dto.UserId > 0 ? $"M-{dto.UserId:D5}" : string.Empty,
            ["ReceiptNumber"] = receipt,
            ["InvoiceNumber"] = dto.InvoiceNumber,
            ["PlanName"] = dto.PlanName ?? "Membership",
            ["PlanDuration"] = string.Empty,
            ["Amount"] = dto.TotalAmount.ToString("N2"),
            ["PaymentMode"] = dto.PaymentMode,
            ["PaymentStatus"] = "Paid",
            ["PaymentDate"] = dto.PaymentDateUtc.ToString("dd MMM yyyy"),
            ["Currency"] = dto.Currency,
        };
    }

    public IReadOnlyDictionary<string, string?> FromMembershipExpiring(MembershipExpiringNotificationDto dto)
    {
        var expired = dto.DaysRemaining <= 0;
        return new Dictionary<string, string?>(StringComparer.OrdinalIgnoreCase)
        {
            ["MemberName"] = dto.MemberName ?? "Member",
            ["MemberId"] = dto.UserId > 0 ? $"M-{dto.UserId:D5}" : string.Empty,
            ["PlanName"] = dto.PlanName ?? "Membership",
            ["EndDate"] = dto.EndDateUtc.ToString("dd MMM yyyy"),
            ["StartDate"] = string.Empty,
            ["DaysRemaining"] = dto.DaysRemaining.ToString(),
            ["PaymentStatus"] = expired ? "Expired" : "Expiring",
        };
    }

    public IReadOnlyDictionary<string, string?> FromDietAssignment(DietAssignmentAssignedNotificationDto dto)
    {
        return new Dictionary<string, string?>(StringComparer.OrdinalIgnoreCase)
        {
            ["MemberName"] = dto.MemberName ?? "Member",
            ["MemberId"] = dto.UserId > 0 ? $"M-{dto.UserId:D5}" : string.Empty,
            ["PlanName"] = dto.DietPlanName ?? "Diet plan",
            ["StartDate"] = dto.StartDateUtc.ToString("dd MMM yyyy"),
            ["EndDate"] = dto.EndDateUtc?.ToString("dd MMM yyyy"),
        };
    }

    public IReadOnlyDictionary<string, string?> FromPaymentDueReminder(PaymentDueReminderNotificationDto dto)
    {
        return new Dictionary<string, string?>(StringComparer.OrdinalIgnoreCase)
        {
            ["MemberName"] = dto.CustomerName ?? "Member",
            ["MemberId"] = dto.UserId > 0 ? $"M-{dto.UserId:D5}" : string.Empty,
            ["InvoiceNumber"] = dto.InvoiceNumber ?? string.Empty,
            ["PlanName"] = dto.PlanName ?? "Membership",
            ["PendingAmount"] = dto.PendingAmount.ToString("N2"),
            ["Amount"] = dto.PendingAmount.ToString("N2"),
            ["NextDueDate"] = dto.NextDueDateUtc?.ToString("dd MMM yyyy") ?? "soon",
            ["PaymentStatus"] = "Due",
        };
    }

    internal static Dictionary<string, string?> Merge(
        IReadOnlyDictionary<string, string?> common,
        IReadOnlyDictionary<string, string?> specific)
    {
        var merged = new Dictionary<string, string?>(StringComparer.OrdinalIgnoreCase);
        foreach (var kv in common) merged[kv.Key] = kv.Value;
        foreach (var kv in specific) merged[kv.Key] = kv.Value;
        return merged;
    }
}
