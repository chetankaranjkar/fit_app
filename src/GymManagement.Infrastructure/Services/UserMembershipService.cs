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



        public async Task<PagedResultDto<UserMembershipDto>> GetPagedAsync(

            int page,

            int pageSize,

            string? search = null,

            MembershipStatus? status = null)

        {

            var safePage = page < 1 ? 1 : page;

            var safePageSize = Math.Clamp(pageSize, 1, 200);

            var trimmedSearch = search?.Trim();

            var likeSearch = string.IsNullOrWhiteSpace(trimmedSearch) ? null : $"%{trimmedSearch}%";



            IQueryable<UserMembership> query = _db.UserMemberships

                .AsNoTracking()

                .Where(m => !m.IsDeleted);



            if (status.HasValue)

                query = query.Where(m => m.Status == status.Value);
            else
                query = query.Where(m =>
                    m.Status != MembershipStatus.Voided
                    && m.Status != MembershipStatus.Cancelled
                    && m.Status != MembershipStatus.Transferred);



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

            var trimmedSearch = search?.Trim();
            var likeSearch = string.IsNullOrWhiteSpace(trimmedSearch) ? null : $"%{trimmedSearch}%";

            IQueryable<UserMembership> query = _db.UserMemberships
                .AsNoTracking()
                .Where(m => !m.IsDeleted
                    && renewingStatuses.Contains(m.Status)
                    && m.EndDate.Date >= today
                    && m.EndDate.Date <= windowEnd);

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
                .OrderBy(m => m.EndDate)
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
            var users = (await _unitOfWork.Users.FindAsync(u => userIds.Contains(u.Id))).ToDictionary(u => u.Id);
            var plans = (await _unitOfWork.MembershipPlans.FindAsync(p => planIds.Contains(p.Id))).ToDictionary(p => p.Id);

            var items = pageItems.Select(m =>
            {
                users.TryGetValue(m.UserId, out var u);
                plans.TryGetValue(m.PlanId, out var p);
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
                    DaysRemaining = Math.Max(0, (m.EndDate.Date - today).Days),
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

            return dtos.FirstOrDefault();

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

            var users = (await _unitOfWork.Users.FindAsync(u => userIds.Contains(u.Id))).ToDictionary(u => u.Id);

            var plans = (await _unitOfWork.MembershipPlans.FindAsync(p => planIds.Contains(p.Id))).ToDictionary(p => p.Id);



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

                    dto.UserName = $"{u.FirstName} {u.LastName}".Trim();

                if (plans.TryGetValue(m.PlanId, out var p))

                    dto.PlanName = p.PlanName;

                return dto;

            }).ToList();

        }

    }

}


