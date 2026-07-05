using System.Text.Json;

using GymManagement.Core.DTOs;

using GymManagement.Core.DTOs.Common;

using GymManagement.Core.Exceptions;

using GymManagement.Core.Interfaces;

using GymManagement.Core.Services;

using GymManagement.Domain.Entities;

using GymManagement.Infrastructure.Data;

using Microsoft.EntityFrameworkCore;



namespace GymManagement.Infrastructure.Services

{

    public class UserMembershipService : IUserMembershipService

    {

        private readonly IUnitOfWork _unitOfWork;

        private readonly IMembershipPaymentService _membershipPaymentService;

        private readonly IMembershipAuditService _audit;

        private readonly ApplicationDbContext _db;



        public UserMembershipService(

            IUnitOfWork unitOfWork,

            IMembershipPaymentService membershipPaymentService,

            IMembershipAuditService audit,

            ApplicationDbContext db)

        {

            _unitOfWork = unitOfWork;

            _membershipPaymentService = membershipPaymentService;

            _audit = audit;

            _db = db;

        }



        public async Task<IEnumerable<UserMembershipDto>> GetAllAsync()

        {

            var list = await _unitOfWork.UserMemberships.GetAllAsync();

            return await MapToDtosAsync(list);

        }



        public async Task<IEnumerable<UserMembershipDto>> GetByUserIdAsync(int userId)

        {

            var list = await _db.UserMemberships.AsNoTracking()

                .Where(m => m.UserId == userId && !m.IsDeleted)

                .OrderByDescending(m => m.StartDate)

                .ThenByDescending(m => m.Id)

                .ToListAsync();

            return await MapToDtosAsync(list);

        }



        public async Task<UserMembershipSummaryDto> GetSummaryAsync()
        {
            var today = DateTime.UtcNow.Date;
            var windowEnd = today.AddDays(14);
            var operational = OperationalMembershipsQuery();
            var renewingStatuses = new[]
            {
                MembershipStatus.Active,
                MembershipStatus.ActivePendingPayment,
                MembershipStatus.PartialPayment,
            };
            var paymentDueStatuses = new[]
            {
                MembershipStatus.ActivePendingPayment,
                MembershipStatus.PartialPayment,
            };

            return new UserMembershipSummaryDto
            {
                Total = await operational.CountAsync(),
                Active = await operational.CountAsync(m => m.Status == MembershipStatus.Active),
                Expired = await operational.CountAsync(m => m.Status == MembershipStatus.Expired),
                VoidPending = await operational.CountAsync(m => m.Status == MembershipStatus.VoidPending),
                Expiring14d = await operational.CountAsync(m =>
                    renewingStatuses.Contains(m.Status)
                    && m.EndDate.Date >= today
                    && m.EndDate.Date <= windowEnd),
                PaymentDue = await operational.CountAsync(m =>
                    paymentDueStatuses.Contains(m.Status)
                    || _db.MembershipPayments.Any(p =>
                        !p.IsDeleted && p.MembershipId == m.Id && p.PendingAmount > 0.02m)),
            };
        }

