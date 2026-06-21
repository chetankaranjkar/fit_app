using GymManagement.Infrastructure.Data;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace GymManagement.Infrastructure.Migrations
{
    [DbContext(typeof(ApplicationDbContext))]
    [Migration("20260616120000_AddMemberCustomTrainingSchedule")]
    public partial class AddMemberCustomTrainingSchedule : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "TrainingDaysOfWeek",
                table: "Users",
                type: "nvarchar(30)",
                maxLength: 30,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "TrainingScheduleType",
                table: "Users",
                type: "nvarchar(20)",
                maxLength: 20,
                nullable: true);

            migrationBuilder.AddColumn<TimeSpan>(
                name: "TrainingEndTime",
                table: "Users",
                type: "time",
                nullable: true);

            migrationBuilder.AddColumn<TimeSpan>(
                name: "TrainingStartTime",
                table: "Users",
                type: "time",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "TrainingDaysOfWeek",
                table: "Members",
                type: "nvarchar(30)",
                maxLength: 30,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "TrainingScheduleType",
                table: "Members",
                type: "nvarchar(20)",
                maxLength: 20,
                nullable: true);

            migrationBuilder.AddColumn<TimeSpan>(
                name: "TrainingEndTime",
                table: "Members",
                type: "time",
                nullable: true);

            migrationBuilder.AddColumn<TimeSpan>(
                name: "TrainingStartTime",
                table: "Members",
                type: "time",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(name: "TrainingDaysOfWeek", table: "Users");
            migrationBuilder.DropColumn(name: "TrainingScheduleType", table: "Users");
            migrationBuilder.DropColumn(name: "TrainingEndTime", table: "Users");
            migrationBuilder.DropColumn(name: "TrainingStartTime", table: "Users");

            migrationBuilder.DropColumn(name: "TrainingDaysOfWeek", table: "Members");
            migrationBuilder.DropColumn(name: "TrainingScheduleType", table: "Members");
            migrationBuilder.DropColumn(name: "TrainingEndTime", table: "Members");
            migrationBuilder.DropColumn(name: "TrainingStartTime", table: "Members");
        }
    }
}
