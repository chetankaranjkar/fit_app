using Microsoft.EntityFrameworkCore;
using GymManagement.Core.Authorization;
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
        private readonly IUserInstructorService _userInstructorService;
        private readonly IUserProvisioningService _provisioning;
        private readonly IRbacService _rbacService;

        public UserService(
            IUnitOfWork unitOfWork,
            IMembershipPaymentService membershipPaymentService,
            IUserInstructorService userInstructorService,
            IUserProvisioningService provisioning,
            IRbacService rbacService)
        {
            _unitOfWork = unitOfWork;
            _membershipPaymentService = membershipPaymentService;
            _userInstructorService = userInstructorService;
            _provisioning = provisioning;
            _rbacService = rbacService;
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
            var billingByUserId = await GetBillingSummariesByUserIdsAsync(userIds);
            var trainerAssignmentByUserId = await GetActiveTrainerAssignmentByUserIdsAsync(userIds);
            return users.Select(u =>
            {
                var dto = MapToDto(u, authByUserId.GetValueOrDefault(u.Id), trainerUserIds.Contains(u.Id), userTypesByUserId.GetValueOrDefault(u.Id), appRoleNamesByUserId.GetValueOrDefault(u.Id));
                EnrichWithBillingSummary(dto, billingByUserId.GetValueOrDefault(u.Id));
                EnrichWithTrainerAssignment(dto, trainerAssignmentByUserId.GetValueOrDefault(u.Id));
                return dto;
            });
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
            await EnrichProfileIdsAsync(dto, id);
            return dto;
        }

        public async Task<UserAggregateDto?> GetUserAggregateAsync(int id)
        {
            var user = await GetUserByIdAsync(id);
            if (user == null)
                return null;

            var (member, staff, trainer) = await _provisioning.GetProfilesAsync(id);
            var appRoles = await _rbacService.GetUserAppRolesAsync(id);
            user.AppRoles = appRoles.ToList();

            return new UserAggregateDto
            {
                User = user,
                AppRoles = appRoles,
                MemberProfile = member,
                StaffProfile = staff,
                TrainerProfile = trainer,
            };
        }

        public Task AssignRoleAsync(int userId, string roleCode) =>
            _provisioning.AssignRoleAsync(userId, roleCode);

        public Task RevokeRoleAsync(int userId, string roleCode) =>
            _provisioning.RevokeRoleAsync(userId, roleCode);

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

            if (createUserDto.TrainerId.HasValue)
                await _userInstructorService.AssignOrReplaceMemberTrainerAsync(user.Id, createUserDto.TrainerId.Value);

            // User types (many-to-many, legacy UI)
            if (createUserDto.UserTypeIds != null && createUserDto.UserTypeIds.Count > 0)
            {
                foreach (var typeId in createUserDto.UserTypeIds.Where(tid => tid > 0))
                {
                    var userType = await _unitOfWork.UserTypes.GetByIdAsync(typeId);
                    if (userType != null)
                        await _unitOfWork.UserUserTypes.AddAsync(new UserUserType { UserId = user.Id, UserTypeId = typeId });
                }
                await _unitOfWork.SaveChangesAsync();
            }

            await AuthUserRoleHelper.EnsureUserHasAppRoleAsync(_unitOfWork, user.Id, AuthUserRoleHelper.MapRoleEnumToAppRoleName(accountRole));
            await _unitOfWork.SaveChangesAsync();

            await _provisioning.SyncFromUserTypeIdsAsync(user.Id, createUserDto.UserTypeIds);
            await _provisioning.EnsureProfilesForUserAsync(user.Id);
            if (accountRole == Role.Instructor)
            {
                await _provisioning.AssignRoleAsync(user.Id, ApplicationRoleCodes.Trainer);
                await _provisioning.EnsureTrainerProfileAsync(user.Id, new TrainerProfileSeedDto
                {
                    Specialization = createUserDto.InstructorSpecialization,
                    Bio = createUserDto.InstructorBio,
                    HireDate = createUserDto.InstructorHireDate,
                });
            }
            else if (accountRole == Role.User)
            {
                await _provisioning.EnsureMemberProfileAsync(user.Id);
            }

            await _provisioning.SyncMemberProfileFromUserAsync(user.Id);

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

            if (updateUserDto.TrainerId.HasValue)
                await _userInstructorService.AssignOrReplaceMemberTrainerAsync(id, updateUserDto.TrainerId.Value);

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
                await _provisioning.SyncFromUserTypeIdsAsync(id, validIds);
            }

            await _provisioning.SyncMemberProfileFromUserAsync(id);
            await _provisioning.EnsureProfilesForUserAsync(id);

            if (!string.IsNullOrWhiteSpace(updateUserDto.Password))
                await ApplyAdminPasswordUpdateAsync(user, updateUserDto.Password, updateUserDto.Email);

            return await GetUserByIdAsync(id);
        }

        private async Task ApplyAdminPasswordUpdateAsync(User user, string newPassword, string? loginEmail)
        {
            var password = newPassword.Trim();
            if (password.Length < 6)
                throw new ArgumentException("Password must be at least 6 characters.");

            var passwordHash = PasswordHasher.Hash(password);

            var authUser = (await _unitOfWork.AuthUsers.GetAllAsync())
                .FirstOrDefault(a => a.UserId == user.Id);

            var emailForAuth = authUser?.Email?.Trim();
            if (string.IsNullOrWhiteSpace(emailForAuth))
                emailForAuth = loginEmail?.Trim();

            if (string.IsNullOrWhiteSpace(emailForAuth))
                throw new ArgumentException(
                    "Login email is required to set a password for a user who does not have a login account yet.");

            var emailLower = emailForAuth.ToLowerInvariant();

            if (authUser == null)
            {
                var existingAuth = (await _unitOfWork.AuthUsers.GetAllAsync())
                    .FirstOrDefault(a => string.Equals(a.Email, emailLower, StringComparison.OrdinalIgnoreCase));
                if (existingAuth != null)
                    throw new ConflictException("Email already exists in another account.");

                authUser = new AuthUser
                {
                    Email = emailForAuth,
                    PasswordHash = passwordHash,
                    UserId = user.Id,
                };
                await _unitOfWork.AuthUsers.AddAsync(authUser);
            }
            else
            {
                authUser.PasswordHash = passwordHash;
                authUser.FailedLoginAttempts = 0;
                authUser.LockoutEnd = null;
                _unitOfWork.AuthUsers.Update(authUser);
            }

            await _unitOfWork.SaveChangesAsync();

            var trainers = await _unitOfWork.Trainers.GetAllAsync();
            var isTrainer = trainers.Any(t => t.UserId == user.Id);
            var accountRole = isTrainer ? Role.Instructor : Role.User;
            await AuthUserRoleHelper.EnsureUserHasAppRoleAsync(
                _unitOfWork,
                user.Id,
                AuthUserRoleHelper.MapRoleEnumToAppRoleName(accountRole));
            await _unitOfWork.SaveChangesAsync();
            await _provisioning.EnsureProfilesForUserAsync(user.Id);
        }

        public async Task<bool> DeleteUserAsync(int id)
        {
            var user = await _unitOfWork.Users.GetByIdAsync(id);
            if (user == null) return false;

            await _provisioning.SoftDeleteProfilesForUserAsync(id);
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

        private sealed class UserBillingListSummary
        {
            public MembershipPayment Latest { get; init; } = null!;
            public bool HasOpenBalance { get; init; }
        }

        private async Task<Dictionary<int, UserBillingListSummary>> GetBillingSummariesByUserIdsAsync(IEnumerable<int> userIds)
        {
            var idSet = userIds.ToHashSet();
            if (idSet.Count == 0)
                return new Dictionary<int, UserBillingListSummary>();

            var billings = (await _unitOfWork.MembershipPayments.FindAsync(
                p => idSet.Contains(p.UserId) && !p.IsDeleted)).ToList();

            return billings
                .GroupBy(p => p.UserId)
                .ToDictionary(g => g.Key, g =>
                {
                    var latest = g.OrderByDescending(p => p.CreatedDate).First();
                    var hasOpen = g.Any(p =>
                        p.PaymentStatus != MembershipPaymentStatus.Paid && p.PendingAmount > 0.02m);
                    return new UserBillingListSummary { Latest = latest, HasOpenBalance = hasOpen };
                });
        }

        private static void EnrichWithBillingSummary(UserDto dto, UserBillingListSummary? summary)
        {
            if (summary == null)
                return;

            var billing = summary.Latest;
            dto.MembershipPaymentStatus = billing.PaymentStatus.ToString();
            dto.PendingPaymentAmount = billing.PendingAmount;
            dto.PaymentNextDueDate = billing.NextDueDate;
            dto.PaymentLastPaidDate = billing.PaymentDate;
            dto.IsPaymentOverdue = summary.HasOpenBalance && IsPaymentOverdue(billing);
            if (summary.HasOpenBalance)
            {
                dto.OpenMembershipPaymentId = billing.Id;
                dto.OpenMembershipId = billing.MembershipId;
            }
        }

        private static bool IsPaymentOverdue(MembershipPayment billing)
        {
            if (billing.PendingAmount <= 0.02m)
                return false;
            if (billing.PaymentStatus == MembershipPaymentStatus.Overdue)
                return true;
            return billing.NextDueDate.HasValue
                   && billing.NextDueDate.Value.Date < DateTime.UtcNow.Date;
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

            var map = await GetActiveTrainerAssignmentByUserIdsAsync(new HashSet<int> { userId });
            EnrichWithTrainerAssignment(dto, map.GetValueOrDefault(userId));
            await EnrichProfileIdsAsync(dto, userId);
        }

        private async Task EnrichProfileIdsAsync(UserDto dto, int userId)
        {
            var member = await _unitOfWork.Members.FirstOrDefaultAsync(m => m.UserId == userId);
            if (member != null)
                dto.MemberProfileId = member.Id;

            var trainer = await _unitOfWork.Trainers.FirstOrDefaultAsync(t => t.UserId == userId);
            if (trainer != null)
                dto.TrainerProfileId = trainer.Id;

            var staff = await _unitOfWork.Staff.FirstOrDefaultAsync(s => s.UserId == userId);
            if (staff != null)
                dto.StaffProfileId = staff.Id;
        }

        private async Task<Dictionary<int, (int TrainerId, string TrainerName)>> GetActiveTrainerAssignmentByUserIdsAsync(
            HashSet<int> userIds)
        {
            if (userIds.Count == 0)
                return new Dictionary<int, (int, string)>();

            var assignments = (await _unitOfWork.UserInstructors.FindAsync(ui =>
                userIds.Contains(ui.UserId) && ui.IsActive && !ui.EndDate.HasValue)).ToList();
            if (assignments.Count == 0)
                return new Dictionary<int, (int, string)>();

            var primaryByUser = assignments
                .GroupBy(a => a.UserId)
                .ToDictionary(g => g.Key, g => g.OrderByDescending(a => a.AssignmentDate).First());

            var trainerIds = primaryByUser.Values.Select(a => a.TrainerId).Distinct().ToList();
            var trainers = (await _unitOfWork.Trainers.FindAsync(t => trainerIds.Contains(t.Id))).ToDictionary(t => t.Id);
            var trainerUserIds = trainers.Values.Select(t => t.UserId).Distinct().ToList();
            var trainerUsers = (await _unitOfWork.Users.FindAsync(u => trainerUserIds.Contains(u.Id)))
                .ToDictionary(u => u.Id);

            var result = new Dictionary<int, (int, string)>();
            foreach (var entry in primaryByUser)
            {
                var userId = entry.Key;
                var assignment = entry.Value;
                if (!trainers.TryGetValue(assignment.TrainerId, out var trainer))
                    continue;
                var name = trainerUsers.TryGetValue(trainer.UserId, out var tu)
                    ? $"{tu.FirstName} {tu.LastName}".Trim()
                    : $"Trainer #{trainer.Id}";
                result[userId] = (assignment.TrainerId, name);
            }

            return result;
        }

        private static void EnrichWithTrainerAssignment(UserDto dto, (int TrainerId, string TrainerName)? assignment)
        {
            if (assignment == null)
                return;
            dto.AssignedTrainerId = assignment.Value.TrainerId;
            dto.AssignedTrainerName = assignment.Value.TrainerName;
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

