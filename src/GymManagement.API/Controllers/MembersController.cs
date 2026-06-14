using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using GymManagement.API.Attributes;
using GymManagement.Core.Authorization;
using GymManagement.Core.DTOs;
using GymManagement.Core.Interfaces;
using GymManagement.Domain.Entities;
using GymManagement.Infrastructure.Data;
using GymManagement.Infrastructure.Services;
using Microsoft.EntityFrameworkCore;

namespace GymManagement.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class MembersController : ControllerBase
    {
        private readonly IUnitOfWork _unitOfWork;
        private readonly ApplicationDbContext _db;

        public MembersController(IUnitOfWork unitOfWork, ApplicationDbContext db)
        {
            _unitOfWork = unitOfWork;
            _db = db;
        }

        [HttpGet]
        [HasPermission(PermissionCodes.UsersAccess)]
        public async Task<ActionResult<IEnumerable<MemberProfileDto>>> GetAll()
        {
            var members = await _db.Members.AsNoTracking()
                .WhereUserHasMemberRole(_db)
                .ToListAsync();
            var userIds = members.Select(m => m.UserId).ToList();
            var users = userIds.Count == 0
                ? new Dictionary<int, User>()
                : (await _unitOfWork.Users.FindAsync(u => userIds.Contains(u.Id))).ToDictionary(u => u.Id);

            var dtos = members.Select(m =>
            {
                users.TryGetValue(m.UserId, out var user);
                return new MemberProfileDto
                {
                    Id = m.Id,
                    UserId = m.UserId,
                    FitnessGoal = m.FitnessGoal,
                    HeightCm = m.HeightCm,
                    WeightKg = m.WeightKg,
                    MedicalConditions = m.MedicalConditions,
                    EmergencyContact = m.EmergencyContact ?? user?.EmergencyContact,
                    EmergencyPhone = m.EmergencyPhone ?? user?.EmergencyPhone,
                    PreferredGymTime = m.PreferredGymTime ?? user?.PreferredGymTime,
                    DateOfBirth = m.DateOfBirth ?? user?.DateOfBirth,
                    Gender = m.Gender ?? user?.Gender,
                    RegistrationDate = m.RegistrationDate,
                    IsActive = m.IsActive && (user?.IsActive ?? true),
                };
            }).OrderBy(m => m.UserId).ToList();

            return Ok(dtos);
        }
    }
}
