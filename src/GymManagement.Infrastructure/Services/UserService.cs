using Microsoft.EntityFrameworkCore;
using GymManagement.Core.DTOs;
using GymManagement.Core.Exceptions;
using GymManagement.Core.Interfaces;
using GymManagement.Core.Services;
using GymManagement.Domain.Entities;
using GymManagement.Infrastructure.Security;

namespace GymManagement.Infrastructure.Services
{
    public class UserService : IUserService
    {
        private readonly IUnitOfWork _unitOfWork;
        private readonly IMembershipPaymentService _membershipPaymentService;

        public UserService(IUnitOfWork unitOfWork, IMembershipPaymentService membershipPaymentService)
        {
            _unitOfWork = unitOfWork;
            _membershipPaymentService = membershipPaymentService;
        }

        public async Task<IEnumerable<UserDto>> GetAllUsersAsync()
        {
            var users = (await _unitOfWork.Users.GetAllAsync()).ToList();
            var userIds = users.Select(u => u.Id).ToHashSet();
            var allAuth = (await _unitOfWork.AuthUsers.GetAllAsync()).ToList();
            var trainersByUserId = (await _unitOfWork.Trainers.GetAllAsync()).ToDictionary(t => t.UserId, t => t);
            var authByUserId = new Dictionary<int, AuthUser>();
            foreach (var u in users)
            {
                var auth = allAuth.FirstOrDefault(a => a.UserId == u.Id);
                if (auth != null)
                    authByUserId[u.Id] = auth;
            }
            var trainerUserIds = trainersByUserId.Keys.ToHashSet();
            var userTypesByUserId = await GetUserTypesByUserIdsAsync(userIds);
            var appRoleNamesByUserId = await BuildAppRoleNamesByUserIdsAsync(userIds);
            return users.Select(u => MapToDto(u, authByUserId.GetValueOrDefault(u.Id), trainerUserIds.Contains(u.Id), userTypesByUserId.GetValueOrDefault(u.Id), appRoleNamesByUserId.GetValueOrDefault(u.Id)));
        }

        public async Task<UserDto?> GetUserByIdAsync(int id)
        {
            var user = await _unitOfWork.Users.GetByIdAsync(id);
            if (user == null) return null;
            var allAuth = (await _unitOfWork.AuthUsers.GetAllAsync()).ToList();
            var trainer = (await _unitOfWork.Trainers.GetAllAsync()).FirstOrDefault(i => i.UserId == user.Id);
            var authUser = allAuth.FirstOrDefault(a => a.UserId == user.Id);
            var userTypes = await GetUserTypeDtosForUserAsync(id);
            var appRoleNamesByUserId = await BuildAppRoleNamesByUserIdsAsync(new HashSet<int> { id });
            var dto = MapToDto(user, authUser, trainer != null, userTypes, appRoleNamesByUserId.GetValueOrDefault(id));
            await EnrichUserProfileForEditPrefillAsync(dto, id);
            return dto;
        }

