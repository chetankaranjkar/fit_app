using GymManagement.Infrastructure.Data;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace GymManagement.Infrastructure.Migrations
{
    [DbContext(typeof(ApplicationDbContext))]
    [Migration("20260421143000_AddAttendanceCorrectionsAndExceptions")]
    public partial class AddAttendanceCorrectionsAndExceptions : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "ExceptionReason",
                table: "AttendanceLogs",
                type: "nvarchar(250)",
                maxLength: 250,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "CorrectionAuditNote",
                table: "AttendanceLogs",
                type: "nvarchar(1000)",
                maxLength: 1000,
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "IsManualCorrection",
                table: "AttendanceLogs",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<int>(
                name: "CorrectedByUserId",
                table: "AttendanceLogs",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "CorrectedAt",
                table: "AttendanceLogs",
                type: "datetime2",
                nullable: true);
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(name: "ExceptionReason", table: "AttendanceLogs");
            migrationBuilder.DropColumn(name: "CorrectionAuditNote", table: "AttendanceLogs");
            migrationBuilder.DropColumn(name: "IsManualCorrection", table: "AttendanceLogs");
            migrationBuilder.DropColumn(name: "CorrectedByUserId", table: "AttendanceLogs");
            migrationBuilder.DropColumn(name: "CorrectedAt", table: "AttendanceLogs");
        }
    }
}