        public async Task<PagedResultDto<UserMembershipDto>> GetPagedAsync(
            int page,
            int pageSize,
            string? search = null,
            MembershipStatus? status = null,
            bool needsPayment = false,
            int? expiringWithinDays = null,
            bool includeTerminal = false,
            int? membershipId = null)
        {
            var safePage = page < 1 ? 1 : page;
            var safePageSize = Math.Clamp(pageSize, 1, 200);
            var trimmedSearch = search?.Trim();
            var likeSearch = string.IsNullOrWhiteSpace(trimmedSearch) ? null : $"%{trimmedSearch}%";
            var today = DateTime.UtcNow.Date;

            IQueryable<UserMembership> query = _db.UserMemberships
                .AsNoTracking()
                .Where(m => !m.IsDeleted);

            if (membershipId.HasValue && membershipId.Value > 0)
            {
                query = query.Where(m => m.Id == membershipId.Value);
            }
            else if (status.HasValue)
            {
                query = query.Where(m => m.Status == status.Value);
            }
            else if (!includeTerminal)
            {
                query = query.Where(m =>
                    m.Status != MembershipStatus.Voided
                    && m.Status != MembershipStatus.Cancelled
                    && m.Status != MembershipStatus.Transferred);
            }

            if (needsPayment)
            {
                query = query.Where(m =>
                    m.Status == MembershipStatus.ActivePendingPayment
                    || m.Status == MembershipStatus.PartialPayment
                    || _db.MembershipPayments.Any(p =>
                        !p.IsDeleted && p.MembershipId == m.Id && p.PendingAmount > 0.02m));
            }

            if (expiringWithinDays.HasValue)
            {
                var windowDays = Math.Clamp(expiringWithinDays.Value, 1, 90);
                var windowEnd = today.AddDays(windowDays);
                var renewingStatuses = new[]
                {
                    MembershipStatus.Active,
                    MembershipStatus.ActivePendingPayment,
                    MembershipStatus.PartialPayment,
                };
                query = query.Where(m =>
                    renewingStatuses.Contains(m.Status)
                    && m.EndDate.Date >= today
                    && m.EndDate.Date <= windowEnd);
            }

            if (!string.IsNullOrWhiteSpace(trimmedSearch))
            {
                if (int.TryParse(trimmedSearch, out var membershipIdSearch) && membershipIdSearch > 0)
                {
                    query = query.Where(m =>
                        m.Id == membershipIdSearch
                        || _db.Users.Any(u =>
                            u.Id == m.UserId
                            && (EF.Functions.Like(u.FirstName, likeSearch!)
                                || EF.Functions.Like(u.LastName, likeSearch!)
                                || (u.Phone != null && EF.Functions.Like(u.Phone, likeSearch!))))
                        || _db.MembershipPlans.Any(p => p.Id == m.PlanId && EF.Functions.Like(p.PlanName, likeSearch!)));
                }
                else if (likeSearch != null)
                {
                    query = query.Where(m =>
                        _db.Users.Any(u =>
                            u.Id == m.UserId
                            && (EF.Functions.Like(u.FirstName, likeSearch)
                                || EF.Functions.Like(u.LastName, likeSearch)
                                || (u.Phone != null && EF.Functions.Like(u.Phone, likeSearch))))
                        || _db.MembershipPlans.Any(p => p.Id == m.PlanId && EF.Functions.Like(p.PlanName, likeSearch)));
                }
            }

            var totalCount = await query.CountAsync();
            var pageItems = await query
                .OrderByDescending(m => m.StartDate)
                .ThenByDescending(m => m.Id)
                .Skip((safePage - 1) * safePageSize)
                .Take(safePageSize)
                .ToListAsync();

            var dtos = await MapToDtosAsync(pageItems);
            return new PagedResultDto<UserMembershipDto>
            {
                Items = dtos,
                TotalCount = totalCount,
                Page = safePage,
                PageSize = safePageSize,
            };
        }

        private IQueryable<UserMembership> OperationalMembershipsQuery() =>
            _db.UserMemberships.AsNoTracking().Where(m =>
                !m.IsDeleted
                && m.Status != MembershipStatus.Voided
                && m.Status != MembershipStatus.Cancelled
                && m.Status != MembershipStatus.Transferred);

