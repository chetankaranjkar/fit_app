-- Run this ONLY if "database update" failed with "There is already an object named 'Admins'".
-- It marks the AddUserTypesAndUserUserTypes migration as applied so the next update only runs RenameInstructorsToTrainerAndFeedbacks.
-- Execute against your database (e.g. in SSMS or: sqlcmd -S your_server -d your_db -i scripts\baseline-migration-history.sql)

IF NOT EXISTS (SELECT 1 FROM [__EFMigrationsHistory] WHERE [MigrationId] = N'20260215131447_AddUserTypesAndUserUserTypes')
BEGIN
    INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
    VALUES (N'20260215131447_AddUserTypesAndUserUserTypes', N'9.0.0');
END
GO
