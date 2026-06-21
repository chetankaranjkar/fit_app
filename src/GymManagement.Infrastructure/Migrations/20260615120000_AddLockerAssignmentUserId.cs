using GymManagement.Infrastructure.Data;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace GymManagement.Infrastructure.Migrations
{
    [DbContext(typeof(ApplicationDbContext))]
    [Migration("20260615120000_AddLockerAssignmentUserId")]
    public partial class AddLockerAssignmentUserId : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "UserId",
                table: "LockerMgmt_Assignments",
                type: "int",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_LockerMgmt_Assignments_UserId",
                table: "LockerMgmt_Assignments",
                column: "UserId");

            migrationBuilder.AddForeignKey(
                name: "FK_LockerMgmt_Assignments_Users_UserId",
                table: "LockerMgmt_Assignments",
                column: "UserId",
                principalTable: "Users",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_LockerMgmt_Assignments_Users_UserId",
                table: "LockerMgmt_Assignments");

            migrationBuilder.DropIndex(
                name: "IX_LockerMgmt_Assignments_UserId",
                table: "LockerMgmt_Assignments");

            migrationBuilder.DropColumn(
                name: "UserId",
                table: "LockerMgmt_Assignments");
        }
    }
}
