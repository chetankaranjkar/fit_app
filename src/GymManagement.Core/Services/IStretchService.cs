using GymManagement.Core.DTOs;

namespace GymManagement.Core.Services;

public interface IStretchService
{
    Task<IEnumerable<StretchDto>> GetAllAsync();
    Task<PagedStretchesDto> GetPagedAsync(int page, int pageSize, string? search = null, string? difficulty = null, string? bodyPart = null, bool? isActive = null);
    Task<StretchDto?> GetByIdAsync(int id);
    Task<StretchDto> CreateAsync(CreateStretchDto dto, int performedByUserId, string performedByUserName);
    Task<StretchDto?> UpdateAsync(int id, UpdateStretchDto dto, int performedByUserId, string performedByUserName);
    Task<bool> DeleteAsync(int id, int performedByUserId, string performedByUserName);
}
