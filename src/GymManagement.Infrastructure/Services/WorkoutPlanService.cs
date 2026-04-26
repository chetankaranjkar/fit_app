using GymManagement.Core.DTOs;
using GymManagement.Core.Interfaces;
using GymManagement.Core.Services;
using GymManagement.Domain.Entities;

namespace GymManagement.Infrastructure.Services
{
    public class WorkoutPlanService : IWorkoutPlanService
    {
        private readonly IUnitOfWork _unitOfWork;

        public WorkoutPlanService(IUnitOfWork unitOfWork)
        {
            _unitOfWork = unitOfWork;
        }

        public async Task<IEnumerable<WorkoutPlanDto>> GetAllWorkoutPlansAsync()
        {
            var workoutPlans = await _unitOfWork.WorkoutPlans.GetAllAsync();
            var instructors = await _unitOfWork.Trainers.GetAllAsync();
            var users = await _unitOfWork.Users.GetAllAsync();
            var instructorDict = instructors.ToDictionary(i => i.Id);
            var userDict = users.ToDictionary(u => u.Id);

            var result = new List<WorkoutPlanDto>();

            foreach (var plan in workoutPlans)
            {
                var exercises = await _unitOfWork.WorkoutPlanExercises
                    .FindAsync(wpe => wpe.WorkoutPlanId == plan.Id);
                
                var exerciseDtos = await MapExercisesAsync(exercises.OrderBy(e => e.Order).ToList());
                
                var instructor = plan.TrainerId.HasValue 
                    ? instructorDict.GetValueOrDefault(plan.TrainerId.Value)
                    : null;

                result.Add(await MapToDtoAsync(plan, instructor, exerciseDtos, instructorDict, userDict));
            }

            return result;
        }

        public async Task<WorkoutPlanDto?> GetWorkoutPlanByIdAsync(int id)
        {
            var workoutPlan = await _unitOfWork.WorkoutPlans.GetByIdAsync(id);
            if (workoutPlan == null) return null;

            var exercises = await _unitOfWork.WorkoutPlanExercises
                .FindAsync(wpe => wpe.WorkoutPlanId == id);
            
            var exerciseDtos = await MapExercisesAsync(exercises.OrderBy(e => e.Order).ToList());
            
            Trainer? instructor = null;
            if (workoutPlan.TrainerId.HasValue)
            {
                instructor = await _unitOfWork.Trainers.GetByIdAsync(workoutPlan.TrainerId.Value);
            }

            var instructors = await _unitOfWork.Trainers.GetAllAsync();
            var users = await _unitOfWork.Users.GetAllAsync();
            var instructorDict = instructors.ToDictionary(i => i.Id);
            var userDict = users.ToDictionary(u => u.Id);

            return await MapToDtoAsync(workoutPlan, instructor, exerciseDtos, instructorDict, userDict);
        }

        public async Task<IEnumerable<WorkoutPlanDto>> GetWorkoutPlansByTypeAsync(WorkoutType workoutType)
        {
            var workoutPlans = await _unitOfWork.WorkoutPlans
                .FindAsync(wp => wp.WorkoutType == workoutType);
            
            var result = new List<WorkoutPlanDto>();
            foreach (var plan in workoutPlans)
            {
                var exercises = await _unitOfWork.WorkoutPlanExercises
                    .FindAsync(wpe => wpe.WorkoutPlanId == plan.Id);
                
                var exerciseDtos = await MapExercisesAsync(exercises.OrderBy(e => e.Order).ToList());
                
                Trainer? instructor = null;
                if (plan.TrainerId.HasValue)
                {
                    instructor = await _unitOfWork.Trainers.GetByIdAsync(plan.TrainerId.Value);
                }

                var instructors = await _unitOfWork.Trainers.GetAllAsync();
                var users = await _unitOfWork.Users.GetAllAsync();
                var instructorDict = instructors.ToDictionary(i => i.Id);
                var userDict = users.ToDictionary(u => u.Id);

                result.Add(await MapToDtoAsync(plan, instructor, exerciseDtos, instructorDict, userDict));
            }

            return result;
        }

