using GymManagement.Core.DTOs.Retail;
using GymManagement.Core.Exceptions;
using GymManagement.Core.Services.Retail;
using GymManagement.Domain.Entities.Retail;
using GymManagement.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace GymManagement.Infrastructure.Services.Retail
{
    public sealed class ProductCategoryService : IProductCategoryService
    {
        private readonly ApplicationDbContext _db;

        public ProductCategoryService(ApplicationDbContext db)
        {
            _db = db;
        }

        public async Task<IReadOnlyList<ProductCategoryDto>> GetTreeAsync(CancellationToken ct = default)
        {
            var all = await _db.RetailProductCategories.AsNoTracking()
                .Where(c => !c.IsDeleted)
                .OrderBy(c => c.SortOrder).ThenBy(c => c.Name)
                .ToListAsync(ct);

            var counts = await _db.RetailProducts.AsNoTracking()
                .Where(p => !p.IsDeleted)
                .GroupBy(p => p.CategoryId)
                .Select(g => new { CategoryId = g.Key, Count = g.Count() })
                .ToDictionaryAsync(x => x.CategoryId, x => x.Count, ct);

            var lookup = all.ToDictionary(c => c.Id, c => MapToDto(c, counts));
            var roots = new List<ProductCategoryDto>();
            foreach (var c in all)
            {
                if (c.ParentCategoryId.HasValue && lookup.TryGetValue(c.ParentCategoryId.Value, out var parent))
                    parent.SubCategories.Add(lookup[c.Id]);
                else
                    roots.Add(lookup[c.Id]);
            }
            return roots;
        }

        public async Task<IReadOnlyList<ProductCategoryDto>> GetFlatAsync(CancellationToken ct = default)
        {
            var all = await _db.RetailProductCategories.AsNoTracking()
                .Include(c => c.ParentCategory)
                .Where(c => !c.IsDeleted)
                .OrderBy(c => c.SortOrder).ThenBy(c => c.Name)
                .ToListAsync(ct);

            var counts = await _db.RetailProducts.AsNoTracking()
                .Where(p => !p.IsDeleted)
                .GroupBy(p => p.CategoryId)
                .Select(g => new { CategoryId = g.Key, Count = g.Count() })
                .ToDictionaryAsync(x => x.CategoryId, x => x.Count, ct);

            return all.Select(c => MapToDto(c, counts)).ToList();
        }

        public async Task<ProductCategoryDto?> GetByIdAsync(int id, CancellationToken ct = default)
        {
            var c = await _db.RetailProductCategories.AsNoTracking()
                .Include(x => x.ParentCategory)
                .FirstOrDefaultAsync(x => x.Id == id && !x.IsDeleted, ct);
            return c == null ? null : MapToDto(c, new Dictionary<int, int>());
        }

        public async Task<ProductCategoryDto> CreateAsync(CreateProductCategoryDto dto, CancellationToken ct = default)
        {
            if (string.IsNullOrWhiteSpace(dto.Name))
                throw new BadRequestException("Category name is required.");

            if (dto.ParentCategoryId.HasValue)
            {
                var parentExists = await _db.RetailProductCategories
                    .AnyAsync(c => c.Id == dto.ParentCategoryId.Value && !c.IsDeleted, ct);
                if (!parentExists)
                    throw new BadRequestException("Parent category not found.");
            }

            var category = new ProductCategory
            {
                Name = dto.Name.Trim(),
                Description = dto.Description?.Trim(),
                ParentCategoryId = dto.ParentCategoryId,
                SortOrder = dto.SortOrder,
                IsActive = dto.IsActive,
            };
            await _db.RetailProductCategories.AddAsync(category, ct);
            await _db.SaveChangesAsync(ct);
            return MapToDto(category, new Dictionary<int, int>());
        }

        public async Task<ProductCategoryDto?> UpdateAsync(int id, UpdateProductCategoryDto dto, CancellationToken ct = default)
        {
            var c = await _db.RetailProductCategories.FirstOrDefaultAsync(x => x.Id == id && !x.IsDeleted, ct);
            if (c == null) return null;

            if (dto.Name != null) c.Name = dto.Name.Trim();
            if (dto.Description != null) c.Description = dto.Description.Trim();
            if (dto.ParentCategoryId.HasValue && dto.ParentCategoryId.Value == id)
                throw new BadRequestException("A category cannot be its own parent.");
            if (dto.ParentCategoryId.HasValue) c.ParentCategoryId = dto.ParentCategoryId;
            if (dto.SortOrder.HasValue) c.SortOrder = dto.SortOrder.Value;
            if (dto.IsActive.HasValue) c.IsActive = dto.IsActive.Value;

            c.UpdatedDate = DateTime.UtcNow;
            await _db.SaveChangesAsync(ct);
            return MapToDto(c, new Dictionary<int, int>());
        }

        public async Task<bool> DeleteAsync(int id, CancellationToken ct = default)
        {
            var c = await _db.RetailProductCategories.FirstOrDefaultAsync(x => x.Id == id && !x.IsDeleted, ct);
            if (c == null) return false;

            var hasChildren = await _db.RetailProductCategories.AnyAsync(x => x.ParentCategoryId == id && !x.IsDeleted, ct);
            if (hasChildren)
                throw new BadRequestException("Cannot delete a category with subcategories.");

            var hasProducts = await _db.RetailProducts.AnyAsync(p => p.CategoryId == id && !p.IsDeleted, ct);
            if (hasProducts)
                throw new BadRequestException("Cannot delete a category that has products.");

            c.IsDeleted = true;
            c.UpdatedDate = DateTime.UtcNow;
            await _db.SaveChangesAsync(ct);
            return true;
        }

        private static ProductCategoryDto MapToDto(ProductCategory c, IReadOnlyDictionary<int, int> productCounts) => new()
        {
            Id = c.Id,
            Name = c.Name,
            Description = c.Description,
            ParentCategoryId = c.ParentCategoryId,
            ParentCategoryName = c.ParentCategory?.Name,
            SortOrder = c.SortOrder,
            IsActive = c.IsActive,
            ProductCount = productCounts.TryGetValue(c.Id, out var n) ? n : 0,
        };
    }
}
