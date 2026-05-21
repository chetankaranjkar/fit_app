using Microsoft.EntityFrameworkCore;
using GymManagement.Core.DTOs;
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
            await _context.SaveChangesAsync();

            var withNav = await _context.UserDietPlans
                .AsNoTracking()
                .Include(u => u.User)!.ThenInclude(u => u.AuthUser)
                .Include(u => u.DietPlan)
                .FirstAsync(u => u.Id == entity.Id);
            var result = MapToDto(withNav);

            if (dto.IsActive && withNav.User != null)
            {
                var webhookDto = new DietAssignmentAssignedNotificationDto
                {
                    UserId = withNav.UserId,
                    MemberName =
                        $"{withNav.User.FirstName} {withNav.User.LastName}".Trim(),
                    MemberEmail = withNav.User.AuthUser?.Email,
                    MemberPhone = withNav.User.Phone,
                    DietPlanId = withNav.DietPlanId,
                    DietPlanName = withNav.DietPlan?.PlanName,
                    StartDateUtc = withNav.StartDate,
                    EndDateUtc = withNav.EndDate,
                    IsActive = withNav.IsActive,
                    Notes = withNav.Notes,
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
