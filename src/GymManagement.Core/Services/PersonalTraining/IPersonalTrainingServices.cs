using GymManagement.Core.DTOs.Common;
using GymManagement.Core.DTOs.PersonalTraining;
using GymManagement.Domain.Entities.PersonalTraining;

namespace GymManagement.Core.Services.PersonalTraining
{
    public interface IPtPackageService
    {
        Task<PagedResultDto<PTPackageDto>> SearchAsync(PTPackageFilterDto filter, CancellationToken ct = default);
        Task<PTPackageDto?> GetByIdAsync(int id, CancellationToken ct = default);
        Task<PTPackageDto> CreateAsync(CreatePTPackageDto dto, CancellationToken ct = default);
        Task<PTPackageDto?> UpdateAsync(int id, UpdatePTPackageDto dto, CancellationToken ct = default);
        Task<bool> DeleteAsync(int id, CancellationToken ct = default);
    }

    public interface IMemberPtPackageService
    {
        Task<PagedResultDto<MemberPTPackageDto>> SearchAsync(MemberPTPackageFilterDto filter, CancellationToken ct = default);
        Task<MemberPTPackageDto?> GetByIdAsync(int id, CancellationToken ct = default);
        Task<MemberPTPackageDto> AssignAsync(AssignPTPackageDto dto, int? performedByUserId, CancellationToken ct = default);
        Task<MemberPTPackageDto?> RecordPaymentAsync(int id, decimal amount, CancellationToken ct = default);
        Task<MemberPTPackageDto?> FreezeAsync(int id, FreezePTPackageDto dto, int? performedByUserId, CancellationToken ct = default);
        Task<MemberPTPackageDto?> UnfreezeAsync(int id, int? performedByUserId, CancellationToken ct = default);
        Task<MemberPTPackageDto?> ExtendAsync(int id, ExtendPTPackageDto dto, int? performedByUserId, CancellationToken ct = default);
    }

    public interface ITrainerScheduleService
    {
        Task<IReadOnlyList<TrainerScheduleDto>> GetByTrainerAsync(int trainerId, CancellationToken ct = default);
        Task<TrainerScheduleDto> UpsertAsync(UpsertTrainerScheduleDto dto, CancellationToken ct = default);
        Task<bool> DeleteAsync(int id, CancellationToken ct = default);
        Task<IReadOnlyList<TrainerLeaveDto>> GetLeavesAsync(int trainerId, CancellationToken ct = default);
        Task<TrainerLeaveDto> CreateLeaveAsync(CreateTrainerLeaveDto dto, CancellationToken ct = default);
        Task<bool> DeleteLeaveAsync(int id, CancellationToken ct = default);
        Task<bool> IsTrainerAvailableAsync(int trainerId, DateTime startUtc, DateTime endUtc, int? excludeSessionId, CancellationToken ct = default);
    }

    public interface IPtSessionService
    {
        Task<PagedResultDto<PTSessionDto>> SearchAsync(PTSessionFilterDto filter, CancellationToken ct = default);
        Task<PTSessionDto?> GetByIdAsync(int id, CancellationToken ct = default);
        Task<PTSessionDto> BookAsync(BookPTSessionDto dto, int? performedByUserId, CancellationToken ct = default);
        Task<PTSessionDto?> RescheduleAsync(int id, ReschedulePTSessionDto dto, int? performedByUserId, CancellationToken ct = default);
        Task<PTSessionDto?> CancelAsync(int id, string? notes, int? performedByUserId, CancellationToken ct = default);
    }

    public interface IPtAttendanceService
    {
        Task<PTAttendanceDto> MarkAsync(int sessionId, MarkPTAttendanceDto dto, CancellationToken ct = default);
    }

    public interface ITrainerCommissionService
    {
        Task<IReadOnlyList<TrainerCommissionRuleDto>> GetRulesAsync(int trainerId, CancellationToken ct = default);
        Task<TrainerCommissionRuleDto> UpsertRuleAsync(UpsertCommissionRuleDto dto, CancellationToken ct = default);
        Task<PagedResultDto<TrainerCommissionDto>> SearchCommissionsAsync(int? trainerId, int page, int pageSize, CancellationToken ct = default);
        Task<int> CreateMonthlyPayoutAsync(int trainerId, int year, int month, CancellationToken ct = default);
        Task AccruePackageCommissionAsync(MemberPTPackage memberPackage, CancellationToken ct = default);
        Task AccrueSessionCommissionAsync(PTSession session, decimal sessionValue, CancellationToken ct = default);
        Task ReverseCommissionForSessionAsync(int sessionId, CancellationToken ct = default);
    }

    public interface IPtDashboardService
    {
        Task<TrainerEarningsDashboardDto> GetTrainerDashboardAsync(int trainerId, CancellationToken ct = default);
        Task<PTRevenueReportDto> GetAdminSummaryAsync(CancellationToken ct = default);
    }

    public interface IPtReportService
    {
        Task<PTRevenueReportDto> GetRevenueReportAsync(PTReportFilterDto filter, CancellationToken ct = default);
        Task<PTUtilizationReportDto> GetUtilizationReportAsync(PTReportFilterDto filter, CancellationToken ct = default);
        Task<IReadOnlyList<MemberPTPackageDto>> GetExpiredPackagesAsync(PTReportFilterDto filter, CancellationToken ct = default);
        Task<byte[]> ExportRevenueCsvAsync(PTReportFilterDto filter, CancellationToken ct = default);
    }

    public interface IPtNotificationService
    {
        Task<IReadOnlyList<PTNotificationDto>> GetForUserAsync(int? userId, int? trainerId, bool unreadOnly, CancellationToken ct = default);
        Task MarkReadAsync(int id, CancellationToken ct = default);
    }
}
