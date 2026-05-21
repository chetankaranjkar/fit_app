using System.Collections.Generic;
using System.Linq;
using GymManagement.Core.DTOs;
using GymManagement.Core.Exceptions;
using GymManagement.Core.Interfaces;
using GymManagement.Core.Services;
using GymManagement.Domain.Entities;
using GymManagement.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;
using EntityMembershipStatus = GymManagement.Domain.Entities.MembershipStatus;

namespace GymManagement.Infrastructure.Services;

public sealed class LeadService : ILeadService
{
    private static readonly HashSet<string> CanonicalLeadSources = new(StringComparer.OrdinalIgnoreCase)
    {
        "FACEBOOK",
        "INSTAGRAM",
        "GOOGLE_SEARCH",
        "YOUTUBE",
        "WHATSAPP",
        "FRIEND_REFERENCE",
        "WALK_IN",
        "BANNER_POSTER",
        "WEBSITE",
        "TRAINER_REFERENCE",
        "EXISTING_MEMBER",
        "OTHER",
    };

    private readonly ApplicationDbContext _db;
    private readonly IUnitOfWork _uow;
    private readonly IUserService _userService;

    public LeadService(ApplicationDbContext db, IUnitOfWork uow, IUserService userService)
    {
        _db = db;
        _uow = uow;
        _userService = userService;
    }

    public async Task<LeadKanbanDto> GetKanbanAsync(LeadAccessScope scope, CancellationToken cancellationToken = default)
    {
        var baseQuery = FilterByScope(_db.GymLeads.AsNoTracking(), scope);
        var statuses = new[]
        {
            LeadPipelineStatus.NEW,
            LeadPipelineStatus.CONTACTED,
            LeadPipelineStatus.FOLLOWUP,
            LeadPipelineStatus.TRIAL,
            LeadPipelineStatus.INTERESTED,
            LeadPipelineStatus.NOT_INTERESTED,
            LeadPipelineStatus.CONVERTED,
        };
        var columns = new List<LeadKanbanColumnDto>();
        foreach (var st in statuses)
        {
            var rows = await baseQuery
                .Where(l => l.Status == st)
                .OrderByDescending(l => l.UpdatedDate ?? l.CreatedDate)
                .Select(l => new GymLeadSummaryDto
                {
                    Id = l.Id,
                    FullName = l.FullName,
                    Phone = l.Phone,
                    Email = l.Email,
                    Status = l.Status,
                    LeadSource = l.LeadSource,
                    CustomLeadSource = l.CustomLeadSource,
                    NextFollowUpAt = l.NextFollowUpAt,
                    CreatedDate = l.CreatedDate,
                    ConvertedMemberId = l.ConvertedMemberId,
                })
                .ToListAsync(cancellationToken)
                .ConfigureAwait(false);
            columns.Add(new LeadKanbanColumnDto { Status = st, Leads = rows });
        }

        return new LeadKanbanDto { Columns = columns };
    }

    public async Task<IReadOnlyList<GymLeadSummaryDto>> GetLeadsAsync(
        LeadPipelineStatus? status,
        LeadAccessScope scope,
        CancellationToken cancellationToken = default)
    {
        var q = FilterByScope(_db.GymLeads.AsNoTracking(), scope);
        if (status.HasValue)
            q = q.Where(l => l.Status == status.Value);
        return await q
            .OrderByDescending(l => l.UpdatedDate ?? l.CreatedDate)
            .Select(l => new GymLeadSummaryDto
            {
                Id = l.Id,
                FullName = l.FullName,
                Phone = l.Phone,
                Email = l.Email,
                Status = l.Status,
                LeadSource = l.LeadSource,
                CustomLeadSource = l.CustomLeadSource,
                NextFollowUpAt = l.NextFollowUpAt,
                CreatedDate = l.CreatedDate,
                ConvertedMemberId = l.ConvertedMemberId,
            })
            .ToListAsync(cancellationToken)
            .ConfigureAwait(false);
    }

