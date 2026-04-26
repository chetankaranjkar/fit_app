using GymManagement.Core.DTOs.GymOps;

namespace GymManagement.Core.Services.GymOps
{
    public interface IEquipmentService
    {
        Task<IEnumerable<EquipmentDto>> GetAllAsync();
        Task<EquipmentDto?> GetByIdAsync(int id);
        Task<EquipmentDto> CreateAsync(CreateEquipmentDto dto);
        Task<EquipmentDto?> UpdateAsync(int id, UpdateEquipmentDto dto);
        Task<bool> DeleteAsync(int id);
    }
}
