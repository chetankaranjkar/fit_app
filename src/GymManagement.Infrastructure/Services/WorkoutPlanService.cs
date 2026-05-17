using GymManagement.Core.DTOs;
using GymManagement.Core.Interfaces;
using GymManagement.Core.Services;
using GymManagement.Domain.Entities;
using System.Text.Json;

namespace GymManagement.Infrastructure.Services
{
    public class WorkoutPlanService : IWorkoutPlanService
    {
        private const string WorkoutPlanMetaPrefix = "[WPMETA]";
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
            var schedules = await _unitOfWork.UserSchedules.FindAsync(s => s.IsActive);
            var sessions = await _unitOfWork.WorkoutSessions.FindAsync(_ => true);

            var result = new List<WorkoutPlanDto>();
            foreach (var plan in workoutPlans)
            {
                var exercises = await _unitOfWork.WorkoutPlanExercises
                    .FindAsync(wpe => wpe.WorkoutPlanId == plan.Id && !wpe.IsDeleted);
                var exerciseDtos = await MapExercisesAsync(exercises.OrderBy(e => e.Order).ToList());
                var instructor = plan.TrainerId.HasValue
                    ? instructorDict.GetValueOrDefault(plan.TrainerId.Value)
                    : null;
                var dto = MapToDto(plan, instructor, exerciseDtos, instructorDict, userDict, includeWeeks: false);
                dto.AssignedMembersCount = schedules
                    .Where(s => s.WorkoutPlanId == plan.Id)
                    .Select(s => s.UserId)
                    .Distinct()
                    .Count();
                var planSessions = sessions.Where(s => s.WorkoutPlanId == plan.Id).ToList();
                dto.CompletionRatePercent = planSessions.Count == 0
                    ? EstimateDemoCompletionPercent(plan.Id)
                    : (int)Math.Round(100.0 * planSessions.Count(s => s.IsCompleted) / planSessions.Count);
                result.Add(dto);
            }

            return result;
        }

        public async Task<WorkoutPlanDto?> GetWorkoutPlanByIdAsync(int id)
        {
            var workoutPlan = await _unitOfWork.WorkoutPlans.GetByIdAsync(id);
            if (workoutPlan == null) return null;

            var exercises = await _unitOfWork.WorkoutPlanExercises
                .FindAsync(wpe => wpe.WorkoutPlanId == id && !wpe.IsDeleted);
            var exerciseDtos = await MapExercisesAsync(exercises.OrderBy(e => e.Order).ToList());
            Trainer? instructor = null;
            if (workoutPlan.TrainerId.HasValue)
                instructor = await _unitOfWork.Trainers.GetByIdAsync(workoutPlan.TrainerId.Value);

            var instructors = await _unitOfWork.Trainers.GetAllAsync();
            var users = await _unitOfWork.Users.GetAllAsync();
            var instructorDict = instructors.ToDictionary(i => i.Id);
            var userDict = users.ToDictionary(u => u.Id);
            var dto = MapToDto(workoutPlan, instructor, exerciseDtos, instructorDict, userDict, includeWeeks: true);
            var schedules = await _unitOfWork.UserSchedules.FindAsync(s => s.WorkoutPlanId == id && s.IsActive);
            dto.AssignedMembersCount = schedules.Select(s => s.UserId).Distinct().Count();
            var sessions = await _unitOfWork.WorkoutSessions.FindAsync(s => s.WorkoutPlanId == id);
            var sessionList = sessions.ToList();
            dto.CompletionRatePercent = sessionList.Count == 0
                ? EstimateDemoCompletionPercent(id)
                : (int)Math.Round(100.0 * sessionList.Count(s => s.IsCompleted) / sessionList.Count);
            dto.Weeks = await BuildWeeksAsync(id, exerciseDtos);
            return dto;
        }

