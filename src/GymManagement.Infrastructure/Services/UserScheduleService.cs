using GymManagement.Core.DTOs;
using GymManagement.Core.Interfaces;
using GymManagement.Core.Services;
using GymManagement.Domain.Entities;

namespace GymManagement.Infrastructure.Services
{
    public class UserScheduleService : IUserScheduleService
    {
        private readonly IUnitOfWork _unitOfWork;

        public UserScheduleService(IUnitOfWork unitOfWork)
        {
            _unitOfWork = unitOfWork;
        }

        public async Task<IEnumerable<UserScheduleDto>> GetAllSchedulesAsync()
        {
            var schedules = await _unitOfWork.UserSchedules.GetAllAsync();
            return await MapSchedulesToDtoAsync(schedules);
        }

        public async Task<IEnumerable<UserScheduleDto>> GetSchedulesByUserIdAsync(int userId)
        {
            var schedules = await _unitOfWork.UserSchedules.FindAsync(s => s.UserId == userId);
            return await MapSchedulesToDtoAsync(schedules);
        }

        public async Task<UserScheduleDto?> GetScheduleByIdAsync(int id)
        {
            var schedule = await _unitOfWork.UserSchedules.GetByIdAsync(id);
            if (schedule == null) return null;

            var schedules = new[] { schedule };
            var dtos = await MapSchedulesToDtoAsync(schedules);
            return dtos.FirstOrDefault();
        }

        public async Task<UserScheduleDto> CreateScheduleAsync(CreateUserScheduleDto createScheduleDto)
        {
            var schedule = new UserSchedule
            {
                UserId = createScheduleDto.UserId,
                TrainerId = createScheduleDto.TrainerId,
                WorkoutPlanId = createScheduleDto.WorkoutPlanId,
                ScheduleType = createScheduleDto.ScheduleType,
                DayOfWeek = createScheduleDto.DayOfWeek,
                StartTime = createScheduleDto.StartTime,
                EndTime = createScheduleDto.EndTime,
                IsActive = true
            };

            await _unitOfWork.UserSchedules.AddAsync(schedule);
            await _unitOfWork.SaveChangesAsync();

            var schedules = new[] { schedule };
            var dtos = await MapSchedulesToDtoAsync(schedules);
            return dtos.First();
        }

        public async Task<bool> GenerateDefaultScheduleAsync(GenerateDefaultScheduleDto generateScheduleDto)
        {
            var user = await _unitOfWork.Users.GetByIdAsync(generateScheduleDto.UserId);
            if (user == null) return false;

            // Check if user already has schedules
            var existingSchedules = await _unitOfWork.UserSchedules
                .FindAsync(s => s.UserId == generateScheduleDto.UserId && s.IsActive);
            
            if (existingSchedules.Any()) return false; // User already has active schedules

            // Get all workout plans (you might want to filter by type)
            var workoutPlans = await _unitOfWork.WorkoutPlans
                .FindAsync(wp => wp.IsActive && wp.WorkoutType == WorkoutType.Strength);

            if (!workoutPlans.Any()) return false;

            var bodyParts = await _unitOfWork.BodyParts.GetAllAsync();
            var exercises = await _unitOfWork.Exercises.GetAllAsync();
            
            var bodyPartsList = bodyParts.ToList();
            var exercisesByBodyPart = exercises
                .GroupBy(e => e.BodyPartId)
                .ToDictionary(g => g.Key, g => g.ToList());

            var schedulesToCreate = new List<UserSchedule>();
            var daysOfWeek = Enum.GetValues<DayOfWeek>().ToList();

            if (generateScheduleDto.ScheduleType == ScheduleType.OneMusclePerDay)
            {
                // One muscle group per day
                for (int i = 0; i < bodyPartsList.Count && i < 7; i++)
                {
                    var bodyPart = bodyPartsList[i];
                    var dayIndex = i % 7;
                    var day = daysOfWeek[dayIndex];

                    // Find workout plan for this body part or create a generic one
                    var workoutPlan = workoutPlans.FirstOrDefault();
                    if (workoutPlan != null)
                    {
                        schedulesToCreate.Add(new UserSchedule
                        {
                            UserId = generateScheduleDto.UserId,
                            TrainerId = generateScheduleDto.TrainerId,
                            WorkoutPlanId = workoutPlan.Id,
                            ScheduleType = ScheduleType.OneMusclePerDay,
                            DayOfWeek = day,
                            StartTime = generateScheduleDto.StartTime,
                            EndTime = generateScheduleDto.EndTime,
                            IsActive = true
                        });
                    }
                }
            }
            else if (generateScheduleDto.ScheduleType == ScheduleType.TwoMusclesPerDay)
            {
                // Two muscle groups per day
                for (int i = 0; i < bodyPartsList.Count; i += 2)
                {
                    if (i + 1 < bodyPartsList.Count)
                    {
                        var dayIndex = (i / 2) % 7;
                        var day = daysOfWeek[dayIndex];

                        var workoutPlan = workoutPlans.FirstOrDefault();
                        if (workoutPlan != null)
                        {
                            schedulesToCreate.Add(new UserSchedule
                            {
                                UserId = generateScheduleDto.UserId,
                                TrainerId = generateScheduleDto.TrainerId,
                                WorkoutPlanId = workoutPlan.Id,
                                ScheduleType = ScheduleType.TwoMusclesPerDay,
                                DayOfWeek = day,
                                StartTime = generateScheduleDto.StartTime,
                                EndTime = generateScheduleDto.EndTime,
                                IsActive = true
                            });
                        }
                    }
                }
            }

            if (schedulesToCreate.Any())
            {
                await _unitOfWork.UserSchedules.AddRangeAsync(schedulesToCreate);
                await _unitOfWork.SaveChangesAsync();
                return true;
            }

            return false;
        }

