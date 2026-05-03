using System.IdentityModel.Tokens.Jwt;
using System.Security.Cryptography;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using System.Linq;
using System.Text;
using GymManagement.Core.DTOs;
using GymManagement.Core.Interfaces;
using GymManagement.Core.Services;
using GymManagement.Domain.Entities;
using GymManagement.Infrastructure.Data;
using GymManagement.Infrastructure.Security;

namespace GymManagement.Infrastructure.Services
{
        /// <summary>
        /// <b>Login:</b> email + password (<see cref="PasswordHasher"/> / BCrypt) → JWT (<see cref="IJwtTokenService"/>) + opaque refresh token on <see cref="AuthUser"/> → <see cref="LoginActivity"/>.
        /// <b>Refresh:</b> match <see cref="AuthUser.RefreshToken"/> + expiry → rotate refresh token + issue new JWT; roles and <c>permission</c> claims from RBAC (same as login).
        /// <b>Logout:</b> clear refresh token on <see cref="AuthUser"/>; close <see cref="LoginActivity"/> when <c>jti</c> matches.
        /// </summary>
    public class AuthService : IAuthService
    {
        private readonly IUnitOfWork _unitOfWork;
        private readonly ApplicationDbContext _db;
        private readonly IConfiguration _configuration;
        private readonly IJwtTokenService _jwtTokenService;
        private readonly ILogger<AuthService> _logger;
        private readonly IHttpContextAccessor _httpContextAccessor;
        private readonly ILoginPayloadFactory _loginPayloadFactory;

        public AuthService(
            IUnitOfWork unitOfWork,
            ApplicationDbContext db,
            IConfiguration configuration,
            IJwtTokenService jwtTokenService,
            ILogger<AuthService> logger,
            IHttpContextAccessor httpContextAccessor,
            ILoginPayloadFactory loginPayloadFactory)
        {
            _unitOfWork = unitOfWork;
            _db = db;
            _configuration = configuration;
            _jwtTokenService = jwtTokenService;
            _logger = logger;
            _httpContextAccessor = httpContextAccessor;
            _loginPayloadFactory = loginPayloadFactory;
        }

        public async Task<LoginResponseDto?> LoginAsync(LoginDto loginDto)
        {
            ArgumentNullException.ThrowIfNull(loginDto);

            var loginId = ResolveLoginEmailInput(loginDto).Trim();
            var loginIdLower = loginId.ToLowerInvariant();
            var emailLower = NormalizeLoginEmail(loginIdLower);

            var authUser = await _db.AuthUsers
                .Include(a => a.User)
                .FirstOrDefaultAsync(a => a.Email.ToLower() == emailLower);

            // Self-heal: if login failed with default admin credentials, ensure admin exists and retry (in case seeding was skipped)
            if (authUser == null && IsDefaultAdminCredentials(loginIdLower, loginDto.Password))
            {
                try
                {
                    await EnsureDefaultAdminExistsAsync();
                    authUser = await _db.AuthUsers
                        .Include(a => a.User)
                        .FirstOrDefaultAsync(a => a.Email.ToLower() == emailLower);
                }
                catch (Exception ex)
                {
                    _logger.LogWarning(ex, "EnsureDefaultAdminExistsAsync failed for '{LoginId}'.", loginId);
                }
            }

            // If admin exists but password is wrong and they're using default credentials, reset password and continue
            if (authUser != null && !PasswordHasher.Verify(loginDto.Password, authUser.PasswordHash) && IsDefaultAdminCredentials(loginIdLower, loginDto.Password))
            {
                authUser.PasswordHash = PasswordHasher.Hash("admin123");
                _unitOfWork.AuthUsers.Update(authUser);
                await _unitOfWork.SaveChangesAsync();
            }
            else if (authUser == null || !PasswordHasher.Verify(loginDto.Password, authUser.PasswordHash))
            {
                if (authUser == null)
                {
                    _logger.LogWarning("Login failed for '{LoginId}': no matching account.", loginId);
                    await RecordAnonymousFailedLoginAsync(loginId, "Unknown email or no account");
                }
                else
                {
                    _logger.LogWarning("Login failed for '{LoginId}': password mismatch.", loginId);
                    authUser.FailedLoginAttempts++;
                    _unitOfWork.AuthUsers.Update(authUser);
                    await _unitOfWork.SaveChangesAsync();
                    await RecordLoginActivityAsync(authUser, success: false, sessionId: null, failureReason: "Invalid password");
                }
                return null;
            }

            authUser.FailedLoginAttempts = 0;
            if (!PasswordHasher.IsBcrypt(authUser.PasswordHash))
                authUser.PasswordHash = PasswordHasher.Hash(loginDto.Password);
            _unitOfWork.AuthUsers.Update(authUser);
            await _unitOfWork.SaveChangesAsync();

            return await BuildResponseFromAuthUserAsync(authUser);
        }

