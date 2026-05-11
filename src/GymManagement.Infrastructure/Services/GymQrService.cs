using GymManagement.Core.DTOs;
using GymManagement.Core.Interfaces;
using GymManagement.Core.Services;
using GymManagement.Domain.Entities;
using GymManagement.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace GymManagement.Infrastructure.Services;

public sealed class GymQrService : IGymQrService
{
    public const int DefaultCheckInRadiusMeters = 100;
    public const int CheckInRadiusOffsetMin = -90;
    public const int CheckInRadiusOffsetMax = 9900;
    private const int MinCheckInRadiusMeters = 10;
    private const int MaxCheckInRadiusMeters = 10_000;

    private readonly ApplicationDbContext _db;
    private readonly IUnitOfWork _uow;
    private readonly IDoorUnlockService _doorUnlock;
    private readonly ILogger<GymQrService> _logger;

    /// <summary>Default 100 m plus per-branch offset, clamped to 10…10,000 m.</summary>
    public static int EffectiveCheckInRadiusMeters(int checkInRadiusOffsetMeters) =>
        Math.Clamp(
            DefaultCheckInRadiusMeters + checkInRadiusOffsetMeters,
            MinCheckInRadiusMeters,
            MaxCheckInRadiusMeters);

    public GymQrService(
        ApplicationDbContext db,
        IUnitOfWork uow,
        IDoorUnlockService doorUnlock,
        ILogger<GymQrService> logger)
    {
        _db = db;
        _uow = uow;
        _doorUnlock = doorUnlock;
        _logger = logger;
    }

    public async Task<QrGenerateResponseDto> GenerateAsync(int branchId, CancellationToken cancellationToken = default)
    {
        var branch = await _db.Branches.AsNoTracking()
            .FirstOrDefaultAsync(b => b.Id == branchId, cancellationToken)
            .ConfigureAwait(false);

        if (branch == null)
            throw new InvalidOperationException($"Branch {branchId} was not found.");

        if (!branch.IsActive)
            throw new InvalidOperationException(
                $"Branch {branchId} is inactive. Activate it on the Branches page before generating a venue QR.");

        var now = DateTime.UtcNow;
        var expiry = GeoUtilities.EndOfUtcMonth(now);
        var existing = await _uow.GymQrCodes.FindAsync(q => q.BranchId == branchId && q.IsActive);
        foreach (var q in existing)
        {
            q.IsActive = false;
            q.UpdatedDate = now;
            _uow.GymQrCodes.Update(q);
        }

        var token = Guid.NewGuid().ToString("D");
        var row = new GymQrCode
        {
            BranchId = branchId,
            QrToken = token,
            ExpiryDate = expiry,
            IsActive = true
        };

        await _uow.GymQrCodes.AddAsync(row).ConfigureAwait(false);
        await _uow.SaveChangesAsync().ConfigureAwait(false);

        return new QrGenerateResponseDto
        {
            GymQrCodeId = row.Id,
            BranchId = branchId,
            QrToken = token,
            ExpiryDateUtc = expiry,
            CreatedDateUtc = row.CreatedDate
        };
    }

