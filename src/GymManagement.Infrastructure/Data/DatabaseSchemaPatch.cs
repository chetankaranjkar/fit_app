using GymManagement.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace GymManagement.Infrastructure.Data;

/// <summary>
/// Idempotent SQL patches for schema drift when a migration was missing from EF discovery.
/// </summary>
public static class DatabaseSchemaPatch
{
    public static async Task ApplyAsync(ApplicationDbContext db, ILogger logger, CancellationToken cancellationToken = default)
    {
        if (!db.Database.IsSqlServer())
            return;

        await EnsureBranchCheckInRadiusOffsetAsync(db, logger, cancellationToken).ConfigureAwait(false);
        await EnsureRetailCatalogTablesAsync(db, logger, cancellationToken).ConfigureAwait(false);
    }

    /// <summary>
    /// Retail POS tables were missing from early migrations (AddRetailPosModule only added coupon columns).
    /// Applies <c>20260525102659_AddRetailCatalogTables</c> when that migration is not yet recorded.
    /// </summary>
    private static async Task EnsureRetailCatalogTablesAsync(
        ApplicationDbContext db,
        ILogger logger,
        CancellationToken cancellationToken)
    {
        const string migrationId = "20260525102659_AddRetailCatalogTables";

        try
        {
            var applied = await db.Database.GetAppliedMigrationsAsync(cancellationToken).ConfigureAwait(false);
            if (applied.Contains(migrationId))
                return;

            await BaselineStuckCouponMigrationsAsync(db, cancellationToken).ConfigureAwait(false);

            var pending = await db.Database.GetPendingMigrationsAsync(cancellationToken).ConfigureAwait(false);
            if (!pending.Contains(migrationId))
            {
                logger.LogDebug("Retail catalog migration {MigrationId} is not in the pending list.", migrationId);
                return;
            }

            logger.LogInformation("Applying retail catalog migration {MigrationId}...", migrationId);
            await db.Database.MigrateAsync(migrationId, cancellationToken).ConfigureAwait(false);
            logger.LogInformation("Retail catalog tables are ready.");
        }
        catch (Exception ex)
        {
            logger.LogWarning(
                ex,
                "Could not apply retail catalog migration. Run: dotnet ef database update --project src/GymManagement.Infrastructure --startup-project src/GymManagement.API");
        }
    }

    /// <summary>
    /// When coupon columns already exist but EF history is missing, mark migrations applied so retail migration can run.
    /// </summary>
    private static async Task BaselineStuckCouponMigrationsAsync(
        ApplicationDbContext db,
        CancellationToken cancellationToken)
    {
        const string sql = """
            IF COL_LENGTH('membership_payments', 'CouponCode') IS NOT NULL
               AND NOT EXISTS (SELECT 1 FROM dbo.__EFMigrationsHistory WHERE MigrationId = N'20260521120500_AddCouponModule')
                INSERT INTO dbo.__EFMigrationsHistory (MigrationId, ProductVersion)
                VALUES (N'20260521120500_AddCouponModule', N'9.0.0');

            IF COL_LENGTH('membership_payments', 'OriginalAmount') IS NOT NULL
               AND NOT EXISTS (SELECT 1 FROM dbo.__EFMigrationsHistory WHERE MigrationId = N'20260521140000_EnterpriseCouponBilling')
                INSERT INTO dbo.__EFMigrationsHistory (MigrationId, ProductVersion)
                VALUES (N'20260521140000_EnterpriseCouponBilling', N'9.0.0');

            IF COL_LENGTH('membership_payments', 'CouponLocked') IS NOT NULL
               AND NOT EXISTS (SELECT 1 FROM dbo.__EFMigrationsHistory WHERE MigrationId = N'20260524142624_AddRetailPosModule')
                INSERT INTO dbo.__EFMigrationsHistory (MigrationId, ProductVersion)
                VALUES (N'20260524142624_AddRetailPosModule', N'9.0.0');
            """;

        await db.Database.ExecuteSqlRawAsync(sql, cancellationToken).ConfigureAwait(false);
    }

    private static async Task EnsureBranchCheckInRadiusOffsetAsync(
        ApplicationDbContext db,
        ILogger logger,
        CancellationToken cancellationToken)
    {
        const string sql = """
            IF COL_LENGTH('dbo.Branches', 'CheckInRadiusOffsetMeters') IS NULL
            BEGIN
                ALTER TABLE dbo.Branches
                    ADD CheckInRadiusOffsetMeters INT NOT NULL
                        CONSTRAINT DF_Branches_CheckInRadiusOffsetMeters DEFAULT (0);
            END

            IF NOT EXISTS (
                SELECT 1 FROM dbo.__EFMigrationsHistory
                WHERE MigrationId = N'20260510120000_AddBranchCheckInRadiusOffset'
            )
            BEGIN
                INSERT INTO dbo.__EFMigrationsHistory (MigrationId, ProductVersion)
                VALUES (N'20260510120000_AddBranchCheckInRadiusOffset', N'9.0.0');
            END
            """;

        try
        {
            await db.Database.ExecuteSqlRawAsync(sql, cancellationToken).ConfigureAwait(false);
            logger.LogInformation("Schema patch applied: Branches.CheckInRadiusOffsetMeters");
        }
        catch (Exception ex)
        {
            logger.LogWarning(ex, "Schema patch for CheckInRadiusOffsetMeters failed.");
        }
    }
}
