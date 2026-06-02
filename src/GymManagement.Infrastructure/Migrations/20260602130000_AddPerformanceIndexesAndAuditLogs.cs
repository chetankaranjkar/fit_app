using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace GymManagement.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddPerformanceIndexesAndAuditLogs : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "AuditLogs",
                columns: table => new
                {
                    Id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    UserId = table.Column<int>(type: "int", nullable: true),
                    Action = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    Entity = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    OldValue = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    NewValue = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AuditLogs", x => x.Id);
                });

            migrationBuilder.CreateIndex(
                name: "IX_AuditLogs_CreatedAt",
                table: "AuditLogs",
                column: "CreatedAt");

            migrationBuilder.CreateIndex(
                name: "IX_AuditLogs_Entity_CreatedAt",
                table: "AuditLogs",
                columns: new[] { "Entity", "CreatedAt" });

            migrationBuilder.CreateIndex(
                name: "IX_AuditLogs_UserId",
                table: "AuditLogs",
                column: "UserId");

            migrationBuilder.CreateIndex(
                name: "IX_Users_IsActive",
                table: "Users",
                column: "IsActive",
                filter: "[IsDeleted] = 0");

            migrationBuilder.CreateIndex(
                name: "IX_Users_RegistrationDate",
                table: "Users",
                column: "RegistrationDate");

            migrationBuilder.CreateIndex(
                name: "IX_Members_IsActive",
                table: "Members",
                column: "IsActive",
                filter: "[IsDeleted] = 0");

            migrationBuilder.CreateIndex(
                name: "IX_Trainer_Specialization",
                table: "Trainer",
                column: "Specialization",
                filter: "[IsDeleted] = 0");

            migrationBuilder.DropIndex(
                name: "IX_AttendanceLogs_UserId_AttendanceDate",
                table: "AttendanceLogs");

            migrationBuilder.CreateIndex(
                name: "IX_AttendanceLogs_AttendanceDate",
                table: "AttendanceLogs",
                column: "AttendanceDate");

            migrationBuilder.CreateIndex(
                name: "IX_AttendanceLogs_UserId_AttendanceDate_Unique",
                table: "AttendanceLogs",
                columns: new[] { "UserId", "AttendanceDate" },
                unique: true,
                filter: "[UserId] IS NOT NULL AND [IsDeleted] = 0");

            migrationBuilder.CreateIndex(
                name: "IX_payments_MembershipId",
                table: "payments",
                column: "MembershipId");

            migrationBuilder.CreateIndex(
                name: "IX_payments_PaymentDate",
                table: "payments",
                column: "PaymentDate");

            migrationBuilder.CreateIndex(
                name: "IX_user_memberships_UserId",
                table: "user_memberships",
                column: "UserId");

            migrationBuilder.CreateIndex(
                name: "IX_user_memberships_EndDate",
                table: "user_memberships",
                column: "EndDate");

            migrationBuilder.CreateIndex(
                name: "IX_user_memberships_Status",
                table: "user_memberships",
                column: "Status");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(name: "AuditLogs");

            migrationBuilder.DropIndex(name: "IX_Users_IsActive", table: "Users");
            migrationBuilder.DropIndex(name: "IX_Users_RegistrationDate", table: "Users");
            migrationBuilder.DropIndex(name: "IX_Members_IsActive", table: "Members");
            migrationBuilder.DropIndex(name: "IX_Trainer_Specialization", table: "Trainer");
            migrationBuilder.DropIndex(name: "IX_AttendanceLogs_AttendanceDate", table: "AttendanceLogs");
            migrationBuilder.DropIndex(
                name: "IX_AttendanceLogs_UserId_AttendanceDate_Unique",
                table: "AttendanceLogs");
            migrationBuilder.DropIndex(name: "IX_payments_MembershipId", table: "payments");
            migrationBuilder.DropIndex(name: "IX_payments_PaymentDate", table: "payments");
            migrationBuilder.DropIndex(name: "IX_user_memberships_UserId", table: "user_memberships");
            migrationBuilder.DropIndex(name: "IX_user_memberships_EndDate", table: "user_memberships");
            migrationBuilder.DropIndex(name: "IX_user_memberships_Status", table: "user_memberships");
        }
    }
}