        public async Task<PagedResultDto<ExpiringMembershipQueueItemDto>> GetExpiringQueueAsync(
            int withinDays,
            int page,
            int pageSize,
            string? search = null)
        {
            var safePage = page < 1 ? 1 : page;
            var safePageSize = Math.Clamp(pageSize, 1, 100);
            var windowDays = Math.Clamp(withinDays, 1, 90);
            var today = DateTime.UtcNow.Date;
            var windowEnd = today.AddDays(windowDays);

            var renewingStatuses = new[]
            {
                MembershipStatus.Active,
                MembershipStatus.ActivePendingPayment,
                MembershipStatus.PartialPayment,
            };
            var expiredLookbackDays = Math.Max(windowDays, 30);
            var expiredCutoff = today.AddDays(-expiredLookbackDays);

            var trimmedSearch = search?.Trim();
            var likeSearch = string.IsNullOrWhiteSpace(trimmedSearch) ? null : $"%{trimmedSearch}%";

            IQueryable<UserMembership> query = _db.UserMemberships
                .AsNoTracking()
                .Where(m => !m.IsDeleted && (
                    (renewingStatuses.Contains(m.Status)
                        && m.EndDate.Date >= today
                        && m.EndDate.Date <= windowEnd)
                    || (m.Status == MembershipStatus.Expired
                        && m.EndDate.Date >= expiredCutoff
                        && m.EndDate.Date < today)));

            if (!string.IsNullOrWhiteSpace(likeSearch))
            {
                query = query.Where(m =>
                    _db.Users.Any(u =>
                        u.Id == m.UserId
                        && (EF.Functions.Like(u.FirstName, likeSearch)
                            || EF.Functions.Like(u.LastName, likeSearch)
                            || (u.Phone != null && EF.Functions.Like(u.Phone, likeSearch))))
                    || _db.MembershipPlans.Any(p => p.Id == m.PlanId && EF.Functions.Like(p.PlanName, likeSearch)));
            }

            var totalCount = await query.CountAsync();
            var pageItems = await query
                .OrderBy(m => m.Status == MembershipStatus.Expired ? 0 : 1)
                .ThenBy(m => m.EndDate)
                .ThenBy(m => m.UserId)
                .Skip((safePage - 1) * safePageSize)
                .Take(safePageSize)
                .ToListAsync();

            if (pageItems.Count == 0)
            {
                return new PagedResultDto<ExpiringMembershipQueueItemDto>
                {
                    Items = Array.Empty<ExpiringMembershipQueueItemDto>(),
                    TotalCount = totalCount,
                    Page = safePage,
                    PageSize = safePageSize,
                };
            }

            var userIds = pageItems.Select(x => x.UserId).Distinct().ToList();
            var planIds = pageItems.Select(x => x.PlanId).Distinct().ToList();
            var membershipIds = pageItems.Select(x => x.Id).Distinct().ToList();
            var users = (await _unitOfWork.Users.FindAsync(u => userIds.Contains(u.Id))).ToDictionary(u => u.Id);
            var plans = (await _unitOfWork.MembershipPlans.FindAsync(p => planIds.Contains(p.Id))).ToDictionary(p => p.Id);
            var payments = await _db.MembershipPayments.AsNoTracking()
                .Where(p => !p.IsDeleted && membershipIds.Contains(p.MembershipId))
                .ToDictionaryAsync(p => p.MembershipId);

            var items = pageItems.Select(m =>
            {
                users.TryGetValue(m.UserId, out var u);
                plans.TryGetValue(m.PlanId, out var p);
                payments.TryGetValue(m.Id, out var payment);
                var isExpired = m.Status == MembershipStatus.Expired || m.EndDate.Date < today;
                var pendingAmount = payment?.PendingAmount ?? 0m;
                var paymentStatus = payment?.PaymentStatus.ToString();
                var isFullyPaid = payment == null
                    || payment.PaymentStatus == MembershipPaymentStatus.Paid
                    || pendingAmount <= 0.02m;
                return new ExpiringMembershipQueueItemDto
                {
                    Id = m.Id,
                    UserId = m.UserId,
                    PlanId = m.PlanId,
                    StartDate = m.StartDate,
                    EndDate = m.EndDate,
                    Status = m.Status,
                    UserName = u != null ? $"{u.FirstName} {u.LastName}".Trim() : null,
                    MemberPhone = u?.Phone,
                    PlanName = p?.PlanName,
                    DaysRemaining = (m.EndDate.Date - today).Days,
                    IsExpired = isExpired,
                    MembershipPaymentId = payment?.Id,
                    PendingAmount = pendingAmount,
                    PaymentStatus = paymentStatus,
                    IsFullyPaid = isFullyPaid,
                };
            }).ToList();

            return new PagedResultDto<ExpiringMembershipQueueItemDto>
            {
                Items = items,
                TotalCount = totalCount,
                Page = safePage,
                PageSize = safePageSize,
            };
        }

        public async Task<UserMembershipDto?> GetByIdAsync(int id)

        {

            var m = await _unitOfWork.UserMemberships.GetByIdAsync(id);

            if (m == null) return null;

            var dtos = await MapToDtosAsync(new[] { m });

            var dto = dtos.FirstOrDefault();
            if (dto != null)
                dto.HasCompletedPayments = await HasCompletedPaymentsAsync(id);

            return dto;

        }

