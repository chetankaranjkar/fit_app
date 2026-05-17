using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace GymManagement.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddProgramWeeksAndProgramFields : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "Goal",
                table: "WorkoutPlans",
                type: "nvarchar(120)",
                maxLength: 120,
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "DurationDays",
                table: "WorkoutPlans",
                type: "int",
                nullable: false,
                defaultValue: 30);

            migrationBuilder.AddColumn<int>(
                name: "WorkoutsPerWeek",
                table: "WorkoutPlans",
                type: "int",
                nullable: false,
                defaultValue: 3);

            migrationBuilder.AddColumn<string>(
                name: "Thumbnail",
                table: "WorkoutPlans",
                type: "nvarchar(500)",
                maxLength: 500,
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "EstimatedCaloriesBurn",
                table: "WorkoutPlans",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Tags",
                table: "WorkoutPlans",
                type: "nvarchar(1000)",
                maxLength: 1000,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Status",
                table: "WorkoutPlans",
                type: "nvarchar(32)",
                maxLength: 32,
                nullable: false,
                defaultValue: "Active");

            migrationBuilder.CreateTable(
                name: "WorkoutPlanWeeks",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    WorkoutPlanId = table.Column<int>(type: "int", nullable: false),
                    WeekNumber = table.Column<int>(type: "int", nullable: false),
                    Name = table.Column<string>(type: "nvarchar(120)", maxLength: 120, nullable: true),
                    CreatedDate = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedDate = table.Column<DateTime>(type: "datetime2", nullable: true),
                    IsDeleted = table.Column<bool>(type: "bit", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_WorkoutPlanWeeks", x => x.Id);
                    table.ForeignKey(
                        name: "FK_WorkoutPlanWeeks_WorkoutPlans_WorkoutPlanId",
                        column: x => x.WorkoutPlanId,
                        principalTable: "WorkoutPlans",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.AddColumn<int>(
                name: "WorkoutPlanWeekId",
                table: "WorkoutPlanDays",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "FocusArea",
                table: "WorkoutPlanDays",
                type: "nvarchar(120)",
                maxLength: 120,
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "DurationMinutes",
                table: "WorkoutPlanDays",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Notes",
                table: "WorkoutPlanDays",
                type: "nvarchar(500)",
                maxLength: 500,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Tempo",
                table: "WorkoutPlanExercises",
                type: "nvarchar(32)",
                maxLength: 32,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Intensity",
                table: "WorkoutPlanExercises",
                type: "nvarchar(64)",
                maxLength: 64,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Notes",
                table: "WorkoutPlanExercises",
                type: "nvarchar(500)",
                maxLength: 500,
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_WorkoutPlanWeeks_WorkoutPlanId_WeekNumber",
                table: "WorkoutPlanWeeks",
                columns: new[] { "WorkoutPlanId", "WeekNumber" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_WorkoutPlanDays_WorkoutPlanWeekId",
                table: "WorkoutPlanDays",
                column: "WorkoutPlanWeekId");

            migrationBuilder.AddForeignKey(
                name: "FK_WorkoutPlanDays_WorkoutPlanWeeks_WorkoutPlanWeekId",
                table: "WorkoutPlanDays",
                column: "WorkoutPlanWeekId",
                principalTable: "WorkoutPlanWeeks",
                principalColumn: "Id");

            migrationBuilder.Sql(@"
INSERT INTO WorkoutPlanWeeks (WorkoutPlanId, WeekNumber, Name, CreatedDate, IsDeleted)
SELECT DISTINCT d.WorkoutPlanId, 1, N'Week 1', SYSUTCDATETIME(), 0
FROM WorkoutPlanDays d
WHERE d.IsDeleted = 0
  AND NOT EXISTS (
    SELECT 1 FROM WorkoutPlanWeeks w
    WHERE w.WorkoutPlanId = d.WorkoutPlanId AND w.WeekNumber = 1 AND w.IsDeleted = 0
  );

UPDATE d
SET d.WorkoutPlanWeekId = w.Id
FROM WorkoutPlanDays d
INNER JOIN WorkoutPlanWeeks w ON w.WorkoutPlanId = d.WorkoutPlanId AND w.WeekNumber = 1 AND w.IsDeleted = 0
WHERE d.WorkoutPlanWeekId IS NULL AND d.IsDeleted = 0;
");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_WorkoutPlanDays_WorkoutPlanWeeks_WorkoutPlanWeekId",
                table: "WorkoutPlanDays");

            migrationBuilder.DropTable(
                name: "WorkoutPlanWeeks");

            migrationBuilder.DropIndex(
                name: "IX_WorkoutPlanDays_WorkoutPlanWeekId",
                table: "WorkoutPlanDays");

            migrationBuilder.DropColumn(
                name: "WorkoutPlanWeekId",
                table: "WorkoutPlanDays");

            migrationBuilder.DropColumn(
                name: "FocusArea",
                table: "WorkoutPlanDays");

            migrationBuilder.DropColumn(
                name: "DurationMinutes",
                table: "WorkoutPlanDays");

            migrationBuilder.DropColumn(
                name: "Notes",
                table: "WorkoutPlanDays");

            migrationBuilder.DropColumn(
                name: "Tempo",
                table: "WorkoutPlanExercises");

            migrationBuilder.DropColumn(
                name: "Intensity",
                table: "WorkoutPlanExercises");

            migrationBuilder.DropColumn(
                name: "Notes",
                table: "WorkoutPlanExercises");

            migrationBuilder.DropColumn(
                name: "Goal",
                table: "WorkoutPlans");

            migrationBuilder.DropColumn(
                name: "DurationDays",
                table: "WorkoutPlans");

            migrationBuilder.DropColumn(
                name: "WorkoutsPerWeek",
                table: "WorkoutPlans");

            migrationBuilder.DropColumn(
                name: "Thumbnail",
                table: "WorkoutPlans");

            migrationBuilder.DropColumn(
                name: "EstimatedCaloriesBurn",
                table: "WorkoutPlans");

            migrationBuilder.DropColumn(
                name: "Tags",
                table: "WorkoutPlans");

            migrationBuilder.DropColumn(
                name: "Status",
                table: "WorkoutPlans");
        }
    }
}