    public async Task<GymLeadDetailDto?> GetLeadDetailAsync(int id, LeadAccessScope scope, CancellationToken cancellationToken = default)
    {
        var q = FilterByScope(_db.GymLeads.AsNoTracking(), scope);
        var head = await q.FirstOrDefaultAsync(l => l.Id == id, cancellationToken).ConfigureAwait(false);
        if (head == null) return null;

        var followups = await _db.LeadFollowups.AsNoTracking()
            .Where(f => f.GymLeadId == id)
            .OrderByDescending(f => f.CreatedDate)
            .Select(f => new LeadFollowupDto
            {
                Id = f.Id,
                GymLeadId = f.GymLeadId,
                Notes = f.Notes,
                NextFollowUpAt = f.NextFollowUpAt,
                CallRemarks = f.CallRemarks,
                CreatedByUserId = f.CreatedByUserId,
                CreatedDate = f.CreatedDate,
            })
            .ToListAsync(cancellationToken)
            .ConfigureAwait(false);

        var trials = await _db.LeadTrials.AsNoTracking()
            .Where(t => t.GymLeadId == id)
            .OrderByDescending(t => t.TrialDate)
            .Join(_db.Trainers.AsNoTracking(), t => t.AssignedTrainerId, tr => tr.Id, (t, tr) => new { t, tr })
            .Join(_db.Users.AsNoTracking(), x => x.tr.UserId, u => u.Id, (x, u) => new LeadTrialDto
            {
                Id = x.t.Id,
                GymLeadId = x.t.GymLeadId,
                TrialDate = x.t.TrialDate,
                AssignedTrainerId = x.t.AssignedTrainerId,
                AssignedTrainerName = (u.FirstName + " " + u.LastName).Trim(),
                Feedback = x.t.Feedback,
                ConversionProbability = x.t.ConversionProbability,
                CreatedDate = x.t.CreatedDate,
            })
            .ToListAsync(cancellationToken)
            .ConfigureAwait(false);

        return MapDetail(head, followups, trials);
    }

    public async Task<GymLeadDetailDto> CreateLeadAsync(CreateGymLeadDto dto, CancellationToken cancellationToken = default)
    {
        ValidateLead(dto.FullName, dto.Phone, dto.Email, dto.Age);
        var (src, custom) = NormalizeLeadSourceInput(dto.LeadSource, dto.CustomLeadSource, required: true);
        var lead = new GymLead
        {
            FullName = dto.FullName.Trim(),
            Phone = string.IsNullOrWhiteSpace(dto.Phone) ? null : dto.Phone.Trim(),
            Email = string.IsNullOrWhiteSpace(dto.Email) ? null : dto.Email.Trim(),
            Gender = (dto.Gender ?? string.Empty).Trim(),
            Age = dto.Age,
            Occupation = string.IsNullOrWhiteSpace(dto.Occupation) ? null : dto.Occupation.Trim(),
            FitnessGoal = string.IsNullOrWhiteSpace(dto.FitnessGoal) ? null : dto.FitnessGoal.Trim(),
            LeadSource = src,
            CustomLeadSource = custom,
            ReferenceName = string.IsNullOrWhiteSpace(dto.ReferenceName) ? null : dto.ReferenceName.Trim(),
            Notes = string.IsNullOrWhiteSpace(dto.Notes) ? null : dto.Notes.Trim(),
            Status = LeadPipelineStatus.NEW,
            OrganizationId = dto.OrganizationId,
        };
        await _uow.GymLeads.AddAsync(lead);
        await _uow.SaveChangesAsync();
        var detail = await GetLeadDetailAsync(lead.Id, new LeadAccessScope(true, null), cancellationToken).ConfigureAwait(false);
        return detail ?? throw new InvalidOperationException("Lead was not found after insert.");
    }

