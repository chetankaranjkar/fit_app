using GymManagement.Core.DTOs.Retail;

namespace GymManagement.Core.Services.Retail
{
    public interface IProductService
    {
        Task<IReadOnlyList<ProductDto>> SearchAsync(ProductSearchFilterDto filter, CancellationToken ct = default);
        Task<ProductDto?> GetByIdAsync(int id, CancellationToken ct = default);
        Task<ProductDto?> GetBySkuAsync(string sku, CancellationToken ct = default);
        Task<ProductDto?> GetByBarcodeAsync(string barcode, CancellationToken ct = default);
        Task<ProductDto> CreateAsync(CreateProductDto dto, int? performedByUserId, CancellationToken ct = default);
        Task<ProductDto?> UpdateAsync(int id, UpdateProductDto dto, CancellationToken ct = default);
        Task<bool> DeleteAsync(int id, CancellationToken ct = default);
    }
}
