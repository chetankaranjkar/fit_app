using GymManagement.Infrastructure.Data;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace GymManagement.Infrastructure.Migrations
{
    [DbContext(typeof(ApplicationDbContext))]
    [Migration("20260612120000_FixWorkoutPlanWeekUniqueIndexFilter")]
    public partial class FixWorkoutPlanWeekUniqueIndexFilter : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_WorkoutPlanWeeks_WorkoutPlanId_WeekNumber",
                table: "WorkoutPlanWeeks");

            migrationBuilder.CreateIndex(
                name: "IX_WorkoutPlanWeeks_WorkoutPlanId_WeekNumber",
                table: "WorkoutPlanWeeks",
                columns: new[] { "WorkoutPlanId", "WeekNumber" },
                unique: true,
                filter: "[IsDeleted] = 0");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_WorkoutPlanWeeks_WorkoutPlanId_WeekNumber",
                table: "WorkoutPlanWeeks");

            migrationBuilder.CreateIndex(
                name: "IX_WorkoutPlanWeeks_WorkoutPlanId_WeekNumber",
                table: "WorkoutPlanWeeks",
                columns: new[] { "WorkoutPlanId", "WeekNumber" },
                unique: true);
        }
    }
}
