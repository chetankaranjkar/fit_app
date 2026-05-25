using GymManagement.Core.DTOs.Retail;

namespace GymManagement.Core.Services.Retail
{
    public interface IProductCategoryService
    {
        Task<IReadOnlyList<ProductCategoryDto>> GetTreeAsync(CancellationToken ct = default);
        Task<IReadOnlyList<ProductCategoryDto>> GetFlatAsync(CancellationToken ct = default);
        Task<ProductCategoryDto?> GetByIdAsync(int id, CancellationToken ct = default);
        Task<ProductCategoryDto> CreateAsync(CreateProductCategoryDto dto, CancellationToken ct = default);
        Task<ProductCategoryDto?> UpdateAsync(int id, UpdateProductCategoryDto dto, CancellationToken ct = default);
        Task<bool> DeleteAsync(int id, CancellationToken ct = default);
    }
}
