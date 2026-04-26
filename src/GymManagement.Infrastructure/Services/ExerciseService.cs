using Microsoft.EntityFrameworkCore;
using GymManagement.Core.DTOs;
using GymManagement.Core.Interfaces;
using GymManagement.Core.Services;
using GymManagement.Domain.Entities;

namespace GymManagement.Infrastructure.Services
{
    public class ExerciseService : IExerciseService
    {
        private readonly IUnitOfWork _unitOfWork;

        public ExerciseService(IUnitOfWork unitOfWork)
        {
            _unitOfWork = unitOfWork;
        }

        public async Task<IEnumerable<ExerciseDto>> GetAllExercisesAsync()
        {
            var exercises = await _unitOfWork.Exercises.GetAllAsync();
            var exercisesList = exercises.ToList();
            var bodyParts = await _unitOfWork.BodyParts.GetAllAsync();
            var bodyPartsDict = bodyParts.ToDictionary(bp => bp.Id);

            var result = new List<ExerciseDto>();
            foreach (var exercise in exercisesList)
            {
                var exerciseSteps = await _unitOfWork.ExerciseSteps.FindAsync(es => es.ExerciseId == exercise.Id);
                result.Add(MapToDto(exercise, bodyPartsDict.GetValueOrDefault(exercise.BodyPartId), exerciseSteps));
            }

            return result;
        }

        public async Task<ExerciseDto?> GetExerciseByIdAsync(int id)
        {
            var exercise = await _unitOfWork.Exercises.GetByIdAsync(id);
            if (exercise == null) return null;

            var bodyPart = await _unitOfWork.BodyParts.GetByIdAsync(exercise.BodyPartId);
            var exerciseSteps = await _unitOfWork.ExerciseSteps.FindAsync(es => es.ExerciseId == exercise.Id);
            return MapToDto(exercise, bodyPart, exerciseSteps);
        }

        public async Task<IEnumerable<ExerciseDto>> GetExercisesByBodyPartAsync(int bodyPartId)
        {
            var exercises = await _unitOfWork.Exercises.FindAsync(e => e.BodyPartId == bodyPartId);
            var exercisesList = exercises.ToList();
            var bodyPart = await _unitOfWork.BodyParts.GetByIdAsync(bodyPartId);

            var result = new List<ExerciseDto>();
            foreach (var exercise in exercisesList)
            {
                var exerciseSteps = await _unitOfWork.ExerciseSteps.FindAsync(es => es.ExerciseId == exercise.Id);
                result.Add(MapToDto(exercise, bodyPart, exerciseSteps));
            }

            return result;
        }

        public async Task<ExerciseDto> CreateExerciseAsync(CreateExerciseDto createExerciseDto)
        {
            var exercise = new Exercise
            {
                Name = createExerciseDto.Name,
                Description = createExerciseDto.Description,
                Steps = createExerciseDto.Steps,
                VideoUrl = createExerciseDto.VideoUrl,
                DifficultyLevel = createExerciseDto.DifficultyLevel,
                EquipmentRequired = createExerciseDto.EquipmentRequired,
                BodyPartId = createExerciseDto.BodyPartId
            };

            await _unitOfWork.Exercises.AddAsync(exercise);
            await _unitOfWork.SaveChangesAsync();

            // Create exercise steps
            if (createExerciseDto.ExerciseSteps != null && createExerciseDto.ExerciseSteps.Any())
            {
                foreach (var stepDto in createExerciseDto.ExerciseSteps.OrderBy(s => s.StepNumber))
                {
                    var exerciseStep = new ExerciseStep
                    {
                        ExerciseId = exercise.Id,
                        StepNumber = stepDto.StepNumber,
                        Description = stepDto.Description,
                        ImageUrl = stepDto.ImageUrl
                    };
                    await _unitOfWork.ExerciseSteps.AddAsync(exerciseStep);
                }
                await _unitOfWork.SaveChangesAsync();
            }

            var bodyPart = await _unitOfWork.BodyParts.GetByIdAsync(exercise.BodyPartId);
            var exerciseSteps = await _unitOfWork.ExerciseSteps.FindAsync(es => es.ExerciseId == exercise.Id);
            return MapToDto(exercise, bodyPart, exerciseSteps);
        }

