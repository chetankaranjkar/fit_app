using GymManagement.Core.DTOs;
using GymManagement.Core.Interfaces;
using GymManagement.Core.Services;
using GymManagement.Domain.Entities;

namespace GymManagement.Infrastructure.Services
{
    public class UserTypeService : IUserTypeService
    {
        private readonly IUnitOfWork _unitOfWork;

        public UserTypeService(IUnitOfWork unitOfWork)
        {
            _unitOfWork = unitOfWork;
        }

        public async Task<IEnumerable<UserTypeDto>> GetAllAsync()
        {
            var list = await _unitOfWork.UserTypes.GetAllAsync();
            return list.Select(MapToDto).ToList();
        }

        public async Task<UserTypeDto?> GetByIdAsync(int id)
        {
            var entity = await _unitOfWork.UserTypes.GetByIdAsync(id);
            return entity == null ? null : MapToDto(entity);
        }

        public async Task<UserTypeDto> CreateAsync(CreateUserTypeDto dto)
        {
            var entity = new UserType
            {
                Name = dto.Name,
                Description = dto.Description
            };
            await _unitOfWork.UserTypes.AddAsync(entity);
            await _unitOfWork.SaveChangesAsync();
            return MapToDto(entity);
        }

        public async Task<UserTypeDto?> UpdateAsync(int id, UpdateUserTypeDto dto)
        {
            var entity = await _unitOfWork.UserTypes.GetByIdAsync(id);
            if (entity == null) return null;

            if (dto.Name != null) entity.Name = dto.Name;
            if (dto.Description != null) entity.Description = dto.Description;

            _unitOfWork.UserTypes.Update(entity);
            await _unitOfWork.SaveChangesAsync();
            return MapToDto(entity);
        }

        public async Task<bool> DeleteAsync(int id)
        {
            var entity = await _unitOfWork.UserTypes.GetByIdAsync(id);
            if (entity == null) return false;

            _unitOfWork.UserTypes.Delete(entity);
            await _unitOfWork.SaveChangesAsync();
            return true;
        }

        private static UserTypeDto MapToDto(UserType u)
        {
            return new UserTypeDto
            {
                Id = u.Id,
                Name = u.Name,
                Description = u.Description
            };
        }
    }
}
