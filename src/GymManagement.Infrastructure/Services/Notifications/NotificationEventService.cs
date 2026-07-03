using GymManagement.Core.Notifications;
using GymManagement.Core.Services;
using GymManagement.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace GymManagement.Infrastructure.Services.Notifications;

public sealed class NotificationEventService : INotificationEventService
{
    private readonly ApplicationDbContext _db;
    private readonly INotificationOutboxService _outbox;
    private readonly INotificationContextBuilder _contextBuilder;
    private readonly IUserNotificationPreferenceService _preferences;
    private readonly ILogger<NotificationEventService> _logger;

    public NotificationEventService(
        ApplicationDbContext db,
        INotificationOutboxService outbox,
        INotificationContextBuilder contextBuilder,
        IUserNotificationPreferenceService preferences,
        ILogger<NotificationEventService> logger)
    {
        _db = db;
        _outbox = outbox;
        _contextBuilder = contextBuilder;
        _preferences = preferences;
        _logger = logger;
    }

    public async Task QueueWelcomeAsync(int userId, CancellationToken ct = default)
    {
        await QueueForUserAsync(
            userId,
            NotificationTemplateCodes.Welcome,
            new Dictionary<string, string?>(StringComparer.OrdinalIgnoreCase),
            ct);
    }

    public async Task QueueForgotPasswordAsync(
        int? userId,
        string email,
        string memberName,
        string resetUrl,
        CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(email))
            return;

        var common = await _contextBuilder.BuildCommonAsync(ct);
        var placeholders = Merge(common, new Dictionary<string, string?>(StringComparer.OrdinalIgnoreCase)
        {
            ["MemberName"] = string.IsNullOrWhiteSpace(memberName) ? "Member" : memberName,
            ["OTP"] = resetUrl,
            ["ResetUrl"] = resetUrl,
        });

