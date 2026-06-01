using GymManagement.Infrastructure.Data;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace GymManagement.Infrastructure.Migrations
{
    [DbContext(typeof(ApplicationDbContext))]
    [Migration("20260601120000_EnterpriseBillingPaymentsWaiveOff")]
    public class EnterpriseBillingPaymentsWaiveOff : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "ReceiptNumber",
                table: "membership_payment_transactions",
                type: "nvarchar(40)",
                maxLength: 40,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "Status",
                table: "membership_payment_transactions",
                type: "nvarchar(30)",
                maxLength: 30,
                nullable: false,
                defaultValue: "Completed");

            migrationBuilder.AddColumn<int>(
                name: "ModifiedByUserId",
                table: "membership_payment_transactions",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "VoidReason",
                table: "membership_payment_transactions",
                type: "nvarchar(500)",
                maxLength: 500,
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "VoidedByUserId",
                table: "membership_payment_transactions",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "VoidedDate",
                table: "membership_payment_transactions",
                type: "datetime2",
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "RefundAmount",
                table: "membership_payment_transactions",
                type: "decimal(12,2)",
                precision: 12,
                scale: 2,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "RefundReason",
                table: "membership_payment_transactions",
                type: "nvarchar(500)",
                maxLength: 500,
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "RefundedByUserId",
                table: "membership_payment_transactions",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "RefundedDate",
                table: "membership_payment_transactions",
                type: "datetime2",
                nullable: true);

            migrationBuilder.Sql(@"
                UPDATE membership_payment_transactions
                SET ReceiptNumber = 'RCP-LEGACY-' + CAST(Id AS nvarchar(20))
                WHERE ReceiptNumber = '' OR ReceiptNumber IS NULL;
            ");

            migrationBuilder.CreateIndex(
                name: "IX_membership_payment_transactions_ReceiptNumber",
                table: "membership_payment_transactions",
                column: "ReceiptNumber",
                unique: true,
                filter: "[IsDeleted] = 0");

            migrationBuilder.CreateIndex(
                name: "IX_membership_payment_transactions_Status",
                table: "membership_payment_transactions",
                column: "Status");

            migrationBuilder.CreateTable(
                name: "waive_off_requests",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    UserId = table.Column<int>(type: "int", nullable: false),
                    MembershipPaymentId = table.Column<int>(type: "int", nullable: false),
                    RequestedAmount = table.Column<decimal>(type: "decimal(12,2)", precision: 12, scale: 2, nullable: false),
                    Reason = table.Column<string>(type: "nvarchar(2000)", maxLength: 2000, nullable: false),
                    Status = table.Column<string>(type: "nvarchar(30)", maxLength: 30, nullable: false),
                    RequestedByUserId = table.Column<int>(type: "int", nullable: false),
                    RequestedDate = table.Column<DateTime>(type: "datetime2", nullable: false),
                    ApprovedByUserId = table.Column<int>(type: "int", nullable: true),
                    ApprovedDate = table.Column<DateTime>(type: "datetime2", nullable: true),
                    RejectedByUserId = table.Column<int>(type: "int", nullable: true),
                    RejectedDate = table.Column<DateTime>(type: "datetime2", nullable: true),
                    RejectionReason = table.Column<string>(type: "nvarchar(1000)", maxLength: 1000, nullable: true),
                    CreatedDate = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedDate = table.Column<DateTime>(type: "datetime2", nullable: true),
                    IsDeleted = table.Column<bool>(type: "bit", nullable: false),
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_waive_off_requests", x => x.Id);
                    table.ForeignKey(
                        name: "FK_waive_off_requests_Users_UserId",
                        column: x => x.UserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_waive_off_requests_membership_payments_MembershipPaymentId",
                        column: x => x.MembershipPaymentId,
                        principalTable: "membership_payments",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_waive_off_requests_MembershipPaymentId",
                table: "waive_off_requests",
                column: "MembershipPaymentId");

            migrationBuilder.CreateIndex(
                name: "IX_waive_off_requests_Status",
                table: "waive_off_requests",
                column: "Status");

            migrationBuilder.CreateIndex(
                name: "IX_waive_off_requests_UserId",
                table: "waive_off_requests",
                column: "UserId");

            migrationBuilder.CreateTable(
                name: "financial_audit_logs",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    EntityType = table.Column<string>(type: "nvarchar(80)", maxLength: 80, nullable: false),
                    EntityId = table.Column<int>(type: "int", nullable: false),
                    Action = table.Column<string>(type: "nvarchar(80)", maxLength: 80, nullable: false),
                    ActorUserId = table.Column<int>(type: "int", nullable: true),
                    DetailsJson = table.Column<string>(type: "nvarchar(4000)", maxLength: 4000, nullable: true),
                    MembershipPaymentId = table.Column<int>(type: "int", nullable: true),
                    UserId = table.Column<int>(type: "int", nullable: true),
                    CreatedDate = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedDate = table.Column<DateTime>(type: "datetime2", nullable: true),
                    IsDeleted = table.Column<bool>(type: "bit", nullable: false),
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_financial_audit_logs", x => x.Id);
                });

            migrationBuilder.CreateIndex(
                name: "IX_financial_audit_logs_CreatedDate",
                table: "financial_audit_logs",
                column: "CreatedDate");

            migrationBuilder.CreateIndex(
                name: "IX_financial_audit_logs_MembershipPaymentId",
                table: "financial_audit_logs",
                column: "MembershipPaymentId");

            migrationBuilder.CreateIndex(
                name: "IX_financial_audit_logs_UserId",
                table: "financial_audit_logs",
                column: "UserId");
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(name: "financial_audit_logs");
            migrationBuilder.DropTable(name: "waive_off_requests");
            migrationBuilder.DropIndex(
                name: "IX_membership_payment_transactions_Status",
                table: "membership_payment_transactions");
            migrationBuilder.DropIndex(
                name: "IX_membership_payment_transactions_ReceiptNumber",
                table: "membership_payment_transactions");
            migrationBuilder.DropColumn(name: "ReceiptNumber", table: "membership_payment_transactions");
            migrationBuilder.DropColumn(name: "Status", table: "membership_payment_transactions");
            migrationBuilder.DropColumn(name: "ModifiedByUserId", table: "membership_payment_transactions");
            migrationBuilder.DropColumn(name: "VoidReason", table: "membership_payment_transactions");
            migrationBuilder.DropColumn(name: "VoidedByUserId", table: "membership_payment_transactions");
            migrationBuilder.DropColumn(name: "VoidedDate", table: "membership_payment_transactions");
            migrationBuilder.DropColumn(name: "RefundAmount", table: "membership_payment_transactions");
            migrationBuilder.DropColumn(name: "RefundReason", table: "membership_payment_transactions");
            migrationBuilder.DropColumn(name: "RefundedByUserId", table: "membership_payment_transactions");
            migrationBuilder.DropColumn(name: "RefundedDate", table: "membership_payment_transactions");
        }
    }
}