        /// <inheritdoc />
        public async Task<LoginResponseDto?> RefreshAsync(RefreshTokenDto dto)
        {
            ArgumentNullException.ThrowIfNull(dto);

            var raw = dto.RefreshToken?.Trim();
            if (string.IsNullOrEmpty(raw))
                return null;

            var authUser = await _db.AuthUsers
                .Include(a => a.User)
                .FirstOrDefaultAsync(a => a.RefreshToken == raw);
            if (authUser == null)
            {
                var reusedHash = ComputeTokenHash(raw);
                var compromisedUser = await _db.AuthUsers
                    .FirstOrDefaultAsync(a => a.PreviousRefreshTokenHash == reusedHash);
                if (compromisedUser != null)
                {
                    _logger.LogWarning(
                        "Detected refresh token reuse for AuthUserId={AuthUserId}. Revoking active session tokens.",
                        compromisedUser.Id);
                    compromisedUser.RefreshTokenCompromisedAt = DateTime.UtcNow;
                    compromisedUser.RefreshToken = null;
                    compromisedUser.RefreshTokenExpiry = null;
                    compromisedUser.PreviousRefreshTokenHash = null;
                    _unitOfWork.AuthUsers.Update(compromisedUser);
                    await _unitOfWork.SaveChangesAsync();
                }
                return null;
            }
            if (authUser.RefreshTokenExpiry == null || authUser.RefreshTokenExpiry < DateTime.UtcNow)
                return null;
            if (authUser.RefreshTokenCompromisedAt != null)
                return null;

            var rbac = await _loginPayloadFactory.BuildProfileAndRbacAsync(authUser);
            var role = await ResolveRoleFromAuthUserAsync(authUser);
            var userId = authUser.UserId;
            int? trainerId = null;
            if (userId.HasValue)
            {
                var trainer = await _unitOfWork.Trainers.FirstOrDefaultAsync(t => t.UserId == userId.Value);
                if (trainer != null)
                    trainerId = trainer.Id;
            }

            var fullName = ResolveFullName(authUser, rbac.Profile, role);
            var roleNames = await GetJwtRoleClaimNamesAsync(authUser);

            var sessionId = Guid.NewGuid().ToString();
            var permissionCodes = ExtractPermissionCodes(rbac.Permissions);
            var token = _jwtTokenService.CreateAccessToken(authUser.Id, authUser.UserId, roleNames, permissionCodes, sessionId);
            var rotatedRefreshToken = AssignRefreshTokenOnUser(authUser);
            _unitOfWork.AuthUsers.Update(authUser);
            await _unitOfWork.SaveChangesAsync();

            return new LoginResponseDto
            {
                Token = token,
                RefreshToken = rotatedRefreshToken,
                RefreshTokenExpiresAt = authUser.RefreshTokenExpiry,
                Username = authUser.Email,
                Email = authUser.Email,
                Role = role,
                UserId = userId,
                TrainerId = trainerId,
                FullName = fullName,
                Profile = rbac.Profile,
                Roles = rbac.Roles,
                Permissions = rbac.Permissions
            };
        }

        private static bool IsDefaultAdminCredentials(string loginIdLower, string password)
        {
            return (loginIdLower == "admin" || loginIdLower == "admin@gym.com") && password == "admin123";
        }

        /// <summary>Maps legacy login id <c>admin</c> to the seeded admin email.</summary>
        private static string NormalizeLoginEmail(string loginIdLower) =>
            loginIdLower == "admin" ? "admin@gym.com" : loginIdLower;

        /// <summary>Prefer <see cref="LoginDto.Email"/>; otherwise <see cref="LoginDto.Username"/>.</summary>
        private static string ResolveLoginEmailInput(LoginDto loginDto)
        {
            if (!string.IsNullOrWhiteSpace(loginDto.Email))
                return loginDto.Email.Trim();
            return loginDto.Username ?? string.Empty;
        }

