using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace GymManagement.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class GymQrFloorWorkoutSessions : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "GymQrWorkoutSessions",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    MemberUserId = table.Column<int>(type: "int", nullable: false),
                    BranchId = table.Column<int>(type: "int", nullable: false),
                    StartTimeUtc = table.Column<DateTime>(type: "datetime2", nullable: false),
                    EndTimeUtc = table.Column<DateTime>(type: "datetime2", nullable: true),
                    LastActivityAtUtc = table.Column<DateTime>(type: "datetime2", nullable: false),
                    Status = table.Column<string>(type: "nvarchar(32)", maxLength: 32, nullable: false),
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_GymQrWorkoutSessions", x => x.Id);
                    table.ForeignKey(
                        name: "FK_GymQrWorkoutSessions_Branches_BranchId",
                        column: x => x.BranchId,
                        principalTable: "Branches",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_GymQrWorkoutSessions_Users_MemberUserId",
                        column: x => x.MemberUserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "GymQrWorkoutLogs",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    SessionId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    ExerciseName = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    Reps = table.Column<int>(type: "int", nullable: false),
                    Weight = table.Column<decimal>(type: "decimal(12,3)", nullable: false),
                    CreatedAtUtc = table.Column<DateTime>(type: "datetime2", nullable: false),
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_GymQrWorkoutLogs", x => x.Id);
                    table.ForeignKey(
                        name: "FK_GymQrWorkoutLogs_GymQrWorkoutSessions_SessionId",
                        column: x => x.SessionId,
                        principalTable: "GymQrWorkoutSessions",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_GymQrWorkoutSessions_MemberUserId_BranchId_Status",
                table: "GymQrWorkoutSessions",
                columns: new[] { "MemberUserId", "BranchId", "Status" });

            migrationBuilder.CreateIndex(
                name: "IX_GymQrWorkoutSessions_LastActivityAtUtc",
                table: "GymQrWorkoutSessions",
                column: "LastActivityAtUtc");

            migrationBuilder.CreateIndex(
                name: "IX_GymQrWorkoutLogs_SessionId",
                table: "GymQrWorkoutLogs",
                column: "SessionId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(name: "GymQrWorkoutLogs");
            migrationBuilder.DropTable(name: "GymQrWorkoutSessions");
        }
    }
}
