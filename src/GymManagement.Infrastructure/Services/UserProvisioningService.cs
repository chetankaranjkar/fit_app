using GymManagement.Core.Authorization;
using GymManagement.Core.DTOs;
using GymManagement.Core.Exceptions;
using GymManagement.Core.Interfaces;
using GymManagement.Core.Services;
using GymManagement.Domain.Entities;

namespace GymManagement.Infrastructure.Services
{
    public sealed class UserProvisioningService : IUserProvisioningService
    {
        private static readonly Dictionary<string, string> UserTypeNameToRoleCode =
            new(StringComparer.OrdinalIgnoreCase)
            {
                ["Admin"] = ApplicationRoleCodes.Admin,
                ["Member"] = ApplicationRoleCodes.Member,
                ["Trainer"] = ApplicationRoleCodes.Trainer,
                ["Staff"] = ApplicationRoleCodes.Staff,
                ["Receptionist"] = ApplicationRoleCodes.Receptionist,
                ["Reception"] = ApplicationRoleCodes.Receptionist,
                ["Accountant"] = ApplicationRoleCodes.Accountant,
                ["Accounts"] = ApplicationRoleCodes.Accountant,
            };

        private readonly IUnitOfWork _unitOfWork;

        public UserProvisioningService(IUnitOfWork unitOfWork)
        {
            _unitOfWork = unitOfWork;
        }

        public async Task<(MemberProfileDto? Member, StaffProfileDto? Staff, TrainerDto? Trainer)> GetProfilesAsync(
            int userId,
            CancellationToken cancellationToken = default)
        {
            var member = (await _unitOfWork.Members.FirstOrDefaultAsync(m => m.UserId == userId));
            var staff = (await _unitOfWork.Staff.FirstOrDefaultAsync(s => s.UserId == userId));
            var trainer = (await _unitOfWork.Trainers.FirstOrDefaultAsync(t => t.UserId == userId));

            MemberProfileDto? memberDto = member == null ? null : MapMember(member);
            StaffProfileDto? staffDto = staff == null ? null : MapStaff(staff);
            TrainerDto? trainerDto = null;
            if (trainer != null)
            {
                var user = await _unitOfWork.Users.GetByIdAsync(userId);
                var auth = (await _unitOfWork.AuthUsers.GetAllAsync())
                    .FirstOrDefault(a => a.UserId == userId);
                trainerDto = MapTrainer(trainer, user, auth?.Email);
            }

            return (memberDto, staffDto, trainerDto);
        }

        public async Task AssignRoleAsync(int userId, string roleCode, CancellationToken cancellationToken = default)
        {
            var code = NormalizeRoleCode(roleCode);
            await AuthUserRoleHelper.EnsureUserHasAppRoleAsync(_unitOfWork, userId, code);
            await _unitOfWork.SaveChangesAsync();
            await EnsureProfileForRoleAsync(userId, code, null, cancellationToken);
        }

        public async Task RevokeRoleAsync(int userId, string roleCode, CancellationToken cancellationToken = default)
        {
            var code = NormalizeRoleCode(roleCode);
            var appRole = (await _unitOfWork.AppRoles.GetAllAsync())
                .FirstOrDefault(r => string.Equals(r.Name, code, StringComparison.OrdinalIgnoreCase));
            if (appRole == null)
                return;

            var links = (await _unitOfWork.UserRoles.FindAsync(ur => ur.UserId == userId && ur.RoleId == appRole.Id)).ToList();
            foreach (var link in links)
                _unitOfWork.UserRoles.Delete(link);

            await _unitOfWork.SaveChangesAsync();
            await DeactivateProfileForRoleAsync(userId, code, cancellationToken);
        }

        public async Task EnsureProfilesForUserAsync(int userId, CancellationToken cancellationToken = default)
        {
            var roleNames = await GetActiveRoleNamesForUserAsync(userId);
            foreach (var name in roleNames)
                await EnsureProfileForRoleAsync(userId, name, null, cancellationToken);
        }

