using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace GymManagement.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddWorkoutTrackingSessionExercises : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AlterColumn<int>(
                name: "WorkoutPlanId",
                table: "WorkoutSessions",
                type: "int",
                nullable: true,
                oldClrType: typeof(int),
                oldType: "int");

            migrationBuilder.AddColumn<decimal>(
                name: "CaloriesBurned",
                table: "WorkoutSessions",
                type: "decimal(10,2)",
                precision: 10,
                scale: 2,
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "CompletionPercent",
                table: "WorkoutSessions",
                type: "decimal(5,2)",
                precision: 5,
                scale: 2,
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "MemberId",
                table: "WorkoutSessions",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "SessionEndUtc",
                table: "WorkoutSessions",
                type: "datetime2",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "SessionStartUtc",
                table: "WorkoutSessions",
                type: "datetime2",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Status",
                table: "WorkoutSessions",
                type: "nvarchar(20)",
                maxLength: 20,
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "TotalVolume",
                table: "WorkoutSessions",
                type: "decimal(14,2)",
                precision: 14,
                scale: 2,
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "WorkoutDate",
                table: "WorkoutSessions",
                type: "datetime2",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "WorkoutSessionExercises",
                columns: table => new
                {
                    Id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    WorkoutSessionId = table.Column<int>(type: "int", nullable: false),
                    ExerciseId = table.Column<int>(type: "int", nullable: false),
                    ExerciseName = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    SetNumber = table.Column<int>(type: "int", nullable: false),
                    TargetReps = table.Column<int>(type: "int", nullable: false),
                    ActualReps = table.Column<int>(type: "int", nullable: true),
                    TargetWeight = table.Column<decimal>(type: "decimal(10,2)", precision: 10, scale: 2, nullable: true),
                    ActualWeight = table.Column<decimal>(type: "decimal(10,2)", precision: 10, scale: 2, nullable: true),
                    DurationSeconds = table.Column<int>(type: "int", nullable: true),
                    RestSeconds = table.Column<int>(type: "int", nullable: true),
                    IsCompleted = table.Column<bool>(type: "bit", nullable: false),
                    Notes = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_WorkoutSessionExercises", x => x.Id);
                    table.ForeignKey(
                        name: "FK_WorkoutSessionExercises_Exercises_ExerciseId",
                        column: x => x.ExerciseId,
                        principalTable: "Exercises",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_WorkoutSessionExercises_WorkoutSessions_WorkoutSessionId",
                        column: x => x.WorkoutSessionId,
                        principalTable: "WorkoutSessions",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_WorkoutSessions_MemberId",
                table: "WorkoutSessions",
                column: "MemberId");

            migrationBuilder.CreateIndex(
                name: "IX_WorkoutSessionExercises_ExerciseId",
                table: "WorkoutSessionExercises",
                column: "ExerciseId");

            migrationBuilder.CreateIndex(
                name: "IX_WorkoutSessionExercises_WorkoutSessionId_ExerciseId_SetNumber",
                table: "WorkoutSessionExercises",
                columns: new[] { "WorkoutSessionId", "ExerciseId", "SetNumber" });

            migrationBuilder.AddForeignKey(
                name: "FK_WorkoutSessions_Members_MemberId",
                table: "WorkoutSessions",
                column: "MemberId",
                principalTable: "Members",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_WorkoutSessions_Members_MemberId",
                table: "WorkoutSessions");

            migrationBuilder.DropTable(
                name: "WorkoutSessionExercises");

            migrationBuilder.DropIndex(
                name: "IX_WorkoutSessions_MemberId",
                table: "WorkoutSessions");

            migrationBuilder.DropColumn(
                name: "CaloriesBurned",
                table: "WorkoutSessions");

            migrationBuilder.DropColumn(
                name: "CompletionPercent",
                table: "WorkoutSessions");

            migrationBuilder.DropColumn(
                name: "MemberId",
                table: "WorkoutSessions");

            migrationBuilder.DropColumn(
                name: "SessionEndUtc",
                table: "WorkoutSessions");

            migrationBuilder.DropColumn(
                name: "SessionStartUtc",
                table: "WorkoutSessions");

            migrationBuilder.DropColumn(
                name: "Status",
                table: "WorkoutSessions");

            migrationBuilder.DropColumn(
                name: "TotalVolume",
                table: "WorkoutSessions");

            migrationBuilder.DropColumn(
                name: "WorkoutDate",
                table: "WorkoutSessions");

            migrationBuilder.AlterColumn<int>(
                name: "WorkoutPlanId",
                table: "WorkoutSessions",
                type: "int",
                nullable: false,
                defaultValue: 0,
                oldClrType: typeof(int),
                oldType: "int",
                oldNullable: true);
        }
    }
}
