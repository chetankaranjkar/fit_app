using System.Text.Json;
using GymManagement.Core.DTOs;
using GymManagement.Core.Exceptions;
using GymManagement.Core.Services;
using GymManagement.Domain.Entities;
using GymManagement.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace GymManagement.Infrastructure.Services
{
    public sealed class CouponService : ICouponService
    {
        private readonly ApplicationDbContext _db;
        private static readonly JsonSerializerOptions _jsonOpts = new() { PropertyNameCaseInsensitive = true };

        public CouponService(ApplicationDbContext db)
        {
            _db = db;
        }

        #region CRUD

        public async Task<IReadOnlyList<CouponDto>> GetAllAsync(string? search = null, string? status = null, CancellationToken ct = default)
        {
            var query = _db.Coupons.AsNoTracking().Where(c => !c.IsDeleted);

            if (!string.IsNullOrWhiteSpace(search))
            {
                var s = search.Trim().ToLower();
                query = query.Where(c => c.CouponCode.ToLower().Contains(s) || c.CouponName.ToLower().Contains(s));
            }

            if (!string.IsNullOrWhiteSpace(status) && Enum.TryParse<CouponStatus>(status, true, out var st))
                query = query.Where(c => c.Status == st);

            var list = await query.OrderByDescending(c => c.CreatedDate).ToListAsync(ct);
            return list.Select(MapToDto).ToList();
        }

        public async Task<CouponDto?> GetByIdAsync(int id, CancellationToken ct = default)
        {
            var c = await _db.Coupons.AsNoTracking().FirstOrDefaultAsync(x => x.Id == id && !x.IsDeleted, ct);
            return c == null ? null : MapToDto(c);
        }

        public async Task<CouponDto> CreateAsync(CreateCouponDto dto, int? createdByUserId, CancellationToken ct = default)
        {
            // Validate unique code
            var code = dto.CouponCode.Trim().ToUpper();
            var exists = await _db.Coupons.AnyAsync(c => c.CouponCode == code && !c.IsDeleted, ct);
            if (exists)
                throw new BadRequestException($"Coupon code '{code}' already exists.");

            if (dto.DiscountValue <= 0)
                throw new BadRequestException("Discount value must be greater than zero.");
            if (dto.ValidTo <= dto.ValidFrom)
                throw new BadRequestException("Valid To must be after Valid From.");
            if (dto.UsageLimit < 1)
                throw new BadRequestException("Usage limit must be at least 1.");
            if (dto.DiscountType == DiscountType.Percentage && dto.DiscountValue > 100)
                throw new BadRequestException("Percentage discount cannot exceed 100%.");

            var coupon = new Coupon
            {
                CouponCode = code,
                CouponName = dto.CouponName.Trim(),
                Description = dto.Description?.Trim(),
                DiscountType = dto.DiscountType,
                DiscountValue = dto.DiscountValue,
                MinimumInvoiceAmount = dto.MinimumInvoiceAmount,
                MaximumDiscountAmount = dto.MaximumDiscountAmount,
                ValidFrom = dto.ValidFrom.ToUniversalTime(),
                ValidTo = dto.ValidTo.ToUniversalTime(),
                UsageLimit = dto.UsageLimit,
                UsedCount = 0,
                PerUserLimit = dto.PerUserLimit,
                ApplicableMembershipIds = SerializeIds(dto.ApplicableMembershipIds),
                ApplicableBranchIds = SerializeIds(dto.ApplicableBranchIds),
                ApplicableUserTypes = dto.ApplicableUserTypes?.Count > 0 ? JsonSerializer.Serialize(dto.ApplicableUserTypes) : null,
                Status = CouponStatus.Active,
                CreatedByUserId = createdByUserId,
            };

            await _db.Coupons.AddAsync(coupon, ct);
            await _db.SaveChangesAsync(ct);
            return MapToDto(coupon);
        }

        public async Task<CouponDto?> UpdateAsync(int id, UpdateCouponDto dto, CancellationToken ct = default)
        {
            var coupon = await _db.Coupons.FirstOrDefaultAsync(c => c.Id == id && !c.IsDeleted, ct);
            if (coupon == null) return null;

            if (dto.CouponName != null) coupon.CouponName = dto.CouponName.Trim();
            if (dto.Description != null) coupon.Description = dto.Description.Trim();
            if (dto.DiscountType.HasValue) coupon.DiscountType = dto.DiscountType.Value;
            if (dto.DiscountValue.HasValue)
            {
                if (dto.DiscountValue.Value <= 0)
                    throw new BadRequestException("Discount value must be greater than zero.");
                coupon.DiscountValue = dto.DiscountValue.Value;
            }
            if (dto.MinimumInvoiceAmount.HasValue) coupon.MinimumInvoiceAmount = dto.MinimumInvoiceAmount.Value;
            if (dto.MaximumDiscountAmount.HasValue) coupon.MaximumDiscountAmount = dto.MaximumDiscountAmount.Value;
            if (dto.ValidFrom.HasValue) coupon.ValidFrom = dto.ValidFrom.Value.ToUniversalTime();
            if (dto.ValidTo.HasValue) coupon.ValidTo = dto.ValidTo.Value.ToUniversalTime();
            if (dto.UsageLimit.HasValue) coupon.UsageLimit = dto.UsageLimit.Value;
            if (dto.PerUserLimit.HasValue) coupon.PerUserLimit = dto.PerUserLimit.Value;
            if (dto.ApplicableMembershipIds != null) coupon.ApplicableMembershipIds = SerializeIds(dto.ApplicableMembershipIds);
            if (dto.ApplicableBranchIds != null) coupon.ApplicableBranchIds = SerializeIds(dto.ApplicableBranchIds);
            if (dto.ApplicableUserTypes != null) coupon.ApplicableUserTypes = dto.ApplicableUserTypes.Count > 0 ? JsonSerializer.Serialize(dto.ApplicableUserTypes) : null;
            if (dto.Status.HasValue) coupon.Status = dto.Status.Value;

            if (dto.ValidTo.HasValue && dto.ValidFrom.HasValue && dto.ValidTo.Value <= dto.ValidFrom.Value)
                throw new BadRequestException("Valid To must be after Valid From.");

            coupon.UpdatedDate = DateTime.UtcNow;
            await _db.SaveChangesAsync(ct);
            return MapToDto(coupon);
        }

        public async Task<bool> DisableAsync(int id, CancellationToken ct = default)
        {
            var coupon = await _db.Coupons.FirstOrDefaultAsync(c => c.Id == id && !c.IsDeleted, ct);
            if (coupon == null) return false;
            coupon.Status = CouponStatus.Disabled;
            coupon.UpdatedDate = DateTime.UtcNow;
            await _db.SaveChangesAsync(ct);
            return true;
        }

        #endregion

        #region Validation & Application

        public async Task<ValidateCouponResponse> ValidateAsync(ValidateCouponRequest request, CancellationToken ct = default)
        {
            var code = request.CouponCode.Trim().ToUpper();
            var coupon = await _db.Coupons.AsNoTracking()
                .FirstOrDefaultAsync(c => c.CouponCode == code && !c.IsDeleted, ct);

            if (coupon == null)
                return Fail("Coupon not found.");

            var now = DateTime.UtcNow;

            if (coupon.Status == CouponStatus.Disabled)
                return Fail("This coupon has been disabled.");
            if (coupon.Status == CouponStatus.Expired || coupon.ValidTo < now)
                return Fail("This coupon has expired.");
            if (coupon.ValidFrom > now)
                return Fail("This coupon is not yet active.");
            if (coupon.UsedCount >= coupon.UsageLimit)
                return Fail("This coupon has reached its usage limit.");

            // Per-user limit / reusable rules
            var userUsageCount = await _db.CouponUsages
                .CountAsync(u => u.CouponId == coupon.Id && u.UserId == request.UserId && !u.IsDeleted, ct);
            if (!coupon.AllowSameUserMultipleUsage && userUsageCount > 0)
                return Fail("You have already used this coupon.");
            if (userUsageCount >= coupon.PerUserLimit)
                return Fail($"You have already used this coupon {userUsageCount} time(s).");

            if (!coupon.AllowMultipleUsage && coupon.UsedCount >= coupon.UsageLimit)
                return Fail("This coupon is no longer available.");

            if (coupon.FirstTimeUserOnly)
            {
                var hasPriorPayment = await _db.MembershipPayments.AsNoTracking()
                    .AnyAsync(p => p.UserId == request.UserId && !p.IsDeleted
                        && (p.PaidAmount > 0 || p.PaymentStatus == MembershipPaymentStatus.Paid), ct);
                if (hasPriorPayment)
                    return Fail("This coupon is only for first-time members.");
            }

            if (request.MembershipPaymentId.HasValue)
            {
                var header = await _db.MembershipPayments.AsNoTracking()
                    .FirstOrDefaultAsync(p => p.Id == request.MembershipPaymentId.Value && !p.IsDeleted, ct);
                if (header == null)
                    return Fail("Billing record not found.");
                if (header.CouponId.HasValue)
                    return Fail("A coupon is already applied to this invoice.");
                if (header.CouponLocked)
                    return Fail("Coupon is locked on this invoice.");
                var hasTransactions = await _db.MembershipPaymentTransactions
                    .AnyAsync(t => t.PaymentId == header.Id && !t.IsDeleted, ct);
                if (header.PaidAmount > 0 || hasTransactions)
                    return Fail("Cannot apply a coupon after payments have started.");
                if (!coupon.ApplicableOnPartialPayment && header.PaymentStatus == MembershipPaymentStatus.Partial)
                    return Fail("This coupon cannot be applied to a partial payment invoice.");

                var invoiceAmount = header.OriginalAmount > 0 ? header.OriginalAmount : header.TotalAmount;
                request.InvoiceAmount = invoiceAmount;
            }

            // Minimum amount
            if (request.InvoiceAmount < coupon.MinimumInvoiceAmount)
                return Fail($"Minimum invoice amount of ₹{coupon.MinimumInvoiceAmount:N0} required.");

            // Membership applicability
            var membershipIds = DeserializeIds(coupon.ApplicableMembershipIds);
            if (membershipIds.Count > 0 && !membershipIds.Contains(request.MembershipPlanId))
                return Fail("This coupon is not applicable to the selected membership plan.");

            // Branch applicability
            var branchIds = DeserializeIds(coupon.ApplicableBranchIds);
            if (branchIds.Count > 0 && request.BranchId.HasValue && !branchIds.Contains(request.BranchId.Value))
                return Fail("This coupon is not applicable to your branch.");

            // Calculate discount
            var discount = CalculateDiscount(coupon, request.InvoiceAmount);
            var finalAmount = Math.Max(0, request.InvoiceAmount - discount);

            return new ValidateCouponResponse
            {
                Valid = true,
                DiscountAmount = discount,
                FinalAmount = finalAmount,
                Message = "Coupon applied successfully.",
                CouponId = coupon.Id,
                CouponCode = coupon.CouponCode,
            };
        }

        public async Task<decimal> ApplyCouponAsync(int couponId, int userId, int membershipPaymentId, decimal invoiceAmount, CancellationToken ct = default)
        {
            var coupon = await _db.Coupons.FirstOrDefaultAsync(c => c.Id == couponId && !c.IsDeleted, ct)
                ?? throw new NotFoundException("Coupon not found.");

            // Re-validate critical checks
            var now = DateTime.UtcNow;
            if (coupon.Status != CouponStatus.Active)
                throw new BadRequestException("Coupon is not active.");
            if (coupon.ValidTo < now)
                throw new BadRequestException("Coupon has expired.");
            if (coupon.UsedCount >= coupon.UsageLimit)
                throw new BadRequestException("Coupon usage limit reached.");

            var userUsageCount = await _db.CouponUsages
                .CountAsync(u => u.CouponId == couponId && u.UserId == userId && !u.IsDeleted, ct);
            if (userUsageCount >= coupon.PerUserLimit)
                throw new BadRequestException("Per-user coupon limit reached.");

            var discount = CalculateDiscount(coupon, invoiceAmount);

            // Increment usage
            coupon.UsedCount++;
            coupon.UpdatedDate = DateTime.UtcNow;

            // Create usage record
            var usage = new CouponUsage
            {
                CouponId = couponId,
                UserId = userId,
                MembershipPaymentId = membershipPaymentId,
                DiscountAmount = discount,
                UsedAt = DateTime.UtcNow,
            };
            await _db.CouponUsages.AddAsync(usage, ct);

            var original = invoiceAmount;
            var final = Math.Max(0, original - discount);
            await _db.InvoiceCouponUsages.AddAsync(new InvoiceCouponUsage
            {
                CouponId = couponId,
                UserId = userId,
                MembershipPaymentId = membershipPaymentId,
                OriginalAmount = original,
                DiscountAmount = discount,
                FinalAmount = final,
                UsageType = CouponUsageType.FirstPayment,
                Locked = true,
                AppliedAt = DateTime.UtcNow,
            }, ct);

            await _db.SaveChangesAsync(ct);

            return discount;
        }

        public async Task RevokeCouponUsageForBillingAsync(int membershipPaymentId, CancellationToken ct = default)
        {
            var usages = await _db.CouponUsages
                .Where(u => u.MembershipPaymentId == membershipPaymentId && !u.IsDeleted)
                .ToListAsync(ct);
            foreach (var u in usages)
            {
                u.IsDeleted = true;
                u.UpdatedDate = DateTime.UtcNow;
                var coupon = await _db.Coupons.FirstOrDefaultAsync(c => c.Id == u.CouponId && !c.IsDeleted, ct);
                if (coupon != null && coupon.UsedCount > 0)
                {
                    coupon.UsedCount--;
                    coupon.UpdatedDate = DateTime.UtcNow;
                }
            }

            var invoiceUsages = await _db.InvoiceCouponUsages
                .Where(u => u.MembershipPaymentId == membershipPaymentId && !u.IsDeleted)
                .ToListAsync(ct);
            foreach (var u in invoiceUsages)
            {
                u.IsDeleted = true;
                u.UpdatedDate = DateTime.UtcNow;
            }

            if (usages.Count > 0 || invoiceUsages.Count > 0)
                await _db.SaveChangesAsync(ct);
        }

        #endregion

        #region Analytics & Usages

        public async Task<IReadOnlyList<CouponUsageDto>> GetUsagesAsync(int couponId, CancellationToken ct = default)
        {
            var usages = await _db.CouponUsages.AsNoTracking()
                .Include(u => u.User)
                .Include(u => u.Coupon)
                .Where(u => u.CouponId == couponId && !u.IsDeleted)
                .OrderByDescending(u => u.UsedAt)
                .ToListAsync(ct);

            return usages.Select(u => new CouponUsageDto
            {
                Id = u.Id,
                CouponId = u.CouponId,
                CouponCode = u.Coupon.CouponCode,
                UserId = u.UserId,
                UserName = u.User != null ? $"{u.User.FirstName} {u.User.LastName}".Trim() : null,
                MembershipPaymentId = u.MembershipPaymentId,
                InvoiceId = u.InvoiceId,
                DiscountAmount = u.DiscountAmount,
                UsedAt = u.UsedAt,
            }).ToList();
        }

        public async Task<CouponAnalyticsDto> GetAnalyticsAsync(CancellationToken ct = default)
        {
            var coupons = await _db.Coupons.AsNoTracking().Where(c => !c.IsDeleted).ToListAsync(ct);
            var totalDiscount = await _db.CouponUsages.AsNoTracking()
                .Where(u => !u.IsDeleted)
                .SumAsync(u => (decimal?)u.DiscountAmount, ct) ?? 0;

            var mostUsed = coupons.OrderByDescending(c => c.UsedCount).FirstOrDefault();

            var paidBilling = await _db.MembershipPayments.AsNoTracking()
                .Where(p => !p.IsDeleted && p.PaidAmount > 0)
                .ToListAsync(ct);
            var revenueAfter = paidBilling.Sum(p => p.PaidAmount);
            var originalBilled = paidBilling.Sum(p => p.OriginalAmount > 0 ? p.OriginalAmount : p.TotalAmount);
            var conversion = originalBilled > 0
                ? (decimal)await _db.InvoiceCouponUsages.CountAsync(u => !u.IsDeleted, ct) / paidBilling.Count * 100
                : 0;

            return new CouponAnalyticsDto
            {
                ActiveCoupons = coupons.Count(c => c.Status == CouponStatus.Active),
                ExpiredCoupons = coupons.Count(c => c.Status == CouponStatus.Expired),
                DisabledCoupons = coupons.Count(c => c.Status == CouponStatus.Disabled),
                TotalDiscountGiven = totalDiscount,
                MostUsedCoupon = mostUsed != null ? MapToDto(mostUsed) : null,
                RevenueImpact = totalDiscount,
                RevenueAfterDiscount = revenueAfter,
                CouponConversionRate = Math.Round(conversion, 2),
            };
        }

        public async Task<int> ExpireOverdueCouponsAsync(CancellationToken ct = default)
        {
            var now = DateTime.UtcNow;
            var expired = await _db.Coupons
                .Where(c => !c.IsDeleted && c.Status == CouponStatus.Active && c.ValidTo < now)
                .ToListAsync(ct);

            foreach (var c in expired)
            {
                c.Status = CouponStatus.Expired;
                c.UpdatedDate = now;
            }

            if (expired.Count > 0)
                await _db.SaveChangesAsync(ct);

            return expired.Count;
        }

        #endregion

        #region Helpers

        private static decimal CalculateDiscount(Coupon coupon, decimal invoiceAmount)
        {
            decimal discount;
            if (coupon.DiscountType == DiscountType.Percentage)
            {
                discount = invoiceAmount * (coupon.DiscountValue / 100m);
                if (coupon.MaximumDiscountAmount.HasValue && discount > coupon.MaximumDiscountAmount.Value)
                    discount = coupon.MaximumDiscountAmount.Value;
            }
            else
            {
                discount = coupon.DiscountValue;
            }

            // Never exceed invoice amount
            if (discount > invoiceAmount)
                discount = invoiceAmount;

            return Math.Round(discount, 2);
        }

        private static ValidateCouponResponse Fail(string message) => new()
        {
            Valid = false,
            DiscountAmount = 0,
            FinalAmount = 0,
            Message = message,
        };

        private static string? SerializeIds(List<int>? ids) =>
            ids == null || ids.Count == 0 ? null : JsonSerializer.Serialize(ids);

        private static List<int> DeserializeIds(string? json)
        {
            if (string.IsNullOrWhiteSpace(json)) return new List<int>();
            try { return JsonSerializer.Deserialize<List<int>>(json) ?? new List<int>(); }
            catch { return new List<int>(); }
        }

        private static CouponDto MapToDto(Coupon c) => new()
        {
            Id = c.Id,
            CouponCode = c.CouponCode,
            CouponName = c.CouponName,
            Description = c.Description,
            DiscountType = c.DiscountType,
            DiscountValue = c.DiscountValue,
            MinimumInvoiceAmount = c.MinimumInvoiceAmount,
            MaximumDiscountAmount = c.MaximumDiscountAmount,
            ValidFrom = c.ValidFrom,
            ValidTo = c.ValidTo,
            UsageLimit = c.UsageLimit,
            UsedCount = c.UsedCount,
            PerUserLimit = c.PerUserLimit,
            ApplicableMembershipIds = DeserializeIds(c.ApplicableMembershipIds),
            ApplicableBranchIds = DeserializeIds(c.ApplicableBranchIds),
            ApplicableUserTypes = !string.IsNullOrWhiteSpace(c.ApplicableUserTypes)
                ? JsonSerializer.Deserialize<List<string>>(c.ApplicableUserTypes) : null,
            Status = c.Status,
            AllowMultipleUsage = c.AllowMultipleUsage,
            AllowSameUserMultipleUsage = c.AllowSameUserMultipleUsage,
            AllowSameInvoiceMultipleUsage = c.AllowSameInvoiceMultipleUsage,
            FirstTimeUserOnly = c.FirstTimeUserOnly,
            ApplicableOnPartialPayment = c.ApplicableOnPartialPayment,
            CreatedByUserId = c.CreatedByUserId,
            CreatedDate = c.CreatedDate,
            UpdatedDate = c.UpdatedDate,
        };

        #endregion
    }
}
