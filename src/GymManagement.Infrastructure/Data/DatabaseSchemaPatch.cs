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
