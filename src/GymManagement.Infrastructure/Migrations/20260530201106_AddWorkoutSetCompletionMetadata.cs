using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace GymManagement.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddWorkoutSetCompletionMetadata : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_member_supplements_Users_UserId",
                table: "member_supplements");

            migrationBuilder.AddColumn<DateTime>(
                name: "CompletedAt",
                table: "WorkoutSessionExercises",
                type: "datetime2",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "CompletedByUserId",
                table: "WorkoutSessionExercises",
                type: "int",
                nullable: true);

            migrationBuilder.AddForeignKey(
                name: "FK_member_supplements_Users_UserId",
                table: "member_supplements",
                column: "UserId",
                principalTable: "Users",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_member_supplements_Users_UserId",
                table: "member_supplements");

            migrationBuilder.DropColumn(
                name: "CompletedAt",
                table: "WorkoutSessionExercises");

            migrationBuilder.DropColumn(
                name: "CompletedByUserId",
                table: "WorkoutSessionExercises");

            migrationBuilder.AddForeignKey(
                name: "FK_member_supplements_Users_UserId",
                table: "member_supplements",
                column: "UserId",
                principalTable: "Users",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);
        }
    }
}
