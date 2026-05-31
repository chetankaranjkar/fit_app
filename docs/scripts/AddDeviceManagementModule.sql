-- Device Management & Session Security module
-- Applied via EF migration: 20260531130000_AddDeviceManagementModule

IF OBJECT_ID(N'dbo.UserDevices', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.UserDevices (
        Id INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
        UserId INT NOT NULL,
        DeviceUniqueId NVARCHAR(128) NOT NULL,
        DeviceName NVARCHAR(128) NULL,
        DeviceModel NVARCHAR(128) NULL,
        Platform NVARCHAR(64) NULL,
        OsVersion NVARCHAR(64) NULL,
        AppVersion NVARCHAR(32) NULL,
        FirebaseUid NVARCHAR(128) NULL,
        IsActive BIT NOT NULL DEFAULT 1,
        IsTrusted BIT NOT NULL DEFAULT 0,
        LastLoginDate DATETIME2 NULL,
        CreatedDate DATETIME2 NOT NULL,
        UpdatedDate DATETIME2 NULL,
        IsDeleted BIT NOT NULL DEFAULT 0,
        CONSTRAINT FK_UserDevices_Users_UserId FOREIGN KEY (UserId) REFERENCES dbo.Users(Id) ON DELETE CASCADE
    );
    CREATE UNIQUE INDEX IX_UserDevices_UserId_DeviceUniqueId ON dbo.UserDevices(UserId, DeviceUniqueId) WHERE IsDeleted = 0;
END

IF OBJECT_ID(N'dbo.UserSessions', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.UserSessions (
        Id INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
        SessionId NVARCHAR(100) NOT NULL,
        UserId INT NOT NULL,
        DeviceId INT NOT NULL,
        JwtTokenHash NVARCHAR(128) NOT NULL,
        RefreshTokenHash NVARCHAR(128) NOT NULL,
        LoginDate DATETIME2 NOT NULL,
        ExpiryDate DATETIME2 NOT NULL,
        RefreshExpiryDate DATETIME2 NOT NULL,
        IsActive BIT NOT NULL DEFAULT 1,
        LogoutDate DATETIME2 NULL,
        CreatedDate DATETIME2 NOT NULL,
        UpdatedDate DATETIME2 NULL,
        IsDeleted BIT NOT NULL DEFAULT 0,
        CONSTRAINT FK_UserSessions_Users_UserId FOREIGN KEY (UserId) REFERENCES dbo.Users(Id) ON DELETE CASCADE,
        CONSTRAINT FK_UserSessions_UserDevices_DeviceId FOREIGN KEY (DeviceId) REFERENCES dbo.UserDevices(Id) ON DELETE CASCADE
    );
    CREATE UNIQUE INDEX IX_UserSessions_SessionId ON dbo.UserSessions(SessionId) WHERE IsDeleted = 0;
END

IF OBJECT_ID(N'dbo.LoginHistory', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.LoginHistory (
        Id INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
        UserId INT NOT NULL,
        DeviceId INT NULL,
        LoginDate DATETIME2 NOT NULL,
        LoginStatus NVARCHAR(32) NOT NULL,
        Platform NVARCHAR(64) NULL,
        AppVersion NVARCHAR(32) NULL,
        IPAddress NVARCHAR(64) NULL,
        Location NVARCHAR(256) NULL,
        FailureReason NVARCHAR(255) NULL,
        IsSuspicious BIT NOT NULL DEFAULT 0,
        CreatedDate DATETIME2 NOT NULL,
        UpdatedDate DATETIME2 NULL,
        IsDeleted BIT NOT NULL DEFAULT 0,
        CONSTRAINT FK_LoginHistory_Users_UserId FOREIGN KEY (UserId) REFERENCES dbo.Users(Id) ON DELETE CASCADE,
        CONSTRAINT FK_LoginHistory_UserDevices_DeviceId FOREIGN KEY (DeviceId) REFERENCES dbo.UserDevices(Id) ON DELETE SET NULL
    );
END
