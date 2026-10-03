using GymManagement.Core.DTOs;

namespace GymManagement.Core.Services
{
    public interface ITrainerTodayService
    {
        /// <param name="trainerId">Caller's own trainer profile id (resolved by the controller).</param>
        /// <param name="utcOffsetMinutes">Local offset from UTC (IST = 330) used to bucket check-ins by local day.</param>
        Task<TrainerTodayDto?> GetTodayAsync(
            int trainerId,
            int utcOffsetMinutes,
            int missedLookbackDays,
            DateTime nowUtc,
            CancellationToken cancellationToken = default);
    }
}
