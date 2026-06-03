using System.Text.Json;
using GymManagement.Core.DTOs;
using GymManagement.Core.Exceptions;
using GymManagement.Core.Services;
using GymManagement.Core.Validation;
using GymManagement.Domain.Entities;
using GymManagement.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace GymManagement.Infrastructure.Services
{
    public sealed class MembershipApprovalRequestService : IMembershipApprovalRequestService
    {
        private readonly ApplicationDbContext _db;
        private readonly IBillingCalculationService _billing;
        private readonly IMembershipAuditService _audit;

        public MembershipApprovalRequestService(
            ApplicationDbContext db,
            IBillingCalculationService billing,
            IMembershipAuditService audit)
        {
            _db = db;
            _billing = billing;
            _audit = audit;
        }

        public async Task<MembershipApprovalRequestDto> CreateAsync(
            CreateMembershipApprovalRequestDto dto,
            int requestedByUserId,
            CancellationToken ct = default)
        {
            if (string.IsNullOrWhiteSpace(dto.Reason))
                throw new BadRequestException("Reason is required.");

            var membership = await _db.UserMemberships
                .Include(m => m.Plan)
                .Include(m => m.User)
                .FirstOrDefaultAsync(m => m.Id == dto.MembershipId && !m.IsDeleted, ct)
                ?? throw new NotFoundException("Membership not found.");

            if (membership.Status is MembershipStatus.Voided or MembershipStatus.Transferred)
                throw new BadRequestException("This membership is already voided or transferred.");

            var pending = await _db.MembershipApprovalRequests.AnyAsync(
                r => r.MembershipId == membership.Id
                     && r.Status == MembershipApprovalRequestStatus.Pending
                     && !r.IsDeleted,
                ct);
            if (pending)
                throw new BadRequestException("A pending approval request already exists for this membership.");

            var row = new MembershipApprovalRequest
            {
                MembershipId = membership.Id,
                MemberId = membership.UserId,
                RequestType = dto.RequestType,
                Reason = dto.Reason.Trim(),
                Status = MembershipApprovalRequestStatus.Pending,
                RequestedByUserId = requestedByUserId,
                RequestedDate = DateTime.UtcNow,
                ProposedChangesJson = dto.ProposedChangesJson,
                CreatedDate = DateTime.UtcNow,
            };

            switch (dto.RequestType)
            {
                case MembershipApprovalRequestType.Void:
                    if (membership.Status == MembershipStatus.VoidPending)
                        throw new BadRequestException("Membership is already pending void approval.");
                    row.PreviousMembershipStatus = membership.Status;
                    membership.Status = MembershipStatus.VoidPending;
                    _db.UserMemberships.Update(membership);
                    await _audit.LogAsync(
                        membership.Id,
                        MembershipAuditAction.VoidRequested,
                        requestedByUserId,
                        row.PreviousMembershipStatus.ToString(),
                        MembershipStatus.VoidPending.ToString(),
                        ct);
                    break;

                case MembershipApprovalRequestType.Cancel:
                    await _audit.LogAsync(
                        membership.Id,
                        MembershipAuditAction.CancelRequested,
                        requestedByUserId,
                        membership.Status.ToString(),
                        MembershipStatus.Cancelled.ToString(),
                        ct);
                    break;

                case MembershipApprovalRequestType.DateChange:
                case MembershipApprovalRequestType.PlanChange:
                case MembershipApprovalRequestType.FeeChange:
                case MembershipApprovalRequestType.Edit:
                case MembershipApprovalRequestType.Transfer:
                    if (string.IsNullOrWhiteSpace(dto.ProposedChangesJson))
                        throw new BadRequestException("Proposed changes are required for this request type.");
                    break;

                default:
                    throw new BadRequestException("Unsupported request type.");
            }

            await _db.MembershipApprovalRequests.AddAsync(row, ct);
            await _db.SaveChangesAsync(ct);

            await NotifyAdminsAsync(
                $"Membership {dto.RequestType} request #{row.Id}",
                $"Request #{row.Id} for membership #{membership.Id} requires admin approval.",
                "membership_approval_pending",
                ct);

            return (await GetByIdAsync(row.Id, ct))!;
        }

        public async Task<IReadOnlyList<MembershipApprovalRequestDto>> ListAsync(
            MembershipApprovalRequestStatusFilter? status,
            string? search,
            CancellationToken ct = default)
        {
            var q = _db.MembershipApprovalRequests.AsNoTracking()
                .Where(r => !r.IsDeleted);

            if (status is MembershipApprovalRequestStatusFilter.Pending)
                q = q.Where(r => r.Status == MembershipApprovalRequestStatus.Pending);
            else if (status is MembershipApprovalRequestStatusFilter.Approved)
                q = q.Where(r => r.Status == MembershipApprovalRequestStatus.Approved);
            else if (status is MembershipApprovalRequestStatusFilter.Rejected)
                q = q.Where(r => r.Status == MembershipApprovalRequestStatus.Rejected);

            var trimmed = search?.Trim();
            if (!string.IsNullOrWhiteSpace(trimmed))
            {
                var like = $"%{trimmed}%";
                if (int.TryParse(trimmed, out var numId))
                {
                    q = q.Where(r =>
                        r.Id == numId
                        || r.MembershipId == numId
                        || _db.Users.Any(u =>
                            u.Id == r.MemberId
                            && (EF.Functions.Like(u.FirstName, like)
                                || EF.Functions.Like(u.LastName, like))));
                }
                else
                {
                    q = q.Where(r =>
                        _db.Users.Any(u =>
                            u.Id == r.MemberId
                            && (EF.Functions.Like(u.FirstName, like)
                                || EF.Functions.Like(u.LastName, like))));
                }
            }

            var ids = await q.OrderByDescending(r => r.RequestedDate)
                .Select(r => r.Id)
                .Take(200)
                .ToListAsync(ct);

            var result = new List<MembershipApprovalRequestDto>();
            foreach (var id in ids)
            {
                var mapped = await GetByIdAsync(id, ct);
                if (mapped != null)
                    result.Add(mapped);
            }

            return result;
        }

        public async Task<MembershipApprovalRequestDto?> GetByIdAsync(int id, CancellationToken ct = default)
        {
            var row = await _db.MembershipApprovalRequests.AsNoTracking()
                .FirstOrDefaultAsync(r => r.Id == id && !r.IsDeleted, ct);
            if (row == null)
                return null;

            var membership = await _db.UserMemberships.AsNoTracking()
                .Include(m => m.Plan)
                .Include(m => m.User)
                .FirstOrDefaultAsync(m => m.Id == row.MembershipId, ct);

            var requestedBy = await _db.Users.AsNoTracking()
                .Where(u => u.Id == row.RequestedByUserId)
                .Select(u => (u.FirstName + " " + u.LastName).Trim())
                .FirstOrDefaultAsync(ct);

            string? approvedByName = null;
            if (row.ApprovedByUserId.HasValue)
            {
                approvedByName = await _db.Users.AsNoTracking()
                    .Where(u => u.Id == row.ApprovedByUserId.Value)
                    .Select(u => (u.FirstName + " " + u.LastName).Trim())
                    .FirstOrDefaultAsync(ct);
            }

            string? rejectedByName = null;
            if (row.RejectedByUserId.HasValue)
            {
                rejectedByName = await _db.Users.AsNoTracking()
                    .Where(u => u.Id == row.RejectedByUserId.Value)
                    .Select(u => (u.FirstName + " " + u.LastName).Trim())
                    .FirstOrDefaultAsync(ct);
            }

            decimal? fee = null;
            decimal? paid = null;
            decimal? outstanding = null;
            var hasPayments = false;

            if (membership != null)
            {
                var header = await _db.MembershipPayments.AsNoTracking()
                    .Include(p => p.Transactions)
                    .FirstOrDefaultAsync(p => p.MembershipId == membership.Id && !p.IsDeleted, ct);

                if (header != null)
                {
                    fee = header.OriginalAmount;
                    paid = header.PaidAmount;
                    outstanding = header.PendingAmount;
                    hasPayments = header.Transactions.Any(t =>
                        !t.IsDeleted && t.Status == MembershipPaymentTransactionStatus.Completed);
                }
            }

            return new MembershipApprovalRequestDto
            {
                Id = row.Id,
                MembershipId = row.MembershipId,
                MemberId = row.MemberId,
                MemberName = membership?.User != null
                    ? $"{membership.User.FirstName} {membership.User.LastName}".Trim()
                    : null,
                MemberPhotoUrl = membership?.User?.ProfilePictureUrl,
                MemberCode = membership?.User != null ? $"M-{membership.User.Id}" : null,
                PlanName = membership?.Plan?.PlanName,
                MembershipStartDate = membership?.StartDate,
                MembershipEndDate = membership?.EndDate,
                RequestType = row.RequestType,
                Status = row.Status,
                Reason = row.Reason,
                RequestedByUserId = row.RequestedByUserId,
                RequestedByName = requestedBy,
                RequestedDate = row.RequestedDate,
                ApprovedByUserId = row.ApprovedByUserId,
                ApprovedByName = approvedByName,
                ApprovedDate = row.ApprovedDate,
                RejectedByUserId = row.RejectedByUserId,
                RejectedByName = rejectedByName,
                RejectedDate = row.RejectedDate,
                AdminRemarks = row.AdminRemarks,
                HasPaymentRecords = hasPayments,
                MembershipFee = fee,
                TotalPaid = paid,
                OutstandingBalance = outstanding,
                ProposedChangesJson = row.ProposedChangesJson,
            };
        }

        public async Task<MembershipApprovalRequestDto> ApproveAsync(
            int id,
            int approvedByUserId,
            ApproveMembershipApprovalRequestDto dto,
            CancellationToken ct = default)
        {
            var row = await _db.MembershipApprovalRequests
                .FirstOrDefaultAsync(r => r.Id == id && !r.IsDeleted, ct)
                ?? throw new NotFoundException("Approval request not found.");

            if (row.Status != MembershipApprovalRequestStatus.Pending)
                throw new BadRequestException("Only pending requests can be approved.");

            var membership = await _db.UserMemberships
                .Include(m => m.Plan)
                .FirstOrDefaultAsync(m => m.Id == row.MembershipId && !m.IsDeleted, ct)
                ?? throw new NotFoundException("Membership not found.");

            var oldStatus = membership.Status.ToString();
            row.Status = MembershipApprovalRequestStatus.Approved;
            row.ApprovedByUserId = approvedByUserId;
            row.ApprovedDate = DateTime.UtcNow;
            row.AdminRemarks = dto.AdminRemarks?.Trim();
            row.UpdatedDate = DateTime.UtcNow;

            switch (row.RequestType)
            {
                case MembershipApprovalRequestType.Void:
                    membership.Status = MembershipStatus.Voided;
                    await _audit.LogAsync(
                        membership.Id,
                        MembershipAuditAction.VoidApproved,
                        approvedByUserId,
                        oldStatus,
                        membership.Status.ToString(),
                        ct);
                    break;

                case MembershipApprovalRequestType.Cancel:
                    membership.Status = MembershipStatus.Cancelled;
                    await _audit.LogAsync(
                        membership.Id,
                        MembershipAuditAction.CancelApproved,
                        approvedByUserId,
                        oldStatus,
                        membership.Status.ToString(),
                        ct);
                    break;

                case MembershipApprovalRequestType.DateChange:
                case MembershipApprovalRequestType.PlanChange:
                case MembershipApprovalRequestType.FeeChange:
                case MembershipApprovalRequestType.Edit:
                    ApplyProposedChanges(membership, row);
                    await _audit.LogAsync(
                        membership.Id,
                        MapEditAction(row.RequestType),
                        approvedByUserId,
                        oldStatus,
                        JsonSerializer.Serialize(new
                        {
                            membership.StartDate,
                            membership.EndDate,
                            membership.PlanId,
                            membership.Status,
                        }),
                        ct);
                    break;

                case MembershipApprovalRequestType.Transfer:
                    membership.Status = MembershipStatus.Transferred;
                    ApplyProposedChanges(membership, row);
                    await _audit.LogAsync(
                        membership.Id,
                        MembershipAuditAction.TransferApproved,
                        approvedByUserId,
                        oldStatus,
                        membership.Status.ToString(),
                        ct);
                    break;
            }

            _db.UserMemberships.Update(membership);
            await _db.SaveChangesAsync(ct);

            await NotifyUserAsync(
                row.RequestedByUserId,
                $"Membership request #{row.Id} approved",
                $"Your {row.RequestType} request for membership #{row.MembershipId} was approved.",
                "membership_approval_approved",
                ct);

            return (await GetByIdAsync(id, ct))!;
        }

        public async Task<MembershipApprovalRequestDto> RejectAsync(
            int id,
            int rejectedByUserId,
            RejectMembershipApprovalRequestDto dto,
            CancellationToken ct = default)
        {
            var row = await _db.MembershipApprovalRequests
                .FirstOrDefaultAsync(r => r.Id == id && !r.IsDeleted, ct)
                ?? throw new NotFoundException("Approval request not found.");

            if (row.Status != MembershipApprovalRequestStatus.Pending)
                throw new BadRequestException("Only pending requests can be rejected.");

            var membership = await _db.UserMemberships
                .FirstOrDefaultAsync(m => m.Id == row.MembershipId && !m.IsDeleted, ct)
                ?? throw new NotFoundException("Membership not found.");

            row.Status = MembershipApprovalRequestStatus.Rejected;
            row.RejectedByUserId = rejectedByUserId;
            row.RejectedDate = DateTime.UtcNow;
            row.AdminRemarks = dto.AdminRemarks?.Trim();
            row.UpdatedDate = DateTime.UtcNow;

            if (row.RequestType == MembershipApprovalRequestType.Void
                && membership.Status == MembershipStatus.VoidPending)
            {
                membership.Status = row.PreviousMembershipStatus ?? MembershipStatus.Active;
                _db.UserMemberships.Update(membership);
                await _audit.LogAsync(
                    membership.Id,
                    MembershipAuditAction.VoidRejected,
                    rejectedByUserId,
                    MembershipStatus.VoidPending.ToString(),
                    membership.Status.ToString(),
                    ct);
            }

            await _db.SaveChangesAsync(ct);

            await NotifyUserAsync(
                row.RequestedByUserId,
                $"Membership request #{row.Id} rejected",
                $"Your {row.RequestType} request for membership #{row.MembershipId} was rejected.",
                "membership_approval_rejected",
                ct);

            return (await GetByIdAsync(id, ct))!;
        }

        private static MembershipAuditAction MapEditAction(MembershipApprovalRequestType type) =>
            type switch
            {
                MembershipApprovalRequestType.PlanChange => MembershipAuditAction.PlanChanged,
                MembershipApprovalRequestType.DateChange => MembershipAuditAction.DateChanged,
                MembershipApprovalRequestType.FeeChange => MembershipAuditAction.FeeChanged,
                _ => MembershipAuditAction.Updated,
            };

        private static void ApplyProposedChanges(UserMembership membership, MembershipApprovalRequest row)
        {
            if (string.IsNullOrWhiteSpace(row.ProposedChangesJson))
                return;

            using var doc = JsonDocument.Parse(row.ProposedChangesJson);
            var root = doc.RootElement;
            if (root.TryGetProperty("startDate", out var start) && start.TryGetDateTime(out var sd))
                membership.StartDate = sd;
            if (root.TryGetProperty("endDate", out var end) && end.TryGetDateTime(out var ed))
                membership.EndDate = ed;
            if (root.TryGetProperty("planId", out var plan) && plan.TryGetInt32(out var planId))
                membership.PlanId = planId;
            if (root.TryGetProperty("status", out var st)
                && Enum.TryParse<MembershipStatus>(st.GetString(), true, out var status))
                membership.Status = status;
        }

        private async Task NotifyAdminsAsync(
            string title,
            string message,
            string type,
            CancellationToken ct)
        {
            var adminUserIds = await (
                from ur in _db.UserRoles.AsNoTracking()
                join r in _db.AppRoles.AsNoTracking() on ur.RoleId equals r.Id
                where !ur.IsDeleted && !r.IsDeleted && r.Name == "ADMIN"
                select ur.UserId
            ).Distinct().ToListAsync(ct);

            foreach (var userId in adminUserIds)
            {
                await _db.Notifications.AddAsync(new Notification
                {
                    UserId = userId,
                    Title = title,
                    Message = message,
                    NotificationType = type,
                    CreatedDate = DateTime.UtcNow,
                }, ct);
            }

            if (adminUserIds.Count > 0)
                await _db.SaveChangesAsync(ct);
        }

        private async Task NotifyUserAsync(
            int userId,
            string title,
            string message,
            string type,
            CancellationToken ct)
        {
            await _db.Notifications.AddAsync(new Notification
            {
                UserId = userId,
                Title = title,
                Message = message,
                NotificationType = type,
                CreatedDate = DateTime.UtcNow,
            }, ct);
            await _db.SaveChangesAsync(ct);
        }
    }
}
