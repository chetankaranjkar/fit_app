using GymManagement.Infrastructure.Data;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace GymManagement.Infrastructure.Migrations
{
    [DbContext(typeof(ApplicationDbContext))]
    [Migration("20260610140000_AddWorkoutCategories")]
    public partial class AddWorkoutCategories : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("""
                IF OBJECT_ID(N'WorkoutCategories', N'U') IS NULL
                BEGIN
                    CREATE TABLE [WorkoutCategories] (
                        [Id] int NOT NULL IDENTITY,
                        [Name] nvarchar(200) NOT NULL,
                        [Description] nvarchar(max) NULL,
                        [IsActive] bit NOT NULL CONSTRAINT [DF_WorkoutCategories_IsActive] DEFAULT 1,
                        [CreatedDate] datetime2 NOT NULL,
                        [UpdatedDate] datetime2 NULL,
                        [IsDeleted] bit NOT NULL CONSTRAINT [DF_WorkoutCategories_IsDeleted] DEFAULT 0,
                        CONSTRAINT [PK_WorkoutCategories] PRIMARY KEY ([Id])
                    );
                    CREATE UNIQUE INDEX [IX_WorkoutCategories_Name] ON [WorkoutCategories]([Name]);
                END
                """);

            migrationBuilder.Sql("""
                IF OBJECT_ID(N'WorkoutCategoryWarmups', N'U') IS NULL
                BEGIN
                    CREATE TABLE [WorkoutCategoryWarmups] (
                        [Id] int NOT NULL IDENTITY,
                        [WorkoutCategoryId] int NOT NULL,
                        [WarmupId] int NOT NULL,
                        [DisplayOrder] int NOT NULL,
                        [CreatedDate] datetime2 NOT NULL,
                        [UpdatedDate] datetime2 NULL,
                        [IsDeleted] bit NOT NULL CONSTRAINT [DF_WorkoutCategoryWarmups_IsDeleted] DEFAULT 0,
                        CONSTRAINT [PK_WorkoutCategoryWarmups] PRIMARY KEY ([Id]),
                        CONSTRAINT [FK_WorkoutCategoryWarmups_WorkoutCategories_WorkoutCategoryId]
                            FOREIGN KEY ([WorkoutCategoryId]) REFERENCES [WorkoutCategories]([Id]) ON DELETE CASCADE,
                        CONSTRAINT [FK_WorkoutCategoryWarmups_Warmups_WarmupId]
                            FOREIGN KEY ([WarmupId]) REFERENCES [Warmups]([Id]) ON DELETE NO ACTION
                    );
                    CREATE UNIQUE INDEX [IX_WorkoutCategoryWarmups_WorkoutCategoryId_DisplayOrder]
                        ON [WorkoutCategoryWarmups]([WorkoutCategoryId], [DisplayOrder]);
                    CREATE UNIQUE INDEX [IX_WorkoutCategoryWarmups_WorkoutCategoryId_WarmupId]
                        ON [WorkoutCategoryWarmups]([WorkoutCategoryId], [WarmupId]);
                END
                """);

            migrationBuilder.Sql("""
                IF OBJECT_ID(N'WorkoutCategoryStretches', N'U') IS NULL
                BEGIN
                    CREATE TABLE [WorkoutCategoryStretches] (
                        [Id] int NOT NULL IDENTITY,
                        [WorkoutCategoryId] int NOT NULL,
                        [StretchId] int NOT NULL,
                        [DisplayOrder] int NOT NULL,
                        [CreatedDate] datetime2 NOT NULL,
                        [UpdatedDate] datetime2 NULL,
                        [IsDeleted] bit NOT NULL CONSTRAINT [DF_WorkoutCategoryStretches_IsDeleted] DEFAULT 0,
                        CONSTRAINT [PK_WorkoutCategoryStretches] PRIMARY KEY ([Id]),
                        CONSTRAINT [FK_WorkoutCategoryStretches_WorkoutCategories_WorkoutCategoryId]
                            FOREIGN KEY ([WorkoutCategoryId]) REFERENCES [WorkoutCategories]([Id]) ON DELETE CASCADE,
                        CONSTRAINT [FK_WorkoutCategoryStretches_Stretches_StretchId]
                            FOREIGN KEY ([StretchId]) REFERENCES [Stretches]([Id]) ON DELETE NO ACTION
                    );
                    CREATE UNIQUE INDEX [IX_WorkoutCategoryStretches_WorkoutCategoryId_DisplayOrder]
                        ON [WorkoutCategoryStretches]([WorkoutCategoryId], [DisplayOrder]);
                    CREATE UNIQUE INDEX [IX_WorkoutCategoryStretches_WorkoutCategoryId_StretchId]
                        ON [WorkoutCategoryStretches]([WorkoutCategoryId], [StretchId]);
                END
                """);

            migrationBuilder.Sql("""
                IF COL_LENGTH('WorkoutPlans', 'WorkoutCategoryId') IS NULL
                BEGIN
                    ALTER TABLE [WorkoutPlans] ADD [WorkoutCategoryId] int NULL;
                    ALTER TABLE [WorkoutPlans] ADD CONSTRAINT [FK_WorkoutPlans_WorkoutCategories_WorkoutCategoryId]
                        FOREIGN KEY ([WorkoutCategoryId]) REFERENCES [WorkoutCategories]([Id]);
                END
                """);

            migrationBuilder.Sql("""
                IF COL_LENGTH('WorkoutPlans', 'UseDefaultWarmups') IS NULL
                BEGIN
                    ALTER TABLE [WorkoutPlans] ADD [UseDefaultWarmups] bit NOT NULL
                        CONSTRAINT [DF_WorkoutPlans_UseDefaultWarmups] DEFAULT 1;
                END
                """);

            migrationBuilder.Sql("""
                IF COL_LENGTH('WorkoutPlans', 'UseDefaultStretches') IS NULL
                BEGIN
                    ALTER TABLE [WorkoutPlans] ADD [UseDefaultStretches] bit NOT NULL
                        CONSTRAINT [DF_WorkoutPlans_UseDefaultStretches] DEFAULT 1;
                END
                """);
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("""
                IF COL_LENGTH('WorkoutPlans', 'UseDefaultStretches') IS NOT NULL
                    ALTER TABLE [WorkoutPlans] DROP CONSTRAINT [DF_WorkoutPlans_UseDefaultStretches];
                IF COL_LENGTH('WorkoutPlans', 'UseDefaultStretches') IS NOT NULL
                    ALTER TABLE [WorkoutPlans] DROP COLUMN [UseDefaultStretches];
                IF COL_LENGTH('WorkoutPlans', 'UseDefaultWarmups') IS NOT NULL
                    ALTER TABLE [WorkoutPlans] DROP CONSTRAINT [DF_WorkoutPlans_UseDefaultWarmups];
                IF COL_LENGTH('WorkoutPlans', 'UseDefaultWarmups') IS NOT NULL
                    ALTER TABLE [WorkoutPlans] DROP COLUMN [UseDefaultWarmups];
                IF EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = N'FK_WorkoutPlans_WorkoutCategories_WorkoutCategoryId')
                    ALTER TABLE [WorkoutPlans] DROP CONSTRAINT [FK_WorkoutPlans_WorkoutCategories_WorkoutCategoryId];
                IF COL_LENGTH('WorkoutPlans', 'WorkoutCategoryId') IS NOT NULL
                    ALTER TABLE [WorkoutPlans] DROP COLUMN [WorkoutCategoryId];
                """);
            migrationBuilder.Sql("IF OBJECT_ID(N'WorkoutCategoryStretches', N'U') IS NOT NULL DROP TABLE [WorkoutCategoryStretches];");
            migrationBuilder.Sql("IF OBJECT_ID(N'WorkoutCategoryWarmups', N'U') IS NOT NULL DROP TABLE [WorkoutCategoryWarmups];");
            migrationBuilder.Sql("IF OBJECT_ID(N'WorkoutCategories', N'U') IS NOT NULL DROP TABLE [WorkoutCategories];");
        }
    }
}
