using GymManagement.Infrastructure.Data;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace GymManagement.Infrastructure.Migrations
{
    [DbContext(typeof(ApplicationDbContext))]
    [Migration("20260619120000_AddOnlinePaymentOrders")]
    public partial class AddOnlinePaymentOrders : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "online_payment_orders",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    MembershipPaymentId = table.Column<int>(type: "int", nullable: false),
                    UserId = table.Column<int>(type: "int", nullable: false),
                    Gateway = table.Column<string>(type: "nvarchar(40)", maxLength: 40, nullable: false),
                    GatewayOrderId = table.Column<string>(type: "nvarchar(80)", maxLength: 80, nullable: false),
                    GatewayPaymentId = table.Column<string>(type: "nvarchar(80)", maxLength: 80, nullable: true),
                    Amount = table.Column<decimal>(type: "decimal(12,2)", precision: 12, scale: 2, nullable: false),
                    Currency = table.Column<string>(type: "nvarchar(8)", maxLength: 8, nullable: false),
                    Status = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false),
                    CreatedDate = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedDate = table.Column<DateTime>(type: "datetime2", nullable: true),
                    IsDeleted = table.Column<bool>(type: "bit", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_online_payment_orders", x => x.Id);
                    table.ForeignKey(
                        name: "FK_online_payment_orders_membership_payments_MembershipPaymentId",
                        column: x => x.MembershipPaymentId,
                        principalTable: "membership_payments",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_online_payment_orders_GatewayOrderId",
                table: "online_payment_orders",
                column: "GatewayOrderId",
                unique: true,
                filter: "[IsDeleted] = 0");

            migrationBuilder.CreateIndex(
                name: "IX_online_payment_orders_MembershipPaymentId",
                table: "online_payment_orders",
                column: "MembershipPaymentId");

            migrationBuilder.CreateIndex(
                name: "IX_online_payment_orders_UserId",
                table: "online_payment_orders",
                column: "UserId");
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "online_payment_orders");
        }
    }
}
