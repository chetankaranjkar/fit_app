-- Run if API reports: Invalid column name 'CheckInRadiusOffsetMeters'
-- Safe to re-run (checks column first).

IF COL_LENGTH('dbo.Branches', 'CheckInRadiusOffsetMeters') IS NULL
BEGIN
    ALTER TABLE dbo.Branches
        ADD CheckInRadiusOffsetMeters INT NOT NULL
            CONSTRAINT DF_Branches_CheckInRadiusOffsetMeters DEFAULT (0);
END
GO

IF NOT EXISTS (
    SELECT 1 FROM dbo.__EFMigrationsHistory
    WHERE MigrationId = N'20260510120000_AddBranchCheckInRadiusOffset'
)
BEGIN
    INSERT INTO dbo.__EFMigrationsHistory (MigrationId, ProductVersion)
    VALUES (N'20260510120000_AddBranchCheckInRadiusOffset', N'9.0.0');
END
GO
