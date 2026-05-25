using GymManagement.Domain.Entities.PersonalTraining;

namespace GymManagement.Core.DTOs.PersonalTraining
{
    public class PTPackageDto
    {
        public int Id { get; set; }
        public string PackageName { get; set; } = string.Empty;
        public string? Description { get; set; }
        public PTPackageType PackageType { get; set; }
        public int TotalSessions { get; set; }
        public int ValidityDays { get; set; }
        public decimal Price { get; set; }
        public decimal TaxPercentage { get; set; }
        public decimal DefaultDiscountAmount { get; set; }
        public bool IsActive { get; set; }
        public IReadOnlyList<PTPackagePriceDto> TrainerPrices { get; set; } = Array.Empty<PTPackagePriceDto>();
    }

    public class PTPackagePriceDto
    {
        public int Id { get; set; }
        public int TrainerId { get; set; }
        public string? TrainerName { get; set; }
        public decimal Price { get; set; }
        public bool IsActive { get; set; }
    }

    public class CreatePTPackageDto
    {
        public string PackageName { get; set; } = string.Empty;
        public string? Description { get; set; }
        public PTPackageType PackageType { get; set; }
        public int TotalSessions { get; set; }
        public int ValidityDays { get; set; }
        public decimal Price { get; set; }
        public decimal TaxPercentage { get; set; }
        public decimal DefaultDiscountAmount { get; set; }
        public bool IsActive { get; set; } = true;
        public List<CreatePTPackagePriceDto>? TrainerPrices { get; set; }
    }

    public class CreatePTPackagePriceDto
    {
        public int TrainerId { get; set; }
        public decimal Price { get; set; }
    }

    public class UpdatePTPackageDto : CreatePTPackageDto { }

    public class PTPackageFilterDto : GymManagement.Core.DTOs.Common.PagedQueryDto
    {
        public PTPackageType? PackageType { get; set; }
        public bool? IsActive { get; set; }
    }

    public class MemberPTPackageDto
    {
        public int Id { get; set; }
        public int UserId { get; set; }
        public string? MemberName { get; set; }
        public int TrainerId { get; set; }
        public string? TrainerName { get; set; }
        public int PackageId { get; set; }
        public string? PackageName { get; set; }
        public int TotalSessions { get; set; }
        public int RemainingSessions { get; set; }
        public DateTime StartDate { get; set; }
        public DateTime ExpiryDate { get; set; }
        public DateTime? FrozenUntil { get; set; }
        public MemberPTPackageStatus Status { get; set; }
        public decimal TotalAmount { get; set; }
        public decimal PaidAmount { get; set; }
        public PTPaymentStatus PaymentStatus { get; set; }
        public string? InvoiceNumber { get; set; }
    }

    public class RecordPtPaymentDto
    {
        public decimal Amount { get; set; }
    }

    public class AssignPTPackageDto
    {
        public int UserId { get; set; }
        public int TrainerId { get; set; }
        public int PackageId { get; set; }
        public decimal? DiscountAmount { get; set; }
        public string? CouponCode { get; set; }
        public decimal? PaidAmount { get; set; }
        public string? Notes { get; set; }
    }

    public class MemberPTPackageFilterDto : GymManagement.Core.DTOs.Common.PagedQueryDto
    {
        public int? UserId { get; set; }
        public int? TrainerId { get; set; }
        public MemberPTPackageStatus? Status { get; set; }
        public bool? ExpiringWithinDays { get; set; }
    }

    public class FreezePTPackageDto
    {
        public DateTime FrozenUntil { get; set; }
        public string? Notes { get; set; }
    }

    public class ExtendPTPackageDto
    {
        public int AdditionalDays { get; set; }
        public int? AdditionalSessions { get; set; }
        public string? Notes { get; set; }
    }

    public class TrainerScheduleDto
    {
        public int Id { get; set; }
        public int TrainerId { get; set; }
        public int DayOfWeek { get; set; }
        public TimeSpan StartTime { get; set; }
        public TimeSpan EndTime { get; set; }
        public TimeSpan? BreakStart { get; set; }
        public TimeSpan? BreakEnd { get; set; }
        public int SessionDurationMinutes { get; set; }
        public int MaxSessionsPerDay { get; set; }
        public bool IsActive { get; set; }
    }

    public class UpsertTrainerScheduleDto
    {
        public int TrainerId { get; set; }
        public int DayOfWeek { get; set; }
        public TimeSpan StartTime { get; set; }
        public TimeSpan EndTime { get; set; }
        public TimeSpan? BreakStart { get; set; }
        public TimeSpan? BreakEnd { get; set; }
        public int SessionDurationMinutes { get; set; } = 60;
        public int MaxSessionsPerDay { get; set; } = 8;
        public bool IsActive { get; set; } = true;
    }

    public class TrainerLeaveDto
    {
        public int Id { get; set; }
        public int TrainerId { get; set; }
        public DateTime StartDate { get; set; }
        public DateTime EndDate { get; set; }
        public string? Reason { get; set; }
        public bool IsApproved { get; set; }
    }