    public async Task<QrScanResponseDto> ScanAsync(QrScanRequestDto request, int memberUserId, CancellationToken cancellationToken = default)
    {
        var token = request.QrToken?.Trim();
        if (string.IsNullOrEmpty(token))
            return Fail("QR token is required.");

        var memberActive = await _db.Users.AsNoTracking()
            .AnyAsync(u => u.Id == memberUserId && u.IsActive, cancellationToken)
            .ConfigureAwait(false);

        if (!memberActive)
            return Fail("Member profile was not found.");

        var qrRow = await _db.GymQrCodes
            .Include(q => q.Branch)
            .FirstOrDefaultAsync(
                q => q.QrToken == token && q.IsActive && !q.IsDeleted,
                cancellationToken)
            .ConfigureAwait(false);

        if (qrRow?.Branch == null)
            return Fail("Invalid or inactive QR code.");

        var nowUtc = DateTime.UtcNow;
        if (qrRow.ExpiryDate < nowUtc)
            return Fail("This QR code has expired.");

        var branch = qrRow.Branch;
        if (!branch.IsActive)
            return Fail("Branch is not active.");

        if (!branch.Latitude.HasValue || !branch.Longitude.HasValue)
        {
            var name = string.IsNullOrWhiteSpace(branch.BranchName) ? "This venue" : branch.BranchName.Trim();
            return Fail(
                $"{name} has no GPS on file. Staff: Dashboard → Access → Owner QR — set Latitude & Longitude (WGS84), then Save.");
        }

        var meters = GeoUtilities.DistanceMeters(
            branch.Latitude.Value,
            branch.Longitude.Value,
            request.Latitude,
            request.Longitude);

        var maxDistanceMeters = EffectiveCheckInRadiusMeters(branch.CheckInRadiusOffsetMeters);
        if (meters > maxDistanceMeters || double.IsNaN(meters) || double.IsInfinity(meters))
        {
            _logger.LogInformation(
                "QR scan rejected for user {MemberId}: distance {Meters:F1}m (max {Max}m).",
                memberUserId,
                meters,
                maxDistanceMeters);
            return Fail($"You must be within {maxDistanceMeters} meters of the branch to check in.");
        }

        var duplicate = await _db.AttendanceLogs.AsNoTracking()
            .AnyAsync(
                a => a.UserId == memberUserId
                    && !a.IsDeleted
                    && a.CheckInMethod == GymQrScanConstants.Method
                    && a.CheckInTime >= nowUtc.AddMinutes(-5),
                cancellationToken)
            .ConfigureAwait(false);

        if (duplicate)
            return Fail("A QR check-in was already recorded in the last 5 minutes.");

        var notes = $"lat:{request.Latitude:F6}|lng:{request.Longitude:F6}|token:{token}|distM:{meters:F1}";
        var log = new AttendanceLog
        {
            UserId = memberUserId,
            LoggedByUserId = null,
            CheckInTime = nowUtc,
            AttendanceDate = nowUtc.Date,
            CheckInMethod = GymQrScanConstants.Method,
            Notes = notes
        };

        await _uow.AttendanceLogs.AddAsync(log).ConfigureAwait(false);
        await _uow.SaveChangesAsync().ConfigureAwait(false);

        var branchDoor = string.IsNullOrWhiteSpace(branch.Esp32DoorBaseUrl)
            ? null
            : branch.Esp32DoorBaseUrl.Trim().TrimEnd('/');
        var doorUnlockOk = await _doorUnlock.TryUnlockAsync(null, branchDoor, cancellationToken).ConfigureAwait(false);

        return new QrScanResponseDto
        {
            Success = true,
            Message = "Checked in successfully.",
            AttendanceLogId = log.Id,
            DoorUnlockAttempted = true,
            DoorUnlockOk = doorUnlockOk,
            BranchId = branch.Id,
        };

        static QrScanResponseDto Fail(string message) => new()
        {
            Success = false,
            Message = message,
            DoorUnlockAttempted = false,
            DoorUnlockOk = false
        };
    }

