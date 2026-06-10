-- Warmup & Stretch management tables
-- Run against GymManagement database after deploying migration 20260610120000_AddWarmupsAndStretches

IF OBJECT_ID(N'Warmups', N'U') IS NULL
BEGIN
    CREATE TABLE [Warmups] (
        [Id] int NOT NULL IDENTITY,
        [Name] nvarchar(200) NOT NULL,
        [Description] nvarchar(max) NULL,
        [VideoUrl] nvarchar(500) NULL,
        [DurationSeconds] int NOT NULL,
        [DifficultyLevel] nvarchar(50) NULL,
        [BodyPart] nvarchar(100) NULL,
        [CaloriesBurn] int NULL,
        [IsActive] bit NOT NULL CONSTRAINT [DF_Warmups_IsActive] DEFAULT 1,
        [CreatedDate] datetime2 NOT NULL,
        [UpdatedDate] datetime2 NULL,
        [IsDeleted] bit NOT NULL CONSTRAINT [DF_Warmups_IsDeleted] DEFAULT 0,
        CONSTRAINT [PK_Warmups] PRIMARY KEY ([Id])
    );
    CREATE INDEX [IX_Warmups_Name] ON [Warmups]([Name]);
    CREATE INDEX [IX_Warmups_BodyPart] ON [Warmups]([BodyPart]);
END
GO

IF OBJECT_ID(N'Stretches', N'U') IS NULL
BEGIN
    CREATE TABLE [Stretches] (
        [Id] int NOT NULL IDENTITY,
        [Name] nvarchar(200) NOT NULL,
        [Description] nvarchar(max) NULL,
        [VideoUrl] nvarchar(500) NULL,
        [DurationSeconds] int NOT NULL,
        [DifficultyLevel] nvarchar(50) NULL,
        [BodyPart] nvarchar(100) NULL,
        [IsActive] bit NOT NULL CONSTRAINT [DF_Stretches_IsActive] DEFAULT 1,
        [CreatedDate] datetime2 NOT NULL,
        [UpdatedDate] datetime2 NULL,
        [IsDeleted] bit NOT NULL CONSTRAINT [DF_Stretches_IsDeleted] DEFAULT 0,
        CONSTRAINT [PK_Stretches] PRIMARY KEY ([Id])
    );
    CREATE INDEX [IX_Stretches_Name] ON [Stretches]([Name]);
    CREATE INDEX [IX_Stretches_BodyPart] ON [Stretches]([BodyPart]);
END
GO

IF OBJECT_ID(N'WorkoutPlanWarmups', N'U') IS NULL
BEGIN
    CREATE TABLE [WorkoutPlanWarmups] (
        [Id] int NOT NULL IDENTITY,
        [WorkoutPlanId] int NOT NULL,
        [WarmupId] int NOT NULL,
        [DisplayOrder] int NOT NULL,
        [CreatedDate] datetime2 NOT NULL,
        [UpdatedDate] datetime2 NULL,
        [IsDeleted] bit NOT NULL CONSTRAINT [DF_WorkoutPlanWarmups_IsDeleted] DEFAULT 0,
        CONSTRAINT [PK_WorkoutPlanWarmups] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_WorkoutPlanWarmups_WorkoutPlans_WorkoutPlanId]
            FOREIGN KEY ([WorkoutPlanId]) REFERENCES [WorkoutPlans]([Id]) ON DELETE CASCADE,
        CONSTRAINT [FK_WorkoutPlanWarmups_Warmups_WarmupId]
            FOREIGN KEY ([WarmupId]) REFERENCES [Warmups]([Id]) ON DELETE NO ACTION
    );
    CREATE INDEX [IX_WorkoutPlanWarmups_WorkoutPlanId_DisplayOrder]
        ON [WorkoutPlanWarmups]([WorkoutPlanId], [DisplayOrder]);
END
GO

IF OBJECT_ID(N'WorkoutPlanStretches', N'U') IS NULL
BEGIN
    CREATE TABLE [WorkoutPlanStretches] (
        [Id] int NOT NULL IDENTITY,
        [WorkoutPlanId] int NOT NULL,
        [StretchId] int NOT NULL,
        [DisplayOrder] int NOT NULL,
        [CreatedDate] datetime2 NOT NULL,
        [UpdatedDate] datetime2 NULL,
        [IsDeleted] bit NOT NULL CONSTRAINT [DF_WorkoutPlanStretches_IsDeleted] DEFAULT 0,
        CONSTRAINT [PK_WorkoutPlanStretches] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_WorkoutPlanStretches_WorkoutPlans_WorkoutPlanId]
            FOREIGN KEY ([WorkoutPlanId]) REFERENCES [WorkoutPlans]([Id]) ON DELETE CASCADE,
        CONSTRAINT [FK_WorkoutPlanStretches_Stretches_StretchId]
            FOREIGN KEY ([StretchId]) REFERENCES [Stretches]([Id]) ON DELETE NO ACTION
    );
    CREATE INDEX [IX_WorkoutPlanStretches_WorkoutPlanId_DisplayOrder]
        ON [WorkoutPlanStretches]([WorkoutPlanId], [DisplayOrder]);
END
GO
