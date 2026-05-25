using GymManagement.Core.DTOs.Common;
using GymManagement.Core.DTOs.PersonalTraining;
using GymManagement.Core.Exceptions;
using GymManagement.Core.Services.PersonalTraining;
using GymManagement.Domain.Entities.PersonalTraining;
using GymManagement.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace GymManagement.Infrastructure.Services.PersonalTraining
{
    public sealed class PtPackageService : IPtPackageService
    {
        private readonly ApplicationDbContext _db;

        public PtPackageService(ApplicationDbContext db) => _db = db;

        public async Task<PagedResultDto<PTPackageDto>> SearchAsync(PTPackageFilterDto filter, CancellationToken ct = default)
        {
            var page = Math.Max(1, filter.Page);
            var pageSize = Math.Clamp(filter.PageSize, 1, 100);

            var query = _db.PTPackages.AsNoTracking()
                .Include(p => p.TrainerPrices.Where(tp => !tp.IsDeleted))
                .ThenInclude(tp => tp.Trainer)
                .ThenInclude(t => t.User)
                .Where(p => !p.IsDeleted);

            if (!string.IsNullOrWhiteSpace(filter.Search))
            {
                var s = filter.Search.Trim().ToLower();
                query = query.Where(p => p.PackageName.ToLower().Contains(s) || (p.Description != null && p.Description.ToLower().Contains(s)));
            }
            if (filter.PackageType.HasValue)
                query = query.Where(p => p.PackageType == filter.PackageType.Value);
            if (filter.IsActive.HasValue)
                query = query.Where(p => p.IsActive == filter.IsActive.Value);

            var total = await query.CountAsync(ct);
            var items = await query.OrderBy(p => p.PackageName)
                .Skip((page - 1) * pageSize).Take(pageSize).ToListAsync(ct);

            return new PagedResultDto<PTPackageDto>
            {
                Items = items.Select(Map).ToList(),
                TotalCount = total,
                Page = page,
                PageSize = pageSize,
            };
        }

        public async Task<PTPackageDto?> GetByIdAsync(int id, CancellationToken ct = default)
        {
            var p = await _db.PTPackages.AsNoTracking()
                .Include(x => x.TrainerPrices.Where(tp => !tp.IsDeleted))
                .ThenInclude(tp => tp.Trainer).ThenInclude(t => t.User)
                .FirstOrDefaultAsync(x => x.Id == id && !x.IsDeleted, ct);
            return p == null ? null : Map(p);
        }

        public async Task<PTPackageDto> CreateAsync(CreatePTPackageDto dto, CancellationToken ct = default)
        {
            ValidatePackage(dto.PackageName, dto.TotalSessions, dto.ValidityDays, dto.Price);
            var entity = new PTPackage
            {
                PackageName = dto.PackageName.Trim(),
                Description = dto.Description?.Trim(),
                PackageType = dto.PackageType,
                TotalSessions = dto.TotalSessions,
                ValidityDays = dto.ValidityDays,
                Price = dto.Price,
                TaxPercentage = dto.TaxPercentage,
                DefaultDiscountAmount = dto.DefaultDiscountAmount,
                IsActive = dto.IsActive,
            };
            await _db.PTPackages.AddAsync(entity, ct);
            await _db.SaveChangesAsync(ct);
            await SyncTrainerPricesAsync(entity.Id, dto.TrainerPrices, ct);
            return (await GetByIdAsync(entity.Id, ct))!;
        }

        public async Task<PTPackageDto?> UpdateAsync(int id, UpdatePTPackageDto dto, CancellationToken ct = default)
        {
            var entity = await _db.PTPackages.FirstOrDefaultAsync(p => p.Id == id && !p.IsDeleted, ct);
            if (entity == null) return null;
            ValidatePackage(dto.PackageName, dto.TotalSessions, dto.ValidityDays, dto.Price);
            entity.PackageName = dto.PackageName.Trim();
            entity.Description = dto.Description?.Trim();
            entity.PackageType = dto.PackageType;
            entity.TotalSessions = dto.TotalSessions;
            entity.ValidityDays = dto.ValidityDays;
            entity.Price = dto.Price;
            entity.TaxPercentage = dto.TaxPercentage;
            entity.DefaultDiscountAmount = dto.DefaultDiscountAmount;
            entity.IsActive = dto.IsActive;
            entity.UpdatedDate = DateTime.UtcNow;
            await SyncTrainerPricesAsync(id, dto.TrainerPrices, ct);
            await _db.SaveChangesAsync(ct);
            return await GetByIdAsync(id, ct);
        }

        public async Task<bool> DeleteAsync(int id, CancellationToken ct = default)
        {
            var entity = await _db.PTPackages.FirstOrDefaultAsync(p => p.Id == id && !p.IsDeleted, ct);
            if (entity == null) return false;
            entity.IsDeleted = true;
            entity.UpdatedDate = DateTime.UtcNow;
            await _db.SaveChangesAsync(ct);
            return true;
        }

        private async Task SyncTrainerPricesAsync(int packageId, List<CreatePTPackagePriceDto>? prices, CancellationToken ct)
        {
            if (prices == null) return;
            foreach (var tp in prices)
            {
                var existing = await _db.PTPackagePrices
                    .FirstOrDefaultAsync(x => x.PackageId == packageId && x.TrainerId == tp.TrainerId && !x.IsDeleted, ct);
                if (existing != null)
                {
                    existing.Price = tp.Price;
                    existing.IsActive = true;
                    existing.UpdatedDate = DateTime.UtcNow;
                }
                else
                {
                    await _db.PTPackagePrices.AddAsync(new PTPackagePrice
                    {
                        PackageId = packageId,
                        TrainerId = tp.TrainerId,
                        Price = tp.Price,
                    }, ct);
                }
            }
            await _db.SaveChangesAsync(ct);
        }

        private static void ValidatePackage(string name, int sessions, int validity, decimal price)
        {
            if (string.IsNullOrWhiteSpace(name)) throw new BadRequestException("Package name is required.");
            if (sessions < 1) throw new BadRequestException("Total sessions must be at least 1.");
            if (validity < 1) throw new BadRequestException("Validity days must be at least 1.");
            if (price < 0) throw new BadRequestException("Price cannot be negative.");
        }

        private static PTPackageDto Map(PTPackage p) => new()
        {
            Id = p.Id,
            PackageName = p.PackageName,
            Description = p.Description,
            PackageType = p.PackageType,
            TotalSessions = p.TotalSessions,
            ValidityDays = p.ValidityDays,
            Price = p.Price,
            TaxPercentage = p.TaxPercentage,
            DefaultDiscountAmount = p.DefaultDiscountAmount,
            IsActive = p.IsActive,
            TrainerPrices = p.TrainerPrices.Where(tp => !tp.IsDeleted).Select(tp => new PTPackagePriceDto
            {
                Id = tp.Id,
                TrainerId = tp.TrainerId,
                TrainerName = tp.Trainer?.User == null ? null : $"{tp.Trainer.User.FirstName} {tp.Trainer.User.LastName}".Trim(),
                Price = tp.Price,
                IsActive = tp.IsActive,
            }).ToList(),
        };
    }
}