    public async Task<QrOwnerDashboardDto> GetOwnerDashboardAsync(int branchId, CancellationToken cancellationToken = default)
    {
        var branchRow = await _db.Branches.AsNoTracking()
            .FirstOrDefaultAsync(b => b.Id == branchId, cancellationToken)
            .ConfigureAwait(false);
        if (branchRow == null)
            throw new InvalidOperationException($"Branch {branchId} was not found.");

        var branchGeoOk = branchRow.Latitude.HasValue && branchRow.Longitude.HasValue;
        var doorUrl = string.IsNullOrWhiteSpace(branchRow.Esp32DoorBaseUrl) ? null : branchRow.Esp32DoorBaseUrl.Trim();
        var branchDoorConfigured = !string.IsNullOrEmpty(doorUrl);

        var branchTokens = await _db.GymQrCodes.AsNoTracking()
            .Where(q => q.BranchId == branchId && !q.IsDeleted)
            .Select(q => q.QrToken)
            .ToListAsync(cancellationToken)
            .ConfigureAwait(false);
        var tokenSet = branchTokens.Count > 0
            ? branchTokens.ToHashSet(StringComparer.OrdinalIgnoreCase)
            : new HashSet<string>(StringComparer.OrdinalIgnoreCase);

        var active = await _db.GymQrCodes.AsNoTracking()
            .Where(q => q.BranchId == branchId && q.IsActive && !q.IsDeleted)
            .OrderByDescending(q => q.CreatedDate)
            .FirstOrDefaultAsync(cancellationToken)
            .ConfigureAwait(false);

        QrGenerateResponseDto? qrDto = null;
        var warns = false;
        if (active != null && active.ExpiryDate >= DateTime.UtcNow)
        {
            var daysUntil = (active.ExpiryDate.Date - DateTime.UtcNow.Date).TotalDays;
            warns = daysUntil is >= 0 and <= 3;
            qrDto = new QrGenerateResponseDto
            {
                GymQrCodeId = active.Id,
                BranchId = branchId,
                QrToken = active.QrToken,
                ExpiryDateUtc = active.ExpiryDate,
                CreatedDateUtc = active.CreatedDate
            };
        }

        // Must scope to THIS branch's venue tokens — a global TOP 400 QR_SCAN omit branch-specific rows when traffic is mixed.
        // ScanAsync Notes: "{lat}|{lng}|token:{QrToken}|distM:{m}" → match"|token:"+token+"|".
        List<AttendanceLog> attendanceRows;
        if (tokenSet.Count == 0)
        {
            attendanceRows = new List<AttendanceLog>();
        }
        else
        {
            attendanceRows = await _db.AttendanceLogs.AsNoTracking()
                .Include(a => a.User)
                .Where(a =>
                    !a.IsDeleted
                    && a.CheckInMethod == GymQrScanConstants.Method
                    && a.Notes != null
                    && _db.GymQrCodes.Any(g =>
                        g.BranchId == branchId && EF.Functions.Like(a.Notes, "%|token:" + g.QrToken + "|%")))
                .OrderByDescending(a => a.CheckInTime)
                .Take(200)
                .ToListAsync(cancellationToken)
                .ConfigureAwait(false);
        }

        var filteredScans = new List<QrScanLogDto>();
        foreach (var a in attendanceRows)
        {
            var extracted = ExtractTokenFromNotes(a.Notes!);
            if (extracted != null && tokenSet.Contains(extracted))
            {
                var name = a.User != null ? $"{a.User.FirstName} {a.User.LastName}".Trim() : null;
                filteredScans.Add(new QrScanLogDto
                {
                    AttendanceLogId = a.Id,
                    CheckInTimeUtc = a.CheckInTime,
                    Notes = a.Notes,
                    UserId = a.UserId,
                    MemberName = string.IsNullOrEmpty(name) ? null : name
                });
            }

            if (filteredScans.Count >= 50)
                break;
        }

        var offset = branchRow.CheckInRadiusOffsetMeters;
        return new QrOwnerDashboardDto
        {
            ActiveQr = qrDto,
            ExpiresWithinThreeDays = warns,
            BranchIsActive = branchRow.IsActive,
            BranchGeoConfigured = branchGeoOk,
            BranchDoorUrlConfigured = branchDoorConfigured,
            BranchLatitude = branchRow.Latitude,
            BranchLongitude = branchRow.Longitude,
            CheckInRadiusOffsetMeters = offset,
            EffectiveCheckInRadiusMeters = EffectiveCheckInRadiusMeters(offset),
            Esp32DoorBaseUrl = branchRow.Esp32DoorBaseUrl,
            BranchName = branchRow.BranchName,
            RecentScans = filteredScans
        };

        static string? ExtractTokenFromNotes(string notes)
        {
            const string key = "|token:";
            var i = notes.IndexOf(key, StringComparison.Ordinal);
            if (i >= 0)
            {
                var s = notes[(i + key.Length)..];
                var end = s.IndexOf('|');
                return (end >= 0 ? s[..end] : s).Trim();
            }

            var t = notes.IndexOf("token:", StringComparison.Ordinal);
            if (t < 0)
                return null;
            var colon = notes.IndexOf(':', t + 6);
            if (colon <= 6)
                return null;
            var rest = notes[(colon + 1)..];
            var endBar = rest.IndexOf('|');
            return (endBar >= 0 ? rest[..endBar] : rest).Trim();
        }
    }
}
