using GymManagement.Core.DTOs;
using GymManagement.Core.Interfaces;
using GymManagement.Core.Services;
using GymManagement.Domain.Entities;

namespace GymManagement.Infrastructure.Services
{
    public class BodyPartMuscleService : IBodyPartMuscleService
    {
        private readonly IUnitOfWork _unitOfWork;

        public BodyPartMuscleService(IUnitOfWork unitOfWork)
        {
            _unitOfWork = unitOfWork;
        }

        public async Task<IEnumerable<BodyPartMuscleDto>> GetByBodyPartIdAsync(int bodyPartId)
        {
            var muscles = await _unitOfWork.BodyPartMuscles.FindAsync(m => m.BodyPartId == bodyPartId);
            return muscles.Select(MapToDto).ToList();
        }

        public async Task<BodyPartMuscleDto?> GetByIdAsync(int id)
        {
            var muscle = await _unitOfWork.BodyPartMuscles.GetByIdAsync(id);
            return muscle == null ? null : MapToDto(muscle);
        }

        public async Task<BodyPartMuscleDto> CreateAsync(CreateBodyPartMuscleDto dto)
        {
            var muscle = new BodyPartMuscle
            {
                BodyPartId = dto.BodyPartId,
                Name = dto.Name,
                Description = dto.Description,
                ImageUrl = dto.ImageUrl
            };
            await _unitOfWork.BodyPartMuscles.AddAsync(muscle);
            await _unitOfWork.SaveChangesAsync();
            return MapToDto(muscle);
        }

        public async Task<BodyPartMuscleDto?> UpdateAsync(int id, UpdateBodyPartMuscleDto dto)
        {
            var muscle = await _unitOfWork.BodyPartMuscles.GetByIdAsync(id);
            if (muscle == null) return null;

            muscle.Name = dto.Name;
            muscle.Description = dto.Description;
            muscle.ImageUrl = dto.ImageUrl;

            _unitOfWork.BodyPartMuscles.Update(muscle);
            await _unitOfWork.SaveChangesAsync();
            return MapToDto(muscle);
        }

        public async Task<bool> DeleteAsync(int id)
        {
            var muscle = await _unitOfWork.BodyPartMuscles.GetByIdAsync(id);
            if (muscle == null) return false;

            _unitOfWork.BodyPartMuscles.Delete(muscle);
            await _unitOfWork.SaveChangesAsync();
            return true;
        }

        private static BodyPartMuscleDto MapToDto(BodyPartMuscle m)
        {
            return new BodyPartMuscleDto
            {
                Id = m.Id,
                BodyPartId = m.BodyPartId,
                Name = m.Name,
                Description = m.Description,
                ImageUrl = m.ImageUrl
            };
        }
    }
}
