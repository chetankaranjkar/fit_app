using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace GymManagement.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddCouponModule : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "CouponCode",
                table: "membership_payments",
                type: "nvarchar(50)",
                maxLength: 50,
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "CouponDiscountAmount",
                table: "membership_payments",
                type: "decimal(12,2)",
                precision: 12,
                scale: 2,
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<int>(
                name: "CouponId",
                table: "membership_payments",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "CouponCode",
                table: "Invoices",
                type: "nvarchar(50)",
                maxLength: 50,
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "CouponDiscountAmount",
                table: "Invoices",
                type: "decimal(10,2)",
                precision: 10,
                scale: 2,
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.CreateTable(
                name: "Coupons",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    CouponCode = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    CouponName = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    Description = table.Column<string>(type: "nvarchar(1000)", maxLength: 1000, nullable: true),
                    DiscountType = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false),
                    DiscountValue = table.Column<decimal>(type: "decimal(12,2)", precision: 12, scale: 2, nullable: false),
                    MinimumInvoiceAmount = table.Column<decimal>(type: "decimal(12,2)", precision: 12, scale: 2, nullable: false),
                    MaximumDiscountAmount = table.Column<decimal>(type: "decimal(12,2)", precision: 12, scale: 2, nullable: true),
                    ValidFrom = table.Column<DateTime>(type: "datetime2", nullable: false),
                    ValidTo = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UsageLimit = table.Column<int>(type: "int", nullable: false),
                    UsedCount = table.Column<int>(type: "int", nullable: false),
                    PerUserLimit = table.Column<int>(type: "int", nullable: false),
                    ApplicableMembershipIds = table.Column<string>(type: "nvarchar(2000)", maxLength: 2000, nullable: true),
                    ApplicableBranchIds = table.Column<string>(type: "nvarchar(2000)", maxLength: 2000, nullable: true),
                    ApplicableUserTypes = table.Column<string>(type: "nvarchar(2000)", maxLength: 2000, nullable: true),
                    Status = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false),
                    CreatedByUserId = table.Column<int>(type: "int", nullable: true),
                    OrganizationId = table.Column<int>(type: "int", nullable: true),
                    CreatedDate = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedDate = table.Column<DateTime>(type: "datetime2", nullable: true),
                    IsDeleted = table.Column<bool>(type: "bit", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Coupons", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Coupons_Organizations_OrganizationId",
                        column: x => x.OrganizationId,
                        principalTable: "Organizations",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_Coupons_Users_CreatedByUserId",
                        column: x => x.CreatedByUserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                });

            migrationBuilder.CreateTable(
                name: "CouponUsages",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    CouponId = table.Column<int>(type: "int", nullable: false),
                    UserId = table.Column<int>(type: "int", nullable: false),
                    MembershipPaymentId = table.Column<int>(type: "int", nullable: false),
                    InvoiceId = table.Column<int>(type: "int", nullable: true),
                    DiscountAmount = table.Column<decimal>(type: "decimal(12,2)", precision: 12, scale: 2, nullable: false),
                    UsedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    CreatedDate = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedDate = table.Column<DateTime>(type: "datetime2", nullable: true),
                    IsDeleted = table.Column<bool>(type: "bit", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_CouponUsages", x => x.Id);
                    table.ForeignKey(
                        name: "FK_CouponUsages_Coupons_CouponId",
                        column: x => x.CouponId,
                        principalTable: "Coupons",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_CouponUsages_Invoices_InvoiceId",
                        column: x => x.InvoiceId,
                        principalTable: "Invoices",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_CouponUsages_Users_UserId",
                        column: x => x.UserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_CouponUsages_membership_payments_MembershipPaymentId",
                        column: x => x.MembershipPaymentId,
                        principalTable: "membership_payments",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_Coupons_CouponCode",
                table: "Coupons",
                column: "CouponCode",
                unique: true,
                filter: "[IsDeleted] = 0");

            migrationBuilder.CreateIndex(
                name: "IX_Coupons_CreatedByUserId",
                table: "Coupons",
                column: "CreatedByUserId");

            migrationBuilder.CreateIndex(
                name: "IX_Coupons_OrganizationId",
                table: "Coupons",
                column: "OrganizationId");

            migrationBuilder.CreateIndex(
                name: "IX_Coupons_Status",
                table: "Coupons",
                column: "Status");

            migrationBuilder.CreateIndex(
                name: "IX_Coupons_ValidTo",
                table: "Coupons",
                column: "ValidTo");

            migrationBuilder.CreateIndex(
                name: "IX_CouponUsages_CouponId_UserId",
                table: "CouponUsages",
                columns: new[] { "CouponId", "UserId" });

            migrationBuilder.CreateIndex(
                name: "IX_CouponUsages_InvoiceId",
                table: "CouponUsages",
                column: "InvoiceId");

            migrationBuilder.CreateIndex(
                name: "IX_CouponUsages_MembershipPaymentId",
                table: "CouponUsages",
                column: "MembershipPaymentId");

            migrationBuilder.CreateIndex(
                name: "IX_CouponUsages_UserId",
                table: "CouponUsages",
                column: "UserId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "CouponUsages");

            migrationBuilder.DropTable(
                name: "Coupons");

            migrationBuilder.DropColumn(
                name: "CouponCode",
                table: "membership_payments");

            migrationBuilder.DropColumn(
                name: "CouponDiscountAmount",
                table: "membership_payments");

            migrationBuilder.DropColumn(
                name: "CouponId",
                table: "membership_payments");

            migrationBuilder.DropColumn(
                name: "CouponCode",
                table: "Invoices");

            migrationBuilder.DropColumn(
                name: "CouponDiscountAmount",
                table: "Invoices");
        }
    }
}
