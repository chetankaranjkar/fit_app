using GymManagement.Core.DTOs;
using GymManagement.Domain.Entities;

namespace GymManagement.Core.Services;

public interface ILeadService
{
    Task<LeadKanbanDto> GetKanbanAsync(LeadAccessScope scope, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<GymLeadSummaryDto>> GetLeadsAsync(
        LeadPipelineStatus? status,
        LeadAccessScope scope,
        CancellationToken cancellationToken = default);
    Task<GymLeadDetailDto?> GetLeadDetailAsync(int id, LeadAccessScope scope, CancellationToken cancellationToken = default);
    Task<GymLeadDetailDto> CreateLeadAsync(CreateGymLeadDto dto, CancellationToken cancellationToken = default);
    Task<GymLeadDetailDto?> UpdateLeadAsync(int id, UpdateGymLeadDto dto, CancellationToken cancellationToken = default);
    Task<bool> SoftDeleteLeadAsync(int id, CancellationToken cancellationToken = default);
    Task<GymLeadDetailDto?> SetStatusAsync(int id, LeadPipelineStatus status, CancellationToken cancellationToken = default);
    Task<LeadFollowupDto> AddFollowupAsync(
        int leadId,
        CreateLeadFollowupDto dto,
        int? createdByUserId,
        CancellationToken cancellationToken = default);
    Task<LeadTrialDto> AddTrialAsync(int leadId, CreateLeadTrialDto dto, CancellationToken cancellationToken = default);
    Task<LeadTrialDto?> UpdateTrialAsync(
        int leadId,
        int trialId,
        UpdateLeadTrialDto dto,
        LeadAccessScope scope,
        CancellationToken cancellationToken = default);
    Task<LeadConversionResultDto> ConvertToMemberAsync(
        int leadId,
        ConvertLeadToMemberDto dto,
        CancellationToken cancellationToken = default);
    Task<ReceptionDashboardDto> GetReceptionDashboardAsync(CancellationToken cancellationToken = default);
    Task<LeadAnalyticsDto> GetAnalyticsAsync(int year, int month, CancellationToken cancellationToken = default);
}

/// <param name="CanViewAll">When true, reception/admin sees every lead.</param>
/// <param name="TrainerId">When <see cref="CanViewAll"/> is false, filter to leads with trials for this trainer.</param>
public readonly record struct LeadAccessScope(bool CanViewAll, int? TrainerId);
