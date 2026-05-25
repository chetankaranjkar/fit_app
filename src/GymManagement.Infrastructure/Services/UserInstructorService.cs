using Microsoft.EntityFrameworkCore;
using GymManagement.Core.DTOs;
using GymManagement.Core.Exceptions;
using GymManagement.Core.Interfaces;
using GymManagement.Core.Services;
using GymManagement.Domain.Entities;

namespace GymManagement.Infrastructure.Services
{
    public class UserInstructorService : IUserInstructorService
    {
        private const int DefaultMaxActiveClients = 30;
        private readonly IUnitOfWork _unitOfWork;

        public UserInstructorService(IUnitOfWork unitOfWork)
        {
            _unitOfWork = unitOfWork;
        }

        public async Task<IEnumerable<UserInstructorDto>> GetAllAssignmentsAsync()
        {
            var assignments = await _unitOfWork.UserInstructors.GetAllAsync();
            return await MapAssignmentsToDtoAsync(assignments);
        }

        public async Task<IEnumerable<UserInstructorDto>> GetAssignmentsByUserIdAsync(int userId)
        {
            var assignments = await _unitOfWork.UserInstructors.FindAsync(a => a.UserId == userId);
            return await MapAssignmentsToDtoAsync(assignments);
        }

        public async Task<IEnumerable<UserInstructorDto>> GetAssignmentsByTrainerIdAsync(int instructorId)
        {
            var assignments = await _unitOfWork.UserInstructors.FindAsync(a => a.TrainerId == instructorId);
            return await MapAssignmentsToDtoAsync(assignments);
        }

        public async Task<IReadOnlyList<TrainerAssignedClientDto>> GetTrainerAssignedClientsAsync(int trainerId)
        {
            var assignments = (await _unitOfWork.UserInstructors.FindAsync(a =>
                a.TrainerId == trainerId && a.IsActive && !a.EndDate.HasValue)).ToList();
            if (assignments.Count == 0)
                return Array.Empty<TrainerAssignedClientDto>();

            var userIds = assignments.Select(a => a.UserId).Distinct().ToList();
            var users = (await _unitOfWork.Users.FindAsync(u => userIds.Contains(u.Id))).ToDictionary(u => u.Id);
            var authByUserId = (await _unitOfWork.AuthUsers.FindAsync(a =>
                    a.UserId.HasValue && userIds.Contains(a.UserId.Value)))
                .GroupBy(a => a.UserId!.Value)
                .ToDictionary(g => g.Key, g => g.First().Email);

            var memberships = (await _unitOfWork.UserMemberships.FindAsync(m =>
                userIds.Contains(m.UserId) &&
                (m.Status == MembershipStatus.Active ||
                 m.Status == MembershipStatus.ActivePendingPayment ||
                 m.Status == MembershipStatus.PartialPayment))).ToList();
            var planIds = memberships.Select(m => m.PlanId).Distinct().ToList();
            var plans = planIds.Count == 0
                ? new Dictionary<int, MembershipPlan>()
                : (await _unitOfWork.MembershipPlans.FindAsync(p => planIds.Contains(p.Id)))
                    .ToDictionary(p => p.Id);

            string? PlanNameForUser(int uid)
            {
                var m = memberships.Where(x => x.UserId == uid).OrderByDescending(x => x.StartDate).FirstOrDefault();
                if (m == null) return null;
                return plans.TryGetValue(m.PlanId, out var plan) ? plan.PlanName : null;
            }

            return assignments
                .OrderByDescending(a => a.AssignmentDate)
                .Select(a =>
                {
                    users.TryGetValue(a.UserId, out var user);
                    return new TrainerAssignedClientDto
                    {
                        UserId = a.UserId,
                        FirstName = user?.FirstName ?? string.Empty,
                        LastName = user?.LastName ?? string.Empty,
                        Email = authByUserId.GetValueOrDefault(a.UserId),
                        ProfilePicture = user?.ProfilePictureUrl,
                        AssignedOn = a.AssignmentDate,
                        MembershipPlan = PlanNameForUser(a.UserId),
                    };
                })
                .ToList();
        }

        public async Task<UserInstructorDto?> GetAssignmentByIdAsync(int id)
        {
            var assignment = await _unitOfWork.UserInstructors.GetByIdAsync(id);
            if (assignment == null) return null;

            var assignments = new[] { assignment };
            var dtos = await MapAssignmentsToDtoAsync(assignments);
            return dtos.FirstOrDefault();
        }

