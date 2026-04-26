using GymManagement.Core.DTOs;

namespace GymManagement.Core.Services
{
    public interface IUserBodyImageService
    {
        Task<IEnumerable<UserBodyImageDto>> GetAllUserBodyImagesAsync();
        Task<IEnumerable<UserBodyImageDto>> GetUserBodyImagesByUserIdAsync(int userId);
        Task<UserBodyImageDto?> GetUserBodyImageByIdAsync(int id);
        Task<UserBodyImageDto> CreateUserBodyImageAsync(CreateUserBodyImageDto createDto, int? uploadedById, string? uploadedByType);
        Task<UserBodyImageDto?> UpdateUserBodyImageUrlAsync(int id, string imageUrl);
        Task<UserBodyImageDto?> UpdateUserBodyImageAsync(int id, UpdateUserBodyImageDto updateDto);
        Task<bool> DeleteUserBodyImageAsync(int id);
    }
}