        public async Task<IEnumerable<WorkoutPlanDto>> GetWorkoutPlansByTypeAsync(WorkoutType workoutType)
        {
            var workoutPlans = await _unitOfWork.WorkoutPlans.FindAsync(wp => wp.WorkoutType == workoutType);
            var instructors = await _unitOfWork.Trainers.GetAllAsync();
            var users = await _unitOfWork.Users.GetAllAsync();
            var instructorDict = instructors.ToDictionary(i => i.Id);
            var userDict = users.ToDictionary(u => u.Id);

            var result = new List<WorkoutPlanDto>();
            foreach (var plan in workoutPlans)
            {
                var exercises = await _unitOfWork.WorkoutPlanExercises
                    .FindAsync(wpe => wpe.WorkoutPlanId == plan.Id && !wpe.IsDeleted);
                var exerciseDtos = await MapExercisesAsync(exercises.OrderBy(e => e.Order).ToList());
                Trainer? instructor = null;
                if (plan.TrainerId.HasValue)
                    instructor = await _unitOfWork.Trainers.GetByIdAsync(plan.TrainerId.Value);
                result.Add(MapToDto(plan, instructor, exerciseDtos, instructorDict, userDict, includeWeeks: false));
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
                Goal = createWorkoutPlanDto.Goal,
                DurationDays = createWorkoutPlanDto.DurationDays,
                WorkoutsPerWeek = createWorkoutPlanDto.WorkoutsPerWeek,
                Thumbnail = createWorkoutPlanDto.Thumbnail,
                EstimatedCaloriesBurn = createWorkoutPlanDto.EstimatedCaloriesBurn,
                Tags = SerializeTags(createWorkoutPlanDto.Tags),
                Status = createWorkoutPlanDto.Status,
                IsActive = true
            };

            await _unitOfWork.WorkoutPlans.AddAsync(workoutPlan);
            await _unitOfWork.SaveChangesAsync();

            foreach (var exerciseDto in createWorkoutPlanDto.Exercises)
            {
                await _unitOfWork.WorkoutPlanExercises.AddAsync(new WorkoutPlanExercise
                {
                    WorkoutPlanId = workoutPlan.Id,
                    ExerciseId = exerciseDto.ExerciseId,
                    Sets = exerciseDto.Sets,
                    Reps = exerciseDto.Reps,
                    RestBetweenSets = exerciseDto.RestBetweenSets,
                    Order = exerciseDto.Order,
                    Weight = exerciseDto.Weight,
                    Tempo = exerciseDto.Tempo,
                    Intensity = exerciseDto.Intensity,
                    Notes = exerciseDto.Notes
                });
            }

            await _unitOfWork.SaveChangesAsync();
            return (await GetWorkoutPlanByIdAsync(workoutPlan.Id))!;
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
            workoutPlan.Goal = updateWorkoutPlanDto.Goal;
            workoutPlan.DurationDays = updateWorkoutPlanDto.DurationDays;
            workoutPlan.WorkoutsPerWeek = updateWorkoutPlanDto.WorkoutsPerWeek;
            workoutPlan.Thumbnail = updateWorkoutPlanDto.Thumbnail;
            workoutPlan.EstimatedCaloriesBurn = updateWorkoutPlanDto.EstimatedCaloriesBurn;
            workoutPlan.Tags = SerializeTags(updateWorkoutPlanDto.Tags);
            workoutPlan.Status = updateWorkoutPlanDto.Status;
            workoutPlan.UpdatedDate = DateTime.UtcNow;
            _unitOfWork.WorkoutPlans.Update(workoutPlan);

            var existingExercises = await _unitOfWork.WorkoutPlanExercises
                .FindAsync(wpe => wpe.WorkoutPlanId == id && !wpe.IsDeleted);
            foreach (var existing in existingExercises)
                _unitOfWork.WorkoutPlanExercises.Delete(existing);

            var newExercises = updateWorkoutPlanDto.Exercises.Select(exerciseDto => new WorkoutPlanExercise
            {
                WorkoutPlanId = id,
                ExerciseId = exerciseDto.ExerciseId,
                Sets = exerciseDto.Sets,
                Reps = exerciseDto.Reps,
                RestBetweenSets = exerciseDto.RestBetweenSets,
                Order = exerciseDto.Order,
                Weight = exerciseDto.Weight,
                Tempo = exerciseDto.Tempo,
                Intensity = exerciseDto.Intensity,
                Notes = exerciseDto.Notes
            }).ToList();

            if (newExercises.Count > 0)
                await _unitOfWork.WorkoutPlanExercises.AddRangeAsync(newExercises);

            await _unitOfWork.SaveChangesAsync();
            return await GetWorkoutPlanByIdAsync(id);
        }

