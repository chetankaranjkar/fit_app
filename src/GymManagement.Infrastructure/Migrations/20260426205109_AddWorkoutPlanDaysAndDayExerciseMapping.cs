using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace GymManagement.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddWorkoutPlanDaysAndDayExerciseMapping : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "WorkoutPlanDayId",
                table: "WorkoutPlanExercises",
                type: "int",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "WorkoutPlanDays",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    WorkoutPlanId = table.Column<int>(type: "int", nullable: false),
                    DayNumber = table.Column<int>(type: "int", nullable: false),
                    Name = table.Column<string>(type: "nvarchar(80)", maxLength: 80, nullable: false),
                    IsRestDay = table.Column<bool>(type: "bit", nullable: false),
                    OrderIndex = table.Column<int>(type: "int", nullable: false),
                    CreatedDate = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedDate = table.Column<DateTime>(type: "datetime2", nullable: true),
                    IsDeleted = table.Column<bool>(type: "bit", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_WorkoutPlanDays", x => x.Id);
                    table.ForeignKey(
                        name: "FK_WorkoutPlanDays_WorkoutPlans_WorkoutPlanId",
                        column: x => x.WorkoutPlanId,
                        principalTable: "WorkoutPlans",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_WorkoutPlanExercises_WorkoutPlanDayId",
                table: "WorkoutPlanExercises",
                column: "WorkoutPlanDayId");

            migrationBuilder.CreateIndex(
                name: "IX_WorkoutPlanDays_WorkoutPlanId_DayNumber",
                table: "WorkoutPlanDays",
                columns: new[] { "WorkoutPlanId", "DayNumber" });

            migrationBuilder.CreateIndex(
                name: "IX_WorkoutPlanDays_WorkoutPlanId_OrderIndex",
                table: "WorkoutPlanDays",
                columns: new[] { "WorkoutPlanId", "OrderIndex" });

            migrationBuilder.AddForeignKey(
                name: "FK_WorkoutPlanExercises_WorkoutPlanDays_WorkoutPlanDayId",
                table: "WorkoutPlanExercises",
                column: "WorkoutPlanDayId",
                principalTable: "WorkoutPlanDays",
                principalColumn: "Id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_WorkoutPlanExercises_WorkoutPlanDays_WorkoutPlanDayId",
                table: "WorkoutPlanExercises");

            migrationBuilder.DropTable(
                name: "WorkoutPlanDays");

            migrationBuilder.DropIndex(
                name: "IX_WorkoutPlanExercises_WorkoutPlanDayId",
                table: "WorkoutPlanExercises");

            migrationBuilder.DropColumn(
                name: "WorkoutPlanDayId",
                table: "WorkoutPlanExercises");
        }
    }
}
