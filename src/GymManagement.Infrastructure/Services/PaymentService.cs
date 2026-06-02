using GymManagement.Core.DTOs;
using GymManagement.Core.DTOs.Common;
using GymManagement.Core.Exceptions;
using GymManagement.Core.Interfaces;
using GymManagement.Core.Services;
using GymManagement.Domain.Entities;
using GymManagement.Infrastructure.Data;
using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;

namespace GymManagement.Infrastructure.Services
{
    public class PaymentService : IPaymentService
    {
        private readonly IUnitOfWork _unitOfWork;
        private readonly ApplicationDbContext _context;
        private readonly IInvoiceService _invoiceService;

        public PaymentService(
            IUnitOfWork unitOfWork,
            ApplicationDbContext context,
            IInvoiceService invoiceService)
        {
            _unitOfWork = unitOfWork;
            _context = context;
            _invoiceService = invoiceService;
        }

        public async Task<PagedResultDto<PaymentDto>> GetPagedAsync(
            int page,
            int pageSize,
            string? search = null,
            DateTime? fromDate = null,
            DateTime? toDate = null,
            string? sortBy = null,
            string? sortDir = null)
        {
            var (safePage, safePageSize) = PagedQueryHelper.Normalize(page, pageSize);
            var trimmedSearch = search?.Trim();
            var likeSearch = string.IsNullOrWhiteSpace(trimmedSearch) ? null : $"%{trimmedSearch}%";

            IQueryable<Payment> query = _context.Payments.AsNoTracking();

            if (fromDate.HasValue)
                query = query.Where(p => p.PaymentDate >= fromDate.Value.Date);
            if (toDate.HasValue)
                query = query.Where(p => p.PaymentDate <= toDate.Value.Date.AddDays(1));

            if (!string.IsNullOrWhiteSpace(likeSearch))
            {
                query = query.Where(p =>
                    (p.ReceiptNo != null && EF.Functions.Like(p.ReceiptNo, likeSearch))
                    || _context.UserMemberships.Any(m =>
                        m.Id == p.MembershipId
                        && _context.Users.Any(u =>
                            m.UserId == u.Id
                            && (EF.Functions.Like(u.FirstName, likeSearch)
                                || EF.Functions.Like(u.LastName, likeSearch)))));
            }

            var isAsc = string.Equals(sortDir, "asc", StringComparison.OrdinalIgnoreCase);
            query = (sortBy ?? "date").Trim().ToLowerInvariant() switch
            {
                "amount" => isAsc ? query.OrderBy(p => p.Amount) : query.OrderByDescending(p => p.Amount),
                _ => isAsc ? query.OrderBy(p => p.PaymentDate) : query.OrderByDescending(p => p.PaymentDate),
            };

            var totalCount = await query.CountAsync();
            var pagePayments = await query.Skip((safePage - 1) * safePageSize).Take(safePageSize).ToListAsync();
            var ids = pagePayments.Select(p => p.Id).ToList();
            var map = await _invoiceService.GetInvoiceIdsByPaymentIdsAsync(ids);
            var items = pagePayments
                .Select(p => MapToDto(p, map.TryGetValue(p.Id, out var invId) ? invId : null))
                .ToList();

            return PagedQueryHelper.ToResult(items, totalCount, safePage, safePageSize);
        }

        public async Task<IEnumerable<PaymentDto>> GetAllAsync()
        {
            var list = await _unitOfWork.Payments.GetAllAsync();
            var ids = list.Select(p => p.Id).ToList();
            var map = await _invoiceService.GetInvoiceIdsByPaymentIdsAsync(ids);
            return list.Select(p => MapToDto(p, map.TryGetValue(p.Id, out var invId) ? invId : (int?)null));
        }

        public async Task<IEnumerable<PaymentDto>> GetByMembershipIdAsync(int membershipId)
        {
            var list = await _unitOfWork.Payments.FindAsync(p => p.MembershipId == membershipId);
            var materialized = list.ToList();
            var ids = materialized.Select(p => p.Id).ToList();
            var map = await _invoiceService.GetInvoiceIdsByPaymentIdsAsync(ids);
            return materialized.Select(p => MapToDto(p, map.TryGetValue(p.Id, out var invId) ? invId : (int?)null));
        }

        public async Task<PaymentDto?> GetByIdAsync(int id)
        {
            var p = await _unitOfWork.Payments.GetByIdAsync(id);
            if (p == null) return null;
            var map = await _invoiceService.GetInvoiceIdsByPaymentIdsAsync(new[] { id });
            return MapToDto(p, map.TryGetValue(id, out var invId) ? invId : (int?)null);
        }

