using GymManagement.Infrastructure.Data;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace GymManagement.Infrastructure.Migrations
{
    /// <summary>
    /// Expand phase only. New branch columns are nullable. Existing people are not assigned to a branch.
    /// Coupon scope is backfilled from the coupon's own branch list, which is authoritative configuration.
    /// </summary>
    [DbContext(typeof(ApplicationDbContext))]
    [Migration("20261018180000_BranchOperationsExpand")]
    public partial class BranchOperationsExpand : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(name: "HomeBranchId", table: "Users", type: "int", nullable: true);
            migrationBuilder.CreateIndex(name: "IX_Users_HomeBranchId", table: "Users", column: "HomeBranchId");
            migrationBuilder.AddForeignKey(
                name: "FK_Users_Branches_HomeBranchId",
                table: "Users",
                column: "HomeBranchId",
                principalTable: "Branches",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddColumn<int>(name: "InterestedBranchId", table: "gym_leads", type: "int", nullable: true);
            migrationBuilder.CreateIndex(name: "IX_gym_leads_InterestedBranchId", table: "gym_leads", column: "InterestedBranchId");
            migrationBuilder.AddForeignKey(
                name: "FK_gym_leads_Branches_InterestedBranchId",
                table: "gym_leads",
                column: "InterestedBranchId",
                principalTable: "Branches",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddColumn<int>(name: "SellingBranchId", table: "user_memberships", type: "int", nullable: true);
            migrationBuilder.AddColumn<decimal>(name: "AgreedPrice", table: "user_memberships", type: "decimal(18,2)", nullable: true);
            migrationBuilder.AddColumn<string>(name: "AccessScope", table: "user_memberships", type: "nvarchar(32)", maxLength: 32, nullable: true);
            migrationBuilder.CreateIndex(name: "IX_user_memberships_SellingBranchId", table: "user_memberships", column: "SellingBranchId");
            migrationBuilder.AddForeignKey(
                name: "FK_user_memberships_Branches_SellingBranchId",
                table: "user_memberships",
                column: "SellingBranchId",
                principalTable: "Branches",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddColumn<int>(name: "SellingBranchId", table: "membership_payments", type: "int", nullable: true);
            migrationBuilder.CreateIndex(name: "IX_membership_payments_SellingBranchId", table: "membership_payments", column: "SellingBranchId");
            migrationBuilder.AddForeignKey(
                name: "FK_membership_payments_Branches_SellingBranchId",
                table: "membership_payments",
                column: "SellingBranchId",
                principalTable: "Branches",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddColumn<int>(name: "BranchId", table: "AttendanceLogs", type: "int", nullable: true);
            migrationBuilder.CreateIndex(name: "IX_AttendanceLogs_BranchId", table: "AttendanceLogs", column: "BranchId");
            migrationBuilder.AddForeignKey(
                name: "FK_AttendanceLogs_Branches_BranchId",
                table: "AttendanceLogs",
                column: "BranchId",
                principalTable: "Branches",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddColumn<string>(
                name: "BranchScope",
                table: "Coupons",
                type: "nvarchar(32)",
                maxLength: 32,
                nullable: false,
                defaultValue: "AllBranches");
            migrationBuilder.Sql("""
                UPDATE Coupons
                SET BranchScope = CASE
                    WHEN ApplicableBranchIds IS NULL OR LTRIM(RTRIM(ApplicableBranchIds)) IN (N'', N'[]') THEN N'AllBranches'
                    ELSE N'SelectedBranches'
                END
                """);

            migrationBuilder.CreateTable(
                name: "UserBranchAssignments",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false).Annotation("SqlServer:Identity", "1, 1"),
                    UserId = table.Column<int>(type: "int", nullable: false),
                    BranchId = table.Column<int>(type: "int", nullable: false),
                    CreatedDate = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedDate = table.Column<DateTime>(type: "datetime2", nullable: true),
                    IsDeleted = table.Column<bool>(type: "bit", nullable: false, defaultValue: false),
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_UserBranchAssignments", x => x.Id);
                    table.ForeignKey("FK_UserBranchAssignments_Users_UserId", x => x.UserId, "Users", "Id", onDelete: ReferentialAction.Cascade);
                    table.ForeignKey("FK_UserBranchAssignments_Branches_BranchId", x => x.BranchId, "Branches", "Id", onDelete: ReferentialAction.Restrict);
                });
            migrationBuilder.CreateIndex(
                name: "IX_UserBranchAssignments_UserId_BranchId",
                table: "UserBranchAssignments",
                columns: new[] { "UserId", "BranchId" },
                unique: true,
                filter: "[IsDeleted] = 0");

            migrationBuilder.CreateTable(
                name: "MembershipPlanBranchPrices",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false).Annotation("SqlServer:Identity", "1, 1"),
                    PlanId = table.Column<int>(type: "int", nullable: false),
                    BranchId = table.Column<int>(type: "int", nullable: false),
                    Price = table.Column<decimal>(type: "decimal(18,2)", nullable: false),
                    IsAvailable = table.Column<bool>(type: "bit", nullable: false, defaultValue: true),
                    CreatedDate = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedDate = table.Column<DateTime>(type: "datetime2", nullable: true),
                    IsDeleted = table.Column<bool>(type: "bit", nullable: false, defaultValue: false),
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_MembershipPlanBranchPrices", x => x.Id);
                    table.ForeignKey("FK_MembershipPlanBranchPrices_membership_plans_PlanId", x => x.PlanId, "membership_plans", "Id", onDelete: ReferentialAction.Cascade);
                    table.ForeignKey("FK_MembershipPlanBranchPrices_Branches_BranchId", x => x.BranchId, "Branches", "Id", onDelete: ReferentialAction.Restrict);
                });
            migrationBuilder.CreateIndex(
                name: "IX_MembershipPlanBranchPrices_PlanId_BranchId",
                table: "MembershipPlanBranchPrices",
                columns: new[] { "PlanId", "BranchId" },
                unique: true,
                filter: "[IsDeleted] = 0");

            migrationBuilder.CreateTable(
                name: "UserMembershipAccessBranches",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false).Annotation("SqlServer:Identity", "1, 1"),
                    UserMembershipId = table.Column<int>(type: "int", nullable: false),
                    BranchId = table.Column<int>(type: "int", nullable: false),
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_UserMembershipAccessBranches", x => x.Id);
                    table.ForeignKey("FK_UserMembershipAccessBranches_user_memberships_UserMembershipId", x => x.UserMembershipId, "user_memberships", "Id", onDelete: ReferentialAction.Cascade);
                    table.ForeignKey("FK_UserMembershipAccessBranches_Branches_BranchId", x => x.BranchId, "Branches", "Id", onDelete: ReferentialAction.Restrict);
                });
            migrationBuilder.CreateIndex(
                name: "IX_UserMembershipAccessBranches_UserMembershipId_BranchId",
                table: "UserMembershipAccessBranches",
                columns: new[] { "UserMembershipId", "BranchId" },
                unique: true);

            migrationBuilder.CreateTable(
                name: "MembershipBillingPeriods",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false).Annotation("SqlServer:Identity", "1, 1"),
                    UserMembershipId = table.Column<int>(type: "int", nullable: false),
                    MembershipPaymentId = table.Column<int>(type: "int", nullable: true),
                    SellingBranchId = table.Column<int>(type: "int", nullable: true),
                    AgreedPrice = table.Column<decimal>(type: "decimal(18,2)", nullable: false),
                    FeeType = table.Column<string>(type: "nvarchar(32)", maxLength: 32, nullable: false),
                    PeriodStart = table.Column<DateTime>(type: "datetime2", nullable: false),
                    PeriodEnd = table.Column<DateTime>(type: "datetime2", nullable: false),
                    CreatedDate = table.Column<DateTime>(type: "datetime2", nullable: false),
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_MembershipBillingPeriods", x => x.Id);
                    table.ForeignKey("FK_MembershipBillingPeriods_user_memberships_UserMembershipId", x => x.UserMembershipId, "user_memberships", "Id", onDelete: ReferentialAction.Cascade);
                    table.ForeignKey("FK_MembershipBillingPeriods_membership_payments_MembershipPaymentId", x => x.MembershipPaymentId, "membership_payments", "Id", onDelete: ReferentialAction.Restrict);
                    table.ForeignKey("FK_MembershipBillingPeriods_Branches_SellingBranchId", x => x.SellingBranchId, "Branches", "Id", onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "MemberBranchTransfers",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false).Annotation("SqlServer:Identity", "1, 1"),
                    UserId = table.Column<int>(type: "int", nullable: false),
                    FromBranchId = table.Column<int>(type: "int", nullable: true),
                    ToBranchId = table.Column<int>(type: "int", nullable: false),
                    EffectiveDate = table.Column<DateTime>(type: "datetime2", nullable: false),
                    Reason = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: false),
                    ActingUserId = table.Column<int>(type: "int", nullable: false),
                    AccessDecision = table.Column<string>(type: "nvarchar(32)", maxLength: 32, nullable: false),
                    FinancialDecision = table.Column<string>(type: "nvarchar(32)", maxLength: 32, nullable: false, defaultValue: "None"),
                    CreatedDate = table.Column<DateTime>(type: "datetime2", nullable: false),
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_MemberBranchTransfers", x => x.Id);
                    table.ForeignKey("FK_MemberBranchTransfers_Users_UserId", x => x.UserId, "Users", "Id", onDelete: ReferentialAction.Restrict);
                    table.ForeignKey("FK_MemberBranchTransfers_Branches_FromBranchId", x => x.FromBranchId, "Branches", "Id", onDelete: ReferentialAction.Restrict);
                    table.ForeignKey("FK_MemberBranchTransfers_Branches_ToBranchId", x => x.ToBranchId, "Branches", "Id", onDelete: ReferentialAction.Restrict);
                    table.ForeignKey("FK_MemberBranchTransfers_Users_ActingUserId", x => x.ActingUserId, "Users", "Id", onDelete: ReferentialAction.Restrict);
                });
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable("MemberBranchTransfers");
            migrationBuilder.DropTable("MembershipBillingPeriods");
            migrationBuilder.DropTable("UserMembershipAccessBranches");
            migrationBuilder.DropTable("MembershipPlanBranchPrices");
            migrationBuilder.DropTable("UserBranchAssignments");
            migrationBuilder.DropColumn("BranchScope", "Coupons");
            migrationBuilder.DropForeignKey("FK_AttendanceLogs_Branches_BranchId", "AttendanceLogs");
            migrationBuilder.DropIndex("IX_AttendanceLogs_BranchId", "AttendanceLogs");
            migrationBuilder.DropColumn("BranchId", "AttendanceLogs");
            migrationBuilder.DropForeignKey("FK_membership_payments_Branches_SellingBranchId", "membership_payments");
            migrationBuilder.DropIndex("IX_membership_payments_SellingBranchId", "membership_payments");
            migrationBuilder.DropColumn("SellingBranchId", "membership_payments");
            migrationBuilder.DropForeignKey("FK_user_memberships_Branches_SellingBranchId", "user_memberships");
            migrationBuilder.DropIndex("IX_user_memberships_SellingBranchId", "user_memberships");
            migrationBuilder.DropColumn("AccessScope", "user_memberships");
            migrationBuilder.DropColumn("AgreedPrice", "user_memberships");
            migrationBuilder.DropColumn("SellingBranchId", "user_memberships");
            migrationBuilder.DropForeignKey("FK_gym_leads_Branches_InterestedBranchId", "gym_leads");
            migrationBuilder.DropIndex("IX_gym_leads_InterestedBranchId", "gym_leads");
            migrationBuilder.DropColumn("InterestedBranchId", "gym_leads");
            migrationBuilder.DropForeignKey("FK_Users_Branches_HomeBranchId", "Users");
            migrationBuilder.DropIndex("IX_Users_HomeBranchId", "Users");
            migrationBuilder.DropColumn("HomeBranchId", "Users");
        }
    }
}