        public async Task AssignOrReplaceMemberTrainerAsync(int userId, int? trainerId, CancellationToken cancellationToken = default)
        {
            var activeForUser = (await _unitOfWork.UserInstructors.FindAsync(a =>
                a.UserId == userId && a.IsActive && !a.EndDate.HasValue)).ToList();

            if (!trainerId.HasValue || trainerId.Value <= 0)
            {
                foreach (var a in activeForUser)
                {
                    a.IsActive = false;
                    a.EndDate = DateTime.UtcNow;
                    a.UpdatedDate = DateTime.UtcNow;
                    _unitOfWork.UserInstructors.Update(a);
                }
                if (activeForUser.Count > 0)
                {
                    var trainerIds = activeForUser.Select(a => a.TrainerId).Distinct();
                    await _unitOfWork.SaveChangesAsync();
                    foreach (var tid in trainerIds)
                        await SyncTrainerClientCountAsync(tid);
                }
                return;
            }

            var targetTrainerId = trainerId.Value;
            if (activeForUser.Any(a => a.TrainerId == targetTrainerId))
                return;

            foreach (var a in activeForUser.Where(a => a.TrainerId != targetTrainerId))
            {
                a.IsActive = false;
                a.EndDate = DateTime.UtcNow;
                a.UpdatedDate = DateTime.UtcNow;
                _unitOfWork.UserInstructors.Update(a);
            }
            if (activeForUser.Any(a => a.TrainerId != targetTrainerId))
                await _unitOfWork.SaveChangesAsync();

            await CreateAssignmentAsync(new CreateUserInstructorDto
            {
                UserId = userId,
                TrainerId = targetTrainerId,
                AssignmentDate = DateTime.UtcNow,
            });
        }

        public async Task<UserInstructorDto> CreateAssignmentAsync(CreateUserInstructorDto createDto)
        {
            var user = await _unitOfWork.Users.GetByIdAsync(createDto.UserId);
            if (user == null)
                throw new NotFoundException("User not found.");

            var trainer = await _unitOfWork.Trainers.GetByIdAsync(createDto.TrainerId);
            if (trainer == null)
                throw new NotFoundException("Trainer not found.");
            if (!trainer.IsActive)
                throw new ConflictException("Trainer is inactive.");

            var activeAssignments = (await _unitOfWork.UserInstructors.FindAsync(a =>
                a.TrainerId == createDto.TrainerId && a.IsActive && !a.EndDate.HasValue)).ToList();

            var alreadyAssigned = activeAssignments.Any(a => a.UserId == createDto.UserId);
            if (alreadyAssigned)
                throw new ConflictException("This member is already actively assigned to the selected trainer.");

            var capacity = trainer.MaxActiveClients ?? DefaultMaxActiveClients;
            if (activeAssignments.Count >= capacity)
                throw new ConflictException($"Trainer is at capacity ({capacity} active clients).");

            var assignment = new UserInstructor
            {
                UserId = createDto.UserId,
                TrainerId = createDto.TrainerId,
                AssignmentDate = createDto.AssignmentDate ?? DateTime.UtcNow,
                Notes = createDto.Notes,
                IsActive = true
            };

            await _unitOfWork.UserInstructors.AddAsync(assignment);
            trainer.TotalClients = activeAssignments.Count + 1;
            _unitOfWork.Trainers.Update(trainer);
            await _unitOfWork.SaveChangesAsync();

            var assignments = new[] { assignment };
            var dtos = await MapAssignmentsToDtoAsync(assignments);
            return dtos.First();
        }

        public async Task<UserInstructorDto?> UpdateAssignmentAsync(int id, UpdateUserInstructorDto updateDto)
        {
            var assignment = await _unitOfWork.UserInstructors.GetByIdAsync(id);
            if (assignment == null) return null;
            var wasActive = assignment.IsActive && !assignment.EndDate.HasValue;

            if (updateDto.EndDate.HasValue)
                assignment.EndDate = updateDto.EndDate;
            if (updateDto.IsActive.HasValue)
                assignment.IsActive = updateDto.IsActive.Value;
            if (updateDto.Notes != null)
                assignment.Notes = updateDto.Notes;

            _unitOfWork.UserInstructors.Update(assignment);
            if (wasActive != (assignment.IsActive && !assignment.EndDate.HasValue))
                await SyncTrainerClientCountAsync(assignment.TrainerId);
            await _unitOfWork.SaveChangesAsync();

            var assignments = new[] { assignment };
            var dtos = await MapAssignmentsToDtoAsync(assignments);
            return dtos.First();
        }

        public async Task<bool> DeleteAssignmentAsync(int id)
        {
            var assignment = await _unitOfWork.UserInstructors.GetByIdAsync(id);
            if (assignment == null) return false;
            var trainerId = assignment.TrainerId;

            _unitOfWork.UserInstructors.Delete(assignment);
            await SyncTrainerClientCountAsync(trainerId);
            await _unitOfWork.SaveChangesAsync();
            return true;
        }