        public async Task<bool> DeleteWorkoutPlanAsync(int id)
        {
            var workoutPlan = await _unitOfWork.WorkoutPlans.GetByIdAsync(id);
            if (workoutPlan == null) return false;
            _unitOfWork.WorkoutPlans.Delete(workoutPlan);
            await _unitOfWork.SaveChangesAsync();
            return true;
        }

        public async Task<WorkoutPlanDto?> SaveProgramStructureAsync(int id, SaveProgramStructureDto dto)
        {
            var plan = await _unitOfWork.WorkoutPlans.GetByIdAsync(id);
            if (plan == null) return null;

            var orphanExercises = await _unitOfWork.WorkoutPlanExercises.FindAsync(e => e.WorkoutPlanId == id && !e.IsDeleted);
            foreach (var e in orphanExercises)
                _unitOfWork.WorkoutPlanExercises.Delete(e);

            var existingDays = await _unitOfWork.WorkoutPlanDays.FindAsync(d => d.WorkoutPlanId == id);
            foreach (var d in existingDays)
                _unitOfWork.WorkoutPlanDays.Delete(d);

            var existingWeeks = await _unitOfWork.WorkoutPlanWeeks.FindAsync(w => w.WorkoutPlanId == id);
            foreach (var w in existingWeeks)
                _unitOfWork.WorkoutPlanWeeks.Delete(w);

            await _unitOfWork.SaveChangesAsync();

            foreach (var weekDto in dto.Weeks.OrderBy(w => w.WeekNumber))
            {
                var week = new WorkoutPlanWeek
                {
                    WorkoutPlanId = id,
                    WeekNumber = weekDto.WeekNumber,
                    Name = weekDto.Name
                };
                await _unitOfWork.WorkoutPlanWeeks.AddAsync(week);
                await _unitOfWork.SaveChangesAsync();

                foreach (var dayDto in weekDto.Days.OrderBy(d => d.OrderIndex))
                {
                    var day = new WorkoutPlanDay
                    {
                        WorkoutPlanId = id,
                        WorkoutPlanWeekId = week.Id,
                        DayNumber = dayDto.DayNumber,
                        Name = dayDto.Name,
                        IsRestDay = dayDto.IsRestDay,
                        OrderIndex = dayDto.OrderIndex,
                        FocusArea = dayDto.FocusArea,
                        DurationMinutes = dayDto.DurationMinutes,
                        Notes = dayDto.Notes
                    };
                    await _unitOfWork.WorkoutPlanDays.AddAsync(day);
                    await _unitOfWork.SaveChangesAsync();

                    if (dayDto.IsRestDay) continue;
                    foreach (var ex in dayDto.Exercises.OrderBy(x => x.Order))
                    {
                        await _unitOfWork.WorkoutPlanExercises.AddAsync(new WorkoutPlanExercise
                        {
                            WorkoutPlanId = id,
                            WorkoutPlanDayId = day.Id,
                            ExerciseId = ex.ExerciseId,
                            Sets = ex.Sets,
                            Reps = ex.Reps,
                            RestBetweenSets = ex.RestBetweenSets,
                            Order = ex.Order,
                            Weight = ex.Weight,
                            Tempo = ex.Tempo,
                            Intensity = ex.Intensity,
                            Notes = ex.Notes
                        });
                    }
                }
            }

            await _unitOfWork.SaveChangesAsync();
            return await GetWorkoutPlanByIdAsync(id);
        }

