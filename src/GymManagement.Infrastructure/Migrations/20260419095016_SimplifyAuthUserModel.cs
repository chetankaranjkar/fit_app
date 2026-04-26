using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace GymManagement.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class SimplifyAuthUserModel : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Trainer-only logins stored TrainerId; profile RBAC uses Users.Id — copy before dropping TrainerId.
            migrationBuilder.Sql("""
                UPDATE a
                SET UserId = t.UserId
                FROM AuthUsers a
                INNER JOIN Trainer t ON t.Id = a.TrainerId
                WHERE a.UserId IS NULL AND a.TrainerId IS NOT NULL;
                """);

            migrationBuilder.DropForeignKey(
                name: "FK_AuthUsers_Trainer_TrainerId",
                table: "AuthUsers");

            migrationBuilder.DropIndex(
                name: "IX_AuthUsers_TrainerId",
                table: "AuthUsers");

            migrationBuilder.DropIndex(
                name: "IX_AuthUsers_Username",
                table: "AuthUsers");

            migrationBuilder.DropColumn(
                name: "EmailVerificationToken",
                table: "AuthUsers");

            migrationBuilder.DropColumn(
                name: "IsActive",
                table: "AuthUsers");

            migrationBuilder.DropColumn(
                name: "IsEmailVerified",
                table: "AuthUsers");

            migrationBuilder.DropColumn(
                name: "LastLoginDate",
                table: "AuthUsers");

            migrationBuilder.DropColumn(
                name: "PasswordResetExpiry",
                table: "AuthUsers");

            migrationBuilder.DropColumn(
                name: "PasswordResetToken",
                table: "AuthUsers");

            migrationBuilder.DropColumn(
                name: "TrainerId",
                table: "AuthUsers");

            migrationBuilder.DropColumn(
                name: "Username",
                table: "AuthUsers");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "EmailVerificationToken",
                table: "AuthUsers",
                type: "nvarchar(200)",
                maxLength: 200,
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "IsActive",
                table: "AuthUsers",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<bool>(
                name: "IsEmailVerified",
                table: "AuthUsers",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<DateTime>(
                name: "LastLoginDate",
                table: "AuthUsers",
                type: "datetime2",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "PasswordResetExpiry",
                table: "AuthUsers",
                type: "datetime2",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "PasswordResetToken",
                table: "AuthUsers",
                type: "nvarchar(200)",
                maxLength: 200,
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "TrainerId",
                table: "AuthUsers",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Username",
                table: "AuthUsers",
                type: "nvarchar(100)",
                maxLength: 100,
                nullable: false,
                defaultValue: "");

            migrationBuilder.CreateIndex(
                name: "IX_AuthUsers_TrainerId",
                table: "AuthUsers",
                column: "TrainerId",
                unique: true,
                filter: "[TrainerId] IS NOT NULL");

            migrationBuilder.CreateIndex(
                name: "IX_AuthUsers_Username",
                table: "AuthUsers",
                column: "Username",
                unique: true,
                filter: "[IsDeleted] = 0");

            migrationBuilder.AddForeignKey(
                name: "FK_AuthUsers_Trainer_TrainerId",
                table: "AuthUsers",
                column: "TrainerId",
                principalTable: "Trainer",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);
        }
    }
}
