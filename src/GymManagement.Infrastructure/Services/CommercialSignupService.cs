using GymManagement.Core.DTOs;
using GymManagement.Core.Options;
using GymManagement.Core.Services;
using GymManagement.Domain.Entities;
using GymManagement.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;

namespace GymManagement.Infrastructure.Services
{
    public sealed class CommercialSignupService : ICommercialSignupService
    {
        private readonly ApplicationDbContext _db;
        private readonly IUserService _userService;
        private readonly IAuthService _authService;
        private readonly IBranchAssignmentService _branches;
        private readonly CommercialOptions _options;

        public CommercialSignupService(
            ApplicationDbContext db,
            IUserService userService,
            IAuthService authService,
            IBranchAssignmentService branches,
            IOptions<CommercialOptions> options)
        {
            _db = db;
            _userService = userService;
            _authService = authService;
            _branches = branches;
            _options = options.Value;
        }

        public async Task<IReadOnlyList<PublicMembershipPlanDto>> GetPublicPlansAsync(
            int branchId,
            CancellationToken cancellationToken = default)
        {
            var offers = await _branches.ListOffersAsync(branchId, cancellationToken).ConfigureAwait(false);
            return offers.Select(p => new PublicMembershipPlanDto
            {
                Id = p.PlanId,
                PlanName = p.PlanName,
                DurationDays = p.DurationDays,
                Price = p.Price,
                Description = p.Description,
            }).ToList();
        }

        public async Task<IReadOnlyList<PublicBranchOptionDto>> GetPublicBranchesAsync(CancellationToken cancellationToken = default)
        {
            return await _db.Branches.AsNoTracking()
                .Where(b => b.IsActive)
                .OrderBy(b => b.BranchName)
                .Select(b => new PublicBranchOptionDto { Id = b.Id, Name = b.BranchName })
                .ToListAsync(cancellationToken)
                .ConfigureAwait(false);
        }

        public async Task<PublicSignupResultDto> SignupAsync(
            PublicSignupRequestDto request,
            CancellationToken cancellationToken = default)
        {
            if (!_options.EnableSelfSignup)
                throw new InvalidOperationException("Self-signup is not enabled for this gym.");

            ArgumentNullException.ThrowIfNull(request);

            var firstName = request.FirstName.Trim();
            var lastName = request.LastName.Trim();
            var email = request.Email.Trim();
            var phone = request.Phone.Trim();
            var password = request.Password;

            if (string.IsNullOrWhiteSpace(firstName))
                throw new ArgumentException("First name is required.");
            if (string.IsNullOrWhiteSpace(lastName))
                throw new ArgumentException("Last name is required.");
            if (string.IsNullOrWhiteSpace(email))
                throw new ArgumentException("Email is required.");
            if (string.IsNullOrWhiteSpace(phone))
                throw new ArgumentException("Phone number is required.");
            if (request.PlanId <= 0)
                throw new ArgumentException("Select a membership plan.");
            if (string.IsNullOrWhiteSpace(password) || password.Length < 6)
                throw new ArgumentException("Password must be at least 6 characters.");

            var planExists = await _db.MembershipPlans.AsNoTracking()
                .AnyAsync(p => p.Id == request.PlanId && !p.IsDeleted, cancellationToken)
                .ConfigureAwait(false);
            if (!planExists)
                throw new ArgumentException("Selected membership plan is not available.");

            var dob = request.DateOfBirth?.Date
                ?? DateTime.UtcNow.Date.AddYears(-25);
            var gender = string.IsNullOrWhiteSpace(request.Gender) ? "Other" : request.Gender.Trim();

            var createUserDto = new CreateUserDto
            {
                FirstName = firstName,
                LastName = lastName,
                Email = email,
                Phone = phone,
                Password = password,
                DateOfBirth = dob,
                Gender = gender,
                IsActive = true,
                PlanId = request.PlanId,
                HomeBranchId = request.HomeBranchId,
                MembershipStartDate = DateTime.UtcNow.Date,
                Role = Role.User,
            };

            var member = await _userService.CreateUserAsync(createUserDto).ConfigureAwait(false);

            LoginResponseDto? session = null;
            var login = await _authService.LoginAsync(new LoginDto
            {
                Email = email,
                Username = email,
                Password = password,
            }).ConfigureAwait(false);
            session = login.Success;

            return new PublicSignupResultDto
            {
                Member = member,
                Session = session,
                OpenMembershipPaymentId = member.OpenMembershipPaymentId,
                PendingAmount = member.PendingPaymentAmount,
            };
        }
    }
}
