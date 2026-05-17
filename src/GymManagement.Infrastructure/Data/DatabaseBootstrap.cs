using GymManagement.Core.Interfaces;
using GymManagement.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;

namespace GymManagement.Infrastructure.Data;

/// <summary>
/// Ensures a fresh production database has roles and the default admin account.
/// </summary>
public static class DatabaseBootstrap
{
    public static async Task SeedIfNoAccountsAsync(
        IServiceProvider services,
        ILogger logger,
        CancellationToken cancellationToken = default)
    {
        using var scope = services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();

        try
        {
            if (!await db.Database.CanConnectAsync(cancellationToken).ConfigureAwait(false))
            {
                logger.LogWarning("Bootstrap seed skipped: cannot connect to database.");
                return;
            }

            int accountCount;
            try
            {
                accountCount = await db.AuthUsers.CountAsync(cancellationToken).ConfigureAwait(false);
            }
            catch (Exception ex)
            {
                logger.LogWarning(ex, "Bootstrap seed skipped: AuthUsers table not ready.");
                return;
            }
            if (accountCount > 0)
            {
                logger.LogInformation("Bootstrap seed skipped: {Count} auth account(s) already exist.", accountCount);
                return;
            }

            logger.LogInformation("No auth accounts found — running bootstrap seed...");
            var unitOfWork = scope.ServiceProvider.GetRequiredService<IUnitOfWork>();
            var seeder = new DatabaseSeeder(unitOfWork, db);
            await seeder.SeedAsync().ConfigureAwait(false);
            logger.LogInformation(
                "Bootstrap seed complete. Default login: admin@gym.com / admin123 (or username admin).");
        }
        catch (Exception ex)
        {
            logger.LogWarning(ex, "Bootstrap seed failed. Run deploy/scripts/seed.sh on the server.");
        }
    }

    public static async Task EnsureDefaultOrganizationAsync(
        IServiceProvider services,
        ILogger logger,
        CancellationToken cancellationToken = default)
    {
        using var scope = services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();

        try
        {
            if (!await db.Database.CanConnectAsync(cancellationToken).ConfigureAwait(false))
                return;

            if (await db.Organizations.AnyAsync(cancellationToken).ConfigureAwait(false))
                return;

            db.Organizations.Add(new Organization
            {
                Name = "PulseFit Gym",
                OrganizationType = "Gym",
                IsActive = true,
                CreatedDate = DateTime.UtcNow,
            });
            await db.SaveChangesAsync(cancellationToken).ConfigureAwait(false);
            logger.LogInformation("Created default organization: PulseFit Gym");
        }
        catch (Exception ex)
        {
            logger.LogWarning(ex, "Could not create default organization.");
        }
    }
}
