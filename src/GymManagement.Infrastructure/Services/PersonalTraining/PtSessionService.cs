using GymManagement.Core.DTOs.Common;
using GymManagement.Core.DTOs.PersonalTraining;
using GymManagement.Core.Exceptions;
using GymManagement.Core.Services.PersonalTraining;
using GymManagement.Domain.Entities.PersonalTraining;
using GymManagement.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace GymManagement.Infrastructure.Services.PersonalTraining
{
    public sealed class PtSessionService : IPtSessionService
    {
        private readonly ApplicationDbContext _db;
        private readonly ITrainerScheduleService _scheduleService;

        public PtSessionService(ApplicationDbContext db, ITrainerScheduleService scheduleService)
        {
            _db = db;
            _scheduleService = scheduleService;
        }

        public async Task<PagedResultDto<PTSessionDto>> SearchAsync(PTSessionFilterDto filter, CancellationToken ct = default)
        {
            var page = Math.Max(1, filter.Page);
            var pageSize = Math.Clamp(filter.PageSize, 1, 100);
            var query = _db.PTSessions.AsNoTracking()
                .Include(s => s.User)
                .Include(s => s.Trainer).ThenInclude(t => t.User)
                .Include(s => s.MemberPTPackage)
                .Where(s => !s.IsDeleted);

            if (filter.UserId.HasValue) query = query.Where(s => s.UserId == filter.UserId);
            if (filter.TrainerId.HasValue) query = query.Where(s => s.TrainerId == filter.TrainerId);
            if (filter.MemberPTPackageId.HasValue) query = query.Where(s => s.MemberPTPackageId == filter.MemberPTPackageId);
            if (filter.Status.HasValue) query = query.Where(s => s.Status == filter.Status);
            if (filter.FromUtc.HasValue) query = query.Where(s => s.ScheduledStartUtc >= filter.FromUtc);
            if (filter.ToUtc.HasValue) query = query.Where(s => s.ScheduledStartUtc <= filter.ToUtc);
            if (!string.IsNullOrWhiteSpace(filter.Search))
            {
                var s = filter.Search.Trim().ToLower();
                query = query.Where(x =>
                    x.User.FirstName.ToLower().Contains(s) ||
                    x.User.LastName.ToLower().Contains(s));
            }

            var total = await query.CountAsync(ct);
            var rows = await query.OrderBy(s => s.ScheduledStartUtc)
                .Skip((page - 1) * pageSize).Take(pageSize).ToListAsync(ct);

            return new PagedResultDto<PTSessionDto>
            {
                Items = rows.Select(Map).ToList(),
                TotalCount = total,
                Page = page,
                PageSize = pageSize,
            };
        }

        public async Task<PTSessionDto?> GetByIdAsync(int id, CancellationToken ct = default)
        {
            var s = await _db.PTSessions.AsNoTracking()
                .Include(x => x.User)
                .Include(x => x.Trainer).ThenInclude(t => t.User)
                .Include(x => x.MemberPTPackage)
                .FirstOrDefaultAsync(x => x.Id == id && !x.IsDeleted, ct);
            return s == null ? null : Map(s);
        }

        public async Task<PTSessionDto> BookAsync(BookPTSessionDto dto, int? performedByUserId, CancellationToken ct = default)
        {
            var pkg = await _db.MemberPTPackages
                .FirstOrDefaultAsync(m => m.Id == dto.MemberPTPackageId && !m.IsDeleted, ct)
                ?? throw new NotFoundException("Member PT package not found.");

            ValidatePackageForBooking(pkg);

            if (!await _scheduleService.IsTrainerAvailableAsync(pkg.TrainerId, dto.ScheduledStartUtc, dto.ScheduledEndUtc, null, ct))
                throw new ConflictException("Trainer is not available for the selected time slot.");

            var session = new PTSession
            {
                MemberPTPackageId = pkg.Id,
                UserId = pkg.UserId,
                TrainerId = pkg.TrainerId,
                ScheduledStartUtc = dto.ScheduledStartUtc,
                ScheduledEndUtc = dto.ScheduledEndUtc,
                Status = PTSessionStatus.Booked,
                Notes = dto.Notes,
            };
            await _db.PTSessions.AddAsync(session, ct);
            await _db.SaveChangesAsync(ct);
            await AddSessionHistoryAsync(session, PTSessionStatus.Booked, PTSessionStatus.Booked, performedByUserId, "Booked", ct);
            await _db.SaveChangesAsync(ct);
            return (await GetByIdAsync(session.Id, ct))!;
        }

        public async Task<PTSessionDto?> RescheduleAsync(int id, ReschedulePTSessionDto dto, int? performedByUserId, CancellationToken ct = default)
        {
            var session = await _db.PTSessions.FirstOrDefaultAsync(s => s.Id == id && !s.IsDeleted, ct);
            if (session == null) return null;
            if (session.Status is PTSessionStatus.Completed or PTSessionStatus.Cancelled)
                throw new BadRequestException("Cannot reschedule a completed or cancelled session.");

            if (!await _scheduleService.IsTrainerAvailableAsync(session.TrainerId, dto.ScheduledStartUtc, dto.ScheduledEndUtc, id, ct))
                throw new ConflictException("Trainer is not available for the new time slot.");

            var oldStatus = session.Status;
            session.Status = PTSessionStatus.Rescheduled;
            session.ScheduledStartUtc = dto.ScheduledStartUtc;
            session.ScheduledEndUtc = dto.ScheduledEndUtc;
            session.Notes = dto.Notes ?? session.Notes;
            session.UpdatedDate = DateTime.UtcNow;

            var newSession = new PTSession
            {
                MemberPTPackageId = session.MemberPTPackageId,
                UserId = session.UserId,
                TrainerId = session.TrainerId,
                ScheduledStartUtc = dto.ScheduledStartUtc,
                ScheduledEndUtc = dto.ScheduledEndUtc,
                Status = PTSessionStatus.Booked,
                RescheduledFromSessionId = session.Id,
                Notes = dto.Notes,
            };
            await _db.PTSessions.AddAsync(newSession, ct);
            await _db.SaveChangesAsync(ct);
            await AddSessionHistoryAsync(session, oldStatus, PTSessionStatus.Rescheduled, performedByUserId, dto.Notes, ct);
            await AddSessionHistoryAsync(newSession, PTSessionStatus.Booked, PTSessionStatus.Booked, performedByUserId, "Rescheduled booking", ct);
            await _db.SaveChangesAsync(ct);
            return await GetByIdAsync(newSession.Id, ct);
        }

        public async Task<PTSessionDto?> CancelAsync(int id, string? notes, int? performedByUserId, CancellationToken ct = default)
        {
            var session = await _db.PTSessions.FirstOrDefaultAsync(s => s.Id == id && !s.IsDeleted, ct);
            if (session == null) return null;
            if (session.Status == PTSessionStatus.Completed)
                throw new BadRequestException("Cannot cancel a completed session.");
            var old = session.Status;
            session.Status = PTSessionStatus.Cancelled;
            session.UpdatedDate = DateTime.UtcNow;
            await AddSessionHistoryAsync(session, old, PTSessionStatus.Cancelled, performedByUserId, notes, ct);
            await _db.SaveChangesAsync(ct);
            return await GetByIdAsync(id, ct);
        }

        private static void ValidatePackageForBooking(MemberPTPackage pkg)
        {
            if (pkg.Status is MemberPTPackageStatus.Frozen or MemberPTPackageStatus.Cancelled or MemberPTPackageStatus.Expired)
                throw new BadRequestException("Member PT package is not active for booking.");
            if (pkg.RemainingSessions <= 0)
                throw new BadRequestException("No remaining sessions on this package.");
            if (pkg.ExpiryDate.Date < DateTime.UtcNow.Date)
                throw new BadRequestException("PT package has expired.");
            if (pkg.PaymentStatus != PTPaymentStatus.Paid && pkg.PaymentStatus != PTPaymentStatus.Partial)
                throw new BadRequestException("Package payment is required before booking sessions.");
        }

        private async Task AddSessionHistoryAsync(PTSession session, PTSessionStatus from, PTSessionStatus to, int? by, string? notes, CancellationToken ct)
        {
            await _db.PTSessionHistories.AddAsync(new PTSessionHistory
            {
                PTSessionId = session.Id,
                FromStatus = from,
                ToStatus = to,
                PerformedByUserId = by,
                Notes = notes,
            }, ct);
        }

        private static PTSessionDto Map(PTSession s) => new()
        {
            Id = s.Id,
            MemberPTPackageId = s.MemberPTPackageId,
            UserId = s.UserId,
            MemberName = $"{s.User.FirstName} {s.User.LastName}".Trim(),
            TrainerId = s.TrainerId,
            TrainerName = s.Trainer?.User == null ? null : $"{s.Trainer.User.FirstName} {s.Trainer.User.LastName}".Trim(),
            ScheduledStartUtc = s.ScheduledStartUtc,
            ScheduledEndUtc = s.ScheduledEndUtc,
            Status = s.Status,
            Notes = s.Notes,
            RemainingSessions = s.MemberPTPackage?.RemainingSessions ?? 0,
        };
    }
}
