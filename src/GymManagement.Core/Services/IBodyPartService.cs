using GymManagement.Core.DTOs;

namespace GymManagement.Core.Services
{
    public interface IBodyPartService
    {
        Task<IEnumerable<BodyPartDto>> GetAllBodyPartsAsync();
        Task<BodyPartDto?> GetBodyPartByIdAsync(int id);
        Task<BodyPartDto> CreateBodyPartAsync(CreateBodyPartDto createBodyPartDto);
        Task<BodyPartDto?> UpdateBodyPartAsync(int id, UpdateBodyPartDto updateDto);
        Task<bool> DeleteBodyPartAsync(int id);
        Task<BodyPartDto?> UpdateCameraPositionAsync(int id, UpdateBodyPartCameraPositionDto updateDto);
    }
}

