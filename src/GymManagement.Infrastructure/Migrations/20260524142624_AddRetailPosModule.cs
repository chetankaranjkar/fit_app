using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace GymManagement.Infrastructure.Migrations
{
    /// <inheritdoc />
    /// <remarks>
    /// Originally duplicated <see cref="EnterpriseCouponBilling"/> (coupon columns + invoice_coupon_usage).
    /// Kept as a no-op so existing databases that already applied EnterpriseCouponBilling can advance EF history.
    /// Retail POS schema lives in <see cref="AddRetailCatalogTables"/>.
    /// </remarks>
    public partial class AddRetailPosModule : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // No-op — see EnterpriseCouponBilling (20260521140000).
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            // No-op — do not drop columns owned by EnterpriseCouponBilling.
        }
    }
}
