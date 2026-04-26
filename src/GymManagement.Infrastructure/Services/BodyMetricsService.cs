using GymManagement.Core.DTOs;
using GymManagement.Core.Interfaces;
using GymManagement.Core.Services;
using GymManagement.Domain.Entities;
using GymManagement.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using System.Globalization;

namespace GymManagement.Infrastructure.Services
{
    public class BodyMetricsService : IBodyMetricsService
    {
        private readonly IUnitOfWork _unitOfWork;
        private readonly ApplicationDbContext _context;
        private readonly ILogger<BodyMetricsService> _logger;

        public BodyMetricsService(
            IUnitOfWork unitOfWork,
            ApplicationDbContext context,
            ILogger<BodyMetricsService> logger)
        {
            _unitOfWork = unitOfWork;
            _context = context;
            _logger = logger;
        }

        public async Task<IEnumerable<BodyMetricsLogDto>> GetBodyMetricsLogsByUserIdAsync(int userId)
        {
            var logs = await _unitOfWork.BodyMetricsLogs.FindAsync(bml => bml.UserId == userId);
            return await MapToDtosAsync(logs.OrderByDescending(bml => bml.MeasurementDate).ThenByDescending(bml => bml.CreatedDate));
        }

        public async Task<BodyMetricsLogDto?> GetLatestBodyMetricsByUserIdAsync(int userId)
        {
            var logs = await _unitOfWork.BodyMetricsLogs.FindAsync(bml => bml.UserId == userId);
            var latest = logs
                .OrderByDescending(bml => bml.MeasurementDate)
                .ThenByDescending(bml => bml.CreatedDate)
                .FirstOrDefault();

            if (latest == null) return null;
            return (await MapToDtosAsync(new[] { latest })).FirstOrDefault();
        }

        public Task<BodyMetricsLogDto?> GetCurrentBodyMetricsByUserIdAsync(int userId)
        {
            // Current snapshot for body metrics is the latest recorded reading.
            return GetLatestBodyMetricsByUserIdAsync(userId);
        }

        public async Task<BodyMetricsLogDto> CreateBodyMetricsLogAsync(CreateBodyMetricsLogDto dto)
        {
            var log = new BodyMetricsLog
            {
                UserId = dto.UserId,
                MeasurementDate = dto.MeasurementDate,
                WeightKg = dto.WeightKg,
                BodyFatPct = dto.BodyFatPct,
                MuscleMassKg = dto.MuscleMassKg,
                ChestCm = dto.ChestCm,
                WaistCm = dto.WaistCm,
                HipsCm = dto.HipsCm,
                BicepsCm = dto.BicepsCm,
                ThighsCm = dto.ThighsCm,
                NeckCm = dto.NeckCm,
                ShouldersCm = dto.ShouldersCm,
                ForearmsCm = dto.ForearmsCm,
                CalvesCm = dto.CalvesCm,
                HeightCm = dto.HeightCm,
                Notes = dto.Notes,
                ProgressPictureUrl = dto.ProgressPictureUrl
            };
            await _unitOfWork.BodyMetricsLogs.AddAsync(log);
            await _unitOfWork.SaveChangesAsync();

            var list = await MapToDtosAsync(new[] { log });
            return list.First();
        }

