using GymManagement.Core.Services;
using GymManagement.Domain.Entities;
using GymManagement.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace GymManagement.Infrastructure.Services;

/// <summary>Daily-ish job backing: notify org admins during the last ~3 calendar days before an active QR expires.</summary>
public sealed class QrExpiryReminderService : IQrExpiryReminderService
{
    private readonly ApplicationDbContext _db;
    private readonly ILogger<QrExpiryReminderService> _logger;

    public QrExpiryReminderService(ApplicationDbContext db, ILogger<QrExpiryReminderService> logger)
    {
        _db = db;
        _logger = logger;
    }

    public async Task RunOnceAsync(DateTime utcNow, CancellationToken cancellationToken = default)
    {
        var horizonDate = utcNow.Date.AddDays(3);

        var active = await _db.GymQrCodes
            .Where(q =>
                q.IsActive
                && !q.IsDeleted
                && q.ExpiryDate >= utcNow
                && q.ExpiryDate.Date <= horizonDate)
            .ToListAsync(cancellationToken)
            .ConfigureAwait(false);

        foreach (var qr in active)
        {
            if (ShouldSkipDedupe(qr, utcNow))
                continue;

            await NotifyOrganizationAdminsAsync(qr.BranchId, qr, utcNow, cancellationToken).ConfigureAwait(false);
        }

        _logger.LogInformation(
            "QR expiry reminder pass completed; scanned {QrCount} near-expiry active code(s).",
            active.Count);
    }

    private static bool ShouldSkipDedupe(GymQrCode qr, DateTime utcNow) =>
        qr.LastExpiryNotificationUtc.HasValue
        && (utcNow - qr.LastExpiryNotificationUtc.Value).TotalHours < 22;

    private async Task NotifyOrganizationAdminsAsync(
        int branchId,
        GymQrCode qr,
        DateTime utcNow,
        CancellationToken cancellationToken)
    {
        var branch = await _db.Branches.AsNoTracking()
            .FirstOrDefaultAsync(b => b.Id == branchId, cancellationToken)
            .ConfigureAwait(false);
        if (branch?.OrganizationId is not { } orgId)
            return;

        var roleIds = await _db.AppRoles.AsNoTracking()
            .Where(r =>
                !r.IsDeleted
                && (r.Name == GymQrScanConstants.AdminRoleName || r.Name == GymQrScanConstants.StaffRoleName))
            .Select(r => r.Id)
            .ToListAsync(cancellationToken)
            .ConfigureAwait(false);

        if (roleIds.Count == 0)
            return;

        var staffAndAdminIds = await _db.Users.AsNoTracking()
            .Where(u => u.OrganizationId == orgId && u.IsActive && !u.IsDeleted)
            .Join(
                _db.UserRoles.AsNoTracking().Where(ur => roleIds.Contains(ur.RoleId) && !ur.IsDeleted),
                u => u.Id,
                ur => ur.UserId,
                (u, _) => u.Id)
            .Distinct()
            .ToListAsync(cancellationToken)
            .ConfigureAwait(false);

        if (staffAndAdminIds.Count == 0)
            return;

        foreach (var uid in staffAndAdminIds)
        {
            _db.Notifications.Add(new Notification
            {
                UserId = uid,
                Title = "Venue QR expiring soon",
                Message =
                    $"Branch \"{branch.BranchName}\" entry QR expires on {qr.ExpiryDate:o}. Rotate it from Owner QR.",
                IsRead = false,
                NotificationType = GymQrScanConstants.NotificationType,
                CreatedDate = utcNow
            });
        }

        var tracked = await _db.GymQrCodes
            .FirstOrDefaultAsync(q => q.Id == qr.Id, cancellationToken)
            .ConfigureAwait(false);
        if (tracked != null)
            tracked.LastExpiryNotificationUtc = utcNow;

        await _db.SaveChangesAsync(cancellationToken).ConfigureAwait(false);
    }
}