        public async Task<PaymentDto?> EnsureInvoiceAsync(int id)
        {
            var p = await _unitOfWork.Payments.GetByIdAsync(id);
            if (p == null) return null;

            var invoice = await _invoiceService.CreatePaidInvoiceForPaymentAsync(id);
            var invoiceId = invoice?.Id;
            if (!invoiceId.HasValue)
            {
                var map = await _invoiceService.GetInvoiceIdsByPaymentIdsAsync(new[] { id });
                invoiceId = map.TryGetValue(id, out var invId) ? invId : (int?)null;
            }

            return MapToDto(p, invoiceId);
        }

        public async Task<PaymentDto> CreateAsync(CreatePaymentDto dto)
        {
            var strategy = _context.Database.CreateExecutionStrategy();
            PaymentDto? created = null;

            await strategy.ExecuteAsync(async () =>
            {
                const int maxAttempts = 3;
                for (var attempt = 1; attempt <= maxAttempts; attempt++)
                {
                    await using var transaction = await _context.Database.BeginTransactionAsync();

                    var membership = await _unitOfWork.UserMemberships.GetByIdAsync(dto.MembershipId);
                    if (membership == null)
                        throw new NotFoundException("Membership not found.");

                    var plan = await _unitOfWork.MembershipPlans.GetByIdAsync(membership.PlanId);
                    if (plan == null)
                        throw new NotFoundException("Membership plan not found for this membership.");

                    var p = new Payment
                    {
                        MembershipId = dto.MembershipId,
                        // Gym billing standard: payment amount follows active membership plan pricing.
                        Amount = plan.Price,
                        PaymentDate = dto.PaymentDate,
                        PaymentMode = dto.PaymentMode,
                        // Race-safe: DB sequence number generated per attempt.
                        ReceiptNo = await GenerateNextReceiptNoAsync()
                    };

                    try
                    {
                        await _unitOfWork.Payments.AddAsync(p);
                        await _unitOfWork.SaveChangesAsync();

                        var invoice = await _invoiceService.CreatePaidInvoiceForPaymentAsync(p.Id);
                        if (invoice == null)
                            throw new ConflictException("Could not create invoice for this payment. Check membership and plan.");

                        await transaction.CommitAsync();
                        created = MapToDto(p, invoice.Id);
                        return;
                    }
                    catch (DbUpdateException ex) when (IsUniqueConstraintViolation(ex) && attempt < maxAttempts)
                    {
                        await transaction.RollbackAsync();
                        _context.Entry(p).State = EntityState.Detached;
                        continue;
                    }
                }

                throw new ConflictException("Failed to create payment due to concurrent numbering collisions.");
            });

            return created ?? throw new ConflictException("Failed to create payment.");
        }

        public async Task<PaymentDto?> UpdateAsync(int id, UpdatePaymentDto dto)
        {
            var p = await _unitOfWork.Payments.GetByIdAsync(id);
            if (p == null) return null;

            if (dto.Amount.HasValue) p.Amount = dto.Amount.Value;
            if (dto.PaymentDate.HasValue) p.PaymentDate = dto.PaymentDate.Value;
            if (dto.PaymentMode.HasValue) p.PaymentMode = dto.PaymentMode.Value;
            if (dto.ReceiptNo != null) p.ReceiptNo = dto.ReceiptNo;

            _unitOfWork.Payments.Update(p);
            await _unitOfWork.SaveChangesAsync();

            var map = await _invoiceService.GetInvoiceIdsByPaymentIdsAsync(new[] { id });
            return MapToDto(p, map.TryGetValue(id, out var invId) ? invId : (int?)null);
        }

        public async Task<bool> DeleteAsync(int id)
        {
            var p = await _unitOfWork.Payments.GetByIdAsync(id);
            if (p == null) return false;
            _unitOfWork.Payments.Delete(p);
            await _unitOfWork.SaveChangesAsync();
            return true;
        }

        private static PaymentDto MapToDto(Payment p, int? invoiceId = null) => new()
        {
            Id = p.Id,
            MembershipId = p.MembershipId,
            Amount = p.Amount,
            PaymentDate = p.PaymentDate,
            PaymentMode = p.PaymentMode,
            ReceiptNo = p.ReceiptNo,
            InvoiceId = invoiceId
        };

        private async Task<string> GenerateNextReceiptNoAsync()
        {
            var conn = _context.Database.GetDbConnection();
            var shouldClose = conn.State != System.Data.ConnectionState.Open;
            if (shouldClose) await conn.OpenAsync();
            try
            {
                await using var cmd = conn.CreateCommand();
                cmd.CommandText = "SELECT NEXT VALUE FOR [dbo].[ReceiptNumberSeq]";
                var result = await cmd.ExecuteScalarAsync();
                var number = Convert.ToInt64(result);
                return $"INV-{number:D6}";
            }
            finally
            {
                if (shouldClose) await conn.CloseAsync();
            }
        }

        private static bool IsUniqueConstraintViolation(DbUpdateException ex)
            => ex.InnerException is SqlException sql &&
               (sql.Number == 2601 || sql.Number == 2627);
    }
}