        public async Task<UserDto> CreateUserAsync(CreateUserDto createUserDto)
        {
            if (!string.IsNullOrWhiteSpace(createUserDto.Phone))
            {
                var phoneExists = await _unitOfWork.Users.ExistsAsync(u => u.Phone == createUserDto.Phone);
                if (phoneExists)
                    throw new ConflictException($"A user with phone number '{createUserDto.Phone}' already exists.");
            }

            var user = new User
            {
                FirstName = createUserDto.FirstName,
                LastName = createUserDto.LastName,
                Phone = createUserDto.Phone,
                DateOfBirth = createUserDto.DateOfBirth,
                Gender = createUserDto.Gender,
                Address = createUserDto.Address,
                EmergencyContact = createUserDto.EmergencyContact,
                EmergencyPhone = createUserDto.EmergencyPhone,
                ProfilePictureUrl = createUserDto.ProfilePictureUrl,
                PreferredGymTime = createUserDto.PreferredGymTime,
                IsActive = createUserDto.IsActive,
                RegistrationDate = DateTime.UtcNow
            };

            await _unitOfWork.Users.AddAsync(user);
            await _unitOfWork.SaveChangesAsync();

            var accountRole = createUserDto.Role ?? Role.User;

            // If role is Instructor, ensure they have a Trainer profile (create before AuthUser so we can set TrainerId)
            if (accountRole == Role.Instructor)
            {
                var existingTrainer = (await _unitOfWork.Trainers.GetAllAsync()).FirstOrDefault(i => i.UserId == user.Id);
                if (existingTrainer == null)
                {
                    var trainer = new Trainer
                    {
                        UserId = user.Id,
                        EmployeeCode = $"EMP{user.Id}",
                        Specialization = !string.IsNullOrWhiteSpace(createUserDto.InstructorSpecialization) ? createUserDto.InstructorSpecialization.Trim() : null,
                        Bio = !string.IsNullOrWhiteSpace(createUserDto.InstructorBio) ? createUserDto.InstructorBio.Trim() : null,
                        IsActive = true,
                        HireDate = createUserDto.InstructorHireDate?.Date ?? DateTime.UtcNow.Date
                    };
                    await _unitOfWork.Trainers.AddAsync(trainer);
                    await _unitOfWork.SaveChangesAsync();
                }
            }

            // Create AuthUser (single auth table) if email and password are provided
            if (!string.IsNullOrEmpty(createUserDto.Password) && !string.IsNullOrWhiteSpace(createUserDto.Email))
            {
                var emailForAuth = createUserDto.Email.Trim();
                var emailLower = emailForAuth.ToLowerInvariant();
                var existingAuth = await _unitOfWork.AuthUsers
                    .FirstOrDefaultAsync(a => a.Email.ToLower() == emailLower);
                if (existingAuth != null)
                    throw new ConflictException("Email already exists in another account.");

                var passwordHash = PasswordHasher.Hash(createUserDto.Password);

                var authUser = new AuthUser
                {
                    Email = emailForAuth,
                    PasswordHash = passwordHash,
                    UserId = user.Id
                };
                await _unitOfWork.AuthUsers.AddAsync(authUser);
                await _unitOfWork.SaveChangesAsync();
            }

            UserMembership? createdMembership = null;
            MembershipPlan? createdPlan = null;

            // Optional: add membership if PlanId is provided
            if (createUserDto.PlanId.HasValue && createUserDto.PlanId.Value > 0)
            {
                var plan = await _unitOfWork.MembershipPlans.GetByIdAsync(createUserDto.PlanId.Value);
                if (plan != null)
                {
                    createdPlan = plan;
                    var startDate = createUserDto.MembershipStartDate?.Date ?? DateTime.UtcNow.Date;
                    var endDate = startDate.AddDays(plan.DurationDays);
                    var membership = new UserMembership
                    {
                        UserId = user.Id,
                        PlanId = plan.Id,
                        StartDate = startDate,
                        EndDate = endDate,
                        Status = MembershipStatus.Active
                    };
                    await _unitOfWork.UserMemberships.AddAsync(membership);
                    await _unitOfWork.SaveChangesAsync();
                    createdMembership = membership;

                    await _membershipPaymentService.EnsureBillingForNewMembershipAsync(user, membership, plan);
                }
            }

            // Optional: assign trainer if TrainerId is provided
            if (createUserDto.TrainerId.HasValue && createUserDto.TrainerId.Value > 0)
            {
                var trainer = await _unitOfWork.Trainers.GetByIdAsync(createUserDto.TrainerId.Value);
                if (trainer != null)
                {
                    var assignment = new UserInstructor
                    {
                        UserId = user.Id,
                        TrainerId = trainer.Id,
                        AssignmentDate = DateTime.UtcNow,
                        IsActive = true
                    };
                    await _unitOfWork.UserInstructors.AddAsync(assignment);
                    await _unitOfWork.SaveChangesAsync();
                }
            }

            // User types (many-to-many)
            if (createUserDto.UserTypeIds != null && createUserDto.UserTypeIds.Count > 0)
            {
                foreach (var typeId in createUserDto.UserTypeIds.Where(tid => tid > 0))
                {
                    var userType = await _unitOfWork.UserTypes.GetByIdAsync(typeId);
                    if (userType != null)
                    {
                        await _unitOfWork.UserUserTypes.AddAsync(new UserUserType { UserId = user.Id, UserTypeId = typeId });
                    }
                }
                await _unitOfWork.SaveChangesAsync();
            }

            await AuthUserRoleHelper.EnsureUserHasAppRoleAsync(_unitOfWork, user.Id, AuthUserRoleHelper.MapRoleEnumToAppRoleName(accountRole));
            await _unitOfWork.SaveChangesAsync();

            var authForNew = (await _unitOfWork.AuthUsers.GetAllAsync()).FirstOrDefault(a => a.UserId == user.Id);
            var trainerUserIds = (await _unitOfWork.Trainers.GetAllAsync()).Select(i => i.UserId).ToHashSet();
            var userTypeDtos = await GetUserTypeDtosForUserAsync(user.Id);
            var appRoleNamesForNew = await BuildAppRoleNamesByUserIdsAsync(new HashSet<int> { user.Id });
            var dto = MapToDto(user, authForNew, trainerUserIds.Contains(user.Id), userTypeDtos, appRoleNamesForNew.GetValueOrDefault(user.Id));

            if (createdMembership != null && createdPlan != null)
            {
                var billings = await _unitOfWork.MembershipPayments.FindAsync(p => p.MembershipId == createdMembership.Id);
                var billing = billings.FirstOrDefault();
                if (billing != null && billing.PaymentStatus != MembershipPaymentStatus.Paid)
                {
                    dto.PendingPaymentCollection = new PendingMembershipPaymentRedirectDto
                    {
                        UserId = user.Id,
                        MembershipId = createdMembership.Id,
                        MembershipPlanId = createdPlan.Id,
                        MembershipAmount = createdPlan.Price,
                        MembershipDurationDays = createdPlan.DurationDays,
                        StartDate = createdMembership.StartDate,
                        EndDate = createdMembership.EndDate,
                        MembershipPaymentId = billing.Id,
                    };
                }
            }

            return dto;
        }

