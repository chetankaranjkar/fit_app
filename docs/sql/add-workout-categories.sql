-- Workout categories + plan auto-assignment (idempotent)
-- Run after add-warmups-and-stretches.sql

IF OBJECT_ID(N'[WorkoutCategories]', N'U') IS NULL
BEGIN
    CREATE TABLE [WorkoutCategories] (
        [Id] int NOT NULL IDENTITY,
        [Name] nvarchar(100) NOT NULL,
        [Description] nvarchar(500) NULL,
        [IsActive] bit NOT NULL DEFAULT 1,
        [CreatedDate] datetime2 NOT NULL,
        CONSTRAINT [PK_WorkoutCategories] PRIMARY KEY ([Id])
    );
    CREATE UNIQUE INDEX [IX_WorkoutCategories_Name] ON [WorkoutCategories] ([Name]);
END

IF OBJECT_ID(N'[WorkoutCategoryWarmups]', N'U') IS NULL
BEGIN
    CREATE TABLE [WorkoutCategoryWarmups] (
        [Id] int NOT NULL IDENTITY,
        [WorkoutCategoryId] int NOT NULL,
        [WarmupId] int NOT NULL,
        [DisplayOrder] int NOT NULL,
        [CreatedDate] datetime2 NOT NULL,
        CONSTRAINT [PK_WorkoutCategoryWarmups] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_WorkoutCategoryWarmups_WorkoutCategories] FOREIGN KEY ([WorkoutCategoryId]) REFERENCES [WorkoutCategories] ([Id]) ON DELETE CASCADE,
        CONSTRAINT [FK_WorkoutCategoryWarmups_Warmups] FOREIGN KEY ([WarmupId]) REFERENCES [Warmups] ([Id])
    );
    CREATE UNIQUE INDEX [IX_WorkoutCategoryWarmups_Category_Warmup] ON [WorkoutCategoryWarmups] ([WorkoutCategoryId], [WarmupId]);
    CREATE UNIQUE INDEX [IX_WorkoutCategoryWarmups_Category_DisplayOrder] ON [WorkoutCategoryWarmups] ([WorkoutCategoryId], [DisplayOrder]);
END

IF OBJECT_ID(N'[WorkoutCategoryStretches]', N'U') IS NULL
BEGIN
    CREATE TABLE [WorkoutCategoryStretches] (
        [Id] int NOT NULL IDENTITY,
        [WorkoutCategoryId] int NOT NULL,
        [StretchId] int NOT NULL,
        [DisplayOrder] int NOT NULL,
        [CreatedDate] datetime2 NOT NULL,
        CONSTRAINT [PK_WorkoutCategoryStretches] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_WorkoutCategoryStretches_WorkoutCategories] FOREIGN KEY ([WorkoutCategoryId]) REFERENCES [WorkoutCategories] ([Id]) ON DELETE CASCADE,
        CONSTRAINT [FK_WorkoutCategoryStretches_Stretches] FOREIGN KEY ([StretchId]) REFERENCES [Stretches] ([Id])
    );
    CREATE UNIQUE INDEX [IX_WorkoutCategoryStretches_Category_Stretch] ON [WorkoutCategoryStretches] ([WorkoutCategoryId], [StretchId]);
    CREATE UNIQUE INDEX [IX_WorkoutCategoryStretches_Category_DisplayOrder] ON [WorkoutCategoryStretches] ([WorkoutCategoryId], [DisplayOrder]);
END

IF COL_LENGTH('WorkoutPlans', 'WorkoutCategoryId') IS NULL
    ALTER TABLE [WorkoutPlans] ADD [WorkoutCategoryId] int NULL;

IF COL_LENGTH('WorkoutPlans', 'UseDefaultWarmups') IS NULL
    ALTER TABLE [WorkoutPlans] ADD [UseDefaultWarmups] bit NOT NULL CONSTRAINT [DF_WorkoutPlans_UseDefaultWarmups] DEFAULT 1;

IF COL_LENGTH('WorkoutPlans', 'UseDefaultStretches') IS NULL
    ALTER TABLE [WorkoutPlans] ADD [UseDefaultStretches] bit NOT NULL CONSTRAINT [DF_WorkoutPlans_UseDefaultStretches] DEFAULT 1;

IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'FK_WorkoutPlans_WorkoutCategories')
    ALTER TABLE [WorkoutPlans] ADD CONSTRAINT [FK_WorkoutPlans_WorkoutCategories]
        FOREIGN KEY ([WorkoutCategoryId]) REFERENCES [WorkoutCategories] ([Id]);