        public async Task<ExerciseDto?> UpdateExerciseAsync(int id, UpdateExerciseDto updateExerciseDto)
        {
            var exercise = await _unitOfWork.Exercises.GetByIdAsync(id);
            if (exercise == null) return null;

            if (!string.IsNullOrEmpty(updateExerciseDto.Name))
                exercise.Name = updateExerciseDto.Name;
            if (updateExerciseDto.Description != null)
                exercise.Description = updateExerciseDto.Description;
            if (!string.IsNullOrEmpty(updateExerciseDto.Steps))
                exercise.Steps = updateExerciseDto.Steps;
            if (updateExerciseDto.VideoUrl != null)
                exercise.VideoUrl = updateExerciseDto.VideoUrl;
            if (!string.IsNullOrEmpty(updateExerciseDto.DifficultyLevel))
                exercise.DifficultyLevel = updateExerciseDto.DifficultyLevel;
            if (updateExerciseDto.EquipmentRequired != null)
                exercise.EquipmentRequired = updateExerciseDto.EquipmentRequired;
            if (updateExerciseDto.BodyPartId.HasValue)
                exercise.BodyPartId = updateExerciseDto.BodyPartId.Value;

            _unitOfWork.Exercises.Update(exercise);
            await _unitOfWork.SaveChangesAsync();

            // Update exercise steps if provided
            if (updateExerciseDto.ExerciseSteps != null)
            {
                // Delete existing steps
                var existingSteps = await _unitOfWork.ExerciseSteps.FindAsync(es => es.ExerciseId == exercise.Id);
                foreach (var step in existingSteps)
                {
                    _unitOfWork.ExerciseSteps.Delete(step);
                }
                await _unitOfWork.SaveChangesAsync();

                // Add new steps
                foreach (var stepDto in updateExerciseDto.ExerciseSteps.OrderBy(s => s.StepNumber))
                {
                    var exerciseStep = new ExerciseStep
                    {
                        ExerciseId = exercise.Id,
                        StepNumber = stepDto.StepNumber,
                        Description = stepDto.Description,
                        ImageUrl = stepDto.ImageUrl
                    };
                    await _unitOfWork.ExerciseSteps.AddAsync(exerciseStep);
                }
                await _unitOfWork.SaveChangesAsync();
            }

            var bodyPart = await _unitOfWork.BodyParts.GetByIdAsync(exercise.BodyPartId);
            var exerciseSteps = await _unitOfWork.ExerciseSteps.FindAsync(es => es.ExerciseId == exercise.Id);
            return MapToDto(exercise, bodyPart, exerciseSteps);
        }

        public async Task<bool> DeleteExerciseAsync(int id)
        {
            var exercise = await _unitOfWork.Exercises.GetByIdAsync(id);
            if (exercise == null) return false;

            _unitOfWork.Exercises.Delete(exercise);
            await _unitOfWork.SaveChangesAsync();
            return true;
        }

        private static ExerciseDto MapToDto(Exercise exercise, BodyPart? bodyPart = null, IEnumerable<ExerciseStep>? exerciseSteps = null)
        {
            var stepsList = exerciseSteps?
                .OrderBy(es => es.StepNumber)
                .Select(es => new ExerciseStepDto
                {
                    Id = es.Id,
                    StepNumber = es.StepNumber,
                    Description = es.Description,
                    ImageUrl = es.ImageUrl
                })
                .ToList() ?? new List<ExerciseStepDto>();

            return new ExerciseDto
            {
                Id = exercise.Id,
                Name = exercise.Name,
                Description = exercise.Description,
                Steps = exercise.Steps,
                VideoUrl = exercise.VideoUrl,
                DifficultyLevel = exercise.DifficultyLevel,
                EquipmentRequired = exercise.EquipmentRequired,
                BodyPartId = exercise.BodyPartId,
                BodyPartName = bodyPart?.Name ?? string.Empty,
                ExerciseSteps = stepsList
            };
        }
    }
}