        public async Task SyncFromUserTypeIdsAsync(
            int userId,
            IEnumerable<int>? userTypeIds,
            CancellationToken cancellationToken = default)
        {
            if (userTypeIds == null)
                return;

            var codes = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
            foreach (var typeId in userTypeIds.Where(id => id > 0).Distinct())
            {
                var userType = await _unitOfWork.UserTypes.GetByIdAsync(typeId);
                if (userType == null)
                    continue;
                if (UserTypeNameToRoleCode.TryGetValue(userType.Name.Trim(), out var code))
                    codes.Add(code);
            }

            foreach (var code in codes)
            {
                await AuthUserRoleHelper.EnsureUserHasAppRoleAsync(_unitOfWork, userId, code);
            }

            if (codes.Count > 0)
                await _unitOfWork.SaveChangesAsync();

            await EnsureProfilesForUserAsync(userId, cancellationToken);
        }

        public async Task EnsureMemberProfileAsync(int userId, CancellationToken cancellationToken = default)
        {
            var user = await _unitOfWork.Users.GetByIdAsync(userId);
            if (user == null)
                throw new NotFoundException("User not found.");

            var existing = await _unitOfWork.Members.FirstOrDefaultAsync(m => m.UserId == userId);
            if (existing != null)
            {
                await SyncMemberProfileFromUserAsync(userId, cancellationToken);
                return;
            }

            var latestDetail = (await _unitOfWork.UserDetails.FindAsync(d => d.UserId == userId))
                .OrderByDescending(d => d.MeasurementDate)
                .FirstOrDefault();

            var member = new Member
            {
                UserId = userId,
                EmergencyContact = user.EmergencyContact,
                EmergencyPhone = user.EmergencyPhone,
                PreferredGymTime = user.PreferredGymTime,
                DateOfBirth = user.DateOfBirth,
                Gender = user.Gender,
                RegistrationDate = user.RegistrationDate,
                IsActive = user.IsActive,
                FitnessGoal = latestDetail?.GoalType,
                HeightCm = latestDetail?.Height,
                WeightKg = latestDetail?.Weight,
            };

            await _unitOfWork.Members.AddAsync(member);
            await _unitOfWork.SaveChangesAsync();
        }

        public async Task EnsureTrainerProfileAsync(
            int userId,
            TrainerProfileSeedDto? seed = null,
            CancellationToken cancellationToken = default)
        {
            var user = await _unitOfWork.Users.GetByIdAsync(userId);
            if (user == null)
                throw new NotFoundException("User not found.");

            var existing = await _unitOfWork.Trainers.FirstOrDefaultAsync(t => t.UserId == userId);
            if (existing != null)
                return;

            var employeeCode = await TrainerEmployeeCodeGenerator.GenerateNextAsync(_unitOfWork, cancellationToken);
            var trainer = new Trainer
            {
                UserId = userId,
                EmployeeCode = employeeCode,
                Specialization = seed?.Specialization?.Trim(),
                Bio = seed?.Bio?.Trim(),
                IsActive = true,
                IsPersonalTrainer = true,
                HireDate = seed?.HireDate?.Date ?? DateTime.UtcNow.Date,
                JoiningDate = seed?.HireDate?.Date,
            };
            await _unitOfWork.Trainers.AddAsync(trainer);
            await _unitOfWork.SaveChangesAsync();
        }

        public async Task EnsureStaffProfileAsync(
            int userId,
            string? department = null,
            CancellationToken cancellationToken = default)
        {
            var user = await _unitOfWork.Users.GetByIdAsync(userId);
            if (user == null)
                throw new NotFoundException("User not found.");

            var existing = await _unitOfWork.Staff.FirstOrDefaultAsync(s => s.UserId == userId);
            if (existing != null)
            {
                if (!string.IsNullOrWhiteSpace(department) && string.IsNullOrWhiteSpace(existing.Department))
                {
                    existing.Department = department.Trim();
                    _unitOfWork.Staff.Update(existing);
                    await _unitOfWork.SaveChangesAsync();
                }
                return;
            }

            var staff = new Staff
            {
                UserId = userId,
                EmployeeCode = await StaffEmployeeCodeGenerator.GenerateNextAsync(_unitOfWork, cancellationToken),
                Department = department?.Trim() ?? "General",
                IsActive = user.IsActive,
                JoiningDate = DateTime.UtcNow.Date,
            };
            await _unitOfWork.Staff.AddAsync(staff);
            await _unitOfWork.SaveChangesAsync();
        }

