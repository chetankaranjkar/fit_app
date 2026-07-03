using GymManagement.Core.DTOs;

namespace GymManagement.Core.Services;

public interface INotificationTemplateRenderer
{
    string Render(string template, IReadOnlyDictionary<string, string?> placeholders);
    RenderedNotificationDto RenderTemplate(
        string? subjectTemplate,
        string bodyTemplate,
        bool isHtml,
        IReadOnlyDictionary<string, string?> placeholders);
}

public interface INotificationTemplateProvider
{
    Task<NotificationTemplateDto?> GetActiveAsync(string templateCode, string channel, CancellationToken ct = default);
    Task<string?> GetDefaultBodyFromFileAsync(string templateCode, string channel, CancellationToken ct = default);
    Task<string?> GetDefaultSubjectFromFileAsync(string templateCode, string channel, CancellationToken ct = default);
}

public interface INotificationTemplateService
{
    Task<IReadOnlyList<NotificationTemplateDto>> ListAsync(NotificationTemplateQueryDto query, CancellationToken ct = default);
    Task<int> CountAsync(NotificationTemplateQueryDto query, CancellationToken ct = default);
    Task<NotificationTemplateDto?> GetByIdAsync(int id, CancellationToken ct = default);
    Task<NotificationTemplateDto> UpdateAsync(int id, UpdateNotificationTemplateDto dto, CancellationToken ct = default);
    Task<NotificationTemplateDto> ResetToDefaultAsync(int id, CancellationToken ct = default);
    Task<NotificationTemplatePreviewDto> PreviewAsync(int id, CancellationToken ct = default);
    Task EnsureSeededAsync(CancellationToken ct = default);
    IReadOnlyDictionary<string, string?> GetSamplePlaceholders();
}

public interface INotificationContextBuilder
{
    Task<IReadOnlyDictionary<string, string?>> BuildCommonAsync(CancellationToken ct = default);
    IReadOnlyDictionary<string, string?> FromPaymentReceipt(PaymentReceiptNotificationDto dto);
    IReadOnlyDictionary<string, string?> FromMembershipExpiring(MembershipExpiringNotificationDto dto);
    IReadOnlyDictionary<string, string?> FromDietAssignment(DietAssignmentAssignedNotificationDto dto);
    IReadOnlyDictionary<string, string?> FromPaymentDueReminder(PaymentDueReminderNotificationDto dto);
}

public interface INotificationOutboxService
{
    Task<int> EnqueueAsync(EnqueueNotificationRequest request, CancellationToken ct = default);
    Task ProcessPendingAsync(CancellationToken ct = default);
}

public interface INotificationHistoryService
{
    Task RecordAsync(
        int? memberId,
        string notificationType,
        string channel,
        string recipient,
        string? subject,
        string message,
        string status,
        int retryCount,
        int? createdByUserId,
        int? durationMs,
        string? errorMessage,
        CancellationToken ct = default);

    Task<IReadOnlyList<NotificationHistoryDto>> ListAsync(int? memberId, int take, CancellationToken ct = default);
}

public interface IEmailTransportService
{
    Task SendAsync(
        string to,
        string subject,
        string textBody,
        string? htmlBody,
        IReadOnlyList<string>? attachmentPaths,
        CancellationToken ct = default);
}

public interface INotificationComposerService
{
    Task<RenderedNotificationDto> ComposeAsync(
        string templateCode,
        string channel,
        IReadOnlyDictionary<string, string?> placeholders,
        CancellationToken ct = default);
}

public interface INotificationEventService
{
    Task QueueWelcomeAsync(int userId, CancellationToken ct = default);
    Task QueueForgotPasswordAsync(int? userId, string email, string memberName, string resetUrl, CancellationToken ct = default);
    Task QueueAttendanceAsync(int userId, DateTime checkInUtc, CancellationToken ct = default);
    Task QueueWorkoutAssignedAsync(int userId, int workoutPlanId, CancellationToken ct = default);
    Task QueueTrainerAssignedAsync(int userId, int trainerId, CancellationToken ct = default);
    Task QueueInvoiceGeneratedAsync(int userId, string? recipientEmail, string invoiceNumber, decimal amount, string? attachmentPath, CancellationToken ct = default);
}
