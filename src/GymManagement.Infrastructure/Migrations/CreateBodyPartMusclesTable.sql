-- Run this script against your database if you get "Invalid object name 'BodyPartMuscles'".
-- Creates the BodyPartMuscles table and unique index. Safe to run once (IF NOT EXISTS).

IF OBJECT_ID(N'[dbo].[BodyPartMuscles]', N'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[BodyPartMuscles] (
        [Id] int NOT NULL IDENTITY(1,1),
        [BodyPartId] int NOT NULL,
        [Name] nvarchar(100) NOT NULL,
        [Description] nvarchar(max) NULL,
        [ImageUrl] nvarchar(max) NULL,
        [CreatedDate] datetime2 NOT NULL,
        [UpdatedDate] datetime2 NULL,
        [IsDeleted] bit NOT NULL DEFAULT 0,
        CONSTRAINT [PK_BodyPartMuscles] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_BodyPartMuscles_BodyParts_BodyPartId] FOREIGN KEY ([BodyPartId])
            REFERENCES [dbo].[BodyParts] ([Id]) ON DELETE CASCADE
    );

    CREATE UNIQUE INDEX [IX_BodyPartMuscles_BodyPartId_Name]
        ON [dbo].[BodyPartMuscles] ([BodyPartId], [Name]);

    -- Record that this migration was applied (optional; EF uses __EFMigrationsHistory)
    INSERT INTO [dbo].[__EFMigrationsHistory] ([MigrationId], [ProductVersion])
    VALUES (N'20260206120000_EnsureBodyPartMusclesTable', N'9.0.0');
END
GO