        public async Task<ActiveMembershipConflictDto?> GetActiveMembershipConflictForUserAsync(
            int userId,
            int? excludeMembershipId = null) =>
            await UserMembershipConflictGuard.TryGetActiveConflictAsync(
                _db, userId, excludeMembershipId);



        public async Task<UserMembershipDto> CreateAsync(CreateUserMembershipDto dto, int performedByUserId)

        {

            await UserMembershipConflictGuard.EnsureNoActiveMembershipBeforeCreateAsync(_db, dto.UserId);



            var m = new UserMembership

            {

                UserId = dto.UserId,

                PlanId = dto.PlanId,

                StartDate = dto.StartDate,

                EndDate = dto.EndDate,

                Status = dto.Status,

                FreezeStartDate = dto.FreezeStartDate,

                FreezeEndDate = dto.FreezeEndDate,

                FreezeReason = dto.FreezeReason

            };

            await _unitOfWork.UserMemberships.AddAsync(m);

            try
            {
                await _unitOfWork.SaveChangesAsync();
            }
            catch (DbUpdateException ex) when (UserMembershipConflictGuard.IsDuplicateActiveMembershipIndex(ex))
            {
                var dup = await UserMembershipConflictGuard.TryGetActiveConflictAsync(_db, dto.UserId)
                    ?? new ActiveMembershipConflictDto { Message = UserMembershipConflictCodes.Message, UserId = dto.UserId };
                throw new ActiveMembershipConflictException(dup);
            }



            var user = await _unitOfWork.Users.GetByIdAsync(m.UserId);

            var plan = await _unitOfWork.MembershipPlans.GetByIdAsync(m.PlanId);

            await MemberAccountReactivation.EnsureActiveForNewMembershipAsync(_unitOfWork, m.UserId);

            if (user != null && plan != null)

                await _membershipPaymentService.EnsureBillingForNewMembershipAsync(user, m, plan);



            var isRenew = string.Equals(dto.Intent, "renew", StringComparison.OrdinalIgnoreCase);
            var auditPayload = new
            {
                m.UserId,
                m.PlanId,
                m.StartDate,
                m.EndDate,
                m.Status,
                dto.CreationSource,
                dto.Intent,
                dto.PriorMembershipId,
            };

            await _audit.LogAsync(
                m.Id,
                isRenew ? MembershipAuditAction.Renewed : MembershipAuditAction.Created,
                performedByUserId,
                null,
                JsonSerializer.Serialize(auditPayload));



            var dtos = await MapToDtosAsync(new[] { m });

            return dtos.First();

        }



        public async Task<UserMembershipDto?> UpdateAsync(int id, UpdateUserMembershipDto dto, int performedByUserId)

        {

            var m = await _unitOfWork.UserMemberships.GetByIdAsync(id);

            if (m == null) return null;



            if (m.Status is MembershipStatus.Voided or MembershipStatus.Transferred)

                throw new BadRequestException("Voided or transferred memberships cannot be edited.");



            var hasPayments = await HasCompletedPaymentsAsync(m.Id);

            var planChanging = dto.PlanId.HasValue && dto.PlanId.Value != m.PlanId;

            var dateChanging = (dto.StartDate.HasValue && dto.StartDate.Value != m.StartDate)

                || (dto.EndDate.HasValue && dto.EndDate.Value != m.EndDate);

            var statusChanging = dto.Status.HasValue && dto.Status.Value != m.Status;



            if (hasPayments && (planChanging || dateChanging || statusChanging))

            {

                throw new BadRequestException(

                    "This membership has payment records. Submit an admin approval request for plan, date, or status changes.");

            }



            var oldSnapshot = JsonSerializer.Serialize(new

            {

                m.PlanId,

                m.StartDate,

                m.EndDate,

                m.Status,

            });



            var nextStatus = dto.Status ?? m.Status;

            await UserMembershipConflictGuard.EnsureSingleActiveMembershipAsync(
                _db, m.UserId, nextStatus, m.Id);



            if (dto.StartDate.HasValue) m.StartDate = dto.StartDate.Value;

            if (dto.EndDate.HasValue) m.EndDate = dto.EndDate.Value;

            if (dto.Status.HasValue) m.Status = dto.Status.Value;

            if (dto.PlanId.HasValue) m.PlanId = dto.PlanId.Value;

            m.FreezeStartDate = dto.FreezeStartDate;

            m.FreezeEndDate = dto.FreezeEndDate;

            m.FreezeReason = dto.FreezeReason;



            _unitOfWork.UserMemberships.Update(m);

            await _unitOfWork.SaveChangesAsync();



            await _audit.LogAsync(

                m.Id,

                MembershipAuditAction.Updated,

                performedByUserId,

                oldSnapshot,

                JsonSerializer.Serialize(new

                {

                    m.PlanId,

                    m.StartDate,

                    m.EndDate,

                    m.Status,

                }));



            var dtos = await MapToDtosAsync(new[] { m });

            return dtos.First();

        }

