using GymManagement.Core.DTOs;

namespace GymManagement.Core.Services;

public interface IWarmupService
{
    Task<IEnumerable<WarmupDto>> GetAllAsync();
    Task<PagedWarmupsDto> GetPagedAsync(int page, int pageSize, string? search = null, string? difficulty = null, string? bodyPart = null, bool? isActive = null);
    Task<WarmupDto?> GetByIdAsync(int id);
    Task<WarmupDto> CreateAsync(CreateWarmupDto dto, int performedByUserId, string performedByUserName);
    Task<WarmupDto?> UpdateAsync(int id, UpdateWarmupDto dto, int performedByUserId, string performedByUserName);
    Task<bool> DeleteAsync(int id, int performedByUserId, string performedByUserName);
}
