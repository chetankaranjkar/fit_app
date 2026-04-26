using GymManagement.Core.DTOs.GymOps;

namespace GymManagement.Core.Services.GymOps
{
    public interface IVendorService
    {
        Task<IEnumerable<VendorDto>> GetAllAsync();
        Task<VendorDto?> GetByIdAsync(int id);
        Task<VendorDto> CreateAsync(CreateVendorDto dto);
        Task<VendorDto?> UpdateAsync(int id, UpdateVendorDto dto);
        Task<bool> DeleteAsync(int id);
    }
}
