using GymManagement.Core.DTOs;
using GymManagement.Core.Notifications;
using GymManagement.Core.Services;
using GymManagement.Domain.Entities;
using GymManagement.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace GymManagement.Infrastructure.Services.Notifications;

public sealed class NotificationTemplateService : INotificationTemplateService
{
    private static readonly (string Code, string Name)[] SeedTemplates =
    [
        (NotificationTemplateCodes.PaymentSuccess, "Payment Success"),
        (NotificationTemplateCodes.MembershipActivated, "Membership Activated"),
        (NotificationTemplateCodes.MembershipRenewalReminder, "Membership Renewal Reminder"),
        (NotificationTemplateCodes.MembershipExpired, "Membership Expired"),
        (NotificationTemplateCodes.Birthday, "Birthday"),
        (NotificationTemplateCodes.WorkoutAssigned, "Workout Assigned"),
        (NotificationTemplateCodes.TrainerAssigned, "Trainer Assigned"),
        (NotificationTemplateCodes.ForgotPasswordOtp, "Forgot Password OTP"),
        (NotificationTemplateCodes.Welcome, "Welcome"),
        (NotificationTemplateCodes.InvoiceGenerated, "Invoice Generated"),
        (NotificationTemplateCodes.PaymentDueReminder, "Payment Due Reminder"),
        (NotificationTemplateCodes.Attendance, "Attendance"),
        (NotificationTemplateCodes.PtSessionBooked, "PT Session Booked"),
        (NotificationTemplateCodes.DietAssignmentAssigned, "Diet Assignment"),
    ];

    private readonly ApplicationDbContext _db;
    private readonly INotificationTemplateProvider _provider;
    private readonly INotificationTemplateRenderer _renderer;
    private readonly ILogger<NotificationTemplateService> _logger;

    public NotificationTemplateService(
        ApplicationDbContext db,
        INotificationTemplateProvider provider,
        INotificationTemplateRenderer renderer,
        ILogger<NotificationTemplateService> logger)
    {
        _db = db;
        _provider = provider;
        _renderer = renderer;
        _logger = logger;
    }

    public async Task EnsureSeededAsync(CancellationToken ct = default)
    {
        foreach (var (code, name) in SeedTemplates)
        {
            foreach (var channel in new[] { NotificationChannels.Email, NotificationChannels.Sms })
            {
                var exists = await _db.NotificationTemplates.AnyAsync(
                    t => !t.IsDeleted && t.TemplateCode == code && t.Channel == channel,
                    ct);
                if (exists)
                    continue;

                var body = await _provider.GetDefaultBodyFromFileAsync(code, channel, ct);
                if (body == null)
                    continue;

                var subject = await _provider.GetDefaultSubjectFromFileAsync(code, channel, ct);
                await _db.NotificationTemplates.AddAsync(new NotificationTemplate
                {
                    TemplateCode = code,
                    TemplateName = name,
                    Channel = channel,
                    Subject = subject,
                    Body = body,
                    IsHtml = channel == NotificationChannels.Email,
                    IsActive = true,
                    IsCustomized = false,
                }, ct);
            }
        }

        if (_db.ChangeTracker.HasChanges())
        {
            await _db.SaveChangesAsync(ct);
            _logger.LogInformation("Seeded notification templates from file defaults.");
        }
    }

    public async Task<IReadOnlyList<NotificationTemplateDto>> ListAsync(NotificationTemplateQueryDto query, CancellationToken ct = default)
    {
        var q = BuildQuery(query);
        var page = Math.Max(1, query.Page);
        var size = Math.Clamp(query.PageSize, 1, 100);

        var rows = await q.OrderBy(t => t.TemplateCode).ThenBy(t => t.Channel)
            .Skip((page - 1) * size).Take(size).ToListAsync(ct);
        return rows.Select(Map).ToList();
    }

    public Task<int> CountAsync(NotificationTemplateQueryDto query, CancellationToken ct = default) =>
        BuildQuery(query).CountAsync(ct);

    public async Task<NotificationTemplateDto?> GetByIdAsync(int id, CancellationToken ct = default)
    {
        var row = await _db.NotificationTemplates.AsNoTracking()
            .FirstOrDefaultAsync(t => t.Id == id && !t.IsDeleted, ct);
        return row == null ? null : Map(row);
    }