        public async Task<IEnumerable<TrainerAssignmentRecommendationDto>> GetRecommendationsAsync(int userId)
        {
            var user = await _unitOfWork.Users.GetByIdAsync(userId);
            if (user == null)
                throw new NotFoundException("User not found.");

            var trainers = (await _unitOfWork.Trainers.FindAsync(t => t.IsActive)).ToList();
            var allAssignments = (await _unitOfWork.UserInstructors.FindAsync(a => a.IsActive && !a.EndDate.HasValue)).ToList();
            var schedules = (await _unitOfWork.UserSchedules.FindAsync(s => s.IsActive)).ToList();

            var userSchedules = schedules.Where(s => s.UserId == userId).ToList();
            var trainerUserIds = trainers.Select(t => t.UserId).Distinct().ToList();
            var trainerUsers = (await _unitOfWork.Users.FindAsync(u => trainerUserIds.Contains(u.Id)))
                .ToDictionary(u => u.Id);

            var recommendations = trainers.Select(trainer =>
            {
                var trainerSchedules = schedules.Where(s => s.TrainerId == trainer.Id).ToList();
                var activeClients = allAssignments.Count(a => a.TrainerId == trainer.Id);
                var max = trainer.MaxActiveClients ?? DefaultMaxActiveClients;
                var remaining = Math.Max(0, max - activeClients);
                var conflictCount = CountScheduleConflicts(userSchedules, trainerSchedules);

                var availability = (trainer.AvailabilityStatus ?? "Available").Trim();
                var warnings = new List<string>();
                if (remaining <= 0)
                    warnings.Add("Capacity full");
                if (IsLowAvailability(availability))
                    warnings.Add($"Availability: {availability}");
                if (conflictCount > 0)
                    warnings.Add($"{conflictCount} schedule conflict(s)");

                var trainerName = trainerUsers.TryGetValue(trainer.UserId, out var tu)
                    ? $"{tu.FirstName} {tu.LastName}".Trim()
                    : $"Trainer #{trainer.Id}";

                return new TrainerAssignmentRecommendationDto
                {
                    TrainerId = trainer.Id,
                    TrainerName = trainerName,
                    AvailabilityStatus = availability,
                    ActiveClients = activeClients,
                    MaxActiveClients = max,
                    RemainingCapacity = remaining,
                    ConflictCount = conflictCount,
                    IsRecommended = remaining > 0 && !IsLowAvailability(availability) && conflictCount == 0,
                    Warnings = warnings
                };
            })
            .OrderByDescending(r => r.IsRecommended)
            .ThenByDescending(r => r.RemainingCapacity)
            .ThenBy(r => r.ConflictCount)
            .ThenBy(r => r.TrainerName)
            .ToList();

            return recommendations;
        }

        private async Task SyncTrainerClientCountAsync(int trainerId)
        {
            var trainer = await _unitOfWork.Trainers.GetByIdAsync(trainerId);
            if (trainer == null) return;

            var activeCount = (await _unitOfWork.UserInstructors.FindAsync(a =>
                a.TrainerId == trainerId && a.IsActive && !a.EndDate.HasValue)).Count();
            trainer.TotalClients = activeCount;
            _unitOfWork.Trainers.Update(trainer);
        }

        private static int CountScheduleConflicts(IEnumerable<UserSchedule> userSchedules, IEnumerable<UserSchedule> trainerSchedules)
        {
            var count = 0;
            foreach (var us in userSchedules)
            {
                var conflict = trainerSchedules.Any(ts =>
                    ts.DayOfWeek == us.DayOfWeek &&
                    ts.StartTime < us.EndTime &&
                    ts.EndTime > us.StartTime);
                if (conflict) count++;
            }

            return count;
        }

        private static bool IsLowAvailability(string availability)
            => availability.Contains("leave", StringComparison.OrdinalIgnoreCase) ||
               availability.Contains("off", StringComparison.OrdinalIgnoreCase) ||
               availability.Contains("busy", StringComparison.OrdinalIgnoreCase);

        private async Task<IEnumerable<UserInstructorDto>> MapAssignmentsToDtoAsync(IEnumerable<UserInstructor> assignments)
        {
            var assignmentList = assignments.ToList();
            var userIds = assignmentList.Select(a => a.UserId).Distinct().ToList();
            var instructorIds = assignmentList.Select(a => a.TrainerId).Distinct().ToList();

            var users = await _unitOfWork.Users.FindAsync(u => userIds.Contains(u.Id));
            var instructors = await _unitOfWork.Trainers.FindAsync(i => instructorIds.Contains(i.Id));
            var instructorUserIds = instructors.Select(i => i.UserId).Distinct().ToList();
            var instructorUsers = await _unitOfWork.Users.FindAsync(u => instructorUserIds.Contains(u.Id));

            var userDict = users.ToDictionary(u => u.Id);
            var instructorDict = instructors.ToDictionary(i => i.Id);
            var instructorUserDict = instructorUsers.ToDictionary(u => u.Id);

            return assignmentList.Select(a => new UserInstructorDto
            {
                Id = a.Id,
                UserId = a.UserId,
                UserName = userDict.ContainsKey(a.UserId)
                    ? $"{userDict[a.UserId].FirstName} {userDict[a.UserId].LastName}"
                    : "Unknown",
                TrainerId = a.TrainerId,
                TrainerName = instructorDict.ContainsKey(a.TrainerId) && instructorUserDict.ContainsKey(instructorDict[a.TrainerId].UserId)
                    ? $"{instructorUserDict[instructorDict[a.TrainerId].UserId].FirstName} {instructorUserDict[instructorDict[a.TrainerId].UserId].LastName}"
                    : "Unknown",
                AssignmentDate = a.AssignmentDate,
                EndDate = a.EndDate,
                IsActive = a.IsActive,
                Notes = a.Notes
            });
        }
    }
}

