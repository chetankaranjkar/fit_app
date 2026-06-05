using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace GymManagement.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class MemberSearchPerformanceIndexes : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_UserUserTypes_UserTypeId",
                table: "UserUserTypes");

            migrationBuilder.CreateIndex(
                name: "IX_UserUserTypes_UserTypeId_UserId",
                table: "UserUserTypes",
                columns: new[] { "UserTypeId", "UserId" },
                filter: "[IsDeleted] = 0");

            migrationBuilder.CreateIndex(
                name: "IX_Users_FirstName",
                table: "Users",
                column: "FirstName",
                filter: "[IsDeleted] = 0");

            migrationBuilder.CreateIndex(
                name: "IX_Users_IsDeleted_RegistrationDate_Id",
                table: "Users",
                columns: new[] { "IsDeleted", "RegistrationDate", "Id" });

            migrationBuilder.CreateIndex(
                name: "IX_Users_LastName",
                table: "Users",
                column: "LastName",
                filter: "[IsDeleted] = 0");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_UserUserTypes_UserTypeId_UserId",
                table: "UserUserTypes");

            migrationBuilder.DropIndex(
                name: "IX_Users_FirstName",
                table: "Users");

            migrationBuilder.DropIndex(
                name: "IX_Users_IsDeleted_RegistrationDate_Id",
                table: "Users");

            migrationBuilder.DropIndex(
                name: "IX_Users_LastName",
                table: "Users");

            migrationBuilder.CreateIndex(
                name: "IX_UserUserTypes_UserTypeId",
                table: "UserUserTypes",
                column: "UserTypeId");
        }
    }
}