        private async Task EnsureDefaultAdminExistsAsync()
        {
            var existingAuth = await _unitOfWork.AuthUsers.FirstOrDefaultAsync(a => a.Email.ToLower() == "admin@gym.com");
            if (existingAuth != null) return;

            // Ensure Roles exist (in case seeding was skipped)
            await EnsureRolesExistAsync();

            var adminUser = await _unitOfWork.Users.FirstOrDefaultAsync(u =>
                u.FirstName == "Admin" && u.LastName == "User");
            if (adminUser == null)
            {
                adminUser = new User
                {
                    FirstName = "Admin",
                    LastName = "User",
                    DateOfBirth = new DateTime(1990, 1, 1),
                    Gender = "Other",
                    RegistrationDate = DateTime.UtcNow,
                    IsActive = true
                };
                await _unitOfWork.Users.AddAsync(adminUser);
                await _unitOfWork.SaveChangesAsync();
            }

            var authUser = new AuthUser
            {
                Email = "admin@gym.com",
                PasswordHash = PasswordHasher.Hash("admin123"),
                UserId = adminUser.Id
            };
            await _unitOfWork.AuthUsers.AddAsync(authUser);
            await _unitOfWork.SaveChangesAsync();

            await AuthUserRoleHelper.EnsureUserHasAppRoleAsync(_unitOfWork, adminUser.Id, "ADMIN");
            await _unitOfWork.SaveChangesAsync();
        }

        private async Task EnsureRolesExistAsync()
        {
            var roleNames = new[] { "ADMIN", "STAFF", "TRAINER", "MEMBER" };
            foreach (var name in roleNames)
            {
                var exists = await _unitOfWork.AppRoles.FirstOrDefaultAsync(r => r.Name == name);
                if (exists == null)
                {
                    await _unitOfWork.AppRoles.AddAsync(new AppRole
                    {
                        Name = name,
                        Description = name,
                        IsActive = true,
                        CreatedDate = DateTime.UtcNow
                    });
                }
            }
            await _unitOfWork.SaveChangesAsync();
        }

        private Task<Role> ResolveRoleFromAuthUserAsync(AuthUser authUser) =>
            AuthUserRoleHelper.ResolveRoleAsync(_unitOfWork, authUser);

        private async Task<LoginResponseDto> BuildResponseFromAuthUserAsync(AuthUser authUser)
        {
            // Profile + permissions for API (uses UserRoles / RbacService internally).
            var rbac = await _loginPayloadFactory.BuildProfileAndRbacAsync(authUser);

            var role = await ResolveRoleFromAuthUserAsync(authUser);
            int? userId = authUser.UserId;
            int? trainerId = null;
            if (userId.HasValue)
            {
                var trainer = await _unitOfWork.Trainers.FirstOrDefaultAsync(t => t.UserId == userId.Value);
                if (trainer != null)
                    trainerId = trainer.Id;
            }

            var fullName = ResolveFullName(authUser, rbac.Profile, role);

            if (userId.HasValue && role == Role.User)
                await LogAttendanceOnLoginAsync(userId.Value, "System Login");

            // JWT role claims: UserRoles first; legacy fallback matches ResolveRoleAsync (see GetJwtRoleClaimNamesAsync).
            var roleNames = await GetJwtRoleClaimNamesAsync(authUser);

            var permissionCodes = ExtractPermissionCodes(rbac.Permissions);
            var (token, sessionId) = CreateSessionJwtToken(authUser, roleNames, permissionCodes);

            var refreshPlain = AssignRefreshTokenOnUser(authUser);
            _unitOfWork.AuthUsers.Update(authUser);
            await _unitOfWork.SaveChangesAsync();

            await RecordLoginActivityAsync(authUser, success: true, sessionId: sessionId, failureReason: null);

            return new LoginResponseDto
            {
                Token = token,
                RefreshToken = refreshPlain,
                RefreshTokenExpiresAt = authUser.RefreshTokenExpiry,
                Username = authUser.Email,
                Email = authUser.Email,
                Role = role,
                UserId = userId,
                TrainerId = trainerId,
                FullName = fullName,
                Profile = rbac.Profile,
                Roles = rbac.Roles,
                Permissions = rbac.Permissions
            };
        }

