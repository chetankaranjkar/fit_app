using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace GymManagement.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class MembershipLifecycleAndUniqueActiveMembership : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_user_memberships_UserId",
                table: "user_memberships");

            migrationBuilder.CreateTable(
                name: "membership_approval_requests",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    MembershipId = table.Column<int>(type: "int", nullable: false),
                    MemberId = table.Column<int>(type: "int", nullable: false),
                    RequestType = table.Column<string>(type: "nvarchar(40)", maxLength: 40, nullable: false),
                    Status = table.Column<string>(type: "nvarchar(30)", maxLength: 30, nullable: false),
                    Reason = table.Column<string>(type: "nvarchar(2000)", maxLength: 2000, nullable: false),
                    RequestedByUserId = table.Column<int>(type: "int", nullable: false),
                    RequestedDate = table.Column<DateTime>(type: "datetime2", nullable: false),
                    ApprovedByUserId = table.Column<int>(type: "int", nullable: true),
                    ApprovedDate = table.Column<DateTime>(type: "datetime2", nullable: true),
                    RejectedByUserId = table.Column<int>(type: "int", nullable: true),
                    RejectedDate = table.Column<DateTime>(type: "datetime2", nullable: true),
                    AdminRemarks = table.Column<string>(type: "nvarchar(1000)", maxLength: 1000, nullable: true),
                    PreviousMembershipStatus = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: true),
                    ProposedChangesJson = table.Column<string>(type: "nvarchar(4000)", maxLength: 4000, nullable: true),
                    CreatedDate = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedDate = table.Column<DateTime>(type: "datetime2", nullable: true),
                    IsDeleted = table.Column<bool>(type: "bit", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_membership_approval_requests", x => x.Id);
                    table.ForeignKey(
                        name: "FK_membership_approval_requests_Users_MemberId",
                        column: x => x.MemberId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_membership_approval_requests_Users_RequestedByUserId",
                        column: x => x.RequestedByUserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_membership_approval_requests_user_memberships_MembershipId",
                        column: x => x.MembershipId,
                        principalTable: "user_memberships",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "membership_audit_logs",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    MembershipId = table.Column<int>(type: "int", nullable: false),
                    Action = table.Column<string>(type: "nvarchar(60)", maxLength: 60, nullable: false),
                    OldValue = table.Column<string>(type: "nvarchar(4000)", maxLength: 4000, nullable: true),
                    NewValue = table.Column<string>(type: "nvarchar(4000)", maxLength: 4000, nullable: true),
                    PerformedByUserId = table.Column<int>(type: "int", nullable: false),
                    PerformedDate = table.Column<DateTime>(type: "datetime2", nullable: false),
                    IPAddress = table.Column<string>(type: "nvarchar(64)", maxLength: 64, nullable: true),
                    DeviceInfo = table.Column<string>(type: "nvarchar(512)", maxLength: 512, nullable: true),
                    CreatedDate = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedDate = table.Column<DateTime>(type: "datetime2", nullable: true),
                    IsDeleted = table.Column<bool>(type: "bit", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_membership_audit_logs", x => x.Id);
                    table.ForeignKey(
                        name: "FK_membership_audit_logs_Users_PerformedByUserId",
                        column: x => x.PerformedByUserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_membership_audit_logs_user_memberships_MembershipId",
                        column: x => x.MembershipId,
                        principalTable: "user_memberships",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.Sql(
                """
                IF NOT EXISTS (SELECT 1 FROM [membership_status] WHERE [Name] = N'VoidPending')
                    INSERT INTO [membership_status] ([Name]) VALUES (N'VoidPending');
                IF NOT EXISTS (SELECT 1 FROM [membership_status] WHERE [Name] = N'Voided')
                    INSERT INTO [membership_status] ([Name]) VALUES (N'Voided');
                IF NOT EXISTS (SELECT 1 FROM [membership_status] WHERE [Name] = N'Transferred')
                    INSERT INTO [membership_status] ([Name]) VALUES (N'Transferred');

                ;WITH DupActive AS (
                    SELECT Id, ROW_NUMBER() OVER (PARTITION BY UserId ORDER BY StartDate DESC, Id DESC) AS rn
                    FROM user_memberships
                    WHERE IsDeleted = 0 AND Status = N'Active'
                )
                UPDATE um SET Status = N'Expired', UpdatedDate = GETUTCDATE()
                FROM user_memberships um
                INNER JOIN DupActive d ON d.Id = um.Id
                WHERE d.rn > 1;
                """);

            migrationBuilder.CreateIndex(
                name: "IX_user_memberships_one_active_per_user",
                table: "user_memberships",
                column: "UserId",
                unique: true,
                filter: "[IsDeleted] = 0 AND [Status] = N'Active'");

            migrationBuilder.CreateIndex(
                name: "IX_membership_approval_requests_MemberId",
                table: "membership_approval_requests",
                column: "MemberId");

            migrationBuilder.CreateIndex(
                name: "IX_membership_approval_requests_MembershipId",
                table: "membership_approval_requests",
                column: "MembershipId");

            migrationBuilder.CreateIndex(
                name: "IX_membership_approval_requests_RequestedByUserId",
                table: "membership_approval_requests",
                column: "RequestedByUserId");

            migrationBuilder.CreateIndex(
                name: "IX_membership_approval_requests_RequestedDate",
                table: "membership_approval_requests",
                column: "RequestedDate");

            migrationBuilder.CreateIndex(
                name: "IX_membership_approval_requests_Status",
                table: "membership_approval_requests",
                column: "Status");

            migrationBuilder.CreateIndex(
                name: "IX_membership_audit_logs_MembershipId",
                table: "membership_audit_logs",
                column: "MembershipId");

            migrationBuilder.CreateIndex(
                name: "IX_membership_audit_logs_PerformedByUserId",
                table: "membership_audit_logs",
                column: "PerformedByUserId");

            migrationBuilder.CreateIndex(
                name: "IX_membership_audit_logs_PerformedDate",
                table: "membership_audit_logs",
                column: "PerformedDate");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "membership_approval_requests");

            migrationBuilder.DropTable(
                name: "membership_audit_logs");

            migrationBuilder.DropIndex(
                name: "IX_user_memberships_one_active_per_user",
                table: "user_memberships");

            migrationBuilder.CreateIndex(
                name: "IX_user_memberships_UserId",
                table: "user_memberships",
                column: "UserId");
        }
    }
}
