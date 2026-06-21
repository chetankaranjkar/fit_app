namespace GymManagement.Core.Services;

/// <summary>Creates in-app (and optional push) reminders for members scheduled to train today.</summary>
public interface IWorkoutDayReminderService
{
    Task<int> CreateTodayRemindersAsync(CancellationToken cancellationToken = default);
}
