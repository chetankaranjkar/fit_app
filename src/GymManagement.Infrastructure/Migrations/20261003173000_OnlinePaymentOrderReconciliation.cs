using GymManagement.Infrastructure.Data;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace GymManagement.Infrastructure.Migrations
{
    [DbContext(typeof(ApplicationDbContext))]
    [Migration("20261003173000_OnlinePaymentOrderReconciliation")]
    public partial class OnlinePaymentOrderReconciliation : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<decimal>(
                name: "CapturedAmount",
                table: "online_payment_orders",
                type: "decimal(12,2)",
                precision: 12,
                scale: 2,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "StatusReason",
                table: "online_payment_orders",
                type: "nvarchar(300)",
                maxLength: 300,
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "MembershipPaymentTransactionId",
                table: "online_payment_orders",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "ProcessingStartedAt",
                table: "online_payment_orders",
                type: "datetime2",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "LastCheckedAt",
                table: "online_payment_orders",
                type: "datetime2",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_online_payment_orders_GatewayPaymentId",
                table: "online_payment_orders",
                column: "GatewayPaymentId",
                unique: true,
                filter: "[GatewayPaymentId] IS NOT NULL AND [IsDeleted] = 0");

            migrationBuilder.CreateIndex(
                name: "IX_online_payment_orders_Status_CreatedDate",
                table: "online_payment_orders",
                columns: new[] { "Status", "CreatedDate" });
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_online_payment_orders_GatewayPaymentId",
                table: "online_payment_orders");

            migrationBuilder.DropIndex(
                name: "IX_online_payment_orders_Status_CreatedDate",
                table: "online_payment_orders");

            migrationBuilder.DropColumn(name: "CapturedAmount", table: "online_payment_orders");
            migrationBuilder.DropColumn(name: "StatusReason", table: "online_payment_orders");
            migrationBuilder.DropColumn(name: "MembershipPaymentTransactionId", table: "online_payment_orders");
            migrationBuilder.DropColumn(name: "ProcessingStartedAt", table: "online_payment_orders");
            migrationBuilder.DropColumn(name: "LastCheckedAt", table: "online_payment_orders");
        }
    }
}
