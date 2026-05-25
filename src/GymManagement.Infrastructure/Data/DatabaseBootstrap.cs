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

    /// <summary>
    /// Adds demo retail categories and products (idempotent by category name + SKU).
    /// </summary>
    public static async Task EnsureRetailCatalogAsync(
        IServiceProvider services,
        ILogger logger,
        CancellationToken cancellationToken = default)
    {
        using var scope = services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        var unitOfWork = scope.ServiceProvider.GetRequiredService<IUnitOfWork>();

        try
        {
            if (!await db.Database.CanConnectAsync(cancellationToken).ConfigureAwait(false))
                return;

            await EnsureRetailPosPermissionAsync(unitOfWork, logger, cancellationToken).ConfigureAwait(false);
            await RetailDatabaseSeeder.SeedAsync(db, logger, cancellationToken).ConfigureAwait(false);
        }
        catch (Exception ex)
        {
            logger.LogWarning(ex, "Retail catalog seed failed.");
        }
    }

    private static async Task EnsureRetailPosPermissionAsync(
        IUnitOfWork unitOfWork,
        ILogger logger,
        CancellationToken cancellationToken)
    {
        const string code = "RETAIL_POS";
        var perm = await unitOfWork.Permissions.FirstOrDefaultAsync(p => p.Code == code);
        if (perm == null)
        {
            await unitOfWork.Permissions.AddAsync(new Permission
            {
                Code = code,
                Name = "Retail POS",
                Description = "Retail products, categories, inventory, and POS checkout",
            });
            await unitOfWork.SaveChangesAsync();
            perm = await unitOfWork.Permissions.FirstOrDefaultAsync(p => p.Code == code);
        }

        if (perm == null)
            return;

        foreach (var roleName in new[] { "ADMIN", "STAFF" })
        {
            var role = await unitOfWork.AppRoles.FirstOrDefaultAsync(r => r.Name == roleName);
            if (role == null)
                continue;

            var linked = await unitOfWork.RolePermissions.ExistsAsync(rp =>
                rp.RoleId == role.Id && rp.PermissionId == perm.Id);
            if (linked)
                continue;

            await unitOfWork.RolePermissions.AddAsync(new RolePermission
            {
                RoleId = role.Id,
                PermissionId = perm.Id,
                CreatedDate = DateTime.UtcNow,
            });
            logger.LogInformation("Linked {Permission} to role {Role}.", code, roleName);
        }

        await unitOfWork.SaveChangesAsync();

        var adminRole = await unitOfWork.AppRoles.FirstOrDefaultAsync(r => r.Name == "ADMIN");
        if (adminRole == null)
            return;

        var allPerms = await unitOfWork.Permissions.GetAllAsync();
        foreach (var p in allPerms)
        {
            var exists = await unitOfWork.RolePermissions.ExistsAsync(rp =>
                rp.RoleId == adminRole.Id && rp.PermissionId == p.Id);
            if (exists)
                continue;

            await unitOfWork.RolePermissions.AddAsync(new RolePermission
            {
                RoleId = adminRole.Id,
                PermissionId = p.Id,
                CreatedDate = DateTime.UtcNow,
            });
        }

        await unitOfWork.SaveChangesAsync();
    }
}
