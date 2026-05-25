using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using GymManagement.API.Attributes;
using GymManagement.Core.Authorization;
using GymManagement.Core.Interfaces;
using GymManagement.Core.DTOs;
using GymManagement.Domain.Entities;

namespace GymManagement.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class MembersController : ControllerBase
    {
        private readonly IUnitOfWork _unitOfWork;

        public MembersController(IUnitOfWork unitOfWork)
        {
            _unitOfWork = unitOfWork;
        }

        [HttpGet]
        [HasPermission(PermissionCodes.UsersAccess)]
        public async Task<ActionResult<IEnumerable<MemberProfileDto>>> GetAll()
        {
            var members = (await _unitOfWork.Members.FindAsync(_ => true)).ToList();
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
