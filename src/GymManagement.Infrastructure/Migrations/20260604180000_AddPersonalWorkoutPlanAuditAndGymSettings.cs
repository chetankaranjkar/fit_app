using GymManagement.Infrastructure.Data;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace GymManagement.Infrastructure.Migrations
{
    [DbContext(typeof(ApplicationDbContext))]
    [Migration("20260604180000_AddPersonalWorkoutPlanAuditAndGymSettings")]
    public partial class AddPersonalWorkoutPlanAuditAndGymSettings : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("""
                IF COL_LENGTH('WorkoutPlans', 'PlanType') IS NULL
                BEGIN
                    ALTER TABLE [WorkoutPlans] ADD [PlanType] nvarchar(32) NOT NULL CONSTRAINT [DF_WorkoutPlans_PlanType] DEFAULT N'Program';
                END
                """);

            migrationBuilder.Sql("""
                IF COL_LENGTH('WorkoutPlans', 'AssignedToUserId') IS NULL
                BEGIN
                    ALTER TABLE [WorkoutPlans] ADD [AssignedToUserId] int NULL;
                    ALTER TABLE [WorkoutPlans] ADD CONSTRAINT [FK_WorkoutPlans_Users_AssignedToUserId]
                        FOREIGN KEY ([AssignedToUserId]) REFERENCES [Users]([Id]);
                END
                """);

            migrationBuilder.Sql("""
                IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'UX_WorkoutPlan_OnePersonalPlanPerUser' AND object_id = OBJECT_ID(N'WorkoutPlans'))
                BEGIN
                    CREATE UNIQUE INDEX [UX_WorkoutPlan_OnePersonalPlanPerUser]
                    ON [WorkoutPlans]([AssignedToUserId])
                    WHERE [PlanType] = N'Personal' AND [IsDeleted] = 0 AND [AssignedToUserId] IS NOT NULL;
                END
                """);

            migrationBuilder.Sql("""
                IF OBJECT_ID(N'workout_plan_audit_logs', N'U') IS NULL
                BEGIN
                    CREATE TABLE [workout_plan_audit_logs] (
                        [Id] int NOT NULL IDENTITY,
                        [WorkoutPlanId] int NULL,
                        [WorkoutPlanName] nvarchar(200) NOT NULL,
                        [AssignedToUserId] int NULL,
                        [Action] nvarchar(40) NOT NULL,
                        [SnapshotJson] nvarchar(max) NULL,
                        [ChangeDetails] nvarchar(4000) NULL,
                        [PerformedByUserId] int NOT NULL,
                        [PerformedByUserName] nvarchar(200) NOT NULL,
                        [PerformedDate] datetime2 NOT NULL,
                        [IPAddress] nvarchar(64) NULL,
                        [DeviceInfo] nvarchar(512) NULL,
                        [CreatedDate] datetime2 NOT NULL,
                        [UpdatedDate] datetime2 NULL,
                        [IsDeleted] bit NOT NULL CONSTRAINT [DF_workout_plan_audit_logs_IsDeleted] DEFAULT 0,
                        CONSTRAINT [PK_workout_plan_audit_logs] PRIMARY KEY ([Id])
                    );
                    CREATE INDEX [IX_workout_plan_audit_logs_WorkoutPlanId] ON [workout_plan_audit_logs]([WorkoutPlanId]);
                    CREATE INDEX [IX_workout_plan_audit_logs_AssignedToUserId] ON [workout_plan_audit_logs]([AssignedToUserId]);
                    CREATE INDEX [IX_workout_plan_audit_logs_PerformedDate] ON [workout_plan_audit_logs]([PerformedDate]);
                    CREATE INDEX [IX_workout_plan_audit_logs_Action] ON [workout_plan_audit_logs]([Action]);
                END
                """);

            migrationBuilder.Sql("""
                IF OBJECT_ID(N'GymSettings', N'U') IS NULL
                BEGIN
                    CREATE TABLE [GymSettings] (
                        [Id] int NOT NULL,
                        [AllowMemberWorkoutPlanCreation] bit NOT NULL CONSTRAINT [DF_GymSettings_AllowMemberWorkoutPlanCreation] DEFAULT 1,
                        [MaxPersonalWorkoutPlansPerMember] int NOT NULL CONSTRAINT [DF_GymSettings_MaxPersonalWorkoutPlansPerMember] DEFAULT 1,
                        [UpdatedDate] datetime2 NOT NULL,
                        CONSTRAINT [PK_GymSettings] PRIMARY KEY ([Id])
                    );
                    INSERT INTO [GymSettings] ([Id], [AllowMemberWorkoutPlanCreation], [MaxPersonalWorkoutPlansPerMember], [UpdatedDate])
                    VALUES (1, 1, 1, SYSUTCDATETIME());
                END
                """);
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("DROP TABLE IF EXISTS [workout_plan_audit_logs];");
            migrationBuilder.Sql("DROP TABLE IF EXISTS [GymSettings];");
            migrationBuilder.Sql("""
                IF EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'UX_WorkoutPlan_OnePersonalPlanPerUser' AND object_id = OBJECT_ID(N'WorkoutPlans'))
                    DROP INDEX [UX_WorkoutPlan_OnePersonalPlanPerUser] ON [WorkoutPlans];
                """);
            migrationBuilder.Sql("""
                IF EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = N'FK_WorkoutPlans_Users_AssignedToUserId')
                    ALTER TABLE [WorkoutPlans] DROP CONSTRAINT [FK_WorkoutPlans_Users_AssignedToUserId];
                IF COL_LENGTH('WorkoutPlans', 'AssignedToUserId') IS NOT NULL
                    ALTER TABLE [WorkoutPlans] DROP COLUMN [AssignedToUserId];
                IF COL_LENGTH('WorkoutPlans', 'PlanType') IS NOT NULL
                    ALTER TABLE [WorkoutPlans] DROP COLUMN [PlanType];
                """);
        }
    }
}
