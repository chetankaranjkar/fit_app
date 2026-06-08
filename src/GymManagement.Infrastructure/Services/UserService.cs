using Microsoft.EntityFrameworkCore;
using GymManagement.Core.Authorization;
using GymManagement.Core.DTOs;
using GymManagement.Core.DTOs.Common;
using GymManagement.Core.Exceptions;
using GymManagement.Core.Interfaces;
using GymManagement.Core.Services;
using GymManagement.Core.Security;
using GymManagement.Core.Validation;
using GymManagement.Domain.Entities;
using GymManagement.Infrastructure.Data;
using GymManagement.Infrastructure.Search;
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
        private readonly ApplicationDbContext _db;
        private readonly ICurrentUserAccessContext _accessContext;
        private readonly IMobileNumberAvailabilityService _mobileAvailability;
        private readonly IUsernameAvailabilityService _usernameAvailability;
        private int? _cachedMemberUserTypeId;

        public UserService(
            IUnitOfWork unitOfWork,
            IMembershipPaymentService membershipPaymentService,
            IUserInstructorService userInstructorService,
            IUserProvisioningService provisioning,
            IRbacService rbacService,
            ApplicationDbContext db,
            ICurrentUserAccessContext accessContext,
            IMobileNumberAvailabilityService mobileAvailability,
            IUsernameAvailabilityService usernameAvailability)
        {
            _unitOfWork = unitOfWork;
            _membershipPaymentService = membershipPaymentService;
            _userInstructorService = userInstructorService;
            _provisioning = provisioning;
            _rbacService = rbacService;
            _db = db;
            _accessContext = accessContext;
            _mobileAvailability = mobileAvailability;
            _usernameAvailability = usernameAvailability;
        }

        public async Task<IEnumerable<UserDto>> GetAllUsersAsync()
        {
            var users = (await _unitOfWork.Users.GetAllAsync()).ToList();
            var userIds = users.Select(u => u.Id).ToHashSet();
            var allAuth = (await _unitOfWork.AuthUsers.GetAllAsync()).ToList();
            var trainersByUserId = (await _unitOfWork.Trainers.GetAllAsync()).ToDictionary(t => t.UserId, t => t);
            var authByUserId = allAuth
                .Where(a => a.UserId.HasValue)
                .GroupBy(a => a.UserId!.Value)
                .ToDictionary(g => g.Key, g => g.First());
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

        public async Task<PagedResultDto<UserDto>> GetUsersPagedAsync(
            int page,
            int pageSize,
            string? search = null,
            bool membersOnly = false,
            bool? isActive = null,
            bool includeBillingSummary = true,
            string? preferredGymTime = null)
        {
            var safePage = page < 1 ? 1 : page;
            var safePageSize = Math.Clamp(pageSize, 1, 200);
            IQueryable<User> query = _db.Users.AsNoTracking().Where(u => !u.IsDeleted);

            if (isActive.HasValue)
                query = query.Where(u => u.IsActive == isActive.Value);

            query = query.ApplyPreferredGymTimeFilter(_db.Members, preferredGymTime);

            if (membersOnly)
            {
                var memberTypeId = await ResolveMemberUserTypeIdAsync().ConfigureAwait(false);
                if (!memberTypeId.HasValue)
                    query = query.Where(_ => false);
                else
                    query = query.ApplyMembersOnlyFilter(_db.UserUserTypes, memberTypeId.Value);
            }

            query = query.ApplyUserSearchFilter(_db.AuthUsers, search);

            var pageUsers = await query
                .OrderByDescending(u => u.RegistrationDate)
                .ThenByDescending(u => u.Id)
                .Skip((safePage - 1) * safePageSize)
                .Take(safePageSize)
                .ToListAsync()
                .ConfigureAwait(false);

            var totalCount = pageUsers.Count < safePageSize
                ? (safePage - 1) * safePageSize + pageUsers.Count
                : await query.CountAsync().ConfigureAwait(false);

            var userIds = pageUsers.Select(u => u.Id).ToHashSet();
            var pageAuth = await _db.AuthUsers.AsNoTracking()
                .Where(a => !a.IsDeleted && a.UserId.HasValue && userIds.Contains(a.UserId.Value))
                .ToListAsync()
                .ConfigureAwait(false);
            var authByUserId = pageAuth
                .Where(a => a.UserId.HasValue)
                .GroupBy(a => a.UserId!.Value)
                .ToDictionary(g => g.Key, g => g.First());
            var trainerUserIds = (await _db.Trainers.AsNoTracking()
                .Where(t => !t.IsDeleted && userIds.Contains(t.UserId))
                .Select(t => t.UserId)
                .ToListAsync()
                .ConfigureAwait(false)).ToHashSet();
            var userTypesByUserId = await GetUserTypesByUserIdsAsync(userIds).ConfigureAwait(false);
            var appRoleNamesByUserId = await BuildAppRoleNamesByUserIdsAsync(userIds).ConfigureAwait(false);
            var billingByUserId = includeBillingSummary
                ? await GetBillingSummariesByUserIdsAsync(userIds).ConfigureAwait(false)
                : new Dictionary<int, UserBillingListSummary>();
            var trainerAssignmentByUserId = await GetActiveTrainerAssignmentByUserIdsAsync(userIds).ConfigureAwait(false);

            var items = pageUsers.Select(u =>
            {
                var dto = MapToDto(
                    u,
                    authByUserId.GetValueOrDefault(u.Id),
                    trainerUserIds.Contains(u.Id),
                    userTypesByUserId.GetValueOrDefault(u.Id),
                    appRoleNamesByUserId.GetValueOrDefault(u.Id));
                EnrichWithBillingSummary(dto, billingByUserId.GetValueOrDefault(u.Id));
                EnrichWithTrainerAssignment(dto, trainerAssignmentByUserId.GetValueOrDefault(u.Id));
                return dto;
            }).ToList();

            return new PagedResultDto<UserDto>
            {
                Items = items,
                TotalCount = totalCount,
                Page = safePage,
                PageSize = safePageSize,
            };
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
            var normalizedPhone = PhoneNumberValidator.NormalizeRequiredPhone(createUserDto.Phone);
            await _mobileAvailability.EnsureAvailableOrThrowAsync(normalizedPhone);

            var normalizedAadhaar = AadhaarNumberValidator.TryNormalizeOptionalAadhaar(createUserDto.AadhaarNumber);
            if (normalizedAadhaar != null)
                await EnsureAadhaarNotDuplicateAsync(normalizedAadhaar);

            DateOfBirthValidator.EnsureValid(createUserDto.DateOfBirth);

            var strategy = _db.Database.CreateExecutionStrategy();
            return await strategy.ExecuteAsync(async () =>
            {
                await using var transaction = await _db.Database.BeginTransactionAsync();
                try
                {
                    return await CreateUserWithinTransactionAsync(
                        createUserDto,
                        normalizedPhone,
                        normalizedAadhaar);
                }
                catch
                {
                    await transaction.RollbackAsync();
                    throw;
                }
            });
        }

        private async Task<UserDto> CreateUserWithinTransactionAsync(
            CreateUserDto createUserDto,
            string normalizedPhone,
            string? normalizedAadhaar)
        {
            var accountRole = createUserDto.Role ?? Role.User;

            // Portal / mobile login id is stored in AuthUsers.Email (member signs in with their email).
            var loginId = ResolveLoginId(createUserDto);
            var password = createUserDto.Password?.Trim();
            var willCreateAuth = !string.IsNullOrEmpty(password) || !string.IsNullOrWhiteSpace(loginId);
            string? passwordHash = null;
            if (willCreateAuth)
            {
                if (string.IsNullOrWhiteSpace(loginId))
                    throw new ArgumentException("Email is required for portal and mobile login.");
                if (string.IsNullOrEmpty(password))
                    throw new ArgumentException("Password is required.");
                if (password.Length < 6)
                    throw new ArgumentException("Password must be at least 6 characters.");

                var usernameCheck = await _usernameAvailability.CheckAsync(loginId);
                if (!usernameCheck.IsAvailable)
                    throw new ConflictException(
                        usernameCheck.ValidationError ?? UsernameAvailabilityService.DuplicateUsernameMessage);

                passwordHash = PasswordHasher.Hash(password);
            }

            var user = new User
            {
                FirstName = createUserDto.FirstName,
                LastName = createUserDto.LastName,
                Phone = normalizedPhone,
                AadhaarNumber = normalizedAadhaar,
                DateOfBirth = createUserDto.DateOfBirth,
                Gender = createUserDto.Gender,
                Address = createUserDto.Address,
                EmergencyContact = createUserDto.EmergencyContact,
                EmergencyPhone = PhoneNumberValidator.NormalizeOptionalPhone(createUserDto.EmergencyPhone),
                ProfilePictureUrl = createUserDto.ProfilePictureUrl,
                PreferredGymTime = createUserDto.PreferredGymTime,
                IsActive = createUserDto.IsActive,
                RegistrationDate = DateTime.UtcNow
            };

            await _unitOfWork.Users.AddAsync(user);
            await _unitOfWork.SaveChangesAsync();

            if (willCreateAuth && passwordHash != null)
            {
                await _unitOfWork.AuthUsers.AddAsync(new AuthUser
                {
                    Email = loginId!,
                    PasswordHash = passwordHash,
                    UserId = user.Id,
                });
                await _unitOfWork.SaveChangesAsync();
            }

            if (normalizedAadhaar != null)
                await LogAadhaarAuditAsync(user.Id, "Aadhaar Created", null, normalizedAadhaar);

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
                    await UserMembershipConflictGuard.EnsureNoActiveMembershipBeforeCreateAsync(_db, user.Id);
                    var membership = new UserMembership
                    {
                        UserId = user.Id,
                        PlanId = plan.Id,
                        StartDate = startDate,
                        EndDate = endDate,
                        Status = IsTrialMembershipPlan(plan)
                            ? MembershipStatus.Active
                            : MembershipStatus.ActivePendingPayment,
                    };
                    await _unitOfWork.UserMemberships.AddAsync(membership);
                    try
                    {
                        await _unitOfWork.SaveChangesAsync();
                    }
                    catch (DbUpdateException ex) when (UserMembershipConflictGuard.IsDuplicateActiveMembershipIndex(ex))
                    {
                        var dup = await UserMembershipConflictGuard.TryGetActiveConflictAsync(_db, user.Id)
                            ?? new ActiveMembershipConflictDto { Message = UserMembershipConflictCodes.Message, UserId = user.Id };
                        throw new ActiveMembershipConflictException(dup);
                    }
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

            await _db.Database.CurrentTransaction!.CommitAsync();
            return dto;
        }

        public const int BulkImportMembersMaxBatchSize = 500;

        public async Task<BulkImportMembersResultDto> BulkImportMembersAsync(BulkImportMembersRequestDto request)
        {
            var members = request.Members ?? new List<CreateUserDto>();
            if (members.Count == 0)
                return new BulkImportMembersResultDto();

            if (members.Count > BulkImportMembersMaxBatchSize)
                throw new ArgumentException($"A maximum of {BulkImportMembersMaxBatchSize} members can be imported per request.");

            var result = new BulkImportMembersResultDto();
            var existingPhones = await _db.Users.AsNoTracking()
                .Where(u => !u.IsDeleted && u.Phone != null)
                .Select(u => u.Phone!)
                .ToListAsync()
                .ConfigureAwait(false);
            var phoneSet = new HashSet<string>(existingPhones, StringComparer.Ordinal);

            var existingLoginIds = await _db.AuthUsers.AsNoTracking()
                .Where(a => !a.IsDeleted)
                .Select(a => a.Email)
                .ToListAsync()
                .ConfigureAwait(false);
            var loginSet = new HashSet<string>(
                existingLoginIds.Select(e => e.Trim().ToLowerInvariant()),
                StringComparer.Ordinal);

            var existingAadhaar = await _db.Users.AsNoTracking()
                .Where(u => !u.IsDeleted && u.AadhaarNumber != null)
                .Select(u => u.AadhaarNumber!)
                .ToListAsync()
                .ConfigureAwait(false);
            var aadhaarSet = new HashSet<string>(existingAadhaar, StringComparer.Ordinal);

            var validUserTypeIds = await _db.UserTypes.AsNoTracking()
                .Where(ut => !ut.IsDeleted)
                .Select(ut => ut.Id)
                .ToHashSetAsync()
                .ConfigureAwait(false);

            var memberAppRole = (await _unitOfWork.AppRoles.GetAllAsync().ConfigureAwait(false))
                .FirstOrDefault(r => string.Equals(r.Name, "MEMBER", StringComparison.OrdinalIgnoreCase));

            var batchPhones = new HashSet<string>(StringComparer.Ordinal);
            var batchLogins = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
            var batchAadhaar = new HashSet<string>(StringComparer.Ordinal);
            var prepared = new List<PreparedBulkMember>();

            for (var i = 0; i < members.Count; i++)
            {
                var dto = members[i];
                var label = string.IsNullOrWhiteSpace(dto.Email) ? $"row {i + 1}" : dto.Email.Trim();

                try
                {
                    var loginId = ResolveLoginId(dto);
                    if (string.IsNullOrWhiteSpace(loginId))
                    {
                        result.Log.Add($"{label}: email is required for login.");
                        continue;
                    }

                    var password = dto.Password?.Trim();
                    if (string.IsNullOrEmpty(password))
                    {
                        result.Log.Add($"{label}: password is required.");
                        continue;
                    }

                    if (password.Length < 6)
                    {
                        result.Log.Add($"{label}: password must be at least 6 characters.");
                        continue;
                    }

                    var normalizedPhone = PhoneNumberValidator.NormalizeRequiredPhone(dto.Phone);
                    var loginKey = loginId.ToLowerInvariant();

                    if (batchLogins.Contains(loginKey) || loginSet.Contains(loginKey))
                    {
                        result.Log.Add($"Skipped (exists): {loginId}");
                        continue;
                    }

                    if (batchPhones.Contains(normalizedPhone) || phoneSet.Contains(normalizedPhone))
                    {
                        result.Log.Add($"Duplicate phone number: {normalizedPhone} ({loginId})");
                        continue;
                    }

                    string? normalizedAadhaar = null;
                    try
                    {
                        normalizedAadhaar = AadhaarNumberValidator.TryNormalizeOptionalAadhaar(dto.AadhaarNumber);
                    }
                    catch (ArgumentException ex)
                    {
                        result.Log.Add($"{label}: {ex.Message}");
                        continue;
                    }

                    if (normalizedAadhaar != null)
                    {
                        if (batchAadhaar.Contains(normalizedAadhaar) || aadhaarSet.Contains(normalizedAadhaar))
                        {
                            result.Log.Add($"{label}: Aadhaar number is already registered.");
                            continue;
                        }

                        batchAadhaar.Add(normalizedAadhaar);
                        aadhaarSet.Add(normalizedAadhaar);
                    }

                    batchLogins.Add(loginKey);
                    loginSet.Add(loginKey);
                    batchPhones.Add(normalizedPhone);
                    phoneSet.Add(normalizedPhone);

                    var now = DateTime.UtcNow;
                    var user = new User
                    {
                        FirstName = dto.FirstName.Trim(),
                        LastName = dto.LastName.Trim(),
                        Phone = normalizedPhone,
                        AadhaarNumber = normalizedAadhaar,
                        DateOfBirth = dto.DateOfBirth,
                        Gender = dto.Gender,
                        Address = dto.Address,
                        EmergencyContact = dto.EmergencyContact,
                        EmergencyPhone = PhoneNumberValidator.NormalizeOptionalPhone(dto.EmergencyPhone),
                        ProfilePictureUrl = dto.ProfilePictureUrl,
                        PreferredGymTime = dto.PreferredGymTime,
                        IsActive = dto.IsActive,
                        RegistrationDate = now,
                    };

                    var userTypeIds = (dto.UserTypeIds ?? new List<int>())
                        .Where(id => id > 0 && validUserTypeIds.Contains(id))
                        .Distinct()
                        .ToList();

                    prepared.Add(new PreparedBulkMember
                    {
                        Password = password,
                        User = user,
                        AuthUser = new AuthUser
                        {
                            Email = loginId,
                            CreatedDate = now,
                        },
                        Member = new Member
                        {
                            EmergencyContact = user.EmergencyContact,
                            EmergencyPhone = user.EmergencyPhone,
                            PreferredGymTime = user.PreferredGymTime,
                            DateOfBirth = user.DateOfBirth,
                            Gender = user.Gender,
                            RegistrationDate = now,
                            IsActive = user.IsActive,
                        },
                        UserUserTypes = userTypeIds.Select(typeId => new UserUserType { UserTypeId = typeId }).ToList(),
                        MemberRoleId = memberAppRole?.Id,
                    });
                }
                catch (ArgumentException ex)
                {
                    result.Log.Add($"{label}: {ex.Message}");
                }
            }

            if (prepared.Count == 0)
                return result;

            Parallel.ForEach(prepared, item =>
            {
                item.PasswordHash = PasswordHasher.Hash(item.Password);
            });

            var strategy = _db.Database.CreateExecutionStrategy();
            await strategy.ExecuteAsync(async () =>
            {
                await using var transaction = await _db.Database.BeginTransactionAsync().ConfigureAwait(false);
                try
                {
                    var users = prepared.Select(p => p.User).ToList();
                    await _db.Users.AddRangeAsync(users).ConfigureAwait(false);
                    await _db.SaveChangesAsync().ConfigureAwait(false);

                    var authUsers = new List<AuthUser>(prepared.Count);
                    var members = new List<Member>(prepared.Count);
                    var userUserTypes = new List<UserUserType>();
                    var userRoles = new List<UserRole>();

                    for (var i = 0; i < prepared.Count; i++)
                    {
                        var row = prepared[i];
                        var userId = row.User.Id;
                        row.AuthUser.UserId = userId;
                        row.AuthUser.PasswordHash = row.PasswordHash!;
                        authUsers.Add(row.AuthUser);

                        row.Member.UserId = userId;
                        members.Add(row.Member);

                        foreach (var link in row.UserUserTypes)
                        {
                            link.UserId = userId;
                            userUserTypes.Add(link);
                        }

                        if (row.MemberRoleId.HasValue)
                        {
                            userRoles.Add(new UserRole
                            {
                                UserId = userId,
                                RoleId = row.MemberRoleId.Value,
                                CreatedDate = DateTime.UtcNow,
                            });
                        }
                    }

                    await _db.AuthUsers.AddRangeAsync(authUsers).ConfigureAwait(false);
                    if (userUserTypes.Count > 0)
                        await _db.UserUserTypes.AddRangeAsync(userUserTypes).ConfigureAwait(false);
                    if (userRoles.Count > 0)
                        await _db.UserRoles.AddRangeAsync(userRoles).ConfigureAwait(false);
                    await _db.Members.AddRangeAsync(members).ConfigureAwait(false);
                    await _db.SaveChangesAsync().ConfigureAwait(false);

                    await transaction.CommitAsync().ConfigureAwait(false);
                }
                catch
                {
                    await transaction.RollbackAsync().ConfigureAwait(false);
                    throw;
                }
            }).ConfigureAwait(false);

            result.Imported = prepared.Count;
            return result;
        }

        private sealed class PreparedBulkMember
        {
            public string Password { get; init; } = string.Empty;
            public string? PasswordHash { get; set; }
            public User User { get; init; } = null!;
            public AuthUser AuthUser { get; init; } = null!;
            public Member Member { get; init; } = null!;
            public List<UserUserType> UserUserTypes { get; init; } = new();
            public int? MemberRoleId { get; init; }
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
                var normalizedPhone = PhoneNumberValidator.NormalizeRequiredPhone(updateUserDto.Phone);
                await _mobileAvailability.EnsureAvailableOrThrowAsync(normalizedPhone, id);
                user.Phone = normalizedPhone;
            }
            if (updateUserDto.AadhaarNumber != null)
            {
                var previousAadhaar = user.AadhaarNumber;
                var normalizedAadhaar = AadhaarNumberValidator.TryNormalizeOptionalAadhaar(updateUserDto.AadhaarNumber);
                if (!string.Equals(previousAadhaar, normalizedAadhaar, StringComparison.Ordinal))
                {
                    if (normalizedAadhaar != null)
                        await EnsureAadhaarNotDuplicateAsync(normalizedAadhaar, id);
                    user.AadhaarNumber = normalizedAadhaar;
                    await LogAadhaarAuditAsync(
                        id,
                        string.IsNullOrWhiteSpace(previousAadhaar) ? "Aadhaar Created" : "Aadhaar Updated",
                        previousAadhaar,
                        normalizedAadhaar);
                }
            }
            if (updateUserDto.DateOfBirth.HasValue)
            {
                DateOfBirthValidator.EnsureValid(updateUserDto.DateOfBirth.Value);
                user.DateOfBirth = updateUserDto.DateOfBirth.Value;
            }
            if (!string.IsNullOrEmpty(updateUserDto.Gender))
                user.Gender = updateUserDto.Gender;
            if (updateUserDto.Address != null)
                user.Address = updateUserDto.Address;
            if (updateUserDto.EmergencyContact != null)
                user.EmergencyContact = updateUserDto.EmergencyContact;
            if (updateUserDto.EmergencyPhone != null)
                user.EmergencyPhone = PhoneNumberValidator.NormalizeOptionalPhone(updateUserDto.EmergencyPhone);
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
                    await UserMembershipConflictGuard.EnsureNoActiveMembershipBeforeCreateAsync(_db, id);
                    var membership = new UserMembership
                    {
                        UserId = id,
                        PlanId = plan.Id,
                        StartDate = startDate,
                        EndDate = endDate,
                        Status = MembershipStatus.Active
                    };
                    await _unitOfWork.UserMemberships.AddAsync(membership);
                    try
                    {
                        await _unitOfWork.SaveChangesAsync();
                    }
                    catch (DbUpdateException ex) when (UserMembershipConflictGuard.IsDuplicateActiveMembershipIndex(ex))
                    {
                        var dup = await UserMembershipConflictGuard.TryGetActiveConflictAsync(_db, id)
                            ?? new ActiveMembershipConflictDto { Message = UserMembershipConflictCodes.Message, UserId = id };
                        throw new ActiveMembershipConflictException(dup);
                    }

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
            {
                var loginIdForNewAccount = ResolveLoginIdForUpdate(updateUserDto);
                await ApplyAdminPasswordUpdateAsync(user, updateUserDto.Password, loginIdForNewAccount);
            }

            var loginEmailUpdate = ResolveLoginIdForUpdate(updateUserDto, emailOnly: true);
            if (loginEmailUpdate != null)
                await ApplyAdminLoginIdUpdateAsync(user.Id, loginEmailUpdate);

            return await GetUserByIdAsync(id);
        }

        private static string? ResolveLoginId(CreateUserDto dto)
        {
            var email = dto.Email?.Trim();
            if (!string.IsNullOrWhiteSpace(email))
                return email;
            return string.IsNullOrWhiteSpace(dto.Username) ? null : dto.Username.Trim();
        }

        private static string? ResolveLoginIdForUpdate(UpdateUserDto dto, bool emailOnly = false)
        {
            if (dto.Email != null)
            {
                var email = dto.Email.Trim();
                if (string.IsNullOrEmpty(email))
                    throw new ArgumentException("Email is required for portal and mobile login.");
                return email;
            }

            if (emailOnly || dto.Username == null)
                return null;

            var legacy = dto.Username.Trim();
            return string.IsNullOrEmpty(legacy) ? null : legacy;
        }

        private async Task ApplyAdminLoginIdUpdateAsync(int userId, string newLoginId)
        {
            var loginId = newLoginId.Trim();
            if (string.IsNullOrEmpty(loginId))
                throw new ArgumentException("Email is required for portal and mobile login.");

            var authUser = (await _unitOfWork.AuthUsers.GetAllAsync())
                .FirstOrDefault(a => a.UserId == userId);
            if (authUser == null)
                throw new ArgumentException(
                    "This user does not have a login account yet. Set a password to create one, or save an email together with a new password.");

            if (string.Equals(authUser.Email, loginId, StringComparison.OrdinalIgnoreCase))
                return;

            var usernameCheck = await _usernameAvailability.CheckAsync(loginId, userId);
            if (!usernameCheck.IsAvailable)
                throw new ConflictException(
                    usernameCheck.ValidationError ?? UsernameAvailabilityService.DuplicateUsernameMessage);

            authUser.Email = loginId;
            authUser.FailedLoginAttempts = 0;
            authUser.LockoutEnd = null;
            _unitOfWork.AuthUsers.Update(authUser);
            await _unitOfWork.SaveChangesAsync();
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

            var rows = await (
                from ur in _db.UserRoles.AsNoTracking()
                join role in _db.AppRoles.AsNoTracking() on ur.RoleId equals role.Id
                where !ur.IsDeleted && role.IsActive && userIds.Contains(ur.UserId)
                select new { ur.UserId, role.Name })
                .ToListAsync()
                .ConfigureAwait(false);

            return rows
                .GroupBy(r => r.UserId)
                .ToDictionary(
                    g => g.Key,
                    g => g.Select(r => r.Name).Where(name => !string.IsNullOrWhiteSpace(name)).Distinct().ToList());
        }

        private static bool IsTrialMembershipPlan(MembershipPlan plan)
        {
            var name = (plan.PlanName ?? string.Empty).Trim().ToLowerInvariant();
            return plan.Price <= 0m
                || plan.DurationDays <= 15
                || name.Contains("trial")
                || name.Contains("trail")
                || name.Contains("free");
        }

        private UserDto MapToDto(User user, AuthUser? authUser = null, bool isInstructorProfile = false, List<UserTypeDto>? userTypes = null, List<string>? appRoleNamesFromUserRoles = null)
        {
            var role = AuthUserRoleHelper.ResolveRoleForUserDto(authUser, isInstructorProfile, userTypes, appRoleNamesFromUserRoles);
            var username = authUser?.Email;
            var dto = new UserDto
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
            EnrichAadhaarFields(dto, user.AadhaarNumber);
            return dto;
        }

        private void EnrichAadhaarFields(UserDto dto, string? aadhaarDigits)
        {
            if (string.IsNullOrWhiteSpace(aadhaarDigits))
                return;

            dto.AadhaarNumberMasked = AadhaarDisplayHelper.Mask(aadhaarDigits);
            if (_accessContext.CanViewFullAadhaar)
                dto.AadhaarNumber = aadhaarDigits;
        }

        private async Task EnsureAadhaarNotDuplicateAsync(string aadhaar, int? excludeUserId = null)
        {
            var taken = await _db.Users.AnyAsync(u =>
                !u.IsDeleted
                && u.AadhaarNumber == aadhaar
                && (!excludeUserId.HasValue || u.Id != excludeUserId.Value));
            if (taken)
                throw new ConflictException("Aadhaar number is already registered to another user.");
        }

        private async Task LogAadhaarAuditAsync(int subjectUserId, string action, string? oldValue, string? newValue)
        {
            await _db.AuditLogs.AddAsync(new AuditLog
            {
                UserId = _accessContext.ActorProfileUserId ?? subjectUserId,
                Action = action,
                Entity = $"User:{subjectUserId}",
                OldValue = oldValue,
                NewValue = newValue,
                CreatedAt = DateTime.UtcNow,
            });
            await _db.SaveChangesAsync();
        }

        private async Task<int?> ResolveMemberUserTypeIdAsync()
        {
            if (_cachedMemberUserTypeId.HasValue)
                return _cachedMemberUserTypeId;

            _cachedMemberUserTypeId = await _db.UserTypes.AsNoTracking()
                .Where(ut => !ut.IsDeleted && ut.Name == "Member")
                .Select(ut => (int?)ut.Id)
                .FirstOrDefaultAsync()
                .ConfigureAwait(false);
            return _cachedMemberUserTypeId;
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

            var billings = await _db.MembershipPayments.AsNoTracking()
                .Where(p => !p.IsDeleted && idSet.Contains(p.UserId))
                .Select(p => new
                {
                    p.UserId,
                    p.Id,
                    p.MembershipId,
                    p.CreatedDate,
                    p.PaymentStatus,
                    p.PendingAmount,
                    p.NextDueDate,
                    p.PaymentDate,
                })
                .ToListAsync()
                .ConfigureAwait(false);

            return billings
                .GroupBy(p => p.UserId)
                .ToDictionary(g => g.Key, g =>
                {
                    var latestRow = g.OrderByDescending(p => p.CreatedDate).First();
                    var latest = new MembershipPayment
                    {
                        Id = latestRow.Id,
                        UserId = latestRow.UserId,
                        MembershipId = latestRow.MembershipId,
                        CreatedDate = latestRow.CreatedDate,
                        PaymentStatus = latestRow.PaymentStatus,
                        PendingAmount = latestRow.PendingAmount,
                        NextDueDate = latestRow.NextDueDate,
                        PaymentDate = latestRow.PaymentDate,
                    };
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
            if (idSet.Count == 0)
                return new Dictionary<int, List<UserTypeDto>>();

            var rows = await (
                from uut in _db.UserUserTypes.AsNoTracking()
                join ut in _db.UserTypes.AsNoTracking() on uut.UserTypeId equals ut.Id
                where !uut.IsDeleted && !ut.IsDeleted && idSet.Contains(uut.UserId)
                select new
                {
                    uut.UserId,
                    TypeId = ut.Id,
                    ut.Name,
                    ut.Description,
                }).ToListAsync().ConfigureAwait(false);

            return rows
                .GroupBy(r => r.UserId)
                .ToDictionary(
                    g => g.Key,
                    g => g.Select(r => new UserTypeDto
                    {
                        Id = r.TypeId,
                        Name = r.Name,
                        Description = r.Description,
                    }).ToList());
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

            var rows = await (
                from ui in _db.UserInstructors.AsNoTracking()
                join trainer in _db.Trainers.AsNoTracking() on ui.TrainerId equals trainer.Id
                join trainerUser in _db.Users.AsNoTracking() on trainer.UserId equals trainerUser.Id
                where !ui.IsDeleted
                    && !trainer.IsDeleted
                    && !trainerUser.IsDeleted
                    && userIds.Contains(ui.UserId)
                    && ui.IsActive
                    && !ui.EndDate.HasValue
                select new
                {
                    ui.UserId,
                    ui.TrainerId,
                    ui.AssignmentDate,
                    TrainerName = (trainerUser.FirstName + " " + trainerUser.LastName).Trim(),
                }).ToListAsync().ConfigureAwait(false);

            return rows
                .GroupBy(r => r.UserId)
                .ToDictionary(
                    g => g.Key,
                    g =>
                    {
                        var best = g.OrderByDescending(r => r.AssignmentDate).First();
                        var name = string.IsNullOrWhiteSpace(best.TrainerName)
                            ? $"Trainer #{best.TrainerId}"
                            : best.TrainerName;
                        return (best.TrainerId, name);
                    });
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