        public async Task<UserDto?> UpdateUserAsync(int id, UpdateUserDto updateUserDto)
        {
            var user = await _unitOfWork.Users.GetByIdAsync(id);
            if (user == null) return null;

            if (!string.IsNullOrEmpty(updateUserDto.FirstName))
                user.FirstName = updateUserDto.FirstName;
            if (!string.IsNullOrEmpty(updateUserDto.LastName))
                user.LastName = updateUserDto.LastName;
            if (updateUserDto.Phone != null)
            {
                var phoneTaken = await _unitOfWork.Users.ExistsAsync(u => u.Phone == updateUserDto.Phone && u.Id != id);
                if (phoneTaken)
                    throw new ConflictException($"A user with phone number '{updateUserDto.Phone}' already exists.");
                user.Phone = updateUserDto.Phone;
            }
            if (updateUserDto.DateOfBirth.HasValue)
                user.DateOfBirth = updateUserDto.DateOfBirth.Value;
            if (!string.IsNullOrEmpty(updateUserDto.Gender))
                user.Gender = updateUserDto.Gender;
            if (updateUserDto.Address != null)
                user.Address = updateUserDto.Address;
            if (updateUserDto.EmergencyContact != null)
                user.EmergencyContact = updateUserDto.EmergencyContact;
            if (updateUserDto.EmergencyPhone != null)
                user.EmergencyPhone = updateUserDto.EmergencyPhone;
            if (updateUserDto.ProfilePictureUrl != null)
                user.ProfilePictureUrl = updateUserDto.ProfilePictureUrl;
            if (updateUserDto.PreferredGymTime != null)
                user.PreferredGymTime = updateUserDto.PreferredGymTime;
            if (updateUserDto.IsActive.HasValue)
                user.IsActive = updateUserDto.IsActive.Value;

            _unitOfWork.Users.Update(user);
            await _unitOfWork.SaveChangesAsync();

            // Optional: add membership if PlanId is provided
            if (updateUserDto.PlanId.HasValue && updateUserDto.PlanId.Value > 0)
            {
                var plan = await _unitOfWork.MembershipPlans.GetByIdAsync(updateUserDto.PlanId.Value);
                if (plan != null)
                {
                    var startDate = updateUserDto.MembershipStartDate?.Date ?? DateTime.UtcNow.Date;
                    var endDate = startDate.AddDays(plan.DurationDays);
                    var membership = new UserMembership
                    {
                        UserId = id,
                        PlanId = plan.Id,
                        StartDate = startDate,
                        EndDate = endDate,
                        Status = MembershipStatus.Active
                    };
                    await _unitOfWork.UserMemberships.AddAsync(membership);
                    await _unitOfWork.SaveChangesAsync();

                    await _membershipPaymentService.EnsureBillingForNewMembershipAsync(user, membership, plan);
                }
            }

            // Optional: assign trainer if TrainerId is provided
            if (updateUserDto.TrainerId.HasValue && updateUserDto.TrainerId.Value > 0)
            {
                var trainer = await _unitOfWork.Trainers.GetByIdAsync(updateUserDto.TrainerId.Value);
                if (trainer != null)
                {
                    var assignment = new UserInstructor
                    {
                        UserId = id,
                        TrainerId = trainer.Id,
                        AssignmentDate = DateTime.UtcNow,
                        IsActive = true
                    };
                    await _unitOfWork.UserInstructors.AddAsync(assignment);
                    await _unitOfWork.SaveChangesAsync();
                }
            }

            // User types: sync selection if provided (revive soft-deleted links; avoid unique-index clash on re-add)
            if (updateUserDto.UserTypeIds != null)
            {
                var validIds = new List<int>();
                foreach (var typeId in updateUserDto.UserTypeIds.Where(tid => tid > 0).Distinct())
                {
                    var userType = await _unitOfWork.UserTypes.GetByIdAsync(typeId);
                    if (userType != null)
                        validIds.Add(typeId);
                }

                await _unitOfWork.SyncUserUserTypesAsync(id, validIds);
                await _unitOfWork.SaveChangesAsync();
            }

            return await GetUserByIdAsync(id);
        }

