namespace GymManagement.Core.DTOs;

/// <summary>QR attendance scan with Redis replay id (client-generated jti equivalent).</summary>
public sealed class AttendanceScanRequestDto
{
    public string QrToken { get; set; } = string.Empty;
    public double Latitude { get; set; }
    public double Longitude { get; set; }
    public Guid ClientScanId { get; set; }
}

public sealed class AttendanceScanResponseDto
{
    public bool Success { get; set; }
    public string? Message { get; set; }
    public int? AttendanceLogId { get; set; }
    public bool DoorUnlockAttempted { get; set; }
    public bool DoorUnlockOk { get; set; }
    public string? SessionId { get; set; }
    public DateTime? SessionStartTimeUtc { get; set; }
    /// <summary>Optional machine code: <c>rate_limited</c>, <c>replay</c>.</summary>
    public string? ErrorCode { get; set; }
}

public sealed class GymQrWorkoutLogRequestDto
{
    public Guid SessionId { get; set; }
    public string ExerciseName { get; set; } = string.Empty;
    public int Reps { get; set; }
    public decimal Weight { get; set; }
}

public sealed class GymQrWorkoutLogResponseDto
{
    public int LogId { get; set; }
    public Guid SessionId { get; set; }
    public DateTime CreatedAtUtc { get; set; }
}

public sealed class GymQrWorkoutEndRequestDto
{
    public Guid SessionId { get; set; }
}
