using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace GymManagement.Infrastructure.Migrations;

/// <inheritdoc />
public partial class WorkoutOneActiveSessionPerMember : Migration
{
    /// <inheritdoc />
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.CreateIndex(
            name: "IX_WorkoutSessions_OneInProgressPerMember",
            table: "WorkoutSessions",
            column: "MemberId",
            unique: true,
            filter: "[IsDeleted] = 0 AND [Status] = N'InProgress' AND [MemberId] IS NOT NULL");
    }

    /// <inheritdoc />
    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.DropIndex(
            name: "IX_WorkoutSessions_OneInProgressPerMember",
            table: "WorkoutSessions");
    }
}