        public async Task<BodyMetricsLogDto?> UpdateBodyMetricsLogAsync(int id, UpdateBodyMetricsLogDto dto, string? changedByUser)
        {
            var log = await _unitOfWork.BodyMetricsLogs.GetByIdAsync(id);
            if (log == null) return null;

            var changes = new List<(string Property, string? Previous, string? New)>();

            ApplyChange(changes, "MeasurementDate", log.MeasurementDate, dto.MeasurementDate, v => log.MeasurementDate = v);
            ApplyChange(changes, "WeightKg", log.WeightKg, dto.WeightKg, v => log.WeightKg = v);
            ApplyChangeNullable(changes, "BodyFatPct", log.BodyFatPct, dto.BodyFatPct, v => log.BodyFatPct = v);
            ApplyChangeNullable(changes, "MuscleMassKg", log.MuscleMassKg, dto.MuscleMassKg, v => log.MuscleMassKg = v);
            ApplyChangeNullable(changes, "ChestCm", log.ChestCm, dto.ChestCm, v => log.ChestCm = v);
            ApplyChangeNullable(changes, "WaistCm", log.WaistCm, dto.WaistCm, v => log.WaistCm = v);
            ApplyChangeNullable(changes, "HipsCm", log.HipsCm, dto.HipsCm, v => log.HipsCm = v);
            ApplyChangeNullable(changes, "BicepsCm", log.BicepsCm, dto.BicepsCm, v => log.BicepsCm = v);
            ApplyChangeNullable(changes, "ThighsCm", log.ThighsCm, dto.ThighsCm, v => log.ThighsCm = v);
            ApplyChangeNullable(changes, "NeckCm", log.NeckCm, dto.NeckCm, v => log.NeckCm = v);
            ApplyChangeNullable(changes, "ShouldersCm", log.ShouldersCm, dto.ShouldersCm, v => log.ShouldersCm = v);
            ApplyChangeNullable(changes, "ForearmsCm", log.ForearmsCm, dto.ForearmsCm, v => log.ForearmsCm = v);
            ApplyChangeNullable(changes, "CalvesCm", log.CalvesCm, dto.CalvesCm, v => log.CalvesCm = v);
            ApplyChangeNullable(changes, "HeightCm", log.HeightCm, dto.HeightCm, v => log.HeightCm = v);
            ApplyChangeString(changes, "Notes", log.Notes, dto.Notes, v => log.Notes = v);
            ApplyChangeString(changes, "ProgressPictureUrl", log.ProgressPictureUrl, dto.ProgressPictureUrl, v => log.ProgressPictureUrl = v);

            _unitOfWork.BodyMetricsLogs.Update(log);
            await _unitOfWork.SaveChangesAsync();
            await TryWriteAuditChangesAsync(log, changes, "UPDATE", changedByUser);

            return (await MapToDtosAsync(new[] { log })).FirstOrDefault();
        }

        public async Task<bool> DeleteBodyMetricsLogAsync(int id, string? changedByUser)
        {
            var log = await _unitOfWork.BodyMetricsLogs.GetByIdAsync(id);
            if (log == null) return false;

            var previousSummary = BuildSummary(log);
            _unitOfWork.BodyMetricsLogs.Delete(log);
            await _unitOfWork.SaveChangesAsync();

            await TryWriteAuditChangesAsync(
                log,
                new List<(string Property, string? Previous, string? New)>
                {
                    ("Record", previousSummary, "[DELETED]")
                },
                "DELETE",
                changedByUser);

            return true;
        }