        public async Task<bool> DeleteUserAsync(int id)
        {
            var user = await _unitOfWork.Users.GetByIdAsync(id);
            if (user == null) return false;

            _unitOfWork.Users.Delete(user);
            await _unitOfWork.SaveChangesAsync();
            return true;
        }

        public async Task<IEnumerable<UserDetailDto>> GetUserDetailsAsync(int userId)
        {
            var details = await _unitOfWork.UserDetails.FindAsync(d => d.UserId == userId);
            return details.Select(d => MapDetailToDto(d));
        }

        public async Task<UserDetailDto> AddUserDetailAsync(CreateUserDetailDto createUserDetailDto)
        {
            var height = createUserDetailDto.Height;
            var weight = createUserDetailDto.Weight;
            var bmi = CalculateBMI(height, weight);
            var bmr = CalculateBMR(weight, height, DateTime.Now, "Male"); // You might want to get gender from user

            var userDetail = new UserDetail
            {
                UserId = createUserDetailDto.UserId,
                Height = height,
                Weight = weight,
                BMI = bmi,
                BMR = bmr,
                BodyFatPercentage = createUserDetailDto.BodyFatPercentage,
                MuscleMass = createUserDetailDto.MuscleMass,
                TargetWeight = createUserDetailDto.TargetWeight,
                GoalType = createUserDetailDto.GoalType,
                ActivityLevel = createUserDetailDto.ActivityLevel,
                Notes = createUserDetailDto.Notes,
                MeasurementDate = DateTime.UtcNow
            };

            await _unitOfWork.UserDetails.AddAsync(userDetail);

            // Add to body metrics history so UserDetails = latest, BodyMetricsLogs = history
            var log = new BodyMetricsLog
            {
                UserId = createUserDetailDto.UserId,
                MeasurementDate = DateTime.UtcNow,
                WeightKg = weight,
                HeightCm = height,
                BodyFatPct = createUserDetailDto.BodyFatPercentage,
                MuscleMassKg = createUserDetailDto.MuscleMass,
                Notes = createUserDetailDto.Notes
            };
            await _unitOfWork.BodyMetricsLogs.AddAsync(log);

            await _unitOfWork.SaveChangesAsync();

            return MapDetailToDto(userDetail);
        }

        private async Task<Dictionary<int, List<string>>> BuildAppRoleNamesByUserIdsAsync(HashSet<int> userIds)
        {
            if (userIds.Count == 0)
                return new Dictionary<int, List<string>>();
            var allUr = (await _unitOfWork.UserRoles.FindAsync(ur => userIds.Contains(ur.UserId))).ToList();
            if (allUr.Count == 0)
                return new Dictionary<int, List<string>>();
            var roleIds = allUr.Select(ur => ur.RoleId).Distinct().ToHashSet();
            var appRoles = (await _unitOfWork.AppRoles.GetAllAsync()).Where(r => roleIds.Contains(r.Id)).ToDictionary(r => r.Id);
            return allUr
                .GroupBy(ur => ur.UserId)
                .ToDictionary(g => g.Key, g => g.Select(ur => appRoles[ur.RoleId].Name).ToList());
        }

        private static UserDto MapToDto(User user, AuthUser? authUser = null, bool isInstructorProfile = false, List<UserTypeDto>? userTypes = null, List<string>? appRoleNamesFromUserRoles = null)
        {
            var role = AuthUserRoleHelper.ResolveRoleForUserDto(authUser, isInstructorProfile, userTypes, appRoleNamesFromUserRoles);
            var username = authUser?.Email;
            return new UserDto
            {
                Id = user.Id,
                FirstName = user.FirstName,
                LastName = user.LastName,
                Email = authUser?.Email ?? "",
                Phone = user.Phone,
                DateOfBirth = user.DateOfBirth,
                Gender = user.Gender,
                RegistrationDate = user.RegistrationDate,
                Address = user.Address,
                EmergencyContact = user.EmergencyContact,
                EmergencyPhone = user.EmergencyPhone,
                ProfilePictureUrl = user.ProfilePictureUrl,
                PreferredGymTime = user.PreferredGymTime,
                IsActive = user.IsActive,
                Role = role,
                Username = username,
                UserTypes = userTypes ?? new List<UserTypeDto>()
            };
        }