    public async Task<NotificationTemplateDto> UpdateAsync(int id, UpdateNotificationTemplateDto dto, CancellationToken ct = default)
    {
        var row = await _db.NotificationTemplates.FirstOrDefaultAsync(t => t.Id == id && !t.IsDeleted, ct)
            ?? throw new KeyNotFoundException("Template not found.");

        if (!string.IsNullOrWhiteSpace(dto.TemplateName))
            row.TemplateName = dto.TemplateName.Trim();
        if (dto.Subject != null)
            row.Subject = dto.Subject;
        if (dto.Body != null)
        {
            row.Body = dto.Body;
            row.IsCustomized = true;
        }
        if (dto.IsActive.HasValue)
            row.IsActive = dto.IsActive.Value;

        row.UpdatedDate = DateTime.UtcNow;
        await _db.SaveChangesAsync(ct);
        return Map(row);
    }

    public async Task<NotificationTemplateDto> ResetToDefaultAsync(int id, CancellationToken ct = default)
    {
        var row = await _db.NotificationTemplates.FirstOrDefaultAsync(t => t.Id == id && !t.IsDeleted, ct)
            ?? throw new KeyNotFoundException("Template not found.");

        var body = await _provider.GetDefaultBodyFromFileAsync(row.TemplateCode, row.Channel, ct)
            ?? throw new InvalidOperationException("No default template file found.");

        row.Body = body;
        row.Subject = await _provider.GetDefaultSubjectFromFileAsync(row.TemplateCode, row.Channel, ct);
        row.IsCustomized = false;
        row.UpdatedDate = DateTime.UtcNow;
        await _db.SaveChangesAsync(ct);
        return Map(row);
    }

    public async Task<NotificationTemplatePreviewDto> PreviewAsync(int id, CancellationToken ct = default)
    {
        var row = await _db.NotificationTemplates.AsNoTracking()
            .FirstOrDefaultAsync(t => t.Id == id && !t.IsDeleted, ct)
            ?? throw new KeyNotFoundException("Template not found.");

        var sample = GetSamplePlaceholders();
        var rendered = _renderer.RenderTemplate(row.Subject, row.Body, row.IsHtml, sample);
        return new NotificationTemplatePreviewDto
        {
            TemplateCode = row.TemplateCode,
            Channel = row.Channel,
            Subject = rendered.Subject,
            Body = rendered.Body,
            IsHtml = rendered.IsHtml,
        };
    }

    public IReadOnlyDictionary<string, string?> GetSamplePlaceholders() =>
        new Dictionary<string, string?>(StringComparer.OrdinalIgnoreCase)
        {
            ["GymName"] = "Tiger Fitness",
            ["LogoUrl"] = "",
            ["MemberName"] = "Chetan Sharma",
            ["MemberId"] = "M-10008",
            ["ReceiptNumber"] = "RCP-2026-000013",
            ["InvoiceNumber"] = "INV-2026-000017",
            ["PlanName"] = "Half Yearly",
            ["PlanDuration"] = "6 months",
            ["Amount"] = "6,899.00",
            ["PaymentMode"] = "UPI",
            ["PaymentStatus"] = "Paid",
            ["PaymentDate"] = "28 Jun 2026",
            ["StartDate"] = "01 Jan 2026",
            ["EndDate"] = "30 Jun 2026",
            ["TrainerName"] = "Coach Rahul",
            ["WorkoutName"] = "Upper Body Strength",
            ["AttendanceDate"] = "28 Jun 2026",
            ["AttendanceTime"] = "07:30 AM",
            ["OTP"] = "482910",
            ["SupportEmail"] = "support@tigerfitness.com",
            ["SupportPhone"] = "+91 98765 43210",
            ["Website"] = "https://tigerfitness.com",
            ["CurrentYear"] = DateTime.UtcNow.Year.ToString(),
            ["DaysRemaining"] = "7",
        };

    private IQueryable<NotificationTemplate> BuildQuery(NotificationTemplateQueryDto query)
    {
        var q = _db.NotificationTemplates.AsNoTracking().Where(t => !t.IsDeleted);
        if (!string.IsNullOrWhiteSpace(query.Search))
        {
            var s = query.Search.Trim();
            q = q.Where(t => t.TemplateCode.Contains(s) || t.TemplateName.Contains(s));
        }
        if (!string.IsNullOrWhiteSpace(query.Channel))
            q = q.Where(t => t.Channel == query.Channel);
        if (query.IsActive.HasValue)
            q = q.Where(t => t.IsActive == query.IsActive.Value);
        return q;
    }

    private static NotificationTemplateDto Map(NotificationTemplate t) => new()
    {
        Id = t.Id,
        TemplateCode = t.TemplateCode,
        TemplateName = t.TemplateName,
        Channel = t.Channel,
        Subject = t.Subject,
        Body = t.Body,
        IsHtml = t.IsHtml,
        IsActive = t.IsActive,
        IsCustomized = t.IsCustomized,
        CreatedDate = t.CreatedDate,
        UpdatedDate = t.UpdatedDate,
    };
}
