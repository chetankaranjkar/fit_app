using GymManagement.Core.DTOs;
using GymManagement.Core.DTOs.Common;
using GymManagement.Core.Exceptions;
using GymManagement.Core.Interfaces;
using GymManagement.Core.Services;
using GymManagement.Domain.Entities;
using GymManagement.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace GymManagement.Infrastructure.Services
{
    public class TrainerService : ITrainerService
    {
        private readonly IUnitOfWork _unitOfWork;
        private readonly ApplicationDbContext _context;

        public TrainerService(IUnitOfWork unitOfWork, ApplicationDbContext context)
        {
            _unitOfWork = unitOfWork;
            _context = context;
        }

        public async Task<PagedResultDto<TrainerDto>> GetPagedAsync(
            int page,
            int pageSize,
            string? search = null,
            bool? isActive = null,
            string? sortBy = null,
            string? sortDir = null)
        {
            var (safePage, safePageSize) = PagedQueryHelper.Normalize(page, pageSize);
            var trimmedSearch = search?.Trim();
            var likeSearch = string.IsNullOrWhiteSpace(trimmedSearch) ? null : $"%{trimmedSearch}%";

            IQueryable<Trainer> query = _context.Trainers.AsNoTracking();

            if (isActive.HasValue)
                query = query.Where(t => t.IsActive == isActive.Value);

            if (!string.IsNullOrWhiteSpace(likeSearch))
            {
                query = query.Where(t =>
                    (t.Specialization != null && EF.Functions.Like(t.Specialization, likeSearch))
                    || (t.EmployeeCode != null && EF.Functions.Like(t.EmployeeCode, likeSearch))
                    || _context.Users.Any(u =>
                        u.Id == t.UserId
                        && (EF.Functions.Like(u.FirstName, likeSearch)
                            || EF.Functions.Like(u.LastName, likeSearch)
                            || (u.Phone != null && EF.Functions.Like(u.Phone, likeSearch))))
                    || _context.AuthUsers.Any(a =>
                        a.UserId == t.UserId && EF.Functions.Like(a.Email, likeSearch)));
            }

            var isAsc = string.Equals(sortDir, "asc", StringComparison.OrdinalIgnoreCase);
            query = (sortBy ?? "name").Trim().ToLowerInvariant() switch
            {
                "specialization" => isAsc
                    ? query.OrderBy(t => t.Specialization)
                    : query.OrderByDescending(t => t.Specialization),
                _ => isAsc ? query.OrderBy(t => t.Id) : query.OrderByDescending(t => t.Id),
            };

            var totalCount = await query.CountAsync();
            var trainers = await query.Skip((safePage - 1) * safePageSize).Take(safePageSize).ToListAsync();
            var userIds = trainers.Select(t => t.UserId).Distinct().ToList();
            var users = await _context.Users.AsNoTracking()
                .Where(u => userIds.Contains(u.Id))
                .ToDictionaryAsync(u => u.Id);
            var authByUserId = await _context.AuthUsers.AsNoTracking()
                .Where(a => a.UserId.HasValue && userIds.Contains(a.UserId.Value))
                .ToDictionaryAsync(a => a.UserId!.Value, a => a.Email);

            var items = trainers
                .Select(t => MapToDto(
                    t,
                    users.GetValueOrDefault(t.UserId),
                    authByUserId.GetValueOrDefault(t.UserId)))
                .ToList();

            return PagedQueryHelper.ToResult(items, totalCount, safePage, safePageSize);
        }

        public async Task<TrainerStatsDto> GetTrainerStatsAsync()
        {
            var trainers = (await _unitOfWork.Trainers.FindAsync(_ => true)).ToList();
            var total = trainers.Count;
            var active = trainers.Count(i => i.IsActive);
            var onLeave = trainers.Count(i =>
                !string.IsNullOrEmpty(i.AvailabilityStatus) &&
                i.AvailabilityStatus.IndexOf("Leave", StringComparison.OrdinalIgnoreCase) >= 0);
            var withRating = trainers.Where(i => i.Rating.HasValue).ToList();
            decimal? avgRating = withRating.Count > 0
                ? (decimal)withRating.Average(i => (double)i.Rating!.Value)
                : null;
            var totalClientsAssigned = trainers.Sum(i => i.TotalClients);

            return new TrainerStatsDto
            {
                TotalTrainers = total,
                ActiveTrainers = active,
                OnLeave = onLeave,
                AvgRating = avgRating,
                TotalClientsAssigned = totalClientsAssigned
            };
        }

        public async Task<IEnumerable<TrainerDto>> GetAllTrainersAsync()
        {
            var trainers = (await _unitOfWork.Trainers.FindAsync(_ => true)).ToList();
            var userIds = trainers.Select(i => i.UserId).Distinct().ToList();
            var users = userIds.Count > 0
                ? (await _unitOfWork.Users.FindAsync(u => userIds.Contains(u.Id))).ToDictionary(u => u.Id)
                : new Dictionary<int, User>();
            var authByUserId = (await _unitOfWork.AuthUsers.GetAllAsync())
                .Where(a => a.UserId.HasValue && userIds.Contains(a.UserId.Value))
                .ToDictionary(a => a.UserId!.Value);
            return trainers.Select(i => MapToDto(i, users.GetValueOrDefault(i.UserId), authByUserId.GetValueOrDefault(i.UserId)?.Email));
        }

        public async Task<TrainerDto?> GetTrainerByIdAsync(int id)
        {
            var trainer = await _unitOfWork.Trainers.GetByIdAsync(id);
            if (trainer == null) return null;
            var user = await _unitOfWork.Users.GetByIdAsync(trainer.UserId);
            var authUser = (await _unitOfWork.AuthUsers.GetAllAsync()).FirstOrDefault(a => a.UserId == trainer.UserId);
            return MapToDto(trainer, user, authUser?.Email);
        }

        public async Task<TrainerDto> CreateTrainerAsync(CreateTrainerDto dto)
        {
            var user = await _unitOfWork.Users.GetByIdAsync(dto.UserId);
            if (user == null)
                throw new NotFoundException("User not found. Create a User first and use their ID.");

            var existing = await _unitOfWork.Trainers.FirstOrDefaultAsync(i => i.UserId == dto.UserId);
            if (existing != null)
                throw new ConflictException("This user is already a trainer.");

            var trainer = new Trainer
            {
                UserId = dto.UserId,
                EmployeeCode = await TrainerEmployeeCodeGenerator.GenerateNextAsync(_unitOfWork),
                Specialization = dto.Specialization,
                CertificationDetails = dto.CertificationDetails,
                ExperienceYears = dto.ExperienceYears,
                Salary = dto.Salary,
                CommissionPercentage = dto.CommissionPercentage,
                HireDate = DateTime.UtcNow,
                JoiningDate = dto.JoiningDate,
                Bio = dto.Bio,
                ProfilePicture = dto.ProfilePicture,
                Rating = dto.Rating,
                TotalClients = 0,
                MaxActiveClients = dto.MaxClients,
                AvailabilityStatus = dto.AvailabilityStatus,
                IsPersonalTrainer = dto.IsPersonalTrainer,
                IsActive = true
            };

            await _unitOfWork.Trainers.AddAsync(trainer);
            await _unitOfWork.SaveChangesAsync();

            var authUser = (await _unitOfWork.AuthUsers.GetAllAsync()).FirstOrDefault(a => a.UserId == trainer.UserId);
            return MapToDto(trainer, user, authUser?.Email);
        }

        public async Task<TrainerDto?> UpdateTrainerAsync(int id, UpdateTrainerDto dto)
        {
            var trainer = await _unitOfWork.Trainers.GetByIdAsync(id);
            if (trainer == null) return null;

            if (dto.EmployeeCode != null) trainer.EmployeeCode = dto.EmployeeCode;
            if (dto.Specialization != null) trainer.Specialization = dto.Specialization;
            if (dto.CertificationDetails != null) trainer.CertificationDetails = dto.CertificationDetails;
            if (dto.ExperienceYears.HasValue) trainer.ExperienceYears = dto.ExperienceYears;
            if (dto.Salary.HasValue) trainer.Salary = dto.Salary;
            if (dto.CommissionPercentage.HasValue) trainer.CommissionPercentage = dto.CommissionPercentage;
            if (dto.JoiningDate.HasValue) trainer.JoiningDate = dto.JoiningDate;
            if (dto.Bio != null) trainer.Bio = dto.Bio;
            if (dto.ProfilePicture != null) trainer.ProfilePicture = dto.ProfilePicture;
            if (dto.Rating.HasValue) trainer.Rating = dto.Rating;
            if (dto.TotalClients.HasValue) trainer.TotalClients = dto.TotalClients.Value;
            if (dto.MaxClients.HasValue) trainer.MaxActiveClients = dto.MaxClients.Value;
            if (dto.AvailabilityStatus != null) trainer.AvailabilityStatus = dto.AvailabilityStatus;
            if (dto.IsPersonalTrainer.HasValue) trainer.IsPersonalTrainer = dto.IsPersonalTrainer.Value;
            if (dto.TerminationDate.HasValue) trainer.TerminationDate = dto.TerminationDate;
            if (dto.TerminationReason != null) trainer.TerminationReason = dto.TerminationReason;
            if (dto.IsActive.HasValue) trainer.IsActive = dto.IsActive.Value;

            _unitOfWork.Trainers.Update(trainer);
            await _unitOfWork.SaveChangesAsync();

            var user = await _unitOfWork.Users.GetByIdAsync(trainer.UserId);
            var authUser = (await _unitOfWork.AuthUsers.GetAllAsync()).FirstOrDefault(a => a.UserId == trainer.UserId);
            return MapToDto(trainer, user, authUser?.Email);
        }

        public async Task<bool> DeleteTrainerAsync(int id)
        {
            var trainer = await _unitOfWork.Trainers.GetByIdAsync(id);
            if (trainer == null) return false;

            _unitOfWork.Trainers.Delete(trainer);
            await _unitOfWork.SaveChangesAsync();
            return true;
        }

        private static TrainerDto MapToDto(Trainer trainer, User? user, string? emailFromAuth = null)
        {
            return new TrainerDto
            {
                Id = trainer.Id,
                UserId = trainer.UserId,
                FirstName = user?.FirstName ?? "",
                LastName = user?.LastName ?? "",
                Email = emailFromAuth ?? "",
                Phone = user?.Phone,
                EmployeeCode = trainer.EmployeeCode,
                Specialization = trainer.Specialization,
                CertificationDetails = trainer.CertificationDetails,
                ExperienceYears = trainer.ExperienceYears,
                Salary = trainer.Salary,
                CommissionPercentage = trainer.CommissionPercentage,
                HireDate = trainer.HireDate,
                JoiningDate = trainer.JoiningDate,
                Bio = trainer.Bio,
                ProfilePicture = trainer.ProfilePicture,
                Rating = trainer.Rating,
                TotalClients = trainer.TotalClients,
                MaxClients = trainer.MaxActiveClients,
                AvailabilityStatus = trainer.AvailabilityStatus,
                IsPersonalTrainer = trainer.IsPersonalTrainer,
                TerminationDate = trainer.TerminationDate,
                TerminationReason = trainer.TerminationReason,
                IsActive = trainer.IsActive
            };
        }
    }
}
