using GymManagement.Core.Caching;
using GymManagement.Core.DTOs;
using GymManagement.Core.Interfaces;
using GymManagement.Core.Interfaces.Caching;
using GymManagement.Core.Options;
using GymManagement.Core.Services;
using GymManagement.Domain.Entities;
using GymManagement.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using EntityInvoiceStatus = GymManagement.Domain.Entities.InvoiceStatus;

namespace GymManagement.Infrastructure.Services
{
    public class DashboardService : IDashboardService
    {
        private readonly IUnitOfWork _unitOfWork;
        private readonly ApplicationDbContext _context;
        private readonly IOptions<NotificationWebhookOptions> _notificationOptions;
        private readonly IAppCache _cache;

        public DashboardService(
            IUnitOfWork unitOfWork,
            ApplicationDbContext context,
            IOptions<NotificationWebhookOptions> notificationOptions,
            IAppCache cache)
        {
            _unitOfWork = unitOfWork;
            _context = context;
            _notificationOptions = notificationOptions;
            _cache = cache;
        }

        public async Task<DashboardSummaryDto> GetSummaryAsync(CancellationToken cancellationToken = default)
        {
            const string cacheKey = DashboardCacheKeys.Summary;
            var cached = await _cache.GetAsync<DashboardSummaryDto>(cacheKey, cancellationToken);
            if (cached != null)
                return cached;

            var today = DateTime.UtcNow.Date;
            var monthStart = new DateTime(today.Year, today.Month, 1, 0, 0, 0, DateTimeKind.Utc);
            var expiryWindowEnd = today.AddDays(14);

            // EXPLAIN ANALYZE (recommended): member counts use User + UserUserTypes + UserTypes with IsDeleted/IsActive filters.
            var membersQuery = _context.Users.AsNoTracking().Where(u =>
                _context.UserUserTypes.Any(uut =>
                    uut.UserId == u.Id
                    && _context.UserTypes.Any(ut => ut.Id == uut.UserTypeId && ut.Name == "Member")));

            var totalMembers = await membersQuery.CountAsync(cancellationToken);
            var activeMembers = await _context.UserMemberships.AsNoTracking()
                .Where(m => !m.IsDeleted && m.Status == MembershipStatus.Active)
                .Select(m => m.UserId)
                .Distinct()
                .CountAsync(cancellationToken);
            var newMembersToday = await membersQuery.CountAsync(
                u => u.RegistrationDate.Date >= today,
                cancellationToken);

            var expiredMemberships = await _context.UserMemberships.AsNoTracking()
                .CountAsync(
                    m => m.Status == MembershipStatus.Expired || m.EndDate.Date < today,
                    cancellationToken);

            var expiringSoon = await _context.UserMemberships.AsNoTracking()
                .CountAsync(
                    m => m.Status == MembershipStatus.Active
                         && m.EndDate.Date >= today
                         && m.EndDate.Date <= expiryWindowEnd,
                    cancellationToken);

            var todayAttendance = await _context.AttendanceLogs.AsNoTracking()
                .CountAsync(a => a.AttendanceDate == today, cancellationToken);

            var now = DateTime.UtcNow;
            var pendingPayments = await _context.Invoices.AsNoTracking()
                .CountAsync(
                    i => i.Status == EntityInvoiceStatus.Overdue
                         || ((i.Status == EntityInvoiceStatus.Draft || i.Status == EntityInvoiceStatus.Sent)
                             && i.DueDate < now),
                    cancellationToken);

            var voidedMembershipIds = _context.UserMemberships.AsNoTracking()
                .Where(m => !m.IsDeleted && m.Status == MembershipStatus.Voided)
                .Select(m => m.Id);

            var monthEnd = monthStart.AddMonths(1);
            var todayEnd = today.AddDays(1);

            // Enterprise billing: completed installments (legacy Payments table is no longer written).
            var completedTransactions = _context.MembershipPaymentTransactions.AsNoTracking()
                .Where(t => !t.IsDeleted && t.Status == MembershipPaymentTransactionStatus.Completed)
                .Join(
                    _context.MembershipPayments.AsNoTracking().Where(mp => !mp.IsDeleted),
                    t => t.PaymentId,
                    mp => mp.Id,
                    (t, mp) => new { t.TransactionAmount, t.TransactionDate, mp.MembershipId });

            var monthlyRevenue = await completedTransactions
                .Where(x => x.TransactionDate >= monthStart && x.TransactionDate < monthEnd)
                .Where(x => !voidedMembershipIds.Contains(x.MembershipId))
                .SumAsync(x => (decimal?)x.TransactionAmount, cancellationToken) ?? 0m;

            var todayRevenue = await completedTransactions
                .Where(x => x.TransactionDate >= today && x.TransactionDate < todayEnd)
                .Where(x => !voidedMembershipIds.Contains(x.MembershipId))
                .SumAsync(x => (decimal?)x.TransactionAmount, cancellationToken) ?? 0m;

            var trainerCount = await _context.Trainers.AsNoTracking().CountAsync(cancellationToken);

            var summary = new DashboardSummaryDto
            {
                TotalMembers = totalMembers,
                ActiveMembers = activeMembers,
                ExpiredMemberships = expiredMemberships,
                TodayAttendance = todayAttendance,
                PendingPayments = pendingPayments,
                MonthlyRevenue = monthlyRevenue,
                TodayRevenue = todayRevenue,
                TrainerCount = trainerCount,
                NewMembersToday = newMembersToday,
                ExpiringMembershipsNext14Days = expiringSoon,
            };

            await _cache.SetAsync(cacheKey, summary, TimeSpan.FromMinutes(2), cancellationToken);
            return summary;
        }