        public async Task<WorkoutPlanDto?> CloneWorkoutPlanAsync(int id, CloneWorkoutPlanDto dto)
        {
            var source = await GetWorkoutPlanByIdAsync(id);
            if (source == null) return null;

            var create = new CreateWorkoutPlanDto
            {
                Name = string.IsNullOrWhiteSpace(dto.Name) ? source.Name + " (Copy)" : dto.Name!.Trim(),
                Description = source.Description,
                WorkoutType = source.WorkoutType,
                Duration = source.Duration,
                DifficultyLevel = source.DifficultyLevel,
                TrainerId = source.TrainerId,
                IsPublic = source.IsPublic,
                Goal = source.Goal,
                DurationDays = source.DurationDays,
                WorkoutsPerWeek = source.WorkoutsPerWeek,
                Thumbnail = source.Thumbnail,
                EstimatedCaloriesBurn = source.EstimatedCaloriesBurn,
                Tags = source.Tags.Count > 0 ? source.Tags : null,
                Status = "Draft",
                Exercises = new List<CreateWorkoutPlanExerciseDto>()
            };

            var structureWeeks = source.Weeks.Select(w => new ProgramWeekWriteDto
            {
                WeekNumber = w.WeekNumber,
                Name = w.Name,
                Days = w.Days.Select(d => new ProgramDayWriteDto
                {
                    DayNumber = d.DayNumber,
                    Name = d.DayName,
                    FocusArea = d.FocusArea,
                    DurationMinutes = d.DurationMinutes,
                    Notes = d.Notes,
                    IsRestDay = d.IsRestDay,
                    OrderIndex = d.OrderIndex,
                    Exercises = d.Exercises.Select(e => new ProgramExerciseWriteDto
                    {
                        ExerciseId = e.ExerciseId,
                        Sets = e.Sets,
                        Reps = e.Reps,
                        RestBetweenSets = e.RestBetweenSets,
                        Order = e.Order,
                        Weight = e.Weight,
                        Tempo = e.Tempo,
                        Intensity = e.Intensity,
                        Notes = e.Notes
                    }).ToList()
                }).ToList()
            }).ToList();

            if (structureWeeks.Count == 0 && source.Exercises.Count > 0)
            {
                create.Exercises = source.Exercises.Select(e => new CreateWorkoutPlanExerciseDto
                {
                    ExerciseId = e.ExerciseId,
                    Sets = e.Sets,
                    Reps = e.Reps,
                    RestBetweenSets = e.RestBetweenSets,
                    Order = e.Order,
                    Weight = e.Weight,
                    Tempo = e.Tempo,
                    Intensity = e.Intensity,
                    Notes = e.Notes
                }).ToList();
            }

            var created = await CreateWorkoutPlanAsync(create);
            if (structureWeeks.Count > 0)
                return await SaveProgramStructureAsync(created.Id, new SaveProgramStructureDto { Weeks = structureWeeks });

            return await GetWorkoutPlanByIdAsync(created.Id);
        }

