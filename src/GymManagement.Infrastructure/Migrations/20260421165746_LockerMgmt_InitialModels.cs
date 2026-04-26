using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace GymManagement.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class LockerMgmt_InitialModels : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "LockerMgmt_Lockers",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    LockerNumber = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    Size = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false),
                    Status = table.Column<string>(type: "nvarchar(30)", maxLength: 30, nullable: false),
                    Location = table.Column<string>(type: "nvarchar(150)", maxLength: 150, nullable: true),
                    CreatedDate = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedDate = table.Column<DateTime>(type: "datetime2", nullable: true),
                    IsDeleted = table.Column<bool>(type: "bit", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_LockerMgmt_Lockers", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "LockerMgmt_AccessLogs",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    LockerId = table.Column<int>(type: "int", nullable: false),
                    MemberName = table.Column<string>(type: "nvarchar(150)", maxLength: 150, nullable: false),
                    Action = table.Column<string>(type: "nvarchar(10)", maxLength: 10, nullable: false),
                    AccessTime = table.Column<DateTime>(type: "datetime2", nullable: false),
                    CreatedDate = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedDate = table.Column<DateTime>(type: "datetime2", nullable: true),
                    IsDeleted = table.Column<bool>(type: "bit", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_LockerMgmt_AccessLogs", x => x.Id);
                    table.ForeignKey(
                        name: "FK_LockerMgmt_AccessLogs_LockerMgmt_Lockers_LockerId",
                        column: x => x.LockerId,
                        principalTable: "LockerMgmt_Lockers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "LockerMgmt_Assignments",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    LockerId = table.Column<int>(type: "int", nullable: false),
                    MemberName = table.Column<string>(type: "nvarchar(150)", maxLength: 150, nullable: false),
                    AssignedDate = table.Column<DateTime>(type: "datetime2", nullable: false),
                    ExpiryDate = table.Column<DateTime>(type: "datetime2", nullable: false),
                    CreatedDate = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedDate = table.Column<DateTime>(type: "datetime2", nullable: true),
                    IsDeleted = table.Column<bool>(type: "bit", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_LockerMgmt_Assignments", x => x.Id);
                    table.ForeignKey(
                        name: "FK_LockerMgmt_Assignments_LockerMgmt_Lockers_LockerId",
                        column: x => x.LockerId,
                        principalTable: "LockerMgmt_Lockers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "LockerMgmt_Maintenance",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    LockerId = table.Column<int>(type: "int", nullable: false),
                    Issue = table.Column<string>(type: "nvarchar(1000)", maxLength: 1000, nullable: false),
                    ReportedDate = table.Column<DateTime>(type: "datetime2", nullable: false),
                    Status = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false),
                    CreatedDate = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedDate = table.Column<DateTime>(type: "datetime2", nullable: true),
                    IsDeleted = table.Column<bool>(type: "bit", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_LockerMgmt_Maintenance", x => x.Id);
                    table.ForeignKey(
                        name: "FK_LockerMgmt_Maintenance_LockerMgmt_Lockers_LockerId",
                        column: x => x.LockerId,
                        principalTable: "LockerMgmt_Lockers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_LockerMgmt_AccessLogs_AccessTime",
                table: "LockerMgmt_AccessLogs",
                column: "AccessTime");

            migrationBuilder.CreateIndex(
                name: "IX_LockerMgmt_AccessLogs_LockerId",
                table: "LockerMgmt_AccessLogs",
                column: "LockerId");

            migrationBuilder.CreateIndex(
                name: "IX_LockerMgmt_Assignments_ExpiryDate",
                table: "LockerMgmt_Assignments",
                column: "ExpiryDate");

            migrationBuilder.CreateIndex(
                name: "IX_LockerMgmt_Assignments_LockerId",
                table: "LockerMgmt_Assignments",
                column: "LockerId");

            migrationBuilder.CreateIndex(
                name: "IX_LockerMgmt_Lockers_LockerNumber",
                table: "LockerMgmt_Lockers",
                column: "LockerNumber",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_LockerMgmt_Lockers_Status",
                table: "LockerMgmt_Lockers",
                column: "Status");

            migrationBuilder.CreateIndex(
                name: "IX_LockerMgmt_Maintenance_LockerId",
                table: "LockerMgmt_Maintenance",
                column: "LockerId");

            migrationBuilder.CreateIndex(
                name: "IX_LockerMgmt_Maintenance_Status",
                table: "LockerMgmt_Maintenance",
                column: "Status");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "LockerMgmt_AccessLogs");

            migrationBuilder.DropTable(
                name: "LockerMgmt_Assignments");

            migrationBuilder.DropTable(
                name: "LockerMgmt_Maintenance");

            migrationBuilder.DropTable(
                name: "LockerMgmt_Lockers");
        }
    }
}
