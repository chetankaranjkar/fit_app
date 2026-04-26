using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Microsoft.EntityFrameworkCore.Infrastructure;
using GymManagement.Infrastructure.Data;

#nullable disable

namespace GymManagement.Infrastructure.Migrations
{
    [DbContext(typeof(ApplicationDbContext))]
    [Migration("20260216120000_SimplifyBodyMetricsAndAddNotifications")]
    public partial class SimplifyBodyMetricsAndAddNotifications : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Drop FK and column BodyMetricsId from BodyMetricsLogs (history only; latest snapshot in UserDetails)
            migrationBuilder.DropForeignKey(
                name: "FK_BodyMetricsLogs_BodyMetrics_BodyMetricsId",
                table: "BodyMetricsLogs");

            migrationBuilder.DropIndex(
                name: "IX_BodyMetricsLogs_BodyMetricsId",
                table: "BodyMetricsLogs");

            migrationBuilder.DropColumn(
                name: "BodyMetricsId",
                table: "BodyMetricsLogs");

            // Change BodyMetricsLogs -> Users to ON DELETE CASCADE (history follows user)
            migrationBuilder.DropForeignKey(
                name: "FK_BodyMetricsLogs_Users_UserId",
                table: "BodyMetricsLogs");
            migrationBuilder.AddForeignKey(
                name: "FK_BodyMetricsLogs_Users_UserId",
                table: "BodyMetricsLogs",
                column: "UserId",
                principalTable: "Users",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);

            // Drop BodyMetrics table
            migrationBuilder.DropTable(
                name: "BodyMetrics");

            // Drop ProgressTrackings table
            migrationBuilder.DropTable(
                name: "ProgressTrackings");

            // Create Notifications table
            migrationBuilder.CreateTable(
                name: "Notifications",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    UserId = table.Column<int>(type: "int", nullable: false),
                    Title = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    Message = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    IsRead = table.Column<bool>(type: "bit", nullable: false, defaultValue: false),
                    NotificationType = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: true),
                    CreatedDate = table.Column<DateTime>(type: "datetime2", nullable: false, defaultValueSql: "GETDATE()")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Notifications", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Notifications_Users_UserId",
                        column: x => x.UserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_Notifications_UserId",
                table: "Notifications",
                column: "UserId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "Notifications");

            migrationBuilder.AddColumn<int>(
                name: "BodyMetricsId",
                table: "BodyMetricsLogs",
                type: "int",
                nullable: false,
                defaultValue: 0);

            // Recreate BodyMetrics table (simplified - would need full column list from Initial migration to restore)
            migrationBuilder.CreateTable(
                name: "BodyMetrics",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    UserId = table.Column<int>(type: "int", nullable: false),
                    MeasurementDate = table.Column<DateTime>(type: "datetime2", nullable: false),
                    WeightKg = table.Column<decimal>(type: "decimal(10,2)", nullable: false),
                    BodyFatPct = table.Column<decimal>(type: "decimal(5,2)", nullable: true),
                    MuscleMassKg = table.Column<decimal>(type: "decimal(10,2)", nullable: true),
                    ChestCm = table.Column<decimal>(type: "decimal(10,2)", nullable: true),
                    WaistCm = table.Column<decimal>(type: "decimal(10,2)", nullable: true),
                    HipsCm = table.Column<decimal>(type: "decimal(10,2)", nullable: true),
                    BicepsCm = table.Column<decimal>(type: "decimal(10,2)", nullable: true),
                    ThighsCm = table.Column<decimal>(type: "decimal(10,2)", nullable: true),
                    NeckCm = table.Column<decimal>(type: "decimal(10,2)", nullable: true),
                    ShouldersCm = table.Column<decimal>(type: "decimal(10,2)", nullable: true),
                    ForearmsCm = table.Column<decimal>(type: "decimal(10,2)", nullable: true),
                    CalvesCm = table.Column<decimal>(type: "decimal(10,2)", nullable: true),
                    HeightCm = table.Column<decimal>(type: "decimal(10,2)", nullable: true),
                    Notes = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    ProgressPictureUrl = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    CreatedDate = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedDate = table.Column<DateTime>(type: "datetime2", nullable: true),
                    IsDeleted = table.Column<bool>(type: "bit", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_BodyMetrics", x => x.Id);
                    table.ForeignKey(
                        name: "FK_BodyMetrics_Users_UserId",
                        column: x => x.UserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "ProgressTrackings",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    UserId = table.Column<int>(type: "int", nullable: false),
                    TrackDate = table.Column<DateTime>(type: "datetime2", nullable: false),
                    Weight = table.Column<decimal>(type: "decimal(10,2)", nullable: false),
                    BodyFatPercentage = table.Column<decimal>(type: "decimal(5,2)", nullable: true),
                    MuscleMass = table.Column<decimal>(type: "decimal(10,2)", nullable: true),
                    Notes = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    ProgressPictures = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    Height = table.Column<decimal>(type: "decimal(10,2)", nullable: true),
                    BMR = table.Column<decimal>(type: "decimal(10,2)", nullable: true),
                    BMI = table.Column<decimal>(type: "decimal(10,2)", nullable: true),
                    CreatedDate = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedDate = table.Column<DateTime>(type: "datetime2", nullable: true),
                    IsDeleted = table.Column<bool>(type: "bit", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ProgressTrackings", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ProgressTrackings_Users_UserId",
                        column: x => x.UserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_BodyMetrics_UserId",
                table: "BodyMetrics",
                column: "UserId",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_ProgressTrackings_UserId",
                table: "ProgressTrackings",
                column: "UserId");

            // Restore BodyMetricsId on BodyMetricsLogs would require data migration; Down is best-effort
            migrationBuilder.CreateIndex(
                name: "IX_BodyMetricsLogs_BodyMetricsId",
                table: "BodyMetricsLogs",
                column: "BodyMetricsId");

            migrationBuilder.AddForeignKey(
                name: "FK_BodyMetricsLogs_BodyMetrics_BodyMetricsId",
                table: "BodyMetricsLogs",
                column: "BodyMetricsId",
                principalTable: "BodyMetrics",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);
        }
    }
}