        public async Task<UserMembershipDto> RenewAccessAsync(
            int id,
            RenewMembershipAccessDto? dto,
            int performedByUserId)
        {
            var m = await _unitOfWork.UserMemberships.GetByIdAsync(id)
                ?? throw new NotFoundException("Membership not found.");

            if (m.Status is MembershipStatus.Voided or MembershipStatus.Transferred)
                throw new BadRequestException("Voided or transferred memberships cannot be renewed.");

            var hasBilling = await _db.MembershipPayments.AnyAsync(p =>
                p.MembershipId == id && !p.IsDeleted);
            if (!hasBilling)
            {
                await _membershipPaymentService.EnsureBillingForMembershipIdAsync(id);
                m = await _unitOfWork.UserMemberships.GetByIdAsync(id)
                    ?? throw new NotFoundException("Membership not found.");
            }

            if (m.Status is MembershipStatus.ActivePendingPayment
                or MembershipStatus.PartialPayment
                or MembershipStatus.Expired)
            {
                throw new BadRequestException(
                    "Collect outstanding payment on the current membership before extending access.");
            }

            var requestedPlanId = dto?.PlanId;
            var planId = requestedPlanId ?? m.PlanId;
            var plan = await _unitOfWork.MembershipPlans.GetByIdAsync(planId)
                ?? throw new BadRequestException("Could not resolve plan duration.");

            if (plan.DurationDays <= 0)
                throw new BadRequestException("Could not resolve plan duration.");

            var oldSnapshot = JsonSerializer.Serialize(new
            {
                m.PlanId,
                m.StartDate,
                m.EndDate,
                m.Status,
            });

            if (requestedPlanId.HasValue && requestedPlanId.Value != m.PlanId)
                m.PlanId = requestedPlanId.Value;

            m.EndDate = m.EndDate.Date.AddDays(plan.DurationDays);

            _unitOfWork.UserMemberships.Update(m);
            await _unitOfWork.SaveChangesAsync();

            await _audit.LogAsync(
                m.Id,
                MembershipAuditAction.Renewed,
                performedByUserId,
                oldSnapshot,
                JsonSerializer.Serialize(new
                {
                    m.PlanId,
                    m.StartDate,
                    m.EndDate,
                    m.Status,
                    RequestedPlanId = dto?.PlanId,
                }));

            var dtos = await MapToDtosAsync(new[] { m });
            return dtos.First();
        }

        public async Task<LastRenewalRevertPreviewDto?> GetLastRenewalRevertPreviewAsync(int membershipId)
        {
            var m = await _unitOfWork.UserMemberships.GetByIdAsync(membershipId);
            if (m == null) return null;

            var renewedLog = await FindLastRenewedAuditWithSnapshotAsync(membershipId);
            if (renewedLog == null || !TryParseMembershipSnapshot(renewedLog.OldValue, out var snapshot))
                return null;

            if (MembershipMatchesSnapshot(m, snapshot))
                return null;

            var planIds = new[] { m.PlanId, snapshot.PlanId }.Distinct().ToList();
            var plans = (await _unitOfWork.MembershipPlans.FindAsync(p => planIds.Contains(p.Id)))
                .ToDictionary(p => p.Id);

            var renewedByName = await _db.Users.AsNoTracking()
                .Where(u => u.Id == renewedLog.PerformedByUserId)
                .Select(u => (u.FirstName + " " + u.LastName).Trim())
                .FirstOrDefaultAsync();

            plans.TryGetValue(m.PlanId, out var currentPlan);
            plans.TryGetValue(snapshot.PlanId, out var previousPlan);

            return new LastRenewalRevertPreviewDto
            {
                MembershipId = membershipId,
                CurrentPlanId = m.PlanId,
                CurrentPlanName = currentPlan?.PlanName,
                CurrentEndDate = m.EndDate,
                PreviousPlanId = snapshot.PlanId,
                PreviousPlanName = previousPlan?.PlanName,
                PreviousStartDate = snapshot.StartDate,
                PreviousEndDate = snapshot.EndDate,
                PreviousStatus = snapshot.Status,
                LastRenewedAt = renewedLog.PerformedDate,
                LastRenewedByName = renewedByName,
            };
        }

