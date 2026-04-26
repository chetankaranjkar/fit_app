using GymManagement.Core.DTOs.GymOps;

namespace GymManagement.Core.Services.GymOps
{
    public interface IExpenseService
    {
        Task<IEnumerable<ExpenseDto>> GetAllAsync();
        Task<ExpenseDto?> GetByIdAsync(int id);
        Task<ExpenseDto> CreateAsync(CreateExpenseDto dto);
        Task<ExpenseDto?> UpdateAsync(int id, UpdateExpenseDto dto);
        Task<bool> DeleteAsync(int id);
    }
}