        public async Task<WorkoutPlanDto> CreateWorkoutPlanAsync(CreateWorkoutPlanDto createWorkoutPlanDto)
        {
            var workoutPlan = new WorkoutPlan
            {
                Name = createWorkoutPlanDto.Name,
                Description = createWorkoutPlanDto.Description,
                WorkoutType = createWorkoutPlanDto.WorkoutType,
                Duration = createWorkoutPlanDto.Duration,
                DifficultyLevel = createWorkoutPlanDto.DifficultyLevel,
                TrainerId = createWorkoutPlanDto.TrainerId,
                CreatedById = createWorkoutPlanDto.CreatedById,
                CreatorType = createWorkoutPlanDto.CreatorType,
                IsPublic = createWorkoutPlanDto.IsPublic,
                IsActive = true
            };

            await _unitOfWork.WorkoutPlans.AddAsync(workoutPlan);
            await _unitOfWork.SaveChangesAsync();

            foreach (var exerciseDto in createWorkoutPlanDto.Exercises)
            {
                var workoutPlanExercise = new WorkoutPlanExercise
                {
                    WorkoutPlanId = workoutPlan.Id,
                    ExerciseId = exerciseDto.ExerciseId,
                    Sets = exerciseDto.Sets,
                    Reps = exerciseDto.Reps,
                    RestBetweenSets = exerciseDto.RestBetweenSets,
                    Order = exerciseDto.Order,
                    Weight = exerciseDto.Weight
                };

                await _unitOfWork.WorkoutPlanExercises.AddAsync(workoutPlanExercise);
            }

            await _unitOfWork.SaveChangesAsync();

            var exercises = await _unitOfWork.WorkoutPlanExercises
                .FindAsync(wpe => wpe.WorkoutPlanId == workoutPlan.Id);
            
            var exerciseDtos = await MapExercisesAsync(exercises.OrderBy(e => e.Order).ToList());
            
            Trainer? instructor = null;
            if (workoutPlan.TrainerId.HasValue)
            {
                instructor = await _unitOfWork.Trainers.GetByIdAsync(workoutPlan.TrainerId.Value);
            }

            var instructors = await _unitOfWork.Trainers.GetAllAsync();
            var users = await _unitOfWork.Users.GetAllAsync();
            var instructorDict = instructors.ToDictionary(i => i.Id);
            var userDict = users.ToDictionary(u => u.Id);

            return await MapToDtoAsync(workoutPlan, instructor, exerciseDtos, instructorDict, userDict);
        }

        public async Task<WorkoutPlanDto?> UpdateWorkoutPlanAsync(int id, CreateWorkoutPlanDto updateWorkoutPlanDto)
        {
            var workoutPlan = await _unitOfWork.WorkoutPlans.GetByIdAsync(id);
            if (workoutPlan == null) return null;

            workoutPlan.Name = updateWorkoutPlanDto.Name;
            workoutPlan.Description = updateWorkoutPlanDto.Description;
            workoutPlan.WorkoutType = updateWorkoutPlanDto.WorkoutType;
            workoutPlan.Duration = updateWorkoutPlanDto.Duration;
            workoutPlan.DifficultyLevel = updateWorkoutPlanDto.DifficultyLevel;
            workoutPlan.TrainerId = updateWorkoutPlanDto.TrainerId;
            workoutPlan.CreatedById = updateWorkoutPlanDto.CreatedById;
            workoutPlan.CreatorType = updateWorkoutPlanDto.CreatorType;
            workoutPlan.IsPublic = updateWorkoutPlanDto.IsPublic;
            workoutPlan.UpdatedDate = DateTime.UtcNow;
            _unitOfWork.WorkoutPlans.Update(workoutPlan);

            var existingExercises = await _unitOfWork.WorkoutPlanExercises
                .FindAsync(wpe => wpe.WorkoutPlanId == id && !wpe.IsDeleted);
            foreach (var existing in existingExercises)
            {
                _unitOfWork.WorkoutPlanExercises.Delete(existing);
            }

            var newExercises = updateWorkoutPlanDto.Exercises.Select((exerciseDto, index) => new WorkoutPlanExercise
            {
                WorkoutPlanId = id,
                ExerciseId = exerciseDto.ExerciseId,
                Sets = exerciseDto.Sets,
                Reps = exerciseDto.Reps,
                RestBetweenSets = exerciseDto.RestBetweenSets,
                Order = index + 1,
                Weight = exerciseDto.Weight
            }).ToList();

            if (newExercises.Count > 0)
            {
                await _unitOfWork.WorkoutPlanExercises.AddRangeAsync(newExercises);
            }

            await _unitOfWork.SaveChangesAsync();

            var activeExercises = await _unitOfWork.WorkoutPlanExercises
                .FindAsync(wpe => wpe.WorkoutPlanId == id && !wpe.IsDeleted);
            var exerciseDtos = await MapExercisesAsync(activeExercises.OrderBy(e => e.Order).ToList());

            Trainer? instructor = null;
            if (workoutPlan.TrainerId.HasValue)
            {
                instructor = await _unitOfWork.Trainers.GetByIdAsync(workoutPlan.TrainerId.Value);
            }

            var instructors = await _unitOfWork.Trainers.GetAllAsync();
            var users = await _unitOfWork.Users.GetAllAsync();
            var instructorDict = instructors.ToDictionary(i => i.Id);
            var userDict = users.ToDictionary(u => u.Id);

            return await MapToDtoAsync(workoutPlan, instructor, exerciseDtos, instructorDict, userDict);
        }