        public async Task<UserMembershipDto> RevertLastRenewalAsync(int id, int performedByUserId)
        {
            var m = await _unitOfWork.UserMemberships.GetByIdAsync(id)
                ?? throw new NotFoundException("Membership not found.");

            if (m.Status is MembershipStatus.Voided or MembershipStatus.Transferred)
                throw new BadRequestException("Voided or transferred memberships cannot be reverted.");

            var renewedLog = await FindLastRenewedAuditWithSnapshotAsync(id)
                ?? throw new BadRequestException("No staff renewal found that can be reverted.");

            if (!TryParseMembershipSnapshot(renewedLog.OldValue, out var snapshot))
                throw new BadRequestException("Could not read the previous membership state from the audit log.");

            if (MembershipMatchesSnapshot(m, snapshot))
                throw new BadRequestException("This membership already matches the state before the last renewal.");

            var currentSnapshot = JsonSerializer.Serialize(new
            {
                m.PlanId,
                m.StartDate,
                m.EndDate,
                m.Status,
            });

            m.PlanId = snapshot.PlanId;
            m.StartDate = snapshot.StartDate;
            m.EndDate = snapshot.EndDate;
            m.Status = snapshot.Status;

            _unitOfWork.UserMemberships.Update(m);
            await _unitOfWork.SaveChangesAsync();

            await _audit.LogAsync(
                m.Id,
                MembershipAuditAction.RenewalReverted,
                performedByUserId,
                currentSnapshot,
                JsonSerializer.Serialize(new
                {
                    m.PlanId,
                    m.StartDate,
                    m.EndDate,
                    m.Status,
                    RevertedRenewalAuditId = renewedLog.Id,
                }));

            var dtos = await MapToDtosAsync(new[] { m });
            return dtos.First();
        }

        private async Task<MembershipAuditLog?> FindLastRenewedAuditWithSnapshotAsync(int membershipId) =>
            await _db.MembershipAuditLogs.AsNoTracking()
                .Where(l =>
                    l.MembershipId == membershipId
                    && !l.IsDeleted
                    && l.Action == MembershipAuditAction.Renewed
                    && l.OldValue != null
                    && l.OldValue != "")
                .OrderByDescending(l => l.PerformedDate)
                .FirstOrDefaultAsync();

        private sealed record MembershipSnapshot(
            int PlanId,
            DateTime StartDate,
            DateTime EndDate,
            MembershipStatus Status);

        private static bool TryParseMembershipSnapshot(string? json, out MembershipSnapshot snapshot)
        {
            snapshot = default!;
            if (string.IsNullOrWhiteSpace(json))
                return false;

            try
            {
                using var doc = JsonDocument.Parse(json);
                var root = doc.RootElement;
                var planId = ReadJsonInt(root, "planId", "PlanId");
                var startDate = ReadJsonDateTime(root, "startDate", "StartDate");
                var endDate = ReadJsonDateTime(root, "endDate", "EndDate");
                if (!planId.HasValue || !startDate.HasValue || !endDate.HasValue)
                    return false;

                var statusRaw = ReadJsonString(root, "status", "Status");
                if (!Enum.TryParse<MembershipStatus>(statusRaw, true, out var status))
                    status = MembershipStatus.Active;

                snapshot = new MembershipSnapshot(
                    planId.Value,
                    startDate.Value.Date,
                    endDate.Value.Date,
                    status);
                return true;
            }
            catch (JsonException)
            {
                return false;
            }
        }