        /// <summary>
        /// JWT <c>role</c> claims: <c>UserRoles</c> → <c>Roles.Name</c> when present; otherwise the same legacy resolution as
        /// <see cref="AuthUserRoleHelper.ResolveRoleAsync"/> so default-admin / Admin user-type accounts are not excluded from
        /// <c>[Authorize(Roles = "ADMIN,...")]</c> while the UI still treats them as admin via <see cref="Role"/>.
        /// </summary>
        private async Task<List<string>> GetJwtRoleClaimNamesAsync(AuthUser authUser)
        {
            var merged = new HashSet<string>(StringComparer.OrdinalIgnoreCase);

            if (authUser.UserId.HasValue)
            {
                var fromUserRoles = await _db.UserRoles
                    .AsNoTracking()
                    .Where(ur => ur.UserId == authUser.UserId.Value)
                    .Select(ur => ur.Role.Name)
                    .ToListAsync()
                    .ConfigureAwait(false);
                foreach (var n in fromUserRoles)
                {
                    if (!string.IsNullOrWhiteSpace(n))
                        merged.Add(n.Trim());
                }
            }

            static bool HasAdminOrStaff(IEnumerable<string> names) =>
                names.Any(n =>
                    string.Equals(n, "ADMIN", StringComparison.OrdinalIgnoreCase)
                    || string.Equals(n, "STAFF", StringComparison.OrdinalIgnoreCase));

            if (!HasAdminOrStaff(merged))
            {
                foreach (var extra in await AuthUserRoleHelper
                             .GetQrConsoleJwtRoleSupplementsAsync(_unitOfWork, authUser)
                             .ConfigureAwait(false))
                    merged.Add(extra);
            }

            if (!HasAdminOrStaff(merged))
            {
                var resolved = await AuthUserRoleHelper.ResolveRoleAsync(_unitOfWork, authUser).ConfigureAwait(false);
                string? canon = resolved switch
                {
                    Role.Admin => "ADMIN",
                    Role.Instructor => "TRAINER",
                    _ => null
                };
                if (!string.IsNullOrEmpty(canon))
                    merged.Add(canon);
            }

            return merged.ToList();
        }

        /// <summary>Opaque refresh token stored as-is on <paramref name="authUser"/> (lookup by equality in <see cref="RefreshAsync"/>).</summary>
        private string AssignRefreshTokenOnUser(AuthUser authUser)
        {
            var plain = GenerateRefreshToken();
            authUser.PreviousRefreshTokenHash = string.IsNullOrWhiteSpace(authUser.RefreshToken)
                ? null
                : ComputeTokenHash(authUser.RefreshToken);
            authUser.RefreshToken = plain;
            authUser.RefreshTokenExpiry = DateTime.UtcNow.AddDays(GetRefreshTokenLifetimeDays());
            authUser.RefreshTokenCompromisedAt = null;
            return plain;
        }

        /// <summary>Cryptographically random refresh token segment (Base64, 64 bytes entropy).</summary>
        private static string GenerateRefreshToken()
        {
            var randomBytes = new byte[64];
            using var rng = RandomNumberGenerator.Create();
            rng.GetBytes(randomBytes);
            return Convert.ToBase64String(randomBytes);
        }

        private static string ComputeTokenHash(string token)
        {
            var bytes = Encoding.UTF8.GetBytes(token);
            var hash = SHA256.HashData(bytes);
            return Convert.ToHexString(hash);
        }

        private int GetRefreshTokenLifetimeDays() =>
            _configuration.GetValue("Jwt:RefreshTokenDays", 7);

        private static string ResolveFullName(AuthUser authUser, UserProfileDto? profile, Role jwtRole)
        {
            if (profile != null)
                return $"{profile.FirstName} {profile.LastName}".Trim();
            if (jwtRole == Role.Admin)
                return string.IsNullOrEmpty(authUser.Email) ? "Admin" : authUser.Email;
            return string.Empty;
        }

        public async Task<bool> RegisterAsync(RegisterDto registerDto)
        {
            var email = string.IsNullOrWhiteSpace(registerDto.Email)
                ? registerDto.Username.Trim()
                : registerDto.Email.Trim();
            if (string.IsNullOrEmpty(email))
                return false;
            var emailLower = email.ToLowerInvariant();

            var existing = await _unitOfWork.AuthUsers
                .FirstOrDefaultAsync(a => a.Email.ToLower() == emailLower);
            if (existing != null)
                return false;

            var authUser = new AuthUser
            {
                Email = email,
                PasswordHash = PasswordHasher.Hash(registerDto.Password)
            };
            await _unitOfWork.AuthUsers.AddAsync(authUser);
            await _unitOfWork.SaveChangesAsync();
            return true;
        }

