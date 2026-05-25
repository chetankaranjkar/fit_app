using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using GymManagement.API.Attributes;
using GymManagement.Core.Authorization;
using GymManagement.Core.DTOs;
using GymManagement.Core.Interfaces;
using GymManagement.Domain.Entities;

namespace GymManagement.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class StaffController : ControllerBase
    {
        private readonly IUnitOfWork _unitOfWork;

        public StaffController(IUnitOfWork unitOfWork)
        {
            _unitOfWork = unitOfWork;
        }

        [HttpGet]
        [HasPermission(PermissionCodes.UsersAccess)]
        public async Task<ActionResult<IEnumerable<StaffProfileDto>>> GetAll()
        {
            var staffRows = (await _unitOfWork.Staff.FindAsync(_ => true)).ToList();
            var userIds = staffRows.Select(s => s.UserId).ToList();
            var users = userIds.Count == 0
                ? new Dictionary<int, User>()
                : (await _unitOfWork.Users.FindAsync(u => userIds.Contains(u.Id))).ToDictionary(u => u.Id);
            var dtos = staffRows.Select(s =>
            {
                users.TryGetValue(s.UserId, out var user);
                return new StaffProfileDto
                {
                    Id = s.Id,
                    UserId = s.UserId,
                    EmployeeCode = s.EmployeeCode,
                    Department = s.Department,
                    JobTitle = s.JobTitle ?? (user != null ? $"{user.FirstName} {user.LastName}".Trim() : null),
                    ShiftType = s.ShiftType,
                    JoiningDate = s.JoiningDate,
                    IsActive = s.IsActive && (user?.IsActive ?? true),
                };
            }).OrderBy(s => s.Department).ThenBy(s => s.UserId).ToList();

            return Ok(dtos);
        }
    }
}
