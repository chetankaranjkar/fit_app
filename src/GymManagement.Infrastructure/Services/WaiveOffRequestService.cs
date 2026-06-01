using GymManagement.Core.DTOs;
using GymManagement.Core.Exceptions;
using GymManagement.Core.Services;
using GymManagement.Domain.Entities;
using GymManagement.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace GymManagement.Infrastructure.Services
{
    public sealed class WaiveOffRequestService : IWaiveOffRequestService
    {
        private readonly ApplicationDbContext _db;
        private readonly IBillingCalculationService _billing;
        private readonly IFinancialAuditService _audit;

        public WaiveOffRequestService(
            ApplicationDbContext db,
            IBillingCalculationService billing,
            IFinancialAuditService audit)
        {
            _db = db;
            _billing = billing;
            _audit = audit;
        }

        public async Task<WaiveOffRequestDto> CreateAsync(
            CreateWaiveOffRequestDto dto,
            int requestedByUserId,
            CancellationToken ct = default)
        {
            if (dto.RequestedAmount <= 0)
                throw new BadRequestException("Requested waive-off amount must be greater than zero.");
            if (string.IsNullOrWhiteSpace(dto.Reason))
                throw new BadRequestException("Reason is required.");

            var header = await _db.MembershipPayments
                .Include(p => p.Membership).ThenInclude(m => m.Plan)
                .FirstOrDefaultAsync(p => p.Id == dto.MembershipPaymentId && !p.IsDeleted, ct)
                ?? throw new NotFoundException("Membership billing not found.");

            var net = _billing.GetNetPayable(header);
            if (dto.RequestedAmount > net)
                throw new BadRequestException("Waive-off cannot exceed net payable amount.");

            var pending = await _db.WaiveOffRequests.AnyAsync(
                w => w.MembershipPaymentId == header.Id
                     && w.Status == WaiveOffRequestStatus.Pending
                     && !w.IsDeleted,
                ct);
            if (pending)
                throw new BadRequestException("A pending waive-off request already exists for this billing.");

            var row = new WaiveOffRequest
            {
                UserId = header.UserId,
                MembershipPaymentId = header.Id,
                RequestedAmount = dto.RequestedAmount,
                Reason = dto.Reason.Trim(),
                Status = WaiveOffRequestStatus.Pending,
                RequestedByUserId = requestedByUserId,
                RequestedDate = DateTime.UtcNow,
            };
            await _db.WaiveOffRequests.AddAsync(row, ct);
            await _db.SaveChangesAsync(ct);

            await _audit.LogAsync(
                "WaiveOffRequest",
                row.Id,
                "requested",
                requestedByUserId,
                header.Id,
                header.UserId,
                $"{{\"amount\":{dto.RequestedAmount}}}",
                ct);

            return (await GetByIdAsync(row.Id, ct))!;
        }

        public async Task<WaiveOffRequestDto> ApproveAsync(int id, int approvedByUserId, CancellationToken ct = default)
        {
            var row = await _db.WaiveOffRequests
                .Include(w => w.MembershipPayment).ThenInclude(p => p.Membership).ThenInclude(m => m.Plan)
                .FirstOrDefaultAsync(w => w.Id == id && !w.IsDeleted, ct)
                ?? throw new NotFoundException("Waive-off request not found.");
            if (row.Status != WaiveOffRequestStatus.Pending)
                throw new BadRequestException("Only pending requests can be approved.");

            var header = row.MembershipPayment;
            _billing.RecalculateHeader(header);
            var netBefore = _billing.GetNetPayable(header);
            if (row.RequestedAmount > netBefore)
                throw new BadRequestException("Approved amount would exceed current net payable.");

            header.WaiverAmount += row.RequestedAmount;
            row.Status = WaiveOffRequestStatus.Approved;
            row.ApprovedByUserId = approvedByUserId;
            row.ApprovedDate = DateTime.UtcNow;

            var txs = await _db.MembershipPaymentTransactions
                .Where(t => t.PaymentId == header.Id && !t.IsDeleted)
                .ToListAsync(ct);
            _billing.ApplyPaidAndPending(header, txs);

            if (header.PendingAmount <= 0.02m)
            {
                header.Membership.Status = MembershipStatus.Active;
            }

            _db.MembershipPayments.Update(header);
            _db.UserMemberships.Update(header.Membership);
            await _db.SaveChangesAsync(ct);

            await _audit.LogAsync(
                "WaiveOffRequest",
                row.Id,
                "approved",
                approvedByUserId,
                header.Id,
                row.UserId,
                $"{{\"amount\":{row.RequestedAmount}}}",
                ct);

            return (await GetByIdAsync(id, ct))!;
        }

        public async Task<WaiveOffRequestDto> RejectAsync(
            int id,
            int rejectedByUserId,
            RejectWaiveOffRequestDto dto,
            CancellationToken ct = default)
        {
            var row = await _db.WaiveOffRequests.FirstOrDefaultAsync(w => w.Id == id && !w.IsDeleted, ct)
                ?? throw new NotFoundException("Waive-off request not found.");
            if (row.Status != WaiveOffRequestStatus.Pending)
                throw new BadRequestException("Only pending requests can be rejected.");

            row.Status = WaiveOffRequestStatus.Rejected;
            row.RejectedByUserId = rejectedByUserId;
            row.RejectedDate = DateTime.UtcNow;
            row.RejectionReason = dto.RejectionReason?.Trim();
            await _db.SaveChangesAsync(ct);

            await _audit.LogAsync(
                "WaiveOffRequest",
                row.Id,
                "rejected",
                rejectedByUserId,
                row.MembershipPaymentId,
                row.UserId,
                null,
                ct);

            return (await GetByIdAsync(id, ct))!;
        }

        public async Task<IReadOnlyList<WaiveOffRequestDto>> ListAsync(
            WaiveOffRequestStatusFilter? status,
            CancellationToken ct = default)
        {
            var q = _db.WaiveOffRequests.AsNoTracking().Where(w => !w.IsDeleted);
            if (status is WaiveOffRequestStatusFilter.Pending)
                q = q.Where(w => w.Status == WaiveOffRequestStatus.Pending);
            else if (status is WaiveOffRequestStatusFilter.Approved)
                q = q.Where(w => w.Status == WaiveOffRequestStatus.Approved);
            else if (status is WaiveOffRequestStatusFilter.Rejected)
                q = q.Where(w => w.Status == WaiveOffRequestStatus.Rejected);

            var ids = await q.OrderByDescending(w => w.RequestedDate).Select(w => w.Id).ToListAsync(ct);
            var result = new List<WaiveOffRequestDto>();
            foreach (var id in ids)
            {
                var dto = await GetByIdAsync(id, ct);
                if (dto != null) result.Add(dto);
            }
            return result;
        }

        public async Task<WaiveOffRequestDto?> GetByIdAsync(int id, CancellationToken ct = default)
        {
            var row = await _db.WaiveOffRequests.AsNoTracking()
                .Include(w => w.User)
                .Include(w => w.MembershipPayment).ThenInclude(p => p.Membership).ThenInclude(m => m.Plan)
                .FirstOrDefaultAsync(w => w.Id == id && !w.IsDeleted, ct);
            if (row == null) return null;

            var userIds = new[] { row.RequestedByUserId, row.ApprovedByUserId, row.RejectedByUserId }
                .Where(x => x.HasValue).Select(x => x!.Value).Distinct().ToList();
            var names = await _db.Users.AsNoTracking()
                .Where(u => userIds.Contains(u.Id))
                .ToDictionaryAsync(u => u.Id, u => $"{u.FirstName} {u.LastName}".Trim(), ct);

            var header = row.MembershipPayment;
            return new WaiveOffRequestDto
            {
                Id = row.Id,
                UserId = row.UserId,
                MemberName = $"{row.User.FirstName} {row.User.LastName}".Trim(),
                MemberPhotoUrl = row.User.ProfilePictureUrl,
                MembershipPaymentId = row.MembershipPaymentId,
                PlanName = header.Membership.Plan?.PlanName,
                MembershipFee = header.OriginalAmount > 0 ? header.OriginalAmount : header.TotalAmount,
                CouponDiscount = header.CouponDiscountAmount,
                ApprovedWaiveOffTotal = header.WaiverAmount,
                RequestedAmount = row.RequestedAmount,
                Reason = row.Reason,
                Status = row.Status,
                RequestedByUserId = row.RequestedByUserId,
                RequestedByName = names.GetValueOrDefault(row.RequestedByUserId),
                RequestedDate = row.RequestedDate,
                ApprovedByUserId = row.ApprovedByUserId,
                ApprovedByName = row.ApprovedByUserId.HasValue ? names.GetValueOrDefault(row.ApprovedByUserId.Value) : null,
                ApprovedDate = row.ApprovedDate,
                RejectedByUserId = row.RejectedByUserId,
                RejectedByName = row.RejectedByUserId.HasValue ? names.GetValueOrDefault(row.RejectedByUserId.Value) : null,
                RejectedDate = row.RejectedDate,
                RejectionReason = row.RejectionReason,
            };
        }
    }
}
