using Microsoft.EntityFrameworkCore;
using GymManagement.Core.DTOs;
using GymManagement.Core.Exceptions;
using GymManagement.Core.Services;
using GymManagement.Domain.Entities;
using GymManagement.Infrastructure.Data;

namespace GymManagement.Infrastructure.Services
{
    public class UserDietPlanService : IUserDietPlanService
    {
        private readonly ApplicationDbContext _context;
        private readonly INotificationWebhookDispatcher _notificationWebhookDispatcher;

        public UserDietPlanService(
            ApplicationDbContext context,
            INotificationWebhookDispatcher notificationWebhookDispatcher)
        {
            _context = context;
            _notificationWebhookDispatcher = notificationWebhookDispatcher;
        }

        public async Task<IEnumerable<UserDietPlanDto>> GetAssignmentsAsync(int? userId = null, int? dietPlanId = null)
        {
            var query = _context.UserDietPlans
                .AsNoTracking()
                .Include(u => u.User)
                .Include(u => u.DietPlan)
                .Where(u => !u.IsDeleted);

            if (userId.HasValue)
                query = query.Where(u => u.UserId == userId.Value);
            if (dietPlanId.HasValue)
                query = query.Where(u => u.DietPlanId == dietPlanId.Value);

            var list = await query.OrderByDescending(u => u.StartDate).ToListAsync();
            return list.Select(MapToDto);
        }

        public async Task<UserDietPlanDto?> GetByIdAsync(int id)
        {
            var entity = await _context.UserDietPlans
                .AsNoTracking()
                .Include(u => u.User)
                .Include(u => u.DietPlan)
                .FirstOrDefaultAsync(u => u.Id == id && !u.IsDeleted);
            return entity == null ? null : MapToDto(entity);
        }

        public async Task<UserDietPlanDto> AssignAsync(CreateUserDietPlanDto dto)
        {
            var member = await _context.Users
                .AsNoTracking()
                .FirstOrDefaultAsync(u => u.Id == dto.UserId)
                .ConfigureAwait(false);
            if (member == null)
                throw new NotFoundException("Member not found.");

            var dietPlan = await _context.DietPlans
                .AsNoTracking()
                .FirstOrDefaultAsync(p => p.Id == dto.DietPlanId)
                .ConfigureAwait(false);
            if (dietPlan == null)
                throw new NotFoundException("Diet plan not found.");

            if (dto.AssignedByTrainerId.HasValue)
            {
                var trainerExists = await _context.Trainers
                    .AsNoTracking()
                    .AnyAsync(t => t.Id == dto.AssignedByTrainerId.Value)
                    .ConfigureAwait(false);
                if (!trainerExists)
                    throw new BadRequestException("Assigned trainer was not found.");
            }

            // One active diet assignment per member — replace any existing active row.
            if (dto.IsActive)
            {
                var existingActive = await _context.UserDietPlans
                    .Where(u => u.UserId == dto.UserId && !u.IsDeleted && u.IsActive)
                    .ToListAsync()
                    .ConfigureAwait(false);

                foreach (var existing in existingActive)
                {
                    existing.IsActive = false;
                    existing.UpdatedDate = DateTime.UtcNow;
                }
            }

            var entity = new UserDietPlan
            {
                UserId = dto.UserId,
                DietPlanId = dto.DietPlanId,
                AssignedByTrainerId = dto.AssignedByTrainerId,
                StartDate = dto.StartDate,
                EndDate = dto.EndDate,
                IsActive = dto.IsActive,
                Notes = dto.Notes,
            };
            _context.UserDietPlans.Add(entity);
            await _context.SaveChangesAsync().ConfigureAwait(false);

            var memberName = $"{member.FirstName} {member.LastName}".Trim();
            var result = new UserDietPlanDto
            {
                Id = entity.Id,
                UserId = entity.UserId,
                DietPlanId = entity.DietPlanId,
                UserName = memberName,
                DietPlanName = dietPlan.PlanName,
                AssignedByTrainerId = entity.AssignedByTrainerId,
                StartDate = entity.StartDate,
                EndDate = entity.EndDate,
                IsActive = entity.IsActive,
                Notes = entity.Notes,
            };

            if (dto.IsActive)
            {
                var memberEmail = await _context.AuthUsers
                    .AsNoTracking()
                    .Where(a => a.UserId == member.Id)
                    .Select(a => a.Email)
                    .FirstOrDefaultAsync()
                    .ConfigureAwait(false);

                var webhookDto = new DietAssignmentAssignedNotificationDto
                {
                    UserId = entity.UserId,
                    MemberName = memberName,
                    MemberEmail = memberEmail,
                    MemberPhone = member.Phone,
                    DietPlanId = entity.DietPlanId,
                    DietPlanName = dietPlan.PlanName,
                    StartDateUtc = entity.StartDate,
                    EndDateUtc = entity.EndDate,
                    IsActive = entity.IsActive,
                    Notes = entity.Notes,
                };
                await _notificationWebhookDispatcher
                    .DispatchDietAssignmentAssignedAsync(webhookDto)
                    .ConfigureAwait(false);
            }

            return result;
        }

        public async Task<bool> UnassignAsync(int id)
        {
            var entity = await _context.UserDietPlans.FirstOrDefaultAsync(u => u.Id == id && !u.IsDeleted);
            if (entity == null) return false;
            entity.IsDeleted = true;
            entity.UpdatedDate = DateTime.UtcNow;
            await _context.SaveChangesAsync();
            return true;
        }

        private static UserDietPlanDto MapToDto(UserDietPlan u)
        {
            var userName = u.User != null
                ? $"{u.User.FirstName} {u.User.LastName}".Trim()
                : null;
            return new UserDietPlanDto
            {
                Id = u.Id,
                UserId = u.UserId,
                DietPlanId = u.DietPlanId,
                UserName = userName,
                DietPlanName = u.DietPlan?.PlanName,
                AssignedByTrainerId = u.AssignedByTrainerId,
                StartDate = u.StartDate,
                EndDate = u.EndDate,
                IsActive = u.IsActive,
                Notes = u.Notes,
            };
        }
    }
}
