using GymManagement.Core.DTOs;
using GymManagement.Core.Interfaces;
using GymManagement.Core.Services;
using GymManagement.Domain.Entities;

namespace GymManagement.Infrastructure.Services
{
    public class UserMembershipService : IUserMembershipService
    {
        private readonly IUnitOfWork _unitOfWork;

        public UserMembershipService(IUnitOfWork unitOfWork)
        {
            _unitOfWork = unitOfWork;
        }

        public async Task<IEnumerable<UserMembershipDto>> GetAllAsync()
        {
            var list = await _unitOfWork.UserMemberships.GetAllAsync();
            return await MapToDtosAsync(list);
        }

        public async Task<IEnumerable<UserMembershipDto>> GetByUserIdAsync(int userId)
        {
            var list = await _unitOfWork.UserMemberships.FindAsync(m => m.UserId == userId);
            return await MapToDtosAsync(list);
        }

        public async Task<UserMembershipDto?> GetByIdAsync(int id)
        {
            var m = await _unitOfWork.UserMemberships.GetByIdAsync(id);
            if (m == null) return null;
            var dtos = await MapToDtosAsync(new[] { m });
            return dtos.FirstOrDefault();
        }

        public async Task<UserMembershipDto> CreateAsync(CreateUserMembershipDto dto)
        {
            var m = new UserMembership
            {
                UserId = dto.UserId,
                PlanId = dto.PlanId,
                StartDate = dto.StartDate,
                EndDate = dto.EndDate,
                Status = dto.Status,
                FreezeStartDate = dto.FreezeStartDate,
                FreezeEndDate = dto.FreezeEndDate,
                FreezeReason = dto.FreezeReason
            };
            await _unitOfWork.UserMemberships.AddAsync(m);
            await _unitOfWork.SaveChangesAsync();
            var dtos = await MapToDtosAsync(new[] { m });
            return dtos.First();
        }

        public async Task<UserMembershipDto?> UpdateAsync(int id, UpdateUserMembershipDto dto)
        {
            var m = await _unitOfWork.UserMemberships.GetByIdAsync(id);
            if (m == null) return null;

            if (dto.StartDate.HasValue) m.StartDate = dto.StartDate.Value;
            if (dto.EndDate.HasValue) m.EndDate = dto.EndDate.Value;
            if (dto.Status.HasValue) m.Status = dto.Status.Value;
            m.FreezeStartDate = dto.FreezeStartDate;
            m.FreezeEndDate = dto.FreezeEndDate;
            m.FreezeReason = dto.FreezeReason;

            _unitOfWork.UserMemberships.Update(m);
            await _unitOfWork.SaveChangesAsync();
            var dtos = await MapToDtosAsync(new[] { m });
            return dtos.First();
        }

        public async Task<bool> DeleteAsync(int id)
        {
            var m = await _unitOfWork.UserMemberships.GetByIdAsync(id);
            if (m == null) return false;
            _unitOfWork.UserMemberships.Delete(m);
            await _unitOfWork.SaveChangesAsync();
            return true;
        }

        private async Task<List<UserMembershipDto>> MapToDtosAsync(IEnumerable<UserMembership> list)
        {
            var items = list.ToList();
            if (items.Count == 0) return new List<UserMembershipDto>();

            var userIds = items.Select(x => x.UserId).Distinct().ToList();
            var planIds = items.Select(x => x.PlanId).Distinct().ToList();
            var users = (await _unitOfWork.Users.FindAsync(u => userIds.Contains(u.Id))).ToDictionary(u => u.Id);
            var plans = (await _unitOfWork.MembershipPlans.FindAsync(p => planIds.Contains(p.Id))).ToDictionary(p => p.Id);

            return items.Select(m =>
            {
                var dto = new UserMembershipDto
                {
                    Id = m.Id,
                    UserId = m.UserId,
                    PlanId = m.PlanId,
                    StartDate = m.StartDate,
                    EndDate = m.EndDate,
                    Status = m.Status,
                    FreezeStartDate = m.FreezeStartDate,
                    FreezeEndDate = m.FreezeEndDate,
                    FreezeReason = m.FreezeReason
                };
                if (users.TryGetValue(m.UserId, out var u))
                    dto.UserName = $"{u.FirstName} {u.LastName}".Trim();
                if (plans.TryGetValue(m.PlanId, out var p))
                    dto.PlanName = p.PlanName;
                return dto;
            }).ToList();
        }
    }
}