        /// <inheritdoc />
        public async Task<bool> LogoutAsync()
        {
            var http = _httpContextAccessor.HttpContext;
            if (http?.User?.Identity?.IsAuthenticated != true)
                return false;

            var sub = http.User.Identity?.Name ?? http.User.FindFirst("sub")?.Value;
            if (string.IsNullOrEmpty(sub))
                return false;

            AuthUser? authUser = null;
            if (int.TryParse(sub, out var authId))
                authUser = await _unitOfWork.AuthUsers.GetByIdAsync(authId);
            if (authUser == null)
                authUser = await _unitOfWork.AuthUsers.FirstOrDefaultAsync(a =>
                    a.Email.ToLower() == sub.ToLowerInvariant());
            if (authUser == null)
                return false;

            var sessionId = http.User.FindFirst(JwtRegisteredClaimNames.Jti)?.Value
                ?? http.User.FindFirst("jti")?.Value;
            if (!string.IsNullOrEmpty(sessionId))
            {
                var activity = await _unitOfWork.LoginActivities.FirstOrDefaultAsync(la =>
                    la.SessionId == sessionId
                    && la.AuthUserId == authUser.Id
                    && la.LogoutTime == null
                    && la.Status == LoginActivityStatus.Success);
                if (activity != null)
                {
                    activity.LogoutTime = DateTime.UtcNow;
                    activity.UpdatedDate = DateTime.UtcNow;
                    _unitOfWork.LoginActivities.Update(activity);
                }
            }

            authUser.RefreshToken = null;
            authUser.RefreshTokenExpiry = null;
            authUser.PreviousRefreshTokenHash = null;
            authUser.RefreshTokenCompromisedAt = null;
            _unitOfWork.AuthUsers.Update(authUser);

            await _unitOfWork.SaveChangesAsync();
            return true;
        }

        public async Task<IReadOnlyList<CompromisedSessionDto>> GetCompromisedSessionsAsync()
        {
            var compromisedUsers = await _db.AuthUsers
                .AsNoTracking()
                .Where(a => a.RefreshTokenCompromisedAt != null)
                .Select(a => new
                {
                    a.Id,
                    a.UserId,
                    a.Email,
                    a.RefreshTokenCompromisedAt,
                    FirstName = a.User != null ? a.User.FirstName : null,
                    LastName = a.User != null ? a.User.LastName : null
                })
                .ToListAsync();

            var authIds = compromisedUsers.Select(x => x.Id).ToList();
            var lastLoginMap = await _db.LoginActivities
                .AsNoTracking()
                .Where(la => la.AuthUserId != null
                    && authIds.Contains(la.AuthUserId.Value)
                    && la.Status == LoginActivityStatus.Success)
                .GroupBy(la => la.AuthUserId!.Value)
                .Select(g => g
                    .OrderByDescending(x => x.LoginTime)
                    .Select(x => new { AuthUserId = g.Key, x.LoginTime, x.IPAddress })
                    .First())
                .ToDictionaryAsync(x => x.AuthUserId, x => new { x.LoginTime, x.IPAddress });

            return compromisedUsers
                .OrderByDescending(x => x.RefreshTokenCompromisedAt)
                .Select(x =>
                {
                    var fullName = $"{x.FirstName} {x.LastName}".Trim();
                    var hasLastLogin = lastLoginMap.TryGetValue(x.Id, out var lastLogin);
                    return new CompromisedSessionDto
                    {
                        AuthUserId = x.Id,
                        UserId = x.UserId,
                        Email = x.Email,
                        FullName = fullName,
                        CompromisedAt = x.RefreshTokenCompromisedAt!.Value,
                        LastLoginTime = hasLastLogin ? lastLogin!.LoginTime : null,
                        LastLoginIpAddress = hasLastLogin ? lastLogin!.IPAddress : null
                    };
                })
                .ToList();
        }

        private (string Token, string SessionId) CreateSessionJwtToken(
            AuthUser authUser,
            IReadOnlyList<string> roleNames,
            IReadOnlyList<string> permissionCodes)
        {
            var sessionId = Guid.NewGuid().ToString();
            var token = _jwtTokenService.CreateAccessToken(authUser.Id, authUser.UserId, roleNames, permissionCodes, sessionId);
            return (token, sessionId);
        }

