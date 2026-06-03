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
        await EnsureAuditLogsTableAsync(db, logger, cancellationToken).ConfigureAwait(false);
        await EnsureRetailCatalogTablesAsync(db, logger, cancellationToken).ConfigureAwait(false);
        await EnsureMembershipLifecycleMigrationAsync(db, logger, cancellationToken).ConfigureAwait(false);
    }

    /// <summary>
    /// Aadhaar audit writes use <c>AuditLogs</c>; model snapshot includes the table but it was never migrated on some environments.
    /// </summary>
    private static async Task EnsureAuditLogsTableAsync(
        ApplicationDbContext db,
        ILogger logger,
        CancellationToken cancellationToken)
    {
        const string migrationId = "20260604120000_EnsureAuditLogsTable";

        const string sql = """
            IF OBJECT_ID(N'AuditLogs', N'U') IS NULL
            BEGIN
                CREATE TABLE [AuditLogs] (
                    [Id] bigint NOT NULL IDENTITY,
                    [UserId] int NULL,
                    [Action] nvarchar(100) NOT NULL,
                    [Entity] nvarchar(100) NOT NULL,
                    [OldValue] nvarchar(max) NULL,
                    [NewValue] nvarchar(max) NULL,
                    [CreatedAt] datetime2 NOT NULL,
                    CONSTRAINT [PK_AuditLogs] PRIMARY KEY ([Id])
                );
                CREATE INDEX [IX_AuditLogs_CreatedAt] ON [AuditLogs] ([CreatedAt]);
                CREATE INDEX [IX_AuditLogs_Entity_CreatedAt] ON [AuditLogs] ([Entity], [CreatedAt]);
                CREATE INDEX [IX_AuditLogs_UserId] ON [AuditLogs] ([UserId]);
            END

            IF NOT EXISTS (
                SELECT 1 FROM dbo.__EFMigrationsHistory
                WHERE MigrationId = N'20260604120000_EnsureAuditLogsTable'
            )
            BEGIN
                INSERT INTO dbo.__EFMigrationsHistory (MigrationId, ProductVersion)
                VALUES (N'20260604120000_EnsureAuditLogsTable', N'9.0.0');
            END
            """;

        try
        {
            await db.Database.ExecuteSqlRawAsync(sql, cancellationToken).ConfigureAwait(false);
            logger.LogInformation("Schema patch applied: AuditLogs table ({MigrationId})", migrationId);
        }
        catch (Exception ex)
        {
            logger.LogWarning(ex, "Schema patch for AuditLogs failed. Run: dotnet ef database update");
        }
    }

    /// <summary>
    /// Applies membership lifecycle tables/indexes when UAT/production started without AutoMigrate,
    /// or when migration history was recorded without creating tables.
    /// </summary>
    private static async Task EnsureMembershipLifecycleMigrationAsync(
        ApplicationDbContext db,
        ILogger logger,
        CancellationToken cancellationToken)
    {
        const string migrationId = "20260603092400_MembershipLifecycleAndUniqueActiveMembership";

        if (await TableExistsAsync(db, "membership_audit_logs", cancellationToken).ConfigureAwait(false))
            return;

        logger.LogWarning(
            "Membership lifecycle tables are missing. Applying pending EF migrations (expected: {MigrationId}).",
            migrationId);

        try
        {
            var pending = (await db.Database.GetPendingMigrationsAsync(cancellationToken).ConfigureAwait(false)).ToList();
            if (pending.Count == 0)
            {
                throw new InvalidOperationException(
                    $"Migration {migrationId} is recorded in history but membership_audit_logs is missing. " +
                    "On UAT run: ./deploy/scripts/fix-uat-membership-schema.sh");
            }

            logger.LogInformation("Applying {Count} pending migration(s)...", pending.Count);
            await db.Database.MigrateAsync(cancellationToken).ConfigureAwait(false);

            if (!await TableExistsAsync(db, "membership_audit_logs", cancellationToken).ConfigureAwait(false))
            {
                logger.LogError(
                    "Migrations finished but membership_audit_logs is still missing. " +
                    "On UAT run: ./deploy/scripts/fix-uat-membership-schema.sh");
            }
            else
            {
                logger.LogInformation("Membership lifecycle schema is ready.");
            }
        }
        catch (Exception ex)
        {
            logger.LogError(
                ex,
                "Could not apply membership lifecycle migration. On UAT run: ./deploy/scripts/fix-uat-membership-schema.sh");
            throw;
        }
    }

    private static async Task<bool> TableExistsAsync(
        ApplicationDbContext db,
        string tableName,
        CancellationToken cancellationToken)
    {
        if (tableName is not ("membership_audit_logs" or "membership_approval_requests"))
            return false;

        await using var cmd = db.Database.GetDbConnection().CreateCommand();
        cmd.CommandText = $"SELECT CASE WHEN OBJECT_ID(N'{tableName}', N'U') IS NOT NULL THEN 1 ELSE 0 END";
        if (cmd.Connection!.State != System.Data.ConnectionState.Open)
            await cmd.Connection.OpenAsync(cancellationToken).ConfigureAwait(false);
        var scalar = await cmd.ExecuteScalarAsync(cancellationToken).ConfigureAwait(false);
        return Convert.ToInt32(scalar) == 1;
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
