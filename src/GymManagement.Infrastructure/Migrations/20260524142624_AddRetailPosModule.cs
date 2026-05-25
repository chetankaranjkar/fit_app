using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace GymManagement.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddRetailPosModule : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<DateTime>(
                name: "CouponAppliedAt",
                table: "membership_payments",
                type: "datetime2",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "CouponDiscountType",
                table: "membership_payments",
                type: "nvarchar(20)",
                maxLength: 20,
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "CouponDiscountValue",
                table: "membership_payments",
                type: "decimal(12,2)",
                precision: 12,
                scale: 2,
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "CouponLocked",
                table: "membership_payments",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<decimal>(
                name: "FinalBillAmount",
                table: "membership_payments",
                type: "decimal(12,2)",
                precision: 12,
                scale: 2,
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<decimal>(
                name: "OriginalAmount",
                table: "membership_payments",
                type: "decimal(12,2)",
                precision: 12,
                scale: 2,
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<bool>(
                name: "AllowMultipleUsage",
                table: "Coupons",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<bool>(
                name: "AllowSameInvoiceMultipleUsage",
                table: "Coupons",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<bool>(
                name: "AllowSameUserMultipleUsage",
                table: "Coupons",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<bool>(
                name: "ApplicableOnPartialPayment",
                table: "Coupons",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<bool>(
                name: "FirstTimeUserOnly",
                table: "Coupons",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.CreateTable(
                name: "invoice_coupon_usage",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    CouponId = table.Column<int>(type: "int", nullable: false),
                    InvoiceId = table.Column<int>(type: "int", nullable: true),
                    UserId = table.Column<int>(type: "int", nullable: false),
                    MembershipPaymentId = table.Column<int>(type: "int", nullable: false),
                    OriginalAmount = table.Column<decimal>(type: "decimal(12,2)", precision: 12, scale: 2, nullable: false),
                    DiscountAmount = table.Column<decimal>(type: "decimal(12,2)", precision: 12, scale: 2, nullable: false),
                    FinalAmount = table.Column<decimal>(type: "decimal(12,2)", precision: 12, scale: 2, nullable: false),
                    UsageType = table.Column<string>(type: "nvarchar(30)", maxLength: 30, nullable: false),
                    Locked = table.Column<bool>(type: "bit", nullable: false),
                    AppliedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    CreatedDate = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedDate = table.Column<DateTime>(type: "datetime2", nullable: true),
                    IsDeleted = table.Column<bool>(type: "bit", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_invoice_coupon_usage", x => x.Id);
                    table.ForeignKey(
                        name: "FK_invoice_coupon_usage_Coupons_CouponId",
                        column: x => x.CouponId,
                        principalTable: "Coupons",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_invoice_coupon_usage_Invoices_InvoiceId",
                        column: x => x.InvoiceId,
                        principalTable: "Invoices",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_invoice_coupon_usage_Users_UserId",
                        column: x => x.UserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_invoice_coupon_usage_membership_payments_MembershipPaymentId",
                        column: x => x.MembershipPaymentId,
                        principalTable: "membership_payments",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_invoice_coupon_usage_CouponId",
                table: "invoice_coupon_usage",
                column: "CouponId");

            migrationBuilder.CreateIndex(
                name: "IX_invoice_coupon_usage_InvoiceId",
                table: "invoice_coupon_usage",
                column: "InvoiceId");

            migrationBuilder.CreateIndex(
                name: "IX_invoice_coupon_usage_MembershipPaymentId",
                table: "invoice_coupon_usage",
                column: "MembershipPaymentId");

            migrationBuilder.CreateIndex(
                name: "IX_invoice_coupon_usage_UserId",
                table: "invoice_coupon_usage",
                column: "UserId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "invoice_coupon_usage");

            migrationBuilder.DropColumn(
                name: "CouponAppliedAt",
                table: "membership_payments");

            migrationBuilder.DropColumn(
                name: "CouponDiscountType",
                table: "membership_payments");

            migrationBuilder.DropColumn(
                name: "CouponDiscountValue",
                table: "membership_payments");

            migrationBuilder.DropColumn(
                name: "CouponLocked",
                table: "membership_payments");

            migrationBuilder.DropColumn(
                name: "FinalBillAmount",
                table: "membership_payments");

            migrationBuilder.DropColumn(
                name: "OriginalAmount",
                table: "membership_payments");

            migrationBuilder.DropColumn(
                name: "AllowMultipleUsage",
                table: "Coupons");

            migrationBuilder.DropColumn(
                name: "AllowSameInvoiceMultipleUsage",
                table: "Coupons");

            migrationBuilder.DropColumn(
                name: "AllowSameUserMultipleUsage",
                table: "Coupons");

            migrationBuilder.DropColumn(
                name: "ApplicableOnPartialPayment",
                table: "Coupons");

            migrationBuilder.DropColumn(
                name: "FirstTimeUserOnly",
                table: "Coupons");
        }
    }
}
