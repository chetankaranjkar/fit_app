/*
  Offline SQL Server provisioning for Gym QR entry (mirrors EF migration AddGymQrCodesAndBranchGeo).
  Adjust schema/database name if needed before running against production.
*/

IF COL_LENGTH(N'dbo.Branches', N'Latitude') IS NULL
BEGIN
    ALTER TABLE [dbo].[Branches] ADD [Latitude] FLOAT(24) NULL; -- EF maps precision 12 scale 8
END
GO

IF COL_LENGTH(N'dbo.Branches', N'Longitude') IS NULL
BEGIN
    ALTER TABLE [dbo].[Branches] ADD [Longitude] FLOAT(24) NULL;
END
GO

IF COL_LENGTH(N'dbo.Branches', N'Esp32DoorBaseUrl') IS NULL
BEGIN
    ALTER TABLE [dbo].[Branches] ADD [Esp32DoorBaseUrl] NVARCHAR(500) NULL;
END
GO

IF OBJECT_ID(N'[dbo].[GymQrCodes]', N'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[GymQrCodes] (
        [Id] INT NOT NULL IDENTITY,
        [BranchId] INT NOT NULL,
        [QrToken] NVARCHAR(64) NOT NULL,
        [ExpiryDate] DATETIME2 NOT NULL,
        [IsActive] BIT NOT NULL,
        [LastExpiryNotificationUtc] DATETIME2 NULL,
        [CreatedDate] DATETIME2 NOT NULL,
        [UpdatedDate] DATETIME2 NULL,
        [IsDeleted] BIT NOT NULL DEFAULT 0,
        CONSTRAINT [PK_GymQrCodes] PRIMARY KEY CLUSTERED ([Id]),
        CONSTRAINT [FK_GymQrCodes_Branches_BranchId]
            FOREIGN KEY ([BranchId]) REFERENCES [dbo].[Branches]([Id]) ON DELETE CASCADE
    );

    CREATE NONCLUSTERED INDEX [IX_GymQrCodes_BranchId_IsActive]
        ON [dbo].[GymQrCodes]([BranchId], [IsActive]);

    CREATE UNIQUE NONCLUSTERED INDEX [IX_GymQrCodes_QrToken]
        ON [dbo].[GymQrCodes]([QrToken]);
END
GO