        private async Task<List<ProgramWeekDto>> BuildWeeksAsync(int planId, List<WorkoutPlanExerciseDto> allExerciseDtos)
        {
            var weeks = (await _unitOfWork.WorkoutPlanWeeks.FindAsync(w => w.WorkoutPlanId == planId && !w.IsDeleted))
                .OrderBy(w => w.WeekNumber)
                .ToList();
            if (weeks.Count == 0) return new List<ProgramWeekDto>();

            var days = (await _unitOfWork.WorkoutPlanDays.FindAsync(d => d.WorkoutPlanId == planId && !d.IsDeleted))
                .OrderBy(d => d.OrderIndex)
                .ToList();

            var byWeek = days
                .Where(d => d.WorkoutPlanWeekId.HasValue)
                .GroupBy(d => d.WorkoutPlanWeekId!.Value)
                .ToDictionary(g => g.Key, g => g.ToList());
            var result = new List<ProgramWeekDto>();
            foreach (var week in weeks)
            {
                var weekDays = byWeek.GetValueOrDefault(week.Id, new List<WorkoutPlanDay>());
                var weekDto = new ProgramWeekDto
                {
                    Id = week.Id,
                    WeekNumber = week.WeekNumber,
                    Name = week.Name,
                    Days = new List<ProgramDayDto>()
                };
                foreach (var day in weekDays)
                {
                    var dayDto = new ProgramDayDto
                    {
                        Id = day.Id,
                        WeekId = week.Id,
                        DayNumber = day.DayNumber,
                        DayName = day.Name,
                        FocusArea = day.FocusArea,
                        DurationMinutes = day.DurationMinutes,
                        Notes = day.Notes,
                        IsRestDay = day.IsRestDay,
                        OrderIndex = day.OrderIndex,
                        Exercises = allExerciseDtos.Where(e => e.WorkoutPlanDayId == day.Id).OrderBy(e => e.Order).ToList()
                    };
                    weekDto.Days.Add(dayDto);
                }
                result.Add(weekDto);
            }

            return result;
        }

        private static int EstimateDemoCompletionPercent(int planId) =>
            58 + Math.Abs(planId * 13 % 37);

        private static string? SerializeTags(IEnumerable<string>? tags)
        {
            if (tags == null) return null;
            var list = tags.Where(t => !string.IsNullOrWhiteSpace(t)).Select(t => t.Trim()).Distinct().ToList();
            return list.Count == 0 ? null : JsonSerializer.Serialize(list);
        }

        private static List<string> DeserializeTags(string? raw)
        {
            if (string.IsNullOrWhiteSpace(raw)) return new List<string>();
            try
            {
                var parsed = JsonSerializer.Deserialize<List<string>>(raw);
                return parsed?.Where(s => !string.IsNullOrWhiteSpace(s)).Select(s => s.Trim()).ToList() ?? new List<string>();
            }
            catch
            {
                return new List<string>();
            }
        }

        private static string? NormalizeDescription(string? rawDescription)
        {
            if (string.IsNullOrWhiteSpace(rawDescription)) return rawDescription;
            var trimmed = rawDescription.Trim();
            if (!trimmed.StartsWith(WorkoutPlanMetaPrefix, StringComparison.Ordinal)) return rawDescription;
            var payload = trimmed[WorkoutPlanMetaPrefix.Length..];
            try
            {
                using var doc = JsonDocument.Parse(payload);
                if (doc.RootElement.TryGetProperty("goal", out var goalProp) &&
                    goalProp.ValueKind == JsonValueKind.String)
                {
                    var goal = goalProp.GetString();
                    return string.IsNullOrWhiteSpace(goal) ? null : goal.Trim();
                }
            }
            catch
            {
                return rawDescription;
            }

            return rawDescription;
        }

        private static string? DisplayDescription(string? rawDescription)
        {
            if (string.IsNullOrWhiteSpace(rawDescription)) return null;
            var trimmed = rawDescription.Trim();
            if (trimmed.StartsWith(WorkoutPlanMetaPrefix, StringComparison.Ordinal)) return null;
            return rawDescription;
        }