        /// <summary>Codes for JWT <c>permission</c> claims (same source as login response; distinct, sorted).</summary>
        private static IReadOnlyList<string> ExtractPermissionCodes(IReadOnlyList<PermissionDto> permissions)
        {
            if (permissions == null || permissions.Count == 0)
                return Array.Empty<string>();
            return permissions
                .Select(p => p.Code)
                .Where(c => !string.IsNullOrWhiteSpace(c))
                .Select(c => c.Trim())
                .Distinct(StringComparer.OrdinalIgnoreCase)
                .OrderBy(c => c, StringComparer.OrdinalIgnoreCase)
                .ToList();
        }

        private Task RecordLoginActivityAsync(AuthUser authUser, bool success, string? sessionId, string? failureReason) =>
            RecordLoginActivityCoreAsync(authUser.Id, authUser.UserId, success, sessionId, failureReason);

        private async Task RecordAnonymousFailedLoginAsync(string attemptedLoginId, string failureReason)
        {
            var reason = $"{failureReason} (attempt: {attemptedLoginId})";
            if (reason.Length > 255)
                reason = reason[..255];
            await RecordLoginActivityCoreAsync(null, null, success: false, sessionId: null, failureReason: reason);
        }

        private async Task RecordLoginActivityCoreAsync(
            int? authUserId,
            int? profileUserId,
            bool success,
            string? sessionId,
            string? failureReason)
        {
            try
            {
                var (ip, device) = CaptureClientMetadata();

                await _unitOfWork.LoginActivities.AddAsync(new LoginActivity
                {
                    AuthUserId = authUserId,
                    UserId = profileUserId,
                    LoginTime = DateTime.UtcNow,
                    Status = success ? LoginActivityStatus.Success : LoginActivityStatus.Failed,
                    FailureReason = failureReason,
                    SessionId = sessionId,
                    IPAddress = ip,
                    DeviceInfo = device
                });
                await _unitOfWork.SaveChangesAsync();
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Failed to persist LoginActivity (AuthUserId={AuthUserId}).", authUserId);
            }
        }

        private (string? Ip, string? Device) CaptureClientMetadata()
        {
            var http = _httpContextAccessor.HttpContext;
            var ip = GetClientIp(http);
            var ua = http?.Request.Headers.UserAgent.ToString();
            if (!string.IsNullOrEmpty(ua) && ua.Length > 255)
                ua = ua[..255];
            return (ip, ua);
        }

        private static string? GetClientIp(HttpContext? http)
        {
            if (http == null) return null;
            var forwarded = http.Request.Headers["X-Forwarded-For"].FirstOrDefault();
            if (!string.IsNullOrWhiteSpace(forwarded))
                return forwarded.Split(',')[0].Trim();
            return http.Connection.RemoteIpAddress?.ToString();
        }

        private async Task LogAttendanceOnLoginAsync(int? userId, string checkInMethod, int? loggedByUserId = null)
        {
            try
            {
                var today = DateTime.UtcNow.Date;
                AttendanceLog? existingLog = null;

                if (userId.HasValue)
                {
                    existingLog = await _unitOfWork.AttendanceLogs
                        .FirstOrDefaultAsync(al =>
                            al.UserId == userId &&
                            al.AttendanceDate.Date == today &&
                            al.CheckOutTime == null);
                }
                else if (loggedByUserId.HasValue)
                {
                    existingLog = await _unitOfWork.AttendanceLogs
                        .FirstOrDefaultAsync(al =>
                            al.LoggedByUserId == loggedByUserId &&
                            al.AttendanceDate.Date == today &&
                            al.CheckOutTime == null);
                }

                if (existingLog == null)
                {
                    var attendanceLog = new AttendanceLog
                    {
                        UserId = userId,
                        LoggedByUserId = loggedByUserId,
                        CheckInTime = DateTime.UtcNow,
                        AttendanceDate = today,
                        CheckInMethod = checkInMethod,
                        Notes = "Automatic check-in on system login"
                    };

                    await _unitOfWork.AttendanceLogs.AddAsync(attendanceLog);
                    await _unitOfWork.SaveChangesAsync();
                }
            }
            catch (Exception)
            {
                // Silently fail - don't block login
            }
        }
    }
}