        private async Task TryWriteAuditChangesAsync(
            BodyMetricsLog log,
            IReadOnlyCollection<(string Property, string? Previous, string? New)> changes,
            string changeType,
            string? changedByUser)
        {
            if (changes.Count == 0) return;

            foreach (var change in changes)
            {
                try
                {
                    await _context.Database.ExecuteSqlInterpolatedAsync($@"
INSERT INTO [AuditValueChange_tbl]
    ([AuditEvent_ID], [ValueChangeType], [PropertyName], [ObjectType], [ChangedObjectType], [ChangedObject_ID], [NewValueStr], [PreviousValueStr], [UserMessage], [changedByUser], [timestamp])
VALUES
    ({(int?)null}, {changeType}, {change.Property}, {"BodyMetrics"}, {"BodyMetricsLog"}, {log.Id}, {change.New}, {change.Previous}, {"Body metrics reading changed"}, {changedByUser ?? "system"}, {DateTime.UtcNow})");
                }
                catch (Exception ex)
                {
                    // Keep metrics CRUD resilient even when legacy/custom audit table is unavailable.
                    _logger.LogWarning(ex, "Failed to write body metrics audit record for log {LogId}", log.Id);
                }
            }
        }

        private static string BuildSummary(BodyMetricsLog log) =>
            $"Date={Format(log.MeasurementDate)}, WeightKg={Format(log.WeightKg)}, BodyFatPct={Format(log.BodyFatPct)}, MuscleMassKg={Format(log.MuscleMassKg)}, " +
            $"ChestCm={Format(log.ChestCm)}, WaistCm={Format(log.WaistCm)}, HipsCm={Format(log.HipsCm)}, BicepsCm={Format(log.BicepsCm)}, " +
            $"ThighsCm={Format(log.ThighsCm)}, NeckCm={Format(log.NeckCm)}, ShouldersCm={Format(log.ShouldersCm)}, ForearmsCm={Format(log.ForearmsCm)}, " +
            $"CalvesCm={Format(log.CalvesCm)}, HeightCm={Format(log.HeightCm)}, Notes={log.Notes ?? "null"}";

        private static void ApplyChange(
            ICollection<(string Property, string? Previous, string? New)> changes,
            string property,
            DateTime current,
            DateTime? incoming,
            Action<DateTime> setter)
        {
            if (!incoming.HasValue || current == incoming.Value) return;
            changes.Add((property, Format(current), Format(incoming.Value)));
            setter(incoming.Value);
        }

        private static void ApplyChange(
            ICollection<(string Property, string? Previous, string? New)> changes,
            string property,
            decimal current,
            decimal? incoming,
            Action<decimal> setter)
        {
            if (!incoming.HasValue || current == incoming.Value) return;
            changes.Add((property, Format(current), Format(incoming.Value)));
            setter(incoming.Value);
        }

        private static void ApplyChangeNullable(
            ICollection<(string Property, string? Previous, string? New)> changes,
            string property,
            decimal? current,
            decimal? incoming,
            Action<decimal?> setter)
        {
            if (!incoming.HasValue) return;
            if (current == incoming) return;
            changes.Add((property, Format(current), Format(incoming)));
            setter(incoming);
        }

        private static void ApplyChangeString(
            ICollection<(string Property, string? Previous, string? New)> changes,
            string property,
            string? current,
            string? incoming,
            Action<string?> setter)
        {
            if (incoming == null) return;
            if (string.Equals(current, incoming, StringComparison.Ordinal)) return;
            changes.Add((property, current, incoming));
            setter(incoming);
        }

        private static string? Format(decimal? value) =>
            value?.ToString(CultureInfo.InvariantCulture);

        private static string? Format(decimal value) =>
            value.ToString(CultureInfo.InvariantCulture);

        private static string? Format(DateTime value) =>
            value.ToString("O", CultureInfo.InvariantCulture);

        private async Task<List<BodyMetricsLogDto>> MapToDtosAsync(IEnumerable<BodyMetricsLog> logs)
        {
            var logsList = logs.ToList();
            if (logsList.Count == 0) return new List<BodyMetricsLogDto>();

            var userIds = logsList.Select(bml => bml.UserId).Distinct().ToList();
            var users = await _unitOfWork.Users.FindAsync(u => userIds.Contains(u.Id));
            var userDict = users.ToDictionary(u => u.Id);

            return logsList.Select(bml => new BodyMetricsLogDto
            {
                Id = bml.Id,
                UserId = bml.UserId,
                UserName = userDict.TryGetValue(bml.UserId, out var u) ? $"{u.FirstName} {u.LastName}".Trim() : "Unknown",
                MeasurementDate = bml.MeasurementDate,
                CreatedDate = bml.CreatedDate,
                WeightKg = bml.WeightKg,
                BodyFatPct = bml.BodyFatPct,
                MuscleMassKg = bml.MuscleMassKg,
                ChestCm = bml.ChestCm,
                WaistCm = bml.WaistCm,
                HipsCm = bml.HipsCm,
                BicepsCm = bml.BicepsCm,
                ThighsCm = bml.ThighsCm,
                NeckCm = bml.NeckCm,
                ShouldersCm = bml.ShouldersCm,
                ForearmsCm = bml.ForearmsCm,
                CalvesCm = bml.CalvesCm,
                HeightCm = bml.HeightCm,
                Notes = bml.Notes,
                ProgressPictureUrl = bml.ProgressPictureUrl
            }).ToList();
        }
    }
}