        private static bool MembershipMatchesSnapshot(UserMembership m, MembershipSnapshot snapshot) =>
            m.PlanId == snapshot.PlanId
            && m.StartDate.Date == snapshot.StartDate.Date
            && m.EndDate.Date == snapshot.EndDate.Date
            && m.Status == snapshot.Status;

        private static int? ReadJsonInt(JsonElement root, params string[] names)
        {
            foreach (var name in names)
            {
                if (!root.TryGetProperty(name, out var el))
                    continue;
                if (el.ValueKind == JsonValueKind.Number && el.TryGetInt32(out var n))
                    return n;
            }

            return null;
        }

        private static string? ReadJsonString(JsonElement root, params string[] names)
        {
            foreach (var name in names)
            {
                if (root.TryGetProperty(name, out var el) && el.ValueKind == JsonValueKind.String)
                    return el.GetString();
            }

            return null;
        }

        private static DateTime? ReadJsonDateTime(JsonElement root, params string[] names)
        {
            foreach (var name in names)
            {
                if (!root.TryGetProperty(name, out var el))
                    continue;
                if (el.ValueKind == JsonValueKind.String
                    && DateTime.TryParse(el.GetString(), out var parsed))
                    return parsed;
            }

            return null;
        }



        private async Task<bool> HasCompletedPaymentsAsync(int membershipId)

        {

            return await _db.MembershipPaymentTransactions.AnyAsync(t =>
                !t.IsDeleted
                && t.Status == MembershipPaymentTransactionStatus.Completed
                && _db.MembershipPayments.Any(p =>
                    p.Id == t.PaymentId
                    && !p.IsDeleted
                    && p.MembershipId == membershipId));

        }



        private async Task<List<UserMembershipDto>> MapToDtosAsync(IEnumerable<UserMembership> list)

        {

            var items = list.ToList();

            if (items.Count == 0) return new List<UserMembershipDto>();



            var userIds = items.Select(x => x.UserId).Distinct().ToList();

            var planIds = items.Select(x => x.PlanId).Distinct().ToList();

            var membershipIds = items.Select(x => x.Id).Distinct().ToList();

            var users = (await _unitOfWork.Users.FindAsync(u => userIds.Contains(u.Id))).ToDictionary(u => u.Id);

            var plans = (await _unitOfWork.MembershipPlans.FindAsync(p => planIds.Contains(p.Id))).ToDictionary(p => p.Id);

            var payments = await _db.MembershipPayments.AsNoTracking()
                .Where(p => !p.IsDeleted && membershipIds.Contains(p.MembershipId))
                .ToDictionaryAsync(p => p.MembershipId);

            var today = DateTime.UtcNow.Date;



            return items.Select(m =>

            {

                var dto = new UserMembershipDto

                {

                    Id = m.Id,

                    UserId = m.UserId,

                    PlanId = m.PlanId,

                    StartDate = m.StartDate,

                    EndDate = m.EndDate,

                    Status = m.Status,

                    FreezeStartDate = m.FreezeStartDate,

                    FreezeEndDate = m.FreezeEndDate,

                    FreezeReason = m.FreezeReason

                };

                if (users.TryGetValue(m.UserId, out var u))
                {
                    dto.UserName = $"{u.FirstName} {u.LastName}".Trim();
                    dto.MemberPhone = u.Phone;
                }

                if (plans.TryGetValue(m.PlanId, out var p))

                    dto.PlanName = p.PlanName;

                payments.TryGetValue(m.Id, out var payment);
                var pendingAmount = payment?.PendingAmount ?? 0m;
                dto.PendingAmount = pendingAmount;
                dto.PaymentStatus = payment?.PaymentStatus.ToString();
                dto.MembershipPaymentId = payment?.Id;
                dto.IsFullyPaid = payment == null
                    || payment.PaymentStatus == MembershipPaymentStatus.Paid
                    || pendingAmount <= 0.02m;
                dto.DaysRemaining = (m.EndDate.Date - today).Days;
                dto.IsExpired = m.Status == MembershipStatus.Expired || m.EndDate.Date < today;

                return dto;

            }).ToList();

        }

    }

}


