using GymManagement.Core.DTOs.GymOps;
using GymManagement.Core.Services.GymOps;
using GymManagement.Domain.Entities.GymOps;
using GymManagement.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace GymManagement.Infrastructure.Services.GymOps
{
    public class ExpenseService : IExpenseService
    {
        private readonly ApplicationDbContext _db;

        public ExpenseService(ApplicationDbContext db)
        {
            _db = db;
        }

        public async Task<IEnumerable<ExpenseDto>> GetAllAsync()
        {
            var list = await _db.Set<Expense>()
                .AsNoTracking()
                .OrderByDescending(e => e.ExpenseDate)
                .ToListAsync();
            return list.Select(Map);
        }

        public async Task<ExpenseDto?> GetByIdAsync(int id)
        {
            var entity = await _db.Set<Expense>().AsNoTracking().FirstOrDefaultAsync(e => e.Id == id);
            return entity == null ? null : Map(entity);
        }

        public async Task<ExpenseDto> CreateAsync(CreateExpenseDto dto)
        {
            var entity = new Expense
            {
                Category = dto.Category,
                Description = dto.Description,
                Amount = dto.Amount,
                ExpenseDate = dto.ExpenseDate,
                PaymentStatus = string.IsNullOrWhiteSpace(dto.PaymentStatus) ? "PAID" : dto.PaymentStatus,
                Vendor = dto.Vendor,
                ReceiptUrl = dto.ReceiptUrl,
                Notes = dto.Notes
            };
            _db.Set<Expense>().Add(entity);
            await _db.SaveChangesAsync();
            return Map(entity);
        }

        public async Task<ExpenseDto?> UpdateAsync(int id, UpdateExpenseDto dto)
        {
            var entity = await _db.Set<Expense>().FirstOrDefaultAsync(e => e.Id == id);
            if (entity == null) return null;

            if (dto.Category != null) entity.Category = dto.Category;
            if (dto.Description != null) entity.Description = dto.Description;
            if (dto.Amount.HasValue) entity.Amount = dto.Amount.Value;
            if (dto.ExpenseDate.HasValue) entity.ExpenseDate = dto.ExpenseDate.Value;
            if (dto.PaymentStatus != null) entity.PaymentStatus = dto.PaymentStatus;
            if (dto.Vendor != null) entity.Vendor = dto.Vendor;
            if (dto.ReceiptUrl != null) entity.ReceiptUrl = dto.ReceiptUrl;
            if (dto.Notes != null) entity.Notes = dto.Notes;

            await _db.SaveChangesAsync();
            return Map(entity);
        }

        public async Task<bool> DeleteAsync(int id)
        {
            var entity = await _db.Set<Expense>().FirstOrDefaultAsync(e => e.Id == id);
            if (entity == null) return false;
            entity.IsDeleted = true;
            await _db.SaveChangesAsync();
            return true;
        }

        private static ExpenseDto Map(Expense e) => new()
        {
            Id = e.Id,
            Category = e.Category,
            Description = e.Description,
            Amount = e.Amount,
            ExpenseDate = e.ExpenseDate,
            PaymentStatus = e.PaymentStatus,
            Vendor = e.Vendor,
            ReceiptUrl = e.ReceiptUrl,
            Notes = e.Notes
        };
    }
}
