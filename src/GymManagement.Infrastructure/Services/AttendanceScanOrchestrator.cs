using GymManagement.Core.DTOs;
using GymManagement.Core.Services;

namespace GymManagement.Infrastructure.Services;

public sealed class AttendanceScanOrchestrator : IAttendanceScanOrchestrator
{
    private readonly IRedisGymSecurityService _redis;
    private readonly IGymQrService _qr;
    private readonly IGymQrFloorWorkoutService _floor;

    public AttendanceScanOrchestrator(
        IRedisGymSecurityService redis,
        IGymQrService qr,
        IGymQrFloorWorkoutService floor)
    {
        _redis = redis;
        _qr = qr;
        _floor = floor;
    }

    public async Task<AttendanceScanResponseDto> ScanAsync(
        AttendanceScanRequestDto request,
        int memberUserId,
        CancellationToken cancellationToken = default)
    {
        if (request.ClientScanId == Guid.Empty)
        {
            return Fail("ClientScanId is required (generate a new UUID per scan attempt).", null);
        }

        if (!await _redis.AllowScanRateLimitAsync(memberUserId, cancellationToken).ConfigureAwait(false))
        {
            return Fail("Too many QR scans. Try again in a minute.", "rate_limited");
        }

        var qrRequest = new QrScanRequestDto
        {
            QrToken = request.QrToken,
            Latitude = request.Latitude,
            Longitude = request.Longitude,
        };

        var scan = await _qr.ScanAsync(qrRequest, memberUserId, cancellationToken).ConfigureAwait(false);
        if (!scan.Success || scan.BranchId is not { } branchId)
        {
            return new AttendanceScanResponseDto
            {
                Success = false,
                Message = scan.Message,
                AttendanceLogId = scan.AttendanceLogId,
                DoorUnlockAttempted = scan.DoorUnlockAttempted,
                DoorUnlockOk = scan.DoorUnlockOk,
            };
        }

        if (!await _redis.TryRegisterClientScanIdAsync(request.ClientScanId, cancellationToken).ConfigureAwait(false))
        {
            return Fail("This scan was already processed. Generate a new ClientScanId and scan again.", "replay");
        }

        var (sessionId, startUtc) = await _floor
            .EnsureSessionAfterScanAsync(memberUserId, branchId, cancellationToken)
            .ConfigureAwait(false);

        return new AttendanceScanResponseDto
        {
            Success = true,
            Message = scan.Message,
            AttendanceLogId = scan.AttendanceLogId,
            DoorUnlockAttempted = scan.DoorUnlockAttempted,
            DoorUnlockOk = scan.DoorUnlockOk,
            SessionId = sessionId.ToString("D"),
            SessionStartTimeUtc = startUtc,
        };

        static AttendanceScanResponseDto Fail(string message, string? code) => new()
        {
            Success = false,
            Message = message,
            ErrorCode = code,
            DoorUnlockAttempted = false,
            DoorUnlockOk = false,
        };
    }
}
