-- Run this ONCE if BodyPartMuscles table already exists and "database update" failed with
-- "There is already an object named 'BodyPartMuscles' in the database."
-- This marks the migration as applied so future "dotnet ef database update" succeeds.

IF NOT EXISTS (SELECT 1 FROM [__EFMigrationsHistory] WHERE [MigrationId] = N'20260206142618_EnsureBodyPartMusclesTable')
BEGIN
    INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
    VALUES (N'20260206142618_EnsureBodyPartMusclesTable', N'9.0.0');
END
GO
