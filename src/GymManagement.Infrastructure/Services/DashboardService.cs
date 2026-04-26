using GymManagement.Core.DTOs;
using GymManagement.Core.Interfaces;
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

        public DashboardService(
            IUnitOfWork unitOfWork,
            ApplicationDbContext context,
            IOptions<NotificationWebhookOptions> notificationOptions)
        {
            _unitOfWork = unitOfWork;
            _context = context;
            _notificationOptions = notificationOptions;
        }

        public async Task<DashboardStatisticsDto> GetStatisticsAsync()
        {
            // Get total users count
            var totalUsers = await _unitOfWork.Users.CountAsync();

            // Get total trainers count
            var totalTrainers = await _unitOfWork.Trainers.CountAsync();

            // Get all trainers with their user count (users linked through schedules)
            var trainers = await _unitOfWork.Trainers.GetAllAsync();
            var trainerUserIds = trainers.Select(i => i.UserId).Distinct().ToList();
            var trainerUsers = trainerUserIds.Count > 0
                ? await _unitOfWork.Users.FindAsync(u => trainerUserIds.Contains(u.Id))
                : new List<Domain.Entities.User>();
            var trainerUserDict = trainerUsers.ToDictionary(u => u.Id);
            var authByUserId = (await _unitOfWork.AuthUsers.GetAllAsync())
                .Where(a => a.UserId.HasValue && trainerUserIds.Contains(a.UserId.Value))
                .ToDictionary(a => a.UserId!.Value);
            var schedules = await _unitOfWork.UserSchedules.GetAllAsync();

            var trainersWithUserCount = new List<TrainerUserCountDto>();

            foreach (var trainer in trainers)
            {
                var instUser = trainerUserDict.GetValueOrDefault(trainer.UserId);
                var trainerEmail = authByUserId.GetValueOrDefault(trainer.UserId)?.Email ?? "";
                var userIds = schedules
                    .Where(s => s.TrainerId.HasValue && s.TrainerId.Value == trainer.Id)
                    .Select(s => s.UserId)
                    .Distinct()
                    .Count();

                trainersWithUserCount.Add(new TrainerUserCountDto
                {
                    TrainerId = trainer.Id,
                    TrainerName = instUser != null ? $"{instUser.FirstName} {instUser.LastName}" : "",
                    TrainerEmail = trainerEmail,
                    UserCount = userIds
                });
            }

            return new DashboardStatisticsDto
            {
                TotalUsers = totalUsers,
                TotalTrainers = totalTrainers,
                TrainersWithUserCount = trainersWithUserCount.OrderByDescending(i => i.UserCount).ToList()
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
                WhatsAppEnabled = !string.IsNullOrWhiteSpace(n.WhatsAppWebhookUrl)
            };

            return new DashboardNotificationsDto
            {
                Alerts = alerts,
                Hooks = hooks
            };
        }
    }
}

