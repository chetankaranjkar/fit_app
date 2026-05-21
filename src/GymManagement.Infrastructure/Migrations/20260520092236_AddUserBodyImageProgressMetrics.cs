using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace GymManagement.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddUserBodyImageProgressMetrics : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<decimal>(
                name: "BodyFatPercent",
                table: "UserBodyImages",
                type: "decimal(5,2)",
                precision: 5,
                scale: 2,
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "WeightKg",
                table: "UserBodyImages",
                type: "decimal(10,2)",
                precision: 10,
                scale: 2,
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_GymQrWorkoutSessions_BranchId",
                table: "GymQrWorkoutSessions",
                column: "BranchId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_GymQrWorkoutSessions_BranchId",
                table: "GymQrWorkoutSessions");

            migrationBuilder.DropColumn(
                name: "BodyFatPercent",
                table: "UserBodyImages");

            migrationBuilder.DropColumn(
                name: "WeightKg",
                table: "UserBodyImages");
        }
    }
}