        await _outbox.EnqueueAsync(new Core.DTOs.EnqueueNotificationRequest
        {
            TemplateCode = NotificationTemplateCodes.ForgotPasswordOtp,
            Channel = NotificationChannels.Email,
            MemberId = userId,
            Recipient = email.Trim(),
            Placeholders = placeholders,
        }, ct);
    }

    public async Task QueueAttendanceAsync(int userId, DateTime checkInUtc, CancellationToken ct = default)
    {
        await QueueForUserAsync(
            userId,
            NotificationTemplateCodes.Attendance,
            new Dictionary<string, string?>(StringComparer.OrdinalIgnoreCase)
            {
                ["AttendanceDate"] = checkInUtc.ToString("dd MMM yyyy"),
                ["AttendanceTime"] = checkInUtc.ToString("hh:mm tt"),
            },
            ct);
    }

    public async Task QueueWorkoutAssignedAsync(int userId, int workoutPlanId, CancellationToken ct = default)
    {
        var workoutName = await _db.WorkoutPlans.AsNoTracking()
            .Where(w => w.Id == workoutPlanId)
            .Select(w => w.Name)
            .FirstOrDefaultAsync(ct);

        await QueueForUserAsync(
            userId,
            NotificationTemplateCodes.WorkoutAssigned,
            new Dictionary<string, string?>(StringComparer.OrdinalIgnoreCase)
            {
                ["WorkoutName"] = workoutName ?? "Workout plan",
                ["StartDate"] = DateTime.UtcNow.ToString("dd MMM yyyy"),
            },
            ct);
    }

    public async Task QueueTrainerAssignedAsync(int userId, int trainerId, CancellationToken ct = default)
    {
        var trainerName = await _db.Trainers.AsNoTracking()
            .Where(t => t.Id == trainerId)
            .Select(t => ((t.User.FirstName ?? "") + " " + (t.User.LastName ?? "")).Trim())
            .FirstOrDefaultAsync(ct);

        await QueueForUserAsync(
            userId,
            NotificationTemplateCodes.TrainerAssigned,
            new Dictionary<string, string?>(StringComparer.OrdinalIgnoreCase)
            {
                ["TrainerName"] = string.IsNullOrWhiteSpace(trainerName) ? "your trainer" : trainerName,
                ["StartDate"] = DateTime.UtcNow.ToString("dd MMM yyyy"),
            },
            ct);
    }

    public async Task QueueInvoiceGeneratedAsync(
        int userId,
        string? recipientEmail,
        string invoiceNumber,
        decimal amount,
        string? attachmentPath,
        CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(recipientEmail))
            return;
        if (!await _preferences.CanReceiveEmailAsync(userId, ct))
            return;

        var common = await _contextBuilder.BuildCommonAsync(ct);
        var user = await LoadUserRecipientAsync(userId, ct);
        var placeholders = Merge(common, new Dictionary<string, string?>(StringComparer.OrdinalIgnoreCase)
        {
            ["MemberName"] = user.Name,
            ["MemberId"] = $"M-{userId:D5}",
            ["InvoiceNumber"] = invoiceNumber,
            ["Amount"] = amount.ToString("N2"),
            ["PaymentStatus"] = "Generated",
        });

        await _outbox.EnqueueAsync(new Core.DTOs.EnqueueNotificationRequest
        {
            TemplateCode = NotificationTemplateCodes.InvoiceGenerated,
            Channel = NotificationChannels.Email,
            MemberId = userId,
            Recipient = recipientEmail.Trim(),
            Placeholders = placeholders,
            AttachmentPaths = string.IsNullOrWhiteSpace(attachmentPath) ? null : new[] { attachmentPath },
        }, ct);
    }

    private async Task QueueForUserAsync(
        int userId,
        string templateCode,
        Dictionary<string, string?> eventPlaceholders,
        CancellationToken ct)
    {
        var recipient = await LoadUserRecipientAsync(userId, ct);
        if (recipient.UserId <= 0)
            return;

        var common = await _contextBuilder.BuildCommonAsync(ct);
        var placeholders = Merge(common, eventPlaceholders);
        placeholders["MemberName"] = recipient.Name;
        placeholders["MemberId"] = $"M-{userId:D5}";

        if (recipient.ReceiveEmail && !string.IsNullOrWhiteSpace(recipient.Email))
        {
            await _outbox.EnqueueAsync(new Core.DTOs.EnqueueNotificationRequest
            {
                TemplateCode = templateCode,
                Channel = NotificationChannels.Email,
                MemberId = userId,
                Recipient = recipient.Email.Trim(),
                Placeholders = placeholders,
            }, ct);
        }

        if (recipient.ReceiveSms && !string.IsNullOrWhiteSpace(recipient.Phone))
        {
            await _outbox.EnqueueAsync(new Core.DTOs.EnqueueNotificationRequest
            {
                TemplateCode = templateCode,
                Channel = NotificationChannels.Sms,
                MemberId = userId,
                Recipient = recipient.Phone.Trim(),
                Placeholders = placeholders,
            }, ct);
        }
    }

    private async Task<UserRecipient> LoadUserRecipientAsync(int userId, CancellationToken ct)
    {
        var row = await _db.Users.AsNoTracking()
            .Where(u => u.Id == userId && !u.IsDeleted)
            .Select(u => new UserRecipient
            {
                UserId = u.Id,
                Name = ((u.FirstName ?? "") + " " + (u.LastName ?? "")).Trim(),
                Phone = u.Phone,
                Email = u.AuthUser != null ? u.AuthUser.Email : null,
                ReceiveEmail = u.ReceiveEmailNotifications,
                ReceiveSms = u.ReceiveSmsNotifications,
            })
            .FirstOrDefaultAsync(ct);

        if (row == null)
        {
            _logger.LogDebug("Notification skipped: user {UserId} not found.", userId);
            return new UserRecipient();
        }

        if (string.IsNullOrWhiteSpace(row.Name))
            row.Name = "Member";

        return row;
    }

    private static Dictionary<string, string?> Merge(
        IReadOnlyDictionary<string, string?> common,
        IReadOnlyDictionary<string, string?> specific)
    {
        var merged = new Dictionary<string, string?>(StringComparer.OrdinalIgnoreCase);
        foreach (var kv in common) merged[kv.Key] = kv.Value;
        foreach (var kv in specific) merged[kv.Key] = kv.Value;
        return merged;
    }

    private sealed class UserRecipient
    {
        public int UserId { get; set; }
        public string Name { get; set; } = string.Empty;
        public string? Email { get; set; }
        public string? Phone { get; set; }
        public bool ReceiveEmail { get; set; }
        public bool ReceiveSms { get; set; }
    }
}