        public async Task<DashboardStatisticsDto> GetStatisticsAsync()
        {
            var totalUsers = await _context.Users.AsNoTracking().CountAsync();
            var totalTrainers = await _context.Trainers.AsNoTracking().CountAsync();

            // Aggregate client counts per trainer in SQL (avoids loading all schedules).
            var trainersWithUserCount = await (
                from t in _context.Trainers.AsNoTracking()
                join u in _context.Users.AsNoTracking() on t.UserId equals u.Id
                join au in _context.AuthUsers.AsNoTracking() on u.Id equals au.UserId into authJoin
                from au in authJoin.DefaultIfEmpty()
                let clientCount = _context.UserSchedules
                    .Where(s => s.TrainerId == t.Id)
                    .Select(s => s.UserId)
                    .Distinct()
                    .Count()
                orderby clientCount descending
                select new TrainerUserCountDto
                {
                    TrainerId = t.Id,
                    TrainerName = (u.FirstName + " " + u.LastName).Trim(),
                    TrainerEmail = au != null ? au.Email : string.Empty,
                    UserCount = clientCount,
                }
            ).ToListAsync();

            return new DashboardStatisticsDto
            {
                TotalUsers = totalUsers,
                TotalTrainers = totalTrainers,
                TrainersWithUserCount = trainersWithUserCount,
            };
        }

        public async Task<DashboardNotificationsDto> GetNotificationsAsync()
        {
            var now = DateTime.UtcNow;
            var expiryWindowEnd = now.Date.AddDays(7);
            var attendanceWindowStart = now.Date.AddDays(-3);

            var expiringMembershipCount = await _context.UserMemberships
                .AsNoTracking()
                .CountAsync(m => m.Status == MembershipStatus.Active &&
                                 m.EndDate.Date >= now.Date &&
                                 m.EndDate.Date <= expiryWindowEnd);

            var failedPaymentCount = await _context.Invoices
                .AsNoTracking()
                .CountAsync(i =>
                    i.Status == EntityInvoiceStatus.Overdue ||
                    ((i.Status == EntityInvoiceStatus.Draft || i.Status == EntityInvoiceStatus.Sent) && i.DueDate < now));

            var activeMembershipUserIds = await _context.UserMemberships
                .AsNoTracking()
                .Where(m => m.Status == MembershipStatus.Active)
                .Select(m => m.UserId)
                .Distinct()
                .ToListAsync();

            var attendedUserIds = await _context.AttendanceLogs
                .AsNoTracking()
                .Where(a => a.UserId.HasValue && a.AttendanceDate >= attendanceWindowStart)
                .Select(a => a.UserId!.Value)
                .Distinct()
                .ToListAsync();

            var missingAttendanceCount = activeMembershipUserIds.Except(attendedUserIds).Count();
            var staleCheckInCount = await _context.AttendanceLogs
                .AsNoTracking()
                .CountAsync(a => a.CheckOutTime == null && a.CheckInTime <= now.AddHours(-12));

            var attendanceAnomalyCount = missingAttendanceCount + staleCheckInCount;

            var alerts = new List<DashboardAlertDto>
            {
                new DashboardAlertDto
                {
                    Type = "membership_expiry",
                    Severity = expiringMembershipCount > 0 ? "warning" : "info",
                    Title = "Expiring memberships",
                    Message = expiringMembershipCount > 0
                        ? $"{expiringMembershipCount} membership(s) expiring in the next 7 days."
                        : "No memberships expiring in the next 7 days.",
                    Count = expiringMembershipCount
                },
                new DashboardAlertDto
                {
                    Type = "failed_payments",
                    Severity = failedPaymentCount > 0 ? "danger" : "info",
                    Title = "Failed/overdue payments",
                    Message = failedPaymentCount > 0
                        ? $"{failedPaymentCount} unpaid invoice(s) are overdue or pending past due date."
                        : "No failed or overdue payments detected.",
                    Count = failedPaymentCount
                },
                new DashboardAlertDto
                {
                    Type = "attendance_anomalies",
                    Severity = attendanceAnomalyCount > 0 ? "warning" : "info",
                    Title = "Attendance anomalies",
                    Message = attendanceAnomalyCount > 0
                        ? $"{attendanceAnomalyCount} anomaly signal(s): no recent check-ins or stale active check-ins."
                        : "No attendance anomalies detected.",
                    Count = attendanceAnomalyCount
                }
            };

            var n = _notificationOptions.Value;
            var hooks = new NotificationHookStatusDto
            {
                EmailEnabled = !string.IsNullOrWhiteSpace(n.EmailWebhookUrl),
                WhatsAppEnabled = !string.IsNullOrWhiteSpace(n.WhatsAppWebhookUrl),
                ScheduledRemindersEnabled = n.EnableScheduledReminders && n.HasOutboundWebhook,
                InAppExpiryRemindersEnabled = n.EnableInAppMembershipExpiryReminders,
                MembershipExpiryReminderDays = n.MembershipExpiryReminderDays,
                InAppMembershipExpiryReminderDays = n.InAppMembershipExpiryReminderDays,
            };

            return new DashboardNotificationsDto
            {
                Alerts = alerts,
                Hooks = hooks
            };
        }
    }
}