    public async Task<GymLeadDetailDto?> UpdateLeadAsync(int id, UpdateGymLeadDto dto, CancellationToken cancellationToken = default)
    {
        var lead = await _db.GymLeads.FirstOrDefaultAsync(l => l.Id == id, cancellationToken).ConfigureAwait(false);
        if (lead == null) return null;
        if (lead.Status == LeadPipelineStatus.CONVERTED && lead.ConvertedMemberId != null)
            throw new ConflictException("Cannot edit a converted lead.");

        if (!string.IsNullOrWhiteSpace(dto.FullName))
        {
            ValidateLead(dto.FullName, dto.Phone ?? lead.Phone, dto.Email ?? lead.Email, dto.Age ?? lead.Age);
            lead.FullName = dto.FullName.Trim();
        }
        if (dto.Phone != null)
            lead.Phone = string.IsNullOrWhiteSpace(dto.Phone) ? null : dto.Phone.Trim();
        if (dto.Email != null)
            lead.Email = string.IsNullOrWhiteSpace(dto.Email) ? null : dto.Email.Trim();
        if (dto.Gender != null)
            lead.Gender = dto.Gender.Trim();
        if (dto.Age.HasValue)
            lead.Age = dto.Age;
        if (dto.Occupation != null)
            lead.Occupation = string.IsNullOrWhiteSpace(dto.Occupation) ? null : dto.Occupation.Trim();
        if (dto.FitnessGoal != null)
            lead.FitnessGoal = string.IsNullOrWhiteSpace(dto.FitnessGoal) ? null : dto.FitnessGoal.Trim();
        if (dto.LeadSource != null)
        {
            if (string.IsNullOrWhiteSpace(dto.LeadSource))
                throw new ArgumentException("Lead source cannot be empty.");
            var code = dto.LeadSource.Trim().ToUpperInvariant();
            if (!CanonicalLeadSources.Contains(code))
                throw new ArgumentException("Invalid lead source.");
            if (code != "OTHER")
            {
                lead.LeadSource = code;
                lead.CustomLeadSource = null;
            }
            else
            {
                var c = (dto.CustomLeadSource ?? lead.CustomLeadSource ?? "").Trim();
                if (string.IsNullOrEmpty(c))
                    throw new ArgumentException("Please specify the source when \"Other\" is selected.");
                if (c.Length > 150)
                    throw new ArgumentException("Custom lead source must be 150 characters or less.");
                lead.LeadSource = "OTHER";
                lead.CustomLeadSource = c;
            }
        }
        else if (dto.CustomLeadSource != null)
        {
            if (!string.Equals(lead.LeadSource, "OTHER", StringComparison.OrdinalIgnoreCase))
                throw new ArgumentException("Custom source is only allowed when lead source is OTHER.");
            var trimmed = dto.CustomLeadSource.Trim();
            if (string.IsNullOrEmpty(trimmed))
                throw new ArgumentException("Please specify the source when \"Other\" is selected.");
            if (trimmed.Length > 150)
                throw new ArgumentException("Custom lead source must be 150 characters or less.");
            lead.CustomLeadSource = trimmed;
        }
        if (dto.ReferenceName != null)
            lead.ReferenceName = string.IsNullOrWhiteSpace(dto.ReferenceName) ? null : dto.ReferenceName.Trim();
        if (dto.Notes != null)
            lead.Notes = string.IsNullOrWhiteSpace(dto.Notes) ? null : dto.Notes.Trim();
        if (dto.OrganizationId.HasValue)
            lead.OrganizationId = dto.OrganizationId;
        lead.UpdatedDate = DateTime.UtcNow;
        _uow.GymLeads.Update(lead);
        await _uow.SaveChangesAsync();
        return await GetLeadDetailAsync(id, new LeadAccessScope(true, null), cancellationToken).ConfigureAwait(false);
    }

    public async Task<bool> SoftDeleteLeadAsync(int id, CancellationToken cancellationToken = default)
    {
        var lead = await _uow.GymLeads.GetByIdAsync(id);
        if (lead == null) return false;
        if (lead.ConvertedMemberId != null)
            throw new ConflictException("Cannot delete a converted lead.");
        _uow.GymLeads.Delete(lead);
        await _uow.SaveChangesAsync();
        return true;
    }

    public async Task<GymLeadDetailDto?> SetStatusAsync(int id, LeadPipelineStatus status, CancellationToken cancellationToken = default)
    {
        var lead = await _db.GymLeads.FirstOrDefaultAsync(l => l.Id == id, cancellationToken).ConfigureAwait(false);
        if (lead == null) return null;
        if (lead.Status == LeadPipelineStatus.CONVERTED && lead.ConvertedMemberId != null && status != LeadPipelineStatus.CONVERTED)
            throw new ConflictException("Unlink the member before changing status from CONVERTED.");
        lead.Status = status;
        lead.UpdatedDate = DateTime.UtcNow;
        _uow.GymLeads.Update(lead);
        await _uow.SaveChangesAsync();
        return await GetLeadDetailAsync(id, new LeadAccessScope(true, null), cancellationToken).ConfigureAwait(false);
    }

    public async Task<LeadFollowupDto> AddFollowupAsync(
        int leadId,
        CreateLeadFollowupDto dto,
        int? createdByUserId,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(dto.Notes))
            throw new ArgumentException("Follow-up notes are required.", nameof(dto));

