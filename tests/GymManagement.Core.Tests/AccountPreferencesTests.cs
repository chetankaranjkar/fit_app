using System.ComponentModel.DataAnnotations;
using GymManagement.Core.DTOs;
using GymManagement.Domain.Entities;
using GymManagement.Infrastructure.Data;
using GymManagement.Infrastructure.Repositories;
using GymManagement.Infrastructure.Services;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Xunit;

namespace GymManagement.Core.Tests;

public sealed class AccountPreferencesTests
{
    [Theory]
    [InlineData("light")]
    [InlineData("dark")]
    public async Task Saving_theme_persists_for_only_the_selected_account(string theme)
    {
        await using var connection = new SqliteConnection("Data Source=:memory:");
        await connection.OpenAsync();
        var options = new DbContextOptionsBuilder<ApplicationDbContext>().UseSqlite(connection).Options;
        await using var db = new PreferencesTestContext(options);
        await db.Database.EnsureCreatedAsync();
        var account = new AuthUser { Email = "first@test.local", Theme = theme == "light" ? "dark" : "light" };
        var other = new AuthUser { Email = "other@test.local", Theme = "dark" };
        db.AuthUsers.AddRange(account, other);
        await db.SaveChangesAsync();
        var service = CreateService(db);

        var response = await service.UpdateAccountPreferencesAsync(account.Id, new() { Theme = theme });
        Assert.Equal(theme, response?.Theme);
        db.ChangeTracker.Clear();
        Assert.Equal(theme, (await service.GetAccountPreferencesAsync(account.Id))?.Theme);
        Assert.Equal("dark", (await service.GetAccountPreferencesAsync(other.Id))?.Theme);
        Assert.Null(await service.GetAccountPreferencesAsync(int.MaxValue));
        Assert.Null(await service.UpdateAccountPreferencesAsync(int.MaxValue, new() { Theme = theme }));
    }

    [Theory]
    [InlineData("")]
    [InlineData("system")]
    [InlineData("LIGHT")]
    [InlineData(" light ")]
    public async Task Invalid_values_are_rejected_by_both_request_validation_and_service(string theme)
    {
        var dto = new UpdateAccountPreferencesDto { Theme = theme };
        Assert.False(Validator.TryValidateObject(dto, new ValidationContext(dto), new List<ValidationResult>(), true));
        // Validation must happen before any database access.
        var service = new AuthService(null!, null!, null!, null!, null!, null!, null!, null!, null!, null!);
        await Assert.ThrowsAsync<ArgumentException>(() => service.UpdateAccountPreferencesAsync(1, dto));
    }

    private static AuthService CreateService(ApplicationDbContext db) =>
        new(new UnitOfWork(db), db, null!, null!, null!, null!, null!, null!, null!, null!);

    // Keep this persistence test limited to the real AuthUser entity and repository.
    private sealed class PreferencesTestContext(DbContextOptions<ApplicationDbContext> options) : ApplicationDbContext(options)
    {
        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            foreach (var entity in modelBuilder.Model.GetEntityTypes().ToArray())
                if (entity.ClrType != typeof(AuthUser)) modelBuilder.Ignore(entity.ClrType);
            modelBuilder.Entity<AuthUser>().Ignore(a => a.User).Ignore(a => a.LoginActivities);
            modelBuilder.Entity<AuthUser>().HasQueryFilter(a => !a.IsDeleted);
        }
    }
}