        public async Task<bool> DeleteScheduleAsync(int id)
        {
            var schedule = await _unitOfWork.UserSchedules.GetByIdAsync(id);
            if (schedule == null) return false;

            _unitOfWork.UserSchedules.Delete(schedule);
            await _unitOfWork.SaveChangesAsync();
            return true;
        }

        public async Task<bool> UpdateScheduleAsync(int id, CreateUserScheduleDto updateScheduleDto)
        {
            var schedule = await _unitOfWork.UserSchedules.GetByIdAsync(id);
            if (schedule == null) return false;

            schedule.UserId = updateScheduleDto.UserId;
            schedule.TrainerId = updateScheduleDto.TrainerId;
            schedule.WorkoutPlanId = updateScheduleDto.WorkoutPlanId;
            schedule.ScheduleType = updateScheduleDto.ScheduleType;
            schedule.DayOfWeek = updateScheduleDto.DayOfWeek;
            schedule.StartTime = updateScheduleDto.StartTime;
            schedule.EndTime = updateScheduleDto.EndTime;

            _unitOfWork.UserSchedules.Update(schedule);
            await _unitOfWork.SaveChangesAsync();
            return true;
        }

        private async Task<List<UserScheduleDto>> MapSchedulesToDtoAsync(IEnumerable<UserSchedule> schedules)
        {
            var result = new List<UserScheduleDto>();
            var users = await _unitOfWork.Users.GetAllAsync();
            var trainers = await _unitOfWork.Trainers.GetAllAsync();
            var workoutPlans = await _unitOfWork.WorkoutPlans.GetAllAsync();

            var userDict = users.ToDictionary(u => u.Id);
            var trainerDict = trainers.ToDictionary(i => i.Id);
            var workoutPlanDict = workoutPlans.ToDictionary(wp => wp.Id);

            foreach (var schedule in schedules)
            {
                var user = userDict.GetValueOrDefault(schedule.UserId);
                var trainer = schedule.TrainerId.HasValue 
                    ? trainerDict.GetValueOrDefault(schedule.TrainerId.Value)
                    : null;
                var instUser = trainer != null ? userDict.GetValueOrDefault(trainer.UserId) : null;
                var workoutPlan = workoutPlanDict.GetValueOrDefault(schedule.WorkoutPlanId);

                result.Add(new UserScheduleDto
                {
                    Id = schedule.Id,
                    UserId = schedule.UserId,
                    UserName = user != null ? $"{user.FirstName} {user.LastName}" : string.Empty,
                    TrainerId = schedule.TrainerId,
                    TrainerName = instUser != null ? $"{instUser.FirstName} {instUser.LastName}" : null,
                    WorkoutPlanId = schedule.WorkoutPlanId,
                    WorkoutPlanName = workoutPlan?.Name ?? string.Empty,
                    ScheduleType = schedule.ScheduleType,
                    DayOfWeek = schedule.DayOfWeek,
                    StartTime = schedule.StartTime,
                    EndTime = schedule.EndTime,
                    IsActive = schedule.IsActive
                });
            }

            return result;
        }
    }
}