        var lead = await _db.GymLeads.FirstOrDefaultAsync(l => l.Id == leadId, cancellationToken).ConfigureAwait(false);
        if (lead == null)
            throw new KeyNotFoundException($"Lead {leadId} was not found.");

        var row = new LeadFollowup
        {
            GymLeadId = leadId,
            Notes = dto.Notes.Trim(),
            NextFollowUpAt = dto.NextFollowUpAt,
            CallRemarks = string.IsNullOrWhiteSpace(dto.CallRemarks) ? null : dto.CallRemarks.Trim(),
            CreatedByUserId = createdByUserId,
        };
        await _uow.LeadFollowups.AddAsync(row);
        if (dto.NextFollowUpAt.HasValue)
        {
            lead.NextFollowUpAt = dto.NextFollowUpAt;
            lead.UpdatedDate = DateTime.UtcNow;
            _uow.GymLeads.Update(lead);
        }

        await _uow.SaveChangesAsync();
        return new LeadFollowupDto
        {
            Id = row.Id,
            GymLeadId = row.GymLeadId,
            Notes = row.Notes,
            NextFollowUpAt = row.NextFollowUpAt,
            CallRemarks = row.CallRemarks,
            CreatedByUserId = row.CreatedByUserId,
            CreatedDate = row.CreatedDate,
        };
    }

    public async Task<LeadTrialDto> AddTrialAsync(int leadId, CreateLeadTrialDto dto, CancellationToken cancellationToken = default)
    {
        var lead = await _db.GymLeads.FirstOrDefaultAsync(l => l.Id == leadId, cancellationToken).ConfigureAwait(false);
        if (lead == null)
            throw new KeyNotFoundException($"Lead {leadId} was not found.");

        var trainer = await _db.Trainers.AsNoTracking().FirstOrDefaultAsync(t => t.Id == dto.AssignedTrainerId, cancellationToken).ConfigureAwait(false);
        if (trainer == null)
            throw new ArgumentException("Trainer not found.");

        if (dto.ConversionProbability is < 0 or > 100)
            throw new ArgumentException("Conversion probability must be 0–100.");

        var row = new LeadTrial
        {
            GymLeadId = leadId,
            TrialDate = dto.TrialDate.Date,
            AssignedTrainerId = dto.AssignedTrainerId,
            Feedback = string.IsNullOrWhiteSpace(dto.Feedback) ? null : dto.Feedback.Trim(),
            ConversionProbability = dto.ConversionProbability,
        };
        await _uow.LeadTrials.AddAsync(row);
        lead.Status = LeadPipelineStatus.TRIAL;
        lead.UpdatedDate = DateTime.UtcNow;
        _uow.GymLeads.Update(lead);
        await _uow.SaveChangesAsync();

        var name = await TrainerDisplayNameAsync(dto.AssignedTrainerId, cancellationToken).ConfigureAwait(false);
        return new LeadTrialDto
        {
            Id = row.Id,
            GymLeadId = row.GymLeadId,
            TrialDate = row.TrialDate,
            AssignedTrainerId = row.AssignedTrainerId,
            AssignedTrainerName = name,
            Feedback = row.Feedback,
            ConversionProbability = row.ConversionProbability,
            CreatedDate = row.CreatedDate,
        };
    }

    public async Task<LeadTrialDto?> UpdateTrialAsync(
        int leadId,
        int trialId,
        UpdateLeadTrialDto dto,
        LeadAccessScope scope,
        CancellationToken cancellationToken = default)
    {
        var trial = await _db.LeadTrials.FirstOrDefaultAsync(t => t.Id == trialId && t.GymLeadId == leadId, cancellationToken).ConfigureAwait(false);
        if (trial == null) return null;

        if (!scope.CanViewAll && scope.TrainerId != trial.AssignedTrainerId)
            return null;

        if (dto.ConversionProbability is < 0 or > 100)
            throw new ArgumentException("Conversion probability must be 0–100.");

        if (dto.Feedback != null)
            trial.Feedback = string.IsNullOrWhiteSpace(dto.Feedback) ? null : dto.Feedback.Trim();
        if (dto.ConversionProbability.HasValue)
            trial.ConversionProbability = dto.ConversionProbability;
        trial.UpdatedDate = DateTime.UtcNow;
        _uow.LeadTrials.Update(trial);
        await _uow.SaveChangesAsync();

        var name = await TrainerDisplayNameAsync(trial.AssignedTrainerId, cancellationToken).ConfigureAwait(false);
        return new LeadTrialDto
        {
            Id = trial.Id,
            GymLeadId = trial.GymLeadId,
            TrialDate = trial.TrialDate,
            AssignedTrainerId = trial.AssignedTrainerId,
            AssignedTrainerName = name,
            Feedback = trial.Feedback,
            ConversionProbability = trial.ConversionProbability,
            CreatedDate = trial.CreatedDate,
        };
    }

    public async Task<LeadConversionResultDto> ConvertToMemberAsync(
        int leadId,
        ConvertLeadToMemberDto dto,
        CancellationToken cancellationToken = default)
    {
        var lead = await _db.GymLeads.FirstOrDefaultAsync(l => l.Id == leadId, cancellationToken).ConfigureAwait(false);
        if (lead == null)
            throw new KeyNotFoundException($"Lead {leadId} was not found.");
        if (lead.ConvertedMemberId != null)
            throw new ConflictException("Lead is already converted.");

        if (dto.PlanId <= 0)
            throw new ArgumentException("PlanId is required.");

        SplitFullName(lead.FullName, out var first, out var last);
        var email = !string.IsNullOrWhiteSpace(dto.Email) ? dto.Email.Trim() : lead.Email?.Trim() ?? string.Empty;
        var phone = !string.IsNullOrWhiteSpace(dto.Phone) ? dto.Phone.Trim() : lead.Phone?.Trim();
        var dob = ResolveDateOfBirth(lead.Age);

        if (!string.IsNullOrEmpty(dto.Password) && string.IsNullOrWhiteSpace(email))
            throw new ArgumentException("Email is required when setting a login password.");

        var createUserDto = new CreateUserDto
        {
            FirstName = first,
            LastName = last,
            Email = email,
            Phone = phone,
            DateOfBirth = dob,
            Gender = string.IsNullOrWhiteSpace(lead.Gender) ? "Other" : lead.Gender.Trim(),
            IsActive = true,
            PlanId = dto.PlanId,
            MembershipStartDate = dto.MembershipStartDate,
            TrainerId = dto.TrainerId,
            Password = dto.Password,
            Role = Role.User,
            UserTypeIds = dto.MemberUserTypeIds ?? new List<int>(),
        };

        var member = await _userService.CreateUserAsync(createUserDto).ConfigureAwait(false);

        lead.Status = LeadPipelineStatus.CONVERTED;
        lead.ConvertedMemberId = member.Id;
        lead.ConvertedAtUtc = DateTime.UtcNow;
        lead.NextFollowUpAt = null;
        lead.UpdatedDate = DateTime.UtcNow;
        _uow.GymLeads.Update(lead);
        await _uow.SaveChangesAsync();

        var detail = await GetLeadDetailAsync(lead.Id, new LeadAccessScope(true, null), cancellationToken).ConfigureAwait(false);
        return new LeadConversionResultDto
        {
            Lead = detail ?? throw new InvalidOperationException("Lead detail missing after conversion."),
            Member = member,
        };
    }

    public async Task<ReceptionDashboardDto> GetReceptionDashboardAsync(CancellationToken cancellationToken = default)
    {
        var today = DateTime.UtcNow.Date;
        var tomorrow = today.AddDays(1);
        var expiryWindowEnd = today.AddDays(7);

        var todaysLeads = await _db.GymLeads.AsNoTracking()
            .CountAsync(l => l.CreatedDate >= today && l.CreatedDate < tomorrow, cancellationToken)
            .ConfigureAwait(false);

        var todaysAdmissions = await _db.GymLeads.AsNoTracking()
            .CountAsync(
                l => l.ConvertedAtUtc >= today && l.ConvertedAtUtc < tomorrow,
                cancellationToken)
            .ConfigureAwait(false);

        var pendingFollowUps = await _db.GymLeads.AsNoTracking()
            .CountAsync(
                l => l.NextFollowUpAt != null &&
                     l.NextFollowUpAt.Value.Date <= today &&
                     l.Status != LeadPipelineStatus.CONVERTED &&
                     l.Status != LeadPipelineStatus.NOT_INTERESTED,
                cancellationToken)
            .ConfigureAwait(false);

        var activeMembers = await _db.UserMemberships.AsNoTracking()
            .CountAsync(m => m.Status == EntityMembershipStatus.Active, cancellationToken)
            .ConfigureAwait(false);

        var expiring = await _db.UserMemberships.AsNoTracking()
            .CountAsync(
                m => m.Status == EntityMembershipStatus.Active &&
                     m.EndDate.Date >= today &&
                     m.EndDate.Date <= expiryWindowEnd,
                cancellationToken)
            .ConfigureAwait(false);

        return new ReceptionDashboardDto
        {
            TodaysLeads = todaysLeads,
            TodaysAdmissions = todaysAdmissions,
            PendingFollowUps = pendingFollowUps,
            ActiveMembers = activeMembers,
            ExpiringMemberships = expiring,
        };
    }

    public async Task<LeadAnalyticsDto> GetAnalyticsAsync(int year, int month, CancellationToken cancellationToken = default)
    {
        var monthStart = new DateTime(year, month, 1, 0, 0, 0, DateTimeKind.Utc);
        var monthEnd = monthStart.AddMonths(1);

        var newLeads = await _db.GymLeads.AsNoTracking()
            .CountAsync(l => l.CreatedDate >= monthStart && l.CreatedDate < monthEnd, cancellationToken)
            .ConfigureAwait(false);

        var admissions = await _db.GymLeads.AsNoTracking()
            .CountAsync(
                l => l.ConvertedAtUtc >= monthStart && l.ConvertedAtUtc < monthEnd,
                cancellationToken)
            .ConfigureAwait(false);

        var totalNonDeleted = await _db.GymLeads.AsNoTracking().CountAsync(cancellationToken).ConfigureAwait(false);
        var totalConverted = await _db.GymLeads.AsNoTracking()
            .CountAsync(l => l.ConvertedMemberId != null, cancellationToken)
            .ConfigureAwait(false);
        var rate = totalNonDeleted == 0 ? 0 : Math.Round((decimal)totalConverted * 100m / totalNonDeleted, 2);

        var sources = await _db.GymLeads.AsNoTracking()
            .Where(l => l.CreatedDate >= monthStart && l.CreatedDate < monthEnd)
            .GroupBy(l => l.LeadSource ?? "Unknown")
            .Select(g => new LeadSourceStatDto { Source = g.Key ?? "Unknown", Count = g.Count() })
            .ToListAsync(cancellationToken)
            .ConfigureAwait(false);

        var leadRows = await _db.GymLeads.AsNoTracking()
            .Where(l => l.CreatedDate >= monthStart && l.CreatedDate < monthEnd)
            .Select(l => new { l.LeadSource, l.CustomLeadSource })
            .ToListAsync(cancellationToken)
            .ConfigureAwait(false);

        var buckets = ComputeAnalyticsBuckets(leadRows.Select(r => (r.LeadSource, r.CustomLeadSource)).ToList());

        var trainerRows = await _db.LeadTrials.AsNoTracking()
            .Where(t => t.CreatedDate >= monthStart && t.CreatedDate < monthEnd)
            .GroupBy(t => t.AssignedTrainerId)
            .Select(g => new { TrainerId = g.Key, Trials = g.Count() })
            .ToListAsync(cancellationToken)
            .ConfigureAwait(false);

        var trainerIds = trainerRows.Select(r => r.TrainerId).ToList();
        var names = await _db.Trainers.AsNoTracking()
            .Where(t => trainerIds.Contains(t.Id))
            .Join(_db.Users.AsNoTracking(), t => t.UserId, u => u.Id, (t, u) => new { t.Id, Name = (u.FirstName + " " + u.LastName).Trim() })
            .ToDictionaryAsync(x => x.Id, x => x.Name, cancellationToken)
            .ConfigureAwait(false);

        var convertedTouch = await _db.GymLeads.AsNoTracking()
            .Where(l => l.ConvertedMemberId != null && l.ConvertedAtUtc >= monthStart && l.ConvertedAtUtc < monthEnd)
            .SelectMany(l => l.Trials.Select(t => new { t.AssignedTrainerId, l.Id }))
            .GroupBy(x => x.AssignedTrainerId)
            .Select(g => new { TrainerId = g.Key, Count = g.Select(x => x.Id).Distinct().Count() })
            .ToListAsync(cancellationToken)
            .ConfigureAwait(false);
        var convertedMap = convertedTouch.ToDictionary(x => x.TrainerId, x => x.Count);

        var trainerStats = trainerRows
            .Select(r => new TrainerLeadStatDto
            {
                TrainerId = r.TrainerId,
                TrainerName = names.GetValueOrDefault(r.TrainerId) ?? $"Trainer #{r.TrainerId}",
                AssignedTrials = r.Trials,
                ConvertedLeadsTouched = convertedMap.GetValueOrDefault(r.TrainerId),
            })
            .OrderByDescending(t => t.ConvertedLeadsTouched)
            .ToList();

        return new LeadAnalyticsDto
        {
            Year = year,
            Month = month,
            NewLeadsInMonth = newLeads,
            AdmissionsInMonth = admissions,
            ConversionRatePercent = rate,
            LeadSources = sources.OrderByDescending(s => s.Count).ToList(),
            GroupedLeadSources = buckets.Grouped,
            OtherSourceDetails = buckets.OtherDetails,
            TrainerStats = trainerStats,
        };
    }

    private readonly record struct AnalyticsBucketResult(
        IReadOnlyList<LeadSourceStatDto> Grouped,
        IReadOnlyList<LeadSourceStatDto> OtherDetails);

    private static AnalyticsBucketResult ComputeAnalyticsBuckets(
        IReadOnlyList<(string? LeadSource, string? CustomLeadSource)> rows)
    {
        var facebook = 0;
        var instagram = 0;
        var google = 0;
        var walkIn = 0;
        var other = 0;
        var otherDetailCounts = new Dictionary<string, int>(StringComparer.OrdinalIgnoreCase);

        foreach (var row in rows)
        {
            var bucket = MapToChartBucket(row.LeadSource);
            switch (bucket)
            {
                case "Facebook": facebook++; break;
                case "Instagram": instagram++; break;
                case "Google": google++; break;
                case "Walk-in": walkIn++; break;
                default: other++; break;
            }

            if (bucket == "Other")
            {
                var label = BuildOtherDetailLabel(row.LeadSource, row.CustomLeadSource);
                if (!string.IsNullOrEmpty(label))
                    otherDetailCounts[label] = otherDetailCounts.GetValueOrDefault(label) + 1;
            }
        }

        var grouped = new List<LeadSourceStatDto>
        {
            new() { Source = "Facebook", Count = facebook },
            new() { Source = "Instagram", Count = instagram },
            new() { Source = "Google", Count = google },
            new() { Source = "Walk-in", Count = walkIn },
            new() { Source = "Other", Count = other },
        };

        var details = otherDetailCounts
            .Select(kv => new LeadSourceStatDto { Source = kv.Key, Count = kv.Value })
            .OrderByDescending(x => x.Count)
            .ThenBy(x => x.Source)
            .ToList();

        return new AnalyticsBucketResult(grouped, details);
    }

    private static string MapToChartBucket(string? leadSource)
    {
        var code = (leadSource ?? "").Trim();
        if (string.IsNullOrEmpty(code))
            return "Other";
        var u = code.ToUpperInvariant();
        return u switch
        {
            "FACEBOOK" => "Facebook",
            "INSTAGRAM" => "Instagram",
            "GOOGLE_SEARCH" or "GOOGLE" => "Google",
            "WALK_IN" or "WALK-IN" => "Walk-in",
            _ => LegacyBucketFallback(u),
        };
    }

    private static string LegacyBucketFallback(string upper)
    {
        if (upper.Contains("FACEBOOK", StringComparison.Ordinal))
            return "Facebook";
        if (upper.Contains("INSTAGRAM", StringComparison.Ordinal))
            return "Instagram";
        if (upper.Contains("GOOGLE", StringComparison.Ordinal))
            return "Google";
        if (upper.Contains("WALK", StringComparison.Ordinal))
            return "Walk-in";
        return "Other";
    }

    private static string? BuildOtherDetailLabel(string? leadSource, string? custom)
    {
        var code = (leadSource ?? "").Trim();
        if (string.IsNullOrEmpty(code))
            return "Unknown";

        var u = code.ToUpperInvariant();
        if (u == "OTHER")
            return string.IsNullOrWhiteSpace(custom) ? "Other (unspecified)" : custom.Trim();

        return FriendlyChannelLabel(u);
    }

    private static string FriendlyChannelLabel(string upperCode) =>
        upperCode switch
        {
            "YOUTUBE" => "YouTube",
            "WHATSAPP" => "WhatsApp",
            "FRIEND_REFERENCE" => "Friend reference",
            "BANNER_POSTER" => "Banner / poster",
            "WEBSITE" => "Website",
            "TRAINER_REFERENCE" => "Trainer reference",
            "EXISTING_MEMBER" => "Existing member",
            _ => upperCode.Length > 40 ? upperCode[..37] + "…" : upperCode,
        };

    private static (string? Source, string? Custom) NormalizeLeadSourceInput(string? leadSource, string? customLeadSource, bool required)
    {
        if (string.IsNullOrWhiteSpace(leadSource))
        {
            if (required)
                throw new ArgumentException("Lead source is required.");
            return (null, null);
        }

        var code = leadSource.Trim().ToUpperInvariant();
        if (!CanonicalLeadSources.Contains(code))
            throw new ArgumentException("Invalid lead source.");

        if (code != "OTHER")
            return (code, null);

        var c = (customLeadSource ?? "").Trim();
        if (string.IsNullOrEmpty(c))
            throw new ArgumentException("Please specify the source when \"Other\" is selected.");
        if (c.Length > 150)
            throw new ArgumentException("Custom lead source must be 150 characters or less.");
        return ("OTHER", c);
    }

    private static IQueryable<GymLead> FilterByScope(IQueryable<GymLead> query, LeadAccessScope scope)
    {
        if (scope.CanViewAll)
            return query;
        if (scope.TrainerId is { } tid)
            return query.Where(l => l.Trials.Any(t => t.AssignedTrainerId == tid));
        return query.Where(_ => false);
    }

    private static void ValidateLead(string fullName, string? phone, string? email, int? age)
    {
        if (string.IsNullOrWhiteSpace(fullName))
            throw new ArgumentException("Full name is required.");
        if (age is < 5 or > 120)
            throw new ArgumentException("Age must be between 5 and 120 when provided.");
        _ = phone;
        _ = email;
    }

    private static void SplitFullName(string fullName, out string first, out string last)
    {
        var t = fullName.Trim();
        var i = t.IndexOf(' ');
        if (i <= 0)
        {
            first = t;
            last = ".";
            return;
        }

        first = t[..i].Trim();
        last = t[(i + 1)..].Trim();
        if (string.IsNullOrEmpty(last))
            last = ".";
    }

    private static DateTime ResolveDateOfBirth(int? age)
    {
        if (age is > 0 and <= 120)
            return DateTime.SpecifyKind(DateTime.UtcNow.Date.AddYears(-age.Value), DateTimeKind.Utc);
        return new DateTime(1990, 1, 1, 0, 0, 0, DateTimeKind.Utc);
    }

    private async Task<string?> TrainerDisplayNameAsync(int trainerId, CancellationToken cancellationToken)
    {
        var q = await _db.Trainers.AsNoTracking()
            .Where(t => t.Id == trainerId)
            .Join(_db.Users.AsNoTracking(), t => t.UserId, u => u.Id, (_, u) => (u.FirstName + " " + u.LastName).Trim())
            .FirstOrDefaultAsync(cancellationToken)
            .ConfigureAwait(false);
        return string.IsNullOrEmpty(q) ? null : q;
    }

    private static GymLeadDetailDto MapDetail(
        GymLead head,
        IReadOnlyList<LeadFollowupDto> followups,
        IReadOnlyList<LeadTrialDto> trials) =>
        new()
        {
            Id = head.Id,
            FullName = head.FullName,
            Phone = head.Phone,
            Email = head.Email,
            Status = head.Status,
            LeadSource = head.LeadSource,
            CustomLeadSource = head.CustomLeadSource,
            NextFollowUpAt = head.NextFollowUpAt,
            CreatedDate = head.CreatedDate,
            ConvertedMemberId = head.ConvertedMemberId,
            Gender = head.Gender,
            Age = head.Age,
            Occupation = head.Occupation,
            FitnessGoal = head.FitnessGoal,
            ReferenceName = head.ReferenceName,
            Notes = head.Notes,
            ConvertedAtUtc = head.ConvertedAtUtc,
            OrganizationId = head.OrganizationId,
            Followups = followups,
            Trials = trials,
        };
}