        private async Task<Dictionary<int, List<UserTypeDto>>> GetUserTypesByUserIdsAsync(IEnumerable<int> userIds)
        {
            var idSet = userIds.ToHashSet();
            if (idSet.Count == 0) return new Dictionary<int, List<UserTypeDto>>();
            var uuts = (await _unitOfWork.UserUserTypes.FindAsync(uut => idSet.Contains(uut.UserId))).ToList();
            var typeIds = uuts.Select(x => x.UserTypeId).Distinct().ToList();
            var types = (await _unitOfWork.UserTypes.GetAllAsync()).Where(t => typeIds.Contains(t.Id)).ToDictionary(t => t.Id);
            var result = new Dictionary<int, List<UserTypeDto>>();
            foreach (var userId in idSet)
            {
                var dtos = uuts.Where(uut => uut.UserId == userId)
                    .Select(uut => types.GetValueOrDefault(uut.UserTypeId))
                    .Where(t => t != null)
                    .Select(t => new UserTypeDto { Id = t!.Id, Name = t.Name, Description = t.Description })
                    .ToList();
                result[userId] = dtos;
            }
            return result;
        }

        private async Task<List<UserTypeDto>> GetUserTypeDtosForUserAsync(int userId)
        {
            var uuts = await _unitOfWork.UserUserTypes.FindAsync(uut => uut.UserId == userId);
            var typeIds = uuts.Select(uut => uut.UserTypeId).Distinct().ToList();
            if (typeIds.Count == 0) return new List<UserTypeDto>();
            var types = (await _unitOfWork.UserTypes.GetAllAsync()).Where(t => typeIds.Contains(t.Id));
            return types.Select(t => new UserTypeDto { Id = t.Id, Name = t.Name, Description = t.Description }).ToList();
        }

        /// <summary>
        /// Populates membership and trainer fields for the admin edit-user form without requiring extra API calls
        /// (membership/instructor endpoints may be permission-gated).
        /// </summary>
        private async Task EnrichUserProfileForEditPrefillAsync(UserDto dto, int userId)
        {
            var activeMemberships = (await _unitOfWork.UserMemberships.FindAsync(m =>
                m.UserId == userId && (
                    m.Status == MembershipStatus.Active
                    || m.Status == MembershipStatus.ActivePendingPayment
                    || m.Status == MembershipStatus.PartialPayment))).ToList();
            var bestMembership = activeMemberships
                .OrderByDescending(m => m.StartDate)
                .FirstOrDefault();
            if (bestMembership != null)
            {
                dto.CurrentMembershipPlanId = bestMembership.PlanId;
                dto.CurrentMembershipStartDate = bestMembership.StartDate;
            }

            var activeAssignments = (await _unitOfWork.UserInstructors.FindAsync(ui =>
                ui.UserId == userId && ui.IsActive && !ui.EndDate.HasValue)).ToList();
            var primary = activeAssignments
                .OrderByDescending(ui => ui.AssignmentDate)
                .FirstOrDefault();
            if (primary != null)
                dto.AssignedTrainerId = primary.TrainerId;
        }

        private static UserDetailDto MapDetailToDto(UserDetail detail)
        {
            return new UserDetailDto
            {
                Id = detail.Id,
                UserId = detail.UserId,
                Height = detail.Height,
                Weight = detail.Weight,
                BMR = detail.BMR,
                BMI = detail.BMI,
                BodyFatPercentage = detail.BodyFatPercentage,
                MuscleMass = detail.MuscleMass,
                TargetWeight = detail.TargetWeight,
                GoalType = detail.GoalType,
                ActivityLevel = detail.ActivityLevel,
                MeasurementDate = detail.MeasurementDate,
                Notes = detail.Notes
            };
        }

        private static decimal CalculateBMI(decimal height, decimal weight)
        {
            // BMI = weight (kg) / (height (m))^2
            var heightInMeters = height / 100;
            return weight / (heightInMeters * heightInMeters);
        }

        private static decimal CalculateBMR(decimal weight, decimal height, DateTime dateOfBirth, string gender)
        {
            // Using Mifflin-St Jeor Equation
            var age = DateTime.Now.Year - dateOfBirth.Year;
            if (DateTime.Now.DayOfYear < dateOfBirth.DayOfYear) age--;

            if (gender.Equals("Male", StringComparison.OrdinalIgnoreCase))
            {
                return 10 * weight + 6.25m * height - 5 * age + 5;
            }
            else
            {
                return 10 * weight + 6.25m * height - 5 * age - 161;
            }
        }

    }
}

