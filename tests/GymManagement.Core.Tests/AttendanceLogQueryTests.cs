using GymManagement.Infrastructure.Data;
using GymManagement.Infrastructure.Services;
using Microsoft.EntityFrameworkCore;
using Xunit;

namespace GymManagement.Core.Tests;

public class AttendanceLogQueryTests
{
    private static ApplicationDbContext CreateContext()
    {
        var options = new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseSqlServer("Server=(localdb)\\mssqllocaldb;Database=GymAttendanceQueryShape;Trusted_Connection=True;TrustServerCertificate=True")
            .Options;
        return new ApplicationDbContext(options);
    }

    [Fact]
    public void Late_filter_is_in_the_query_before_paging()
    {
        using var db = CreateContext();
        var filtered = AttendanceLogListQuery.Apply(
            db.AttendanceLogs.AsNoTracking(),
            db.Users,
            db.UserSchedules,
            new DateTime(2026, 10, 1),
            new DateTime(2026, 10, 7),
            search: null,
            status: "late",
            lateThresholdMinutes: 15);

        var sql = filtered
            .OrderByDescending(a => a.CheckInTime)
            .Skip(25)
            .Take(25)
            .ToQueryString();

        var where = sql.IndexOf("WHERE", StringComparison.OrdinalIgnoreCase);
        var offset = sql.LastIndexOf("OFFSET", StringComparison.OrdinalIgnoreCase);
        Assert.True(where >= 0 && offset > where, sql);
        Assert.Contains("UserSchedules", sql, StringComparison.OrdinalIgnoreCase);
        Assert.Contains("DATEDIFF", sql, StringComparison.OrdinalIgnoreCase);
        Assert.Contains("AttendanceDate", sql, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public void Checked_in_and_checked_out_filters_change_the_count_query()
    {
        using var db = CreateContext();

        var checkedIn = AttendanceLogListQuery.Apply(
            db.AttendanceLogs.AsNoTracking(),
            db.Users,
            db.UserSchedules,
            new DateTime(2026, 10, 5),
            new DateTime(2026, 10, 5),
            search: "ana",
            status: "checked-in",
            lateThresholdMinutes: 15).ToQueryString();

        var checkedOut = AttendanceLogListQuery.Apply(
            db.AttendanceLogs.AsNoTracking(),
            db.Users,
            db.UserSchedules,
            new DateTime(2026, 10, 5),
            new DateTime(2026, 10, 5),
            search: null,
            status: "checked-out",
            lateThresholdMinutes: 15).ToQueryString();

        Assert.DoesNotContain("OFFSET", checkedIn, StringComparison.OrdinalIgnoreCase);
        Assert.Contains("CheckOutTime", checkedIn, StringComparison.OrdinalIgnoreCase);
        Assert.Contains("IS NULL", checkedIn, StringComparison.OrdinalIgnoreCase);
        Assert.Contains("CheckOutTime", checkedOut, StringComparison.OrdinalIgnoreCase);
        Assert.Contains("IS NOT NULL", checkedOut, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public void Range_summary_query_is_not_paged()
    {
        using var db = CreateContext();
        var range = AttendanceLogListQuery.Apply(
            db.AttendanceLogs.AsNoTracking(),
            db.Users,
            db.UserSchedules,
            new DateTime(2026, 10, 1),
            new DateTime(2026, 10, 7),
            search: null,
            status: null,
            lateThresholdMinutes: 15);

        var visits = range.ToQueryString();
        var active = range.Where(a => a.CheckOutTime == null).ToQueryString();
        var members = range.Where(a => a.UserId != null).Select(a => a.UserId).Distinct().ToQueryString();

        Assert.DoesNotContain("OFFSET", visits, StringComparison.OrdinalIgnoreCase);
        Assert.DoesNotContain("OFFSET", active, StringComparison.OrdinalIgnoreCase);
        Assert.DoesNotContain("OFFSET", members, StringComparison.OrdinalIgnoreCase);
        Assert.Contains("DISTINCT", members, StringComparison.OrdinalIgnoreCase);
        Assert.Contains("CheckOutTime", active, StringComparison.OrdinalIgnoreCase);
        Assert.DoesNotContain("UserSchedules", visits, StringComparison.OrdinalIgnoreCase);
    }
}
