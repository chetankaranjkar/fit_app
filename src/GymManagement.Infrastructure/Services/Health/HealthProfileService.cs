using System.Text.Json;
using GymManagement.Core.DTOs.Health;
using GymManagement.Core.Exceptions;
using GymManagement.Core.Health;
using GymManagement.Core.Services;
using GymManagement.Domain.Entities.Health;
using GymManagement.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace GymManagement.Infrastructure.Services.Health
{
    public class HealthProfileService : IHealthProfileService
    {
        private readonly ApplicationDbContext _context;

        private static readonly Dictionary<string, string> ConditionLabels = new(StringComparer.OrdinalIgnoreCase)
        {
            [MedicalConditionCodes.Diabetes] = "Diabetes",
            [MedicalConditionCodes.HighBloodPressure] = "High Blood Pressure",
            [MedicalConditionCodes.Asthma] = "Asthma",
            [MedicalConditionCodes.HeartDisease] = "Heart Disease",
            [MedicalConditionCodes.Arthritis] = "Arthritis",
            [MedicalConditionCodes.Thyroid] = "Thyroid",
            [MedicalConditionCodes.Epilepsy] = "Epilepsy",
            [MedicalConditionCodes.HighCholesterol] = "High Cholesterol",
            [MedicalConditionCodes.Obesity] = "Obesity",
            [MedicalConditionCodes.BackPain] = "Back Pain",
            [MedicalConditionCodes.KneePain] = "Knee Pain",
            [MedicalConditionCodes.Other] = "Other",
        };

        public HealthProfileService(ApplicationDbContext context)
        {
            _context = context;
        }

        public async Task<bool> CanAccessUserHealthProfileAsync(
            int requestingUserId,
            int targetUserId,
            bool hasUsersAccess,
            bool hasTrainerAccess,
            CancellationToken cancellationToken = default)
        {
            if (requestingUserId == targetUserId) return true;
            if (hasUsersAccess) return true;

            if (!hasTrainerAccess) return false;

            return await _context.UserInstructors.AsNoTracking()
                .AnyAsync(
                    ui => !ui.IsDeleted && ui.UserId == targetUserId &&
                          _context.Trainers.Any(t => t.Id == ui.TrainerId && t.UserId == requestingUserId && !t.IsDeleted),
                    cancellationToken);
        }

        public async Task<HealthProfileDto?> GetByUserIdAsync(int userId, CancellationToken cancellationToken = default)
        {
            var profile = await LoadProfileQuery()
                .FirstOrDefaultAsync(p => p.UserId == userId, cancellationToken);

            return profile == null ? null : MapToDto(profile);
        }

        public async Task<HealthProfileSummaryDto?> GetSummaryByUserIdAsync(int userId, CancellationToken cancellationToken = default)
        {
            var user = await _context.Users.AsNoTracking()
                .Where(u => u.Id == userId && !u.IsDeleted)
                .Select(u => new { u.Id, u.FirstName, u.LastName })
                .FirstOrDefaultAsync(cancellationToken);

            if (user == null) return null;

            var profile = await LoadProfileQuery()
                .FirstOrDefaultAsync(p => p.UserId == userId, cancellationToken);

            if (profile == null)
            {
                return new HealthProfileSummaryDto
                {
                    UserId = userId,
                    MemberName = $"{user.FirstName} {user.LastName}".Trim(),
                    RiskLevel = HealthRiskLevels.Low,
                    IsCompleted = false,
                };
            }

            var restrictions = DeserializeRestrictions(profile.ExerciseRestrictions);
            var conditions = profile.MedicalConditions.Where(c => !c.IsDeleted).ToList();
            var activeInjuries = profile.Injuries
                .Where(i => !i.IsDeleted && !string.Equals(i.Status, "Resolved", StringComparison.OrdinalIgnoreCase))
                .ToList();

            return new HealthProfileSummaryDto
            {
                UserId = userId,
                MemberName = $"{user.FirstName} {user.LastName}".Trim(),
                RiskLevel = profile.RiskLevel,
                IsCompleted = profile.IsCompleted,
                LastAssessedAt = profile.LastAssessedAt,
                MedicalConditionLabels = conditions.Select(c => GetConditionLabel(c)).ToList(),
                ActiveInjuries = activeInjuries.Select(MapInjury).ToList(),
                ExerciseRestrictions = restrictions,
                RequiresMedicalClearance = profile.ParqChestPainDuringExercise == true ||
                    profile.ParqDoctorAdvisedAgainstExercise == true ||
                    profile.ParqShortnessOfBreath == true ||
                    profile.ParqDizzinessOrFainting == true ||
                    profile.ParqRecentSurgery == true,
            };
        }

        public async Task<HealthProfileDto> UpsertAsync(int userId, UpsertHealthProfileDto dto, CancellationToken cancellationToken = default)
        {
            var userExists = await _context.Users.AnyAsync(u => u.Id == userId && !u.IsDeleted, cancellationToken);
            if (!userExists)
                throw new NotFoundException($"User {userId} not found.");

            var profile = await _context.UserHealthProfiles
                .Include(p => p.MedicalConditions)
                .Include(p => p.Medications)
                .Include(p => p.Injuries)
                .Include(p => p.EmergencyContacts)
                .FirstOrDefaultAsync(p => p.UserId == userId, cancellationToken);

            if (profile == null)
            {
                profile = new UserHealthProfile { UserId = userId };
                await _context.UserHealthProfiles.AddAsync(profile, cancellationToken);
            }

            profile.HealthOverview = dto.HealthOverview?.Trim();
            profile.ParqChestPainDuringExercise = dto.ParqChestPainDuringExercise;
            profile.ParqDoctorAdvisedAgainstExercise = dto.ParqDoctorAdvisedAgainstExercise;
            profile.ParqShortnessOfBreath = dto.ParqShortnessOfBreath;
            profile.ParqDizzinessOrFainting = dto.ParqDizzinessOrFainting;
            profile.ParqRecentSurgery = dto.ParqRecentSurgery;
            profile.SmokingStatus = dto.SmokingStatus?.Trim();
            profile.AlcoholFrequency = dto.AlcoholFrequency?.Trim();
            profile.StressLevel = dto.StressLevel?.Trim();
            profile.SleepHours = dto.SleepHours;
            profile.DoctorName = dto.DoctorName?.Trim();
            profile.DoctorClinic = dto.DoctorClinic?.Trim();
            profile.DoctorContactNumber = dto.DoctorContactNumber?.Trim();
            profile.IsCompleted = dto.MarkCompleted;
            profile.LastAssessedAt = DateTime.UtcNow;
            profile.UpdatedDate = DateTime.UtcNow;

            SyncCollection(
                profile.MedicalConditions,
                dto.MedicalConditions,
                (entity, item) =>
                {
                    entity.ConditionCode = item.ConditionCode;
                    entity.CustomConditionName = string.Equals(item.ConditionCode, MedicalConditionCodes.Other, StringComparison.OrdinalIgnoreCase)
                        ? item.CustomConditionName?.Trim()
                        : null;
                    entity.Notes = item.Notes?.Trim();
                },
                () => new UserMedicalCondition());

            SyncCollection(
                profile.Medications,
                dto.Medications.Where(m => !string.IsNullOrWhiteSpace(m.MedicationName)).ToList(),
                (entity, item) =>
                {
                    entity.MedicationName = item.MedicationName.Trim();
                    entity.Dosage = item.Dosage?.Trim();
                    entity.Reason = item.Reason?.Trim();
                },
                () => new UserMedication());

            SyncCollection(
                profile.Injuries,
                dto.Injuries.Where(i => !string.IsNullOrWhiteSpace(i.BodyPart)).ToList(),
                (entity, item) =>
                {
                    entity.BodyPart = item.BodyPart.Trim();
                    entity.InjuryType = item.InjuryType?.Trim() ?? string.Empty;
                    entity.Status = string.IsNullOrWhiteSpace(item.Status) ? "Active" : item.Status.Trim();
                    entity.Notes = item.Notes?.Trim();
                },
                () => new UserInjury());

            SyncCollection(
                profile.EmergencyContacts,
                dto.EmergencyContacts.Where(c => !string.IsNullOrWhiteSpace(c.Name)).ToList(),
                (entity, item) =>
                {
                    entity.Name = item.Name.Trim();
                    entity.Relationship = item.Relationship?.Trim();
                    entity.Mobile = item.Mobile?.Trim() ?? string.Empty;
                },
                () => new UserEmergencyContact());

            var (risk, restrictions) = HealthProfileRiskEngine.Evaluate(profile);
            profile.RiskLevel = risk;
            profile.ExerciseRestrictions = JsonSerializer.Serialize(restrictions);

            await _context.SaveChangesAsync(cancellationToken);

            var reloaded = await LoadProfileQuery()
                .FirstAsync(p => p.Id == profile.Id, cancellationToken);

            return MapToDto(reloaded);
        }

        private IQueryable<UserHealthProfile> LoadProfileQuery() =>
            _context.UserHealthProfiles
                .AsNoTracking()
                .Include(p => p.MedicalConditions.Where(c => !c.IsDeleted))
                .Include(p => p.Medications.Where(m => !m.IsDeleted))
                .Include(p => p.Injuries.Where(i => !i.IsDeleted))
                .Include(p => p.EmergencyContacts.Where(c => !c.IsDeleted));

        private static void SyncCollection<TEntity, TDto>(
            ICollection<TEntity> existing,
            IReadOnlyList<TDto> incoming,
            Action<TEntity, TDto> apply,
            Func<TEntity> factory)
            where TEntity : GymManagement.Domain.Entities.BaseEntity
        {
            foreach (var entity in existing.Where(e => !e.IsDeleted).ToList())
            {
                entity.IsDeleted = true;
                entity.UpdatedDate = DateTime.UtcNow;
            }

            foreach (var item in incoming)
            {
                var entity = factory();
                entity.CreatedDate = DateTime.UtcNow;
                apply(entity, item);
                existing.Add(entity);
            }
        }

        private HealthProfileDto MapToDto(UserHealthProfile profile) =>
            new()
            {
                Id = profile.Id,
                UserId = profile.UserId,
                HealthOverview = profile.HealthOverview,
                ParqChestPainDuringExercise = profile.ParqChestPainDuringExercise,
                ParqDoctorAdvisedAgainstExercise = profile.ParqDoctorAdvisedAgainstExercise,
                ParqShortnessOfBreath = profile.ParqShortnessOfBreath,
                ParqDizzinessOrFainting = profile.ParqDizzinessOrFainting,
                ParqRecentSurgery = profile.ParqRecentSurgery,
                SmokingStatus = profile.SmokingStatus,
                AlcoholFrequency = profile.AlcoholFrequency,
                StressLevel = profile.StressLevel,
                SleepHours = profile.SleepHours,
                DoctorName = profile.DoctorName,
                DoctorClinic = profile.DoctorClinic,
                DoctorContactNumber = profile.DoctorContactNumber,
                RiskLevel = profile.RiskLevel,
                ExerciseRestrictions = DeserializeRestrictions(profile.ExerciseRestrictions),
                IsCompleted = profile.IsCompleted,
                LastAssessedAt = profile.LastAssessedAt,
                MedicalConditions = profile.MedicalConditions.Where(c => !c.IsDeleted).Select(c => new MedicalConditionDto
                {
                    Id = c.Id,
                    ConditionCode = c.ConditionCode,
                    CustomConditionName = c.CustomConditionName,
                    Notes = c.Notes,
                    Label = GetConditionLabel(c),
                }).ToList(),
                Medications = profile.Medications.Where(m => !m.IsDeleted).Select(m => new MedicationDto
                {
                    Id = m.Id,
                    MedicationName = m.MedicationName,
                    Dosage = m.Dosage,
                    Reason = m.Reason,
                }).ToList(),
                Injuries = profile.Injuries.Where(i => !i.IsDeleted).Select(MapInjury).ToList(),
                EmergencyContacts = profile.EmergencyContacts.Where(c => !c.IsDeleted).Select(c => new EmergencyContactDto
                {
                    Id = c.Id,
                    Name = c.Name,
                    Relationship = c.Relationship,
                    Mobile = c.Mobile,
                }).ToList(),
            };

        private static InjuryDto MapInjury(UserInjury i) => new()
        {
            Id = i.Id,
            BodyPart = i.BodyPart,
            InjuryType = i.InjuryType,
            Status = i.Status,
            Notes = i.Notes,
        };

        private static string GetConditionLabel(UserMedicalCondition c)
        {
            if (string.Equals(c.ConditionCode, MedicalConditionCodes.Other, StringComparison.OrdinalIgnoreCase))
                return string.IsNullOrWhiteSpace(c.CustomConditionName) ? "Other" : c.CustomConditionName.Trim();

            return ConditionLabels.TryGetValue(c.ConditionCode, out var label) ? label : c.ConditionCode;
        }

        private static IReadOnlyList<string> DeserializeRestrictions(string? json)
        {
            if (string.IsNullOrWhiteSpace(json)) return Array.Empty<string>();
            try
            {
                return JsonSerializer.Deserialize<List<string>>(json) ?? new List<string>();
            }
            catch
            {
                return json.Split('\n', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);
            }
        }
    }
}
