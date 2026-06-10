using GymManagement.Infrastructure.Data;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace GymManagement.Infrastructure.Migrations
{
    [DbContext(typeof(ApplicationDbContext))]
    [Migration("20260610160000_AddWorkoutPlanTemplateSystem")]
    public partial class AddWorkoutPlanTemplateSystem : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("""
                IF COL_LENGTH('WorkoutPlans', 'RepeatTemplate') IS NULL
                    ALTER TABLE [WorkoutPlans] ADD [RepeatTemplate] bit NOT NULL
                        CONSTRAINT [DF_WorkoutPlans_RepeatTemplate] DEFAULT 1;
                """);
            migrationBuilder.Sql("""
                IF COL_LENGTH('WorkoutPlans', 'TemplateMode') IS NULL
                    ALTER TABLE [WorkoutPlans] ADD [TemplateMode] nvarchar(50) NOT NULL
                        CONSTRAINT [DF_WorkoutPlans_TemplateMode] DEFAULT N'LEGACY';
                """);
            migrationBuilder.Sql("""
                IF COL_LENGTH('WorkoutPlans', 'TemplateWeekCount') IS NULL
                    ALTER TABLE [WorkoutPlans] ADD [TemplateWeekCount] int NOT NULL
                        CONSTRAINT [DF_WorkoutPlans_TemplateWeekCount] DEFAULT 1;
                """);
            migrationBuilder.Sql("""
                IF COL_LENGTH('WorkoutPlans', 'Version') IS NULL
                    ALTER TABLE [WorkoutPlans] ADD [Version] int NOT NULL
                        CONSTRAINT [DF_WorkoutPlans_Version] DEFAULT 1;
                """);
            migrationBuilder.Sql("""
                UPDATE [WorkoutPlans] SET [TemplateMode] = N'LEGACY' WHERE [TemplateMode] IS NULL OR [TemplateMode] = N'';
                """);

            migrationBuilder.Sql("""
                IF COL_LENGTH('WorkoutPlanWarmups', 'WorkoutPlanDayId') IS NULL
                BEGIN
                    ALTER TABLE [WorkoutPlanWarmups] ADD [WorkoutPlanDayId] int NULL;
                    ALTER TABLE [WorkoutPlanWarmups] ADD CONSTRAINT [FK_WorkoutPlanWarmups_WorkoutPlanDays_WorkoutPlanDayId]
                        FOREIGN KEY ([WorkoutPlanDayId]) REFERENCES [WorkoutPlanDays]([Id]);
                    CREATE INDEX [IX_WorkoutPlanWarmups_WorkoutPlanDayId] ON [WorkoutPlanWarmups]([WorkoutPlanDayId]);
                END
                """);

            migrationBuilder.Sql("""
                IF COL_LENGTH('WorkoutPlanStretches', 'WorkoutPlanDayId') IS NULL
                BEGIN
                    ALTER TABLE [WorkoutPlanStretches] ADD [WorkoutPlanDayId] int NULL;
                    ALTER TABLE [WorkoutPlanStretches] ADD CONSTRAINT [FK_WorkoutPlanStretches_WorkoutPlanDays_WorkoutPlanDayId]
                        FOREIGN KEY ([WorkoutPlanDayId]) REFERENCES [WorkoutPlanDays]([Id]);
                    CREATE INDEX [IX_WorkoutPlanStretches_WorkoutPlanDayId] ON [WorkoutPlanStretches]([WorkoutPlanDayId]);
                END
                """);

            migrationBuilder.Sql("""
                IF OBJECT_ID(N'WorkoutPlanVersions', N'U') IS NULL
                BEGIN
                    CREATE TABLE [WorkoutPlanVersions] (
                        [Id] int NOT NULL IDENTITY,
                        [WorkoutPlanId] int NOT NULL,
                        [VersionNumber] int NOT NULL,
                        [SnapshotJson] nvarchar(max) NOT NULL,
                        [ChangeSummary] nvarchar(500) NULL,
                        [CreatedByUserId] int NULL,
                        [CreatedByUserName] nvarchar(200) NULL,
                        [CreatedDate] datetime2 NOT NULL,
                        [UpdatedDate] datetime2 NULL,
                        [IsDeleted] bit NOT NULL CONSTRAINT [DF_WorkoutPlanVersions_IsDeleted] DEFAULT 0,
                        CONSTRAINT [PK_WorkoutPlanVersions] PRIMARY KEY ([Id]),
                        CONSTRAINT [FK_WorkoutPlanVersions_WorkoutPlans_WorkoutPlanId]
                            FOREIGN KEY ([WorkoutPlanId]) REFERENCES [WorkoutPlans]([Id]) ON DELETE CASCADE
                    );
                    CREATE UNIQUE INDEX [IX_WorkoutPlanVersions_WorkoutPlanId_VersionNumber]
                        ON [WorkoutPlanVersions]([WorkoutPlanId], [VersionNumber]);
                END
                """);
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("DROP TABLE IF EXISTS [WorkoutPlanVersions];");
            migrationBuilder.Sql("""
                IF EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = N'FK_WorkoutPlanStretches_WorkoutPlanDays_WorkoutPlanDayId')
                    ALTER TABLE [WorkoutPlanStretches] DROP CONSTRAINT [FK_WorkoutPlanStretches_WorkoutPlanDays_WorkoutPlanDayId];
                IF COL_LENGTH('WorkoutPlanStretches', 'WorkoutPlanDayId') IS NOT NULL
                    ALTER TABLE [WorkoutPlanStretches] DROP COLUMN [WorkoutPlanDayId];
                IF EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = N'FK_WorkoutPlanWarmups_WorkoutPlanDays_WorkoutPlanDayId')
                    ALTER TABLE [WorkoutPlanWarmups] DROP CONSTRAINT [FK_WorkoutPlanWarmups_WorkoutPlanDays_WorkoutPlanDayId];
                IF COL_LENGTH('WorkoutPlanWarmups', 'WorkoutPlanDayId') IS NOT NULL
                    ALTER TABLE [WorkoutPlanWarmups] DROP COLUMN [WorkoutPlanDayId];
                """);
            migrationBuilder.Sql("""
                IF COL_LENGTH('WorkoutPlans', 'Version') IS NOT NULL ALTER TABLE [WorkoutPlans] DROP CONSTRAINT [DF_WorkoutPlans_Version];
                IF COL_LENGTH('WorkoutPlans', 'Version') IS NOT NULL ALTER TABLE [WorkoutPlans] DROP COLUMN [Version];
                IF COL_LENGTH('WorkoutPlans', 'TemplateWeekCount') IS NOT NULL ALTER TABLE [WorkoutPlans] DROP CONSTRAINT [DF_WorkoutPlans_TemplateWeekCount];
                IF COL_LENGTH('WorkoutPlans', 'TemplateWeekCount') IS NOT NULL ALTER TABLE [WorkoutPlans] DROP COLUMN [TemplateWeekCount];
                IF COL_LENGTH('WorkoutPlans', 'TemplateMode') IS NOT NULL ALTER TABLE [WorkoutPlans] DROP CONSTRAINT [DF_WorkoutPlans_TemplateMode];
                IF COL_LENGTH('WorkoutPlans', 'TemplateMode') IS NOT NULL ALTER TABLE [WorkoutPlans] DROP COLUMN [TemplateMode];
                IF COL_LENGTH('WorkoutPlans', 'RepeatTemplate') IS NOT NULL ALTER TABLE [WorkoutPlans] DROP CONSTRAINT [DF_WorkoutPlans_RepeatTemplate];
                IF COL_LENGTH('WorkoutPlans', 'RepeatTemplate') IS NOT NULL ALTER TABLE [WorkoutPlans] DROP COLUMN [RepeatTemplate];
                """);
        }
    }
}