        public async Task SyncMemberProfileFromUserAsync(int userId, CancellationToken cancellationToken = default)
        {
            var user = await _unitOfWork.Users.GetByIdAsync(userId);
            if (user == null)
                return;

            var member = await _unitOfWork.Members.FirstOrDefaultAsync(m => m.UserId == userId);
            if (member == null)
                return;

            member.EmergencyContact = user.EmergencyContact;
            member.EmergencyPhone = user.EmergencyPhone;
            member.PreferredGymTime = user.PreferredGymTime;
            member.DateOfBirth = user.DateOfBirth;
            member.Gender = user.Gender;
            member.IsActive = user.IsActive;
            member.UpdatedDate = DateTime.UtcNow;
            _unitOfWork.Members.Update(member);
            await _unitOfWork.SaveChangesAsync();
        }

        public async Task SoftDeleteProfilesForUserAsync(int userId, CancellationToken cancellationToken = default)
        {
            var member = await _unitOfWork.Members.FirstOrDefaultAsync(m => m.UserId == userId);
            if (member != null)
            {
                member.IsDeleted = true;
                member.IsActive = false;
                member.UpdatedDate = DateTime.UtcNow;
                _unitOfWork.Members.Update(member);
            }

            var staff = await _unitOfWork.Staff.FirstOrDefaultAsync(s => s.UserId == userId);
            if (staff != null)
            {
                staff.IsDeleted = true;
                staff.IsActive = false;
                staff.UpdatedDate = DateTime.UtcNow;
                _unitOfWork.Staff.Update(staff);
            }

            var trainer = await _unitOfWork.Trainers.FirstOrDefaultAsync(t => t.UserId == userId);
            if (trainer != null)
            {
                trainer.IsDeleted = true;
                trainer.IsActive = false;
                trainer.UpdatedDate = DateTime.UtcNow;
                _unitOfWork.Trainers.Update(trainer);
            }

            await _unitOfWork.SaveChangesAsync();
        }

        private async Task<List<string>> GetActiveRoleNamesForUserAsync(int userId)
        {
            var userRoleRows = (await _unitOfWork.UserRoles.FindAsync(ur => ur.UserId == userId)).ToList();
            if (userRoleRows.Count == 0)
                return new List<string>();

            var roleIds = userRoleRows.Select(ur => ur.RoleId).ToHashSet();
            return (await _unitOfWork.AppRoles.GetAllAsync())
                .Where(r => roleIds.Contains(r.Id) && r.IsActive)
                .Select(r => r.Name)
                .ToList();
        }

        private async Task EnsureProfileForRoleAsync(
            int userId,
            string roleCode,
            TrainerProfileSeedDto? seed,
            CancellationToken cancellationToken)
        {
            switch (roleCode.ToUpperInvariant())
            {
                case ApplicationRoleCodes.Member:
                    await EnsureMemberProfileAsync(userId, cancellationToken);
                    break;
                case ApplicationRoleCodes.Trainer:
                    await EnsureTrainerProfileAsync(userId, seed, cancellationToken);
                    break;
                case ApplicationRoleCodes.Staff:
                    await EnsureStaffProfileAsync(userId, "General", cancellationToken);
                    break;
                case ApplicationRoleCodes.Receptionist:
                    await EnsureStaffProfileAsync(userId, "Reception", cancellationToken);
                    break;
                case ApplicationRoleCodes.Accountant:
                    await EnsureStaffProfileAsync(userId, "Accounts", cancellationToken);
                    break;
            }
        }