        private async Task<List<WorkoutPlanExerciseDto>> MapExercisesAsync(IEnumerable<WorkoutPlanExercise> exercises)
        {
            var result = new List<WorkoutPlanExerciseDto>();
            var allExercises = await _unitOfWork.Exercises.GetAllAsync();
            var exerciseDict = allExercises.ToDictionary(e => e.Id);
            var bodyParts = await _unitOfWork.BodyParts.GetAllAsync();
            var bodyPartDict = bodyParts.ToDictionary(b => b.Id);
            foreach (var wpe in exercises)
            {
                var exercise = exerciseDict.GetValueOrDefault(wpe.ExerciseId);
                result.Add(new WorkoutPlanExerciseDto
                {
                    Id = wpe.Id,
                    ExerciseId = wpe.ExerciseId,
                    ExerciseName = exercise?.Name ?? string.Empty,
                    VideoUrl = exercise?.VideoUrl,
                    BodyPartName = exercise != null && bodyPartDict.TryGetValue(exercise.BodyPartId, out var bp) ? bp.Name : null,
                    Sets = wpe.Sets,
                    Reps = wpe.Reps,
                    RestBetweenSets = wpe.RestBetweenSets,
                    Order = wpe.Order,
                    Weight = wpe.Weight,
                    Tempo = wpe.Tempo,
                    Intensity = wpe.Intensity,
                    Notes = wpe.Notes,
                    WorkoutPlanDayId = wpe.WorkoutPlanDayId
                });
            }

            return result;
        }

        private WorkoutPlanDto MapToDto(
            WorkoutPlan workoutPlan,
            Trainer? instructor,
            List<WorkoutPlanExerciseDto> exercises,
            Dictionary<int, Trainer> instructorDict,
            Dictionary<int, User> userDict,
            bool includeWeeks)
        {
            string? creatorName = null;
            if (workoutPlan.CreatedById.HasValue && workoutPlan.CreatorType.HasValue)
            {
                if (workoutPlan.CreatorType == CreatorType.Instructor)
                {
                    var creatorTrainer = instructorDict.GetValueOrDefault(workoutPlan.CreatedById.Value);
                    var creatorUser = creatorTrainer != null ? userDict.GetValueOrDefault(creatorTrainer.UserId) : null;
                    creatorName = creatorUser != null ? $"{creatorUser.FirstName} {creatorUser.LastName}" : null;
                }
                else if (workoutPlan.CreatorType == CreatorType.User)
                {
                    var creatorUser = userDict.GetValueOrDefault(workoutPlan.CreatedById.Value);
                    creatorName = creatorUser != null ? $"{creatorUser.FirstName} {creatorUser.LastName}" : null;
                }
            }

            var goal = workoutPlan.Goal;
            if (string.IsNullOrWhiteSpace(goal))
                goal = NormalizeDescription(workoutPlan.Description);

            return new WorkoutPlanDto
            {
                Id = workoutPlan.Id,
                Name = workoutPlan.Name,
                Description = DisplayDescription(workoutPlan.Description),
                WorkoutType = workoutPlan.WorkoutType,
                Duration = workoutPlan.Duration,
                DifficultyLevel = workoutPlan.DifficultyLevel,
                TrainerId = workoutPlan.TrainerId,
                TrainerName = instructor != null && userDict.TryGetValue(instructor.UserId, out var instUser)
                    ? $"{instUser.FirstName} {instUser.LastName}"
                    : null,
                CreatedById = workoutPlan.CreatedById,
                CreatorType = workoutPlan.CreatorType,
                CreatorName = creatorName,
                IsPublic = workoutPlan.IsPublic,
                IsActive = workoutPlan.IsActive,
                Goal = goal,
                DurationDays = workoutPlan.DurationDays,
                WorkoutsPerWeek = workoutPlan.WorkoutsPerWeek,
                Thumbnail = workoutPlan.Thumbnail,
                EstimatedCaloriesBurn = workoutPlan.EstimatedCaloriesBurn,
                Tags = DeserializeTags(workoutPlan.Tags),
                Status = workoutPlan.Status,
                Exercises = exercises,
                Weeks = includeWeeks ? new List<ProgramWeekDto>() : new List<ProgramWeekDto>()
            };
        }
    }
}
