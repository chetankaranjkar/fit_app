using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace GymManagement.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class LoginActivityOptionalAuthUserSessionIndex : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AlterColumn<int>(
                name: "AuthUserId",
                table: "LoginActivity",
                type: "int",
                nullable: true,
                oldClrType: typeof(int),
                oldType: "int");

            migrationBuilder.CreateIndex(
                name: "IX_LoginActivity_SessionId",
                table: "LoginActivity",
                column: "SessionId");

            migrationBuilder.Sql(
                "UPDATE [LoginActivity] SET [Status] = N'SUCCESS' WHERE [Status] = N'Success';" +
                "UPDATE [LoginActivity] SET [Status] = N'FAILED' WHERE [Status] = N'Failed';");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(
                "UPDATE [LoginActivity] SET [Status] = N'Success' WHERE [Status] = N'SUCCESS';" +
                "UPDATE [LoginActivity] SET [Status] = N'Failed' WHERE [Status] = N'FAILED';");

            migrationBuilder.DropIndex(
                name: "IX_LoginActivity_SessionId",
                table: "LoginActivity");

            migrationBuilder.AlterColumn<int>(
                name: "AuthUserId",
                table: "LoginActivity",
                type: "int",
                nullable: false,
                defaultValue: 0,
                oldClrType: typeof(int),
                oldType: "int",
                oldNullable: true);
        }
    }
}