        private async Task DeactivateProfileForRoleAsync(int userId, string roleCode, CancellationToken cancellationToken)
        {
            switch (roleCode.ToUpperInvariant())
            {
                case ApplicationRoleCodes.Member:
                    var member = await _unitOfWork.Members.FirstOrDefaultAsync(m => m.UserId == userId);
                    if (member != null)
                    {
                        member.IsActive = false;
                        member.UpdatedDate = DateTime.UtcNow;
                        _unitOfWork.Members.Update(member);
                    }
                    break;
                case ApplicationRoleCodes.Trainer:
                    var trainer = await _unitOfWork.Trainers.FirstOrDefaultAsync(t => t.UserId == userId);
                    if (trainer != null)
                    {
                        trainer.IsActive = false;
                        trainer.UpdatedDate = DateTime.UtcNow;
                        _unitOfWork.Trainers.Update(trainer);
                    }
                    break;
                case ApplicationRoleCodes.Staff:
                case ApplicationRoleCodes.Receptionist:
                case ApplicationRoleCodes.Accountant:
                    var stillStaffRole = await UserStillHasStaffLikeRoleAsync(userId);
                    if (!stillStaffRole)
                    {
                        var staff = await _unitOfWork.Staff.FirstOrDefaultAsync(s => s.UserId == userId);
                        if (staff != null)
                        {
                            staff.IsActive = false;
                            staff.UpdatedDate = DateTime.UtcNow;
                            _unitOfWork.Staff.Update(staff);
                        }
                    }
                    break;
            }

            await _unitOfWork.SaveChangesAsync();
        }

        private async Task<bool> UserStillHasStaffLikeRoleAsync(int userId)
        {
            var names = await GetActiveRoleNamesForUserAsync(userId);
            return names.Any(n => ApplicationRoleCodes.StaffLikeRoles.Contains(n));
        }

        private static string NormalizeRoleCode(string roleCode)
        {
            var trimmed = roleCode?.Trim().ToUpperInvariant() ?? "";
            if (!ApplicationRoleCodes.All.Contains(trimmed))
                throw new ArgumentException($"Unknown role code '{roleCode}'.");
            return trimmed;
        }

        private static MemberProfileDto MapMember(Member m) => new()
        {
            Id = m.Id,
            UserId = m.UserId,
            FitnessGoal = m.FitnessGoal,
            HeightCm = m.HeightCm,
            WeightKg = m.WeightKg,
            MedicalConditions = m.MedicalConditions,
            EmergencyContact = m.EmergencyContact,
            EmergencyPhone = m.EmergencyPhone,
            PreferredGymTime = m.PreferredGymTime,
            DateOfBirth = m.DateOfBirth,
            Gender = m.Gender,
            RegistrationDate = m.RegistrationDate,
            IsActive = m.IsActive,
        };

        private static StaffProfileDto MapStaff(Staff s) => new()
        {
            Id = s.Id,
            UserId = s.UserId,
            EmployeeCode = s.EmployeeCode,
            Department = s.Department,
            JobTitle = s.JobTitle,
            ShiftType = s.ShiftType,
            JoiningDate = s.JoiningDate,
            IsActive = s.IsActive,
        };

        private static TrainerDto MapTrainer(Trainer t, User? user, string? email) => new()
        {
            Id = t.Id,
            UserId = t.UserId,
            FirstName = user?.FirstName ?? "",
            LastName = user?.LastName ?? "",
            Email = email ?? "",
            Phone = user?.Phone,
            EmployeeCode = t.EmployeeCode,
            Specialization = t.Specialization,
            CertificationDetails = t.CertificationDetails,
            ExperienceYears = t.ExperienceYears,
            Salary = t.Salary,
            CommissionPercentage = t.CommissionPercentage,
            HireDate = t.HireDate,
            JoiningDate = t.JoiningDate,
            Bio = t.Bio,
            ProfilePicture = t.ProfilePicture,
            Rating = t.Rating,
            TotalClients = t.TotalClients,
            MaxClients = t.MaxActiveClients,
            AvailabilityStatus = t.AvailabilityStatus,
            IsPersonalTrainer = t.IsPersonalTrainer,
            TerminationDate = t.TerminationDate,
            TerminationReason = t.TerminationReason,
            IsActive = t.IsActive,
        };
    }
}
