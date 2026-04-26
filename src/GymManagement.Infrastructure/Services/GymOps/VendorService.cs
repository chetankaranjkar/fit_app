using GymManagement.Core.DTOs.GymOps;
using GymManagement.Core.Services.GymOps;
using GymManagement.Domain.Entities.GymOps;
using GymManagement.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace GymManagement.Infrastructure.Services.GymOps
{
    public class VendorService : IVendorService
    {
        private readonly ApplicationDbContext _db;

        public VendorService(ApplicationDbContext db)
        {
            _db = db;
        }

        public async Task<IEnumerable<VendorDto>> GetAllAsync()
        {
            var list = await _db.Set<Vendor>()
                .AsNoTracking()
                .OrderByDescending(v => v.CreatedDate)
                .ToListAsync();
            return list.Select(Map);
        }

        public async Task<VendorDto?> GetByIdAsync(int id)
        {
            var entity = await _db.Set<Vendor>().AsNoTracking().FirstOrDefaultAsync(v => v.Id == id);
            return entity == null ? null : Map(entity);
        }

        public async Task<VendorDto> CreateAsync(CreateVendorDto dto)
        {
            var entity = new Vendor
            {
                Name = dto.Name,
                Category = dto.Category,
                ContactPerson = dto.ContactPerson,
                Phone = dto.Phone,
                Email = dto.Email,
                Address = dto.Address,
                Rating = dto.Rating,
                ContractStatus = string.IsNullOrWhiteSpace(dto.ContractStatus) ? "ACTIVE" : dto.ContractStatus,
                ContractStartDate = dto.ContractStartDate,
                ContractEndDate = dto.ContractEndDate,
                Notes = dto.Notes
            };
            _db.Set<Vendor>().Add(entity);
            await _db.SaveChangesAsync();
            return Map(entity);
        }

        public async Task<VendorDto?> UpdateAsync(int id, UpdateVendorDto dto)
        {
            var entity = await _db.Set<Vendor>().FirstOrDefaultAsync(v => v.Id == id);
            if (entity == null) return null;

            if (dto.Name != null) entity.Name = dto.Name;
            if (dto.Category != null) entity.Category = dto.Category;
            if (dto.ContactPerson != null) entity.ContactPerson = dto.ContactPerson;
            if (dto.Phone != null) entity.Phone = dto.Phone;
            if (dto.Email != null) entity.Email = dto.Email;
            if (dto.Address != null) entity.Address = dto.Address;
            if (dto.Rating.HasValue) entity.Rating = dto.Rating;
            if (dto.ContractStatus != null) entity.ContractStatus = dto.ContractStatus;
            if (dto.ContractStartDate.HasValue) entity.ContractStartDate = dto.ContractStartDate;
            if (dto.ContractEndDate.HasValue) entity.ContractEndDate = dto.ContractEndDate;
            if (dto.Notes != null) entity.Notes = dto.Notes;

            await _db.SaveChangesAsync();
            return Map(entity);
        }

        public async Task<bool> DeleteAsync(int id)
        {
            var entity = await _db.Set<Vendor>().FirstOrDefaultAsync(v => v.Id == id);
            if (entity == null) return false;
            entity.IsDeleted = true;
            await _db.SaveChangesAsync();
            return true;
        }

        private static VendorDto Map(Vendor v) => new()
        {
            Id = v.Id,
            Name = v.Name,
            Category = v.Category,
            ContactPerson = v.ContactPerson,
            Phone = v.Phone,
            Email = v.Email,
            Address = v.Address,
            Rating = v.Rating,
            ContractStatus = v.ContractStatus,
            ContractStartDate = v.ContractStartDate,
            ContractEndDate = v.ContractEndDate,
            Notes = v.Notes
        };
    }
}