    public class CreateTrainerLeaveDto
    {
        public int TrainerId { get; set; }
        public DateTime StartDate { get; set; }
        public DateTime EndDate { get; set; }
        public string? Reason { get; set; }
    }

    public class PTSessionDto
    {
        public int Id { get; set; }
        public int MemberPTPackageId { get; set; }
        public int UserId { get; set; }
        public string? MemberName { get; set; }
        public int TrainerId { get; set; }
        public string? TrainerName { get; set; }
        public DateTime ScheduledStartUtc { get; set; }
        public DateTime ScheduledEndUtc { get; set; }
        public PTSessionStatus Status { get; set; }
        public string? Notes { get; set; }
        public int RemainingSessions { get; set; }
    }

    public class BookPTSessionDto
    {
        public int MemberPTPackageId { get; set; }
        public DateTime ScheduledStartUtc { get; set; }
        public DateTime ScheduledEndUtc { get; set; }
        public string? Notes { get; set; }
    }

    public class ReschedulePTSessionDto
    {
        public DateTime ScheduledStartUtc { get; set; }
        public DateTime ScheduledEndUtc { get; set; }
        public string? Notes { get; set; }
    }

    public class PTSessionFilterDto : GymManagement.Core.DTOs.Common.PagedQueryDto
    {
        public int? UserId { get; set; }
        public int? TrainerId { get; set; }
        public int? MemberPTPackageId { get; set; }
        public PTSessionStatus? Status { get; set; }
        public DateTime? FromUtc { get; set; }
        public DateTime? ToUtc { get; set; }
    }

    public class MarkPTAttendanceDto
    {
        public bool MemberPresent { get; set; }
        public bool TrainerPresent { get; set; }
        public bool IsLate { get; set; }
        public bool IsNoShow { get; set; }
    }

    public class PTAttendanceDto
    {
        public int Id { get; set; }
        public int PTSessionId { get; set; }
        public bool MemberPresent { get; set; }
        public bool TrainerPresent { get; set; }
        public bool IsLate { get; set; }
        public bool IsNoShow { get; set; }
        public DateTime? CompletedAtUtc { get; set; }
    }

    public class TrainerCommissionRuleDto
    {
        public int Id { get; set; }
        public int TrainerId { get; set; }
        public TrainerCommissionType CommissionType { get; set; }
        public decimal? Percentage { get; set; }
        public decimal? FixedAmount { get; set; }
        public int? PackageId { get; set; }
        public bool IsActive { get; set; }
    }

    public class UpsertCommissionRuleDto
    {
        public int TrainerId { get; set; }
        public TrainerCommissionType CommissionType { get; set; }
        public decimal? Percentage { get; set; }
        public decimal? FixedAmount { get; set; }
        public int? PackageId { get; set; }
        public bool IsActive { get; set; } = true;
    }

    public class TrainerCommissionDto
    {
        public int Id { get; set; }
        public int TrainerId { get; set; }
        public decimal Amount { get; set; }
        public TrainerCommissionStatus Status { get; set; }
        public DateTime EarnedDate { get; set; }
        public int? PTSessionId { get; set; }
    }

    public class TrainerEarningsDashboardDto
    {
        public int TotalSessions { get; set; }
        public int SessionsCompleted { get; set; }
        public int ActiveClients { get; set; }
        public decimal MonthlyEarnings { get; set; }
        public decimal PendingCommissions { get; set; }
        public decimal AttendancePercent { get; set; }
        public IReadOnlyList<PackageSalesStatDto> TopPackagesSold { get; set; } = Array.Empty<PackageSalesStatDto>();
        public IReadOnlyList<MonthlyStatPointDto> MonthlySessionTrend { get; set; } = Array.Empty<MonthlyStatPointDto>();
        public IReadOnlyList<MonthlyStatPointDto> MonthlyRevenueTrend { get; set; } = Array.Empty<MonthlyStatPointDto>();
    }

    public class PackageSalesStatDto
    {
        public string PackageName { get; set; } = string.Empty;
        public int Count { get; set; }
        public decimal Revenue { get; set; }
    }

    public class MonthlyStatPointDto
    {
        public int Year { get; set; }
        public int Month { get; set; }
        public decimal Value { get; set; }
    }

    public class PTNotificationDto
    {
        public int Id { get; set; }
        public PTNotificationType NotificationType { get; set; }
        public string Title { get; set; } = string.Empty;
        public string? Body { get; set; }
        public bool IsRead { get; set; }
        public DateTime? ScheduledForUtc { get; set; }
        public DateTime CreatedDate { get; set; }
    }

    public class PTReportFilterDto
    {
        public DateTime? From { get; set; }
        public DateTime? To { get; set; }
        public int? TrainerId { get; set; }
        public int? PackageId { get; set; }
    }

    public class PTRevenueReportDto
    {
        public decimal TotalRevenue { get; set; }
        public decimal TotalPaid { get; set; }
        public decimal TotalPending { get; set; }
        public int PackagesSold { get; set; }
    }

    public class PTUtilizationReportDto
    {
        public int TotalSessionsBooked { get; set; }
        public int SessionsCompleted { get; set; }
        public int SessionsNoShow { get; set; }
        public decimal UtilizationPercent { get; set; }
    }
}
