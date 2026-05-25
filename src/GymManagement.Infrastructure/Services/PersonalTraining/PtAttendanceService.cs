using GymManagement.Core.DTOs.PersonalTraining;
using GymManagement.Core.Exceptions;
using GymManagement.Core.Services.PersonalTraining;
using GymManagement.Domain.Entities.PersonalTraining;
using GymManagement.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace GymManagement.Infrastructure.Services.PersonalTraining
{
    public sealed class PtAttendanceService : IPtAttendanceService
    {
        private readonly ApplicationDbContext _db;
        private readonly ITrainerCommissionService _commissionService;

        public PtAttendanceService(ApplicationDbContext db, ITrainerCommissionService commissionService)
        {
            _db = db;
            _commissionService = commissionService;
        }

        public async Task<PTAttendanceDto> MarkAsync(int sessionId, MarkPTAttendanceDto dto, CancellationToken ct = default)
        {
            var session = await _db.PTSessions
                .Include(s => s.MemberPTPackage)
                .FirstOrDefaultAsync(s => s.Id == sessionId && !s.IsDeleted, ct)
                ?? throw new NotFoundException("PT session not found.");

            if (session.Status == PTSessionStatus.Cancelled)
                throw new BadRequestException("Cannot mark attendance on a cancelled session.");

            var attendance = await _db.PTAttendances.FirstOrDefaultAsync(a => a.PTSessionId == sessionId && !a.IsDeleted, ct);
            if (attendance == null)
            {
                attendance = new PTAttendance { PTSessionId = sessionId };
                await _db.PTAttendances.AddAsync(attendance, ct);
            }

            attendance.MemberPresent = dto.MemberPresent;
            attendance.TrainerPresent = dto.TrainerPresent;
            attendance.IsLate = dto.IsLate;
            attendance.IsNoShow = dto.IsNoShow;
            attendance.UpdatedDate = DateTime.UtcNow;

            if (dto.IsNoShow)
            {
                session.Status = PTSessionStatus.NoShow;
                await _db.PTSessionHistories.AddAsync(new PTSessionHistory
                {
                    PTSessionId = session.Id,
                    FromStatus = PTSessionStatus.Booked,
                    ToStatus = PTSessionStatus.NoShow,
                    Notes = "No-show recorded",
                }, ct);
            }
            else if (dto.MemberPresent && dto.TrainerPresent)
            {
                attendance.CompletedAtUtc = DateTime.UtcNow;
                session.Status = PTSessionStatus.Completed;
                session.UpdatedDate = DateTime.UtcNow;

                var pkg = session.MemberPTPackage;
                if (pkg != null && pkg.RemainingSessions > 0)
                {
                    pkg.RemainingSessions--;
                    pkg.UpdatedDate = DateTime.UtcNow;
                    if (pkg.RemainingSessions == 0)
                        pkg.Status = MemberPTPackageStatus.Completed;
                    await _db.MemberPTPackageHistories.AddAsync(new MemberPTPackageHistory
                    {
                        MemberPTPackageId = pkg.Id,
                        Action = MemberPTPackageHistoryAction.SessionDeducted,
                        SessionsDelta = -1,
                        RemainingSessionsAfter = pkg.RemainingSessions,
                        ExpiryDateAfter = pkg.ExpiryDate,
                        Notes = $"Session {session.Id} completed",
                    }, ct);

                    var sessionValue = pkg.TotalSessions > 0 ? pkg.TotalAmount / pkg.TotalSessions : 0;
                    await _commissionService.AccrueSessionCommissionAsync(session, sessionValue, ct);
                }

                await _db.PTSessionHistories.AddAsync(new PTSessionHistory
                {
                    PTSessionId = session.Id,
                    FromStatus = PTSessionStatus.Booked,
                    ToStatus = PTSessionStatus.Completed,
                    Notes = "Attendance completed",
                }, ct);
            }

            await _db.SaveChangesAsync(ct);
            return new PTAttendanceDto
            {
                Id = attendance.Id,
                PTSessionId = attendance.PTSessionId,
                MemberPresent = attendance.MemberPresent,
                TrainerPresent = attendance.TrainerPresent,
                IsLate = attendance.IsLate,
                IsNoShow = attendance.IsNoShow,
                CompletedAtUtc = attendance.CompletedAtUtc,
            };
        }
    }
}