        public async Task<bool> DeleteWorkoutPlanAsync(int id)
        {
            var workoutPlan = await _unitOfWork.WorkoutPlans.GetByIdAsync(id);
            if (workoutPlan == null) return false;

            _unitOfWork.WorkoutPlans.Delete(workoutPlan);
            await _unitOfWork.SaveChangesAsync();
            return true;
        }

        private async Task<List<WorkoutPlanExerciseDto>> MapExercisesAsync(IEnumerable<WorkoutPlanExercise> exercises)
        {
            var result = new List<WorkoutPlanExerciseDto>();
            var allExercises = await _unitOfWork.Exercises.GetAllAsync();
            var exerciseDict = allExercises.ToDictionary(e => e.Id);

            foreach (var wpe in exercises)
            {
                var exercise = exerciseDict.GetValueOrDefault(wpe.ExerciseId);
                result.Add(new WorkoutPlanExerciseDto
                {
                    Id = wpe.Id,
                    ExerciseId = wpe.ExerciseId,
                    ExerciseName = exercise?.Name ?? string.Empty,
                    Sets = wpe.Sets,
                    Reps = wpe.Reps,
                    RestBetweenSets = wpe.RestBetweenSets,
                    Order = wpe.Order,
                    Weight = wpe.Weight
                });
            }

            return result;
        }

        private async Task<WorkoutPlanDto> MapToDtoAsync(
            WorkoutPlan workoutPlan, 
            Trainer? instructor, 
            List<WorkoutPlanExerciseDto> exercises,
            Dictionary<int, Trainer> instructorDict,
            Dictionary<int, User> userDict)
        {
            string? creatorName = null;
            if (workoutPlan.CreatedById.HasValue && workoutPlan.CreatorType.HasValue)
            {
                if (workoutPlan.CreatorType == Domain.Entities.CreatorType.Instructor)
                {
                    var creatorTrainer = instructorDict.GetValueOrDefault(workoutPlan.CreatedById.Value);
                    var creatorUser = creatorTrainer != null ? userDict.GetValueOrDefault(creatorTrainer.UserId) : null;
                    creatorName = creatorUser != null 
                        ? $"{creatorUser.FirstName} {creatorUser.LastName}" 
                        : null;
                }
                else if (workoutPlan.CreatorType == Domain.Entities.CreatorType.User)
                {
                    var creatorUser = userDict.GetValueOrDefault(workoutPlan.CreatedById.Value);
                    creatorName = creatorUser != null 
                        ? $"{creatorUser.FirstName} {creatorUser.LastName}" 
                        : null;
                }
            }

            return new WorkoutPlanDto
            {
                Id = workoutPlan.Id,
                Name = workoutPlan.Name,
                Description = workoutPlan.Description,
                WorkoutType = workoutPlan.WorkoutType,
                Duration = workoutPlan.Duration,
                DifficultyLevel = workoutPlan.DifficultyLevel,
                TrainerId = workoutPlan.TrainerId,
                TrainerName = instructor != null && userDict.TryGetValue(instructor.UserId, out var instUser) ? $"{instUser.FirstName} {instUser.LastName}" : null,
                CreatedById = workoutPlan.CreatedById,
                CreatorType = workoutPlan.CreatorType,
                CreatorName = creatorName,
                IsPublic = workoutPlan.IsPublic,
                IsActive = workoutPlan.IsActive,
                Exercises = exercises
            };
        }
    }
}

