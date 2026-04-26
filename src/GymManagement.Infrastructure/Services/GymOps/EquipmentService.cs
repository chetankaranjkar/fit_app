using GymManagement.Core.DTOs.GymOps;
using GymManagement.Core.Services.GymOps;
using GymManagement.Domain.Entities.GymOps;
using GymManagement.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace GymManagement.Infrastructure.Services.GymOps
{
    public class EquipmentService : IEquipmentService
    {
        private readonly ApplicationDbContext _db;

        public EquipmentService(ApplicationDbContext db)
        {
            _db = db;
        }

        public async Task<IEnumerable<EquipmentDto>> GetAllAsync()
        {
            var list = await _db.Set<Equipment>()
                .AsNoTracking()
                .OrderByDescending(e => e.CreatedDate)
                .ToListAsync();
            return list.Select(Map);
        }

        public async Task<EquipmentDto?> GetByIdAsync(int id)
        {
            var entity = await _db.Set<Equipment>().AsNoTracking().FirstOrDefaultAsync(e => e.Id == id);
            return entity == null ? null : Map(entity);
        }

        public async Task<EquipmentDto> CreateAsync(CreateEquipmentDto dto)
        {
            var entity = new Equipment
            {
                Name = dto.Name,
                Category = dto.Category,
                Brand = dto.Brand,
                SerialNumber = dto.SerialNumber,
                Location = dto.Location,
                PurchaseDate = dto.PurchaseDate,
                PurchaseCost = dto.PurchaseCost,
                Status = string.IsNullOrWhiteSpace(dto.Status) ? "OPERATIONAL" : dto.Status,
                NextServiceDate = dto.NextServiceDate,
                Notes = dto.Notes
            };
            _db.Set<Equipment>().Add(entity);
            await _db.SaveChangesAsync();
            return Map(entity);
        }

        public async Task<EquipmentDto?> UpdateAsync(int id, UpdateEquipmentDto dto)
        {
            var entity = await _db.Set<Equipment>().FirstOrDefaultAsync(e => e.Id == id);
            if (entity == null) return null;

            if (dto.Name != null) entity.Name = dto.Name;
            if (dto.Category != null) entity.Category = dto.Category;
            if (dto.Brand != null) entity.Brand = dto.Brand;
            if (dto.SerialNumber != null) entity.SerialNumber = dto.SerialNumber;
            if (dto.Location != null) entity.Location = dto.Location;
            if (dto.PurchaseDate.HasValue) entity.PurchaseDate = dto.PurchaseDate.Value;
            if (dto.PurchaseCost.HasValue) entity.PurchaseCost = dto.PurchaseCost.Value;
            if (dto.Status != null) entity.Status = dto.Status;
            if (dto.NextServiceDate.HasValue) entity.NextServiceDate = dto.NextServiceDate;
            if (dto.Notes != null) entity.Notes = dto.Notes;

            await _db.SaveChangesAsync();
            return Map(entity);
        }

        public async Task<bool> DeleteAsync(int id)
        {
            var entity = await _db.Set<Equipment>().FirstOrDefaultAsync(e => e.Id == id);
            if (entity == null) return false;
            entity.IsDeleted = true;
            await _db.SaveChangesAsync();
            return true;
        }

        private static EquipmentDto Map(Equipment e) => new()
        {
            Id = e.Id,
            Name = e.Name,
            Category = e.Category,
            Brand = e.Brand,
            SerialNumber = e.SerialNumber,
            Location = e.Location,
            PurchaseDate = e.PurchaseDate,
            PurchaseCost = e.PurchaseCost,
            Status = e.Status,
            NextServiceDate = e.NextServiceDate,
            Notes = e.Notes
        };
    }
}
