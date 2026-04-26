using GymManagement.Core.DTOs;
using GymManagement.Core.Interfaces;
using GymManagement.Core.Services;
using GymManagement.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace GymManagement.Infrastructure.Services
{
    public class BodyPartService : IBodyPartService
    {
        private readonly IUnitOfWork _unitOfWork;

        public BodyPartService(IUnitOfWork unitOfWork)
        {
            _unitOfWork = unitOfWork;
        }

        public async Task<IEnumerable<BodyPartDto>> GetAllBodyPartsAsync()
        {
            var bodyParts = (await _unitOfWork.BodyParts.GetAllAsync()).ToList();
            var exerciseCounts = (await _unitOfWork.Exercises.GetAllAsync())
                .GroupBy(e => e.BodyPartId)
                .ToDictionary(g => g.Key, g => g.Count());
            var allMuscles = (await _unitOfWork.BodyPartMuscles.GetAllAsync()).ToList();
            var musclesByBodyPart = allMuscles.GroupBy(m => m.BodyPartId).ToDictionary(g => g.Key, g => g.ToList());

            return bodyParts.Select(bp => MapToDto(bp, exerciseCounts.GetValueOrDefault(bp.Id, 0), musclesByBodyPart.GetValueOrDefault(bp.Id, []))).ToList();
        }

        public async Task<BodyPartDto?> GetBodyPartByIdAsync(int id)
        {
            var bodyPart = await _unitOfWork.BodyParts.GetByIdAsync(id);
            if (bodyPart == null) return null;

            var exerciseCount = await _unitOfWork.Exercises.CountAsync(e => e.BodyPartId == id);
            var muscles = (await _unitOfWork.BodyPartMuscles.FindAsync(m => m.BodyPartId == id)).ToList();
            return MapToDto(bodyPart, exerciseCount, muscles);
        }

        public async Task<BodyPartDto> CreateBodyPartAsync(CreateBodyPartDto createBodyPartDto)
        {
            var bodyPart = new BodyPart
            {
                Name = createBodyPartDto.Name,
                Description = createBodyPartDto.Description,
                ImageUrl = createBodyPartDto.ImageUrl,
                CameraPositionJson = createBodyPartDto.CameraPositionJson
            };

            await _unitOfWork.BodyParts.AddAsync(bodyPart);
            await _unitOfWork.SaveChangesAsync();

            return MapToDto(bodyPart, 0, []);
        }

        public async Task<BodyPartDto?> UpdateBodyPartAsync(int id, UpdateBodyPartDto updateDto)
        {
            var bodyPart = await _unitOfWork.BodyParts.GetByIdAsync(id);
            if (bodyPart == null) return null;

            bodyPart.Name = updateDto.Name;
            bodyPart.Description = updateDto.Description;
            bodyPart.ImageUrl = updateDto.ImageUrl;

            _unitOfWork.BodyParts.Update(bodyPart);
            await _unitOfWork.SaveChangesAsync();

            var exerciseCount = await _unitOfWork.Exercises.CountAsync(e => e.BodyPartId == id);
            var muscles = (await _unitOfWork.BodyPartMuscles.FindAsync(m => m.BodyPartId == id)).ToList();
            return MapToDto(bodyPart, exerciseCount, muscles);
        }

        public async Task<bool> DeleteBodyPartAsync(int id)
        {
            var bodyPart = await _unitOfWork.BodyParts.GetByIdAsync(id);
            if (bodyPart == null) return false;

            _unitOfWork.BodyParts.Delete(bodyPart);
            await _unitOfWork.SaveChangesAsync();
            return true;
        }

        public async Task<BodyPartDto?> UpdateCameraPositionAsync(int id, UpdateBodyPartCameraPositionDto updateDto)
        {
            var bodyPart = await _unitOfWork.BodyParts.GetByIdAsync(id);
            if (bodyPart == null) return null;

            bodyPart.CameraPositionJson = updateDto.CameraPositionJson;

            _unitOfWork.BodyParts.Update(bodyPart);
            await _unitOfWork.SaveChangesAsync();

            var exerciseCount = await _unitOfWork.Exercises.CountAsync(e => e.BodyPartId == id);
            var muscles = (await _unitOfWork.BodyPartMuscles.FindAsync(m => m.BodyPartId == id)).ToList();
            return MapToDto(bodyPart, exerciseCount, muscles);
        }

        private static BodyPartDto MapToDto(BodyPart bodyPart, int exerciseCount, List<BodyPartMuscle> bodyPartMuscles)
        {
            var muscleDtos = bodyPartMuscles.Select(m => new BodyPartMuscleDto
            {
                Id = m.Id,
                BodyPartId = m.BodyPartId,
                Name = m.Name,
                Description = m.Description,
                ImageUrl = m.ImageUrl
            }).ToList();

            return new BodyPartDto
            {
                Id = bodyPart.Id,
                Name = bodyPart.Name,
                Description = bodyPart.Description,
                ImageUrl = bodyPart.ImageUrl,
                ExerciseCount = exerciseCount,
                BodyPartMuscles = muscleDtos,
                CameraPositionJson = bodyPart.CameraPositionJson
            };
        }
    }
}
