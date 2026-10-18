using GymManagement.Infrastructure.Data;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace GymManagement.Infrastructure.Migrations
{
    [DbContext(typeof(ApplicationDbContext))]
    [Migration("20261018230000_OperationalBranchOwnership")]
    public partial class OperationalBranchOwnership : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(name: "BranchId", table: "GymOps_Equipment", type: "int", nullable: true);
            migrationBuilder.AddColumn<int>(name: "BranchId", table: "GymOps_MaintenanceLogs", type: "int", nullable: true);
            migrationBuilder.AddColumn<int>(name: "BranchId", table: "GymOps_Expenses", type: "int", nullable: true);
            migrationBuilder.AddColumn<bool>(name: "IsOrganizationWide", table: "GymOps_Expenses", type: "bit", nullable: false, defaultValue: false);
            migrationBuilder.AddColumn<int>(name: "BranchId", table: "GymOps_CleaningLogs", type: "int", nullable: true);
            migrationBuilder.AddColumn<int>(name: "BranchId", table: "LockerMgmt_Lockers", type: "int", nullable: true);
            migrationBuilder.AddColumn<int>(name: "BranchId", table: "LockerMgmt_Assignments", type: "int", nullable: true);
            migrationBuilder.AddColumn<int>(name: "BranchId", table: "Retail_InventoryTransactions", type: "int", nullable: true);
            migrationBuilder.AddColumn<int>(name: "BranchId", table: "Retail_PosOrders", type: "int", nullable: true);
            migrationBuilder.AddColumn<int>(name: "BranchId", table: "PT_Sessions", type: "int", nullable: true);
            migrationBuilder.AddColumn<int>(name: "SellingBranchId", table: "PT_MemberPackages", type: "int", nullable: true);
            migrationBuilder.AddColumn<int>(name: "SellingBranchId", table: "PT_PackageInvoices", type: "int", nullable: true);
            migrationBuilder.AddColumn<string>(name: "AudienceScope", table: "Announcements", type: "nvarchar(32)", maxLength: 32, nullable: false, defaultValue: "OrganizationWide");

            migrationBuilder.Sql("""
                UPDATE Announcements
                SET AudienceScope = CASE WHEN BranchId IS NULL THEN N'OrganizationWide' ELSE N'SelectedBranch' END
                """);

            AddBranchFk(migrationBuilder, "GymOps_Equipment", "BranchId", "FK_GymOps_Equipment_Branches_BranchId");
            AddBranchFk(migrationBuilder, "GymOps_MaintenanceLogs", "BranchId", "FK_GymOps_MaintenanceLogs_Branches_BranchId");
            AddBranchFk(migrationBuilder, "GymOps_Expenses", "BranchId", "FK_GymOps_Expenses_Branches_BranchId");
            AddBranchFk(migrationBuilder, "GymOps_CleaningLogs", "BranchId", "FK_GymOps_CleaningLogs_Branches_BranchId");
            AddBranchFk(migrationBuilder, "LockerMgmt_Lockers", "BranchId", "FK_LockerMgmt_Lockers_Branches_BranchId");
            AddBranchFk(migrationBuilder, "LockerMgmt_Assignments", "BranchId", "FK_LockerMgmt_Assignments_Branches_BranchId");
            AddBranchFk(migrationBuilder, "Retail_InventoryTransactions", "BranchId", "FK_Retail_InventoryTransactions_Branches_BranchId");
            AddBranchFk(migrationBuilder, "Retail_PosOrders", "BranchId", "FK_Retail_PosOrders_Branches_BranchId");
            AddBranchFk(migrationBuilder, "PT_Sessions", "BranchId", "FK_PT_Sessions_Branches_BranchId");
            AddBranchFk(migrationBuilder, "PT_MemberPackages", "SellingBranchId", "FK_PT_MemberPackages_Branches_SellingBranchId");
            AddBranchFk(migrationBuilder, "PT_PackageInvoices", "SellingBranchId", "FK_PT_PackageInvoices_Branches_SellingBranchId");

            migrationBuilder.CreateIndex(name: "IX_GymOps_Equipment_BranchId", table: "GymOps_Equipment", column: "BranchId");
            migrationBuilder.CreateIndex(name: "IX_GymOps_MaintenanceLogs_BranchId", table: "GymOps_MaintenanceLogs", column: "BranchId");
            migrationBuilder.CreateIndex(name: "IX_GymOps_Expenses_BranchId", table: "GymOps_Expenses", column: "BranchId");
            migrationBuilder.CreateIndex(name: "IX_GymOps_CleaningLogs_BranchId", table: "GymOps_CleaningLogs", column: "BranchId");
            migrationBuilder.CreateIndex(name: "IX_LockerMgmt_Lockers_BranchId", table: "LockerMgmt_Lockers", column: "BranchId");
            migrationBuilder.CreateIndex(name: "IX_LockerMgmt_Assignments_BranchId", table: "LockerMgmt_Assignments", column: "BranchId");
            migrationBuilder.CreateIndex(name: "IX_Retail_InventoryTransactions_BranchId", table: "Retail_InventoryTransactions", column: "BranchId");
            migrationBuilder.CreateIndex(name: "IX_Retail_PosOrders_BranchId", table: "Retail_PosOrders", column: "BranchId");
            migrationBuilder.CreateIndex(name: "IX_PT_Sessions_BranchId", table: "PT_Sessions", column: "BranchId");
            migrationBuilder.CreateIndex(name: "IX_PT_MemberPackages_SellingBranchId", table: "PT_MemberPackages", column: "SellingBranchId");
            migrationBuilder.CreateIndex(name: "IX_PT_PackageInvoices_SellingBranchId", table: "PT_PackageInvoices", column: "SellingBranchId");

            migrationBuilder.DropIndex(name: "IX_LockerMgmt_Lockers_LockerNumber", table: "LockerMgmt_Lockers");
            migrationBuilder.CreateIndex(
                name: "IX_LockerMgmt_Lockers_BranchId_LockerNumber",
                table: "LockerMgmt_Lockers",
                columns: new[] { "BranchId", "LockerNumber" },
                unique: true,
                filter: "[IsDeleted] = 0 AND [BranchId] IS NOT NULL");
            migrationBuilder.CreateIndex(
                name: "IX_LockerMgmt_Lockers_LockerNumber",
                table: "LockerMgmt_Lockers",
                column: "LockerNumber",
                unique: true,
                filter: "[IsDeleted] = 0 AND [BranchId] IS NULL");

            migrationBuilder.CreateTable(
                name: "GymOps_EquipmentTransfers",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false).Annotation("SqlServer:Identity", "1, 1"),
                    EquipmentId = table.Column<int>(type: "int", nullable: false),
                    FromBranchId = table.Column<int>(type: "int", nullable: true),
                    ToBranchId = table.Column<int>(type: "int", nullable: false),
                    EffectiveDate = table.Column<DateTime>(type: "datetime2", nullable: false),
                    Reason = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: false),
                    ActingUserId = table.Column<int>(type: "int", nullable: false),
                    CreatedDate = table.Column<DateTime>(type: "datetime2", nullable: false),
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_GymOps_EquipmentTransfers", x => x.Id);
                    table.ForeignKey("FK_GymOps_EquipmentTransfers_GymOps_Equipment_EquipmentId", x => x.EquipmentId, "GymOps_Equipment", "Id", onDelete: ReferentialAction.Restrict);
                    table.ForeignKey("FK_GymOps_EquipmentTransfers_Branches_FromBranchId", x => x.FromBranchId, "Branches", "Id", onDelete: ReferentialAction.Restrict);
                    table.ForeignKey("FK_GymOps_EquipmentTransfers_Branches_ToBranchId", x => x.ToBranchId, "Branches", "Id", onDelete: ReferentialAction.Restrict);
                });
            migrationBuilder.CreateIndex(name: "IX_GymOps_EquipmentTransfers_EquipmentId", table: "GymOps_EquipmentTransfers", column: "EquipmentId");
            migrationBuilder.CreateIndex(name: "IX_GymOps_EquipmentTransfers_EffectiveDate", table: "GymOps_EquipmentTransfers", column: "EffectiveDate");

            migrationBuilder.CreateTable(
                name: "Retail_BranchStocks",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false).Annotation("SqlServer:Identity", "1, 1"),
                    ProductId = table.Column<int>(type: "int", nullable: false),
                    BranchId = table.Column<int>(type: "int", nullable: false),
                    Quantity = table.Column<int>(type: "int", nullable: false),
                    ReorderLevel = table.Column<int>(type: "int", nullable: false),
                    CreatedDate = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedDate = table.Column<DateTime>(type: "datetime2", nullable: true),
                    IsDeleted = table.Column<bool>(type: "bit", nullable: false, defaultValue: false),
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Retail_BranchStocks", x => x.Id);
                    table.ForeignKey("FK_Retail_BranchStocks_Retail_Products_ProductId", x => x.ProductId, "Retail_Products", "Id", onDelete: ReferentialAction.Restrict);
                    table.ForeignKey("FK_Retail_BranchStocks_Branches_BranchId", x => x.BranchId, "Branches", "Id", onDelete: ReferentialAction.Restrict);
                });
            migrationBuilder.CreateIndex(
                name: "IX_Retail_BranchStocks_ProductId_BranchId",
                table: "Retail_BranchStocks",
                columns: new[] { "ProductId", "BranchId" },
                unique: true,
                filter: "[IsDeleted] = 0");

            migrationBuilder.CreateTable(
                name: "Retail_StockTransfers",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false).Annotation("SqlServer:Identity", "1, 1"),
                    ProductId = table.Column<int>(type: "int", nullable: false),
                    FromBranchId = table.Column<int>(type: "int", nullable: false),
                    ToBranchId = table.Column<int>(type: "int", nullable: false),
                    Quantity = table.Column<int>(type: "int", nullable: false),
                    EffectiveDate = table.Column<DateTime>(type: "datetime2", nullable: false),
                    Reason = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: false),
                    ActingUserId = table.Column<int>(type: "int", nullable: false),
                    CreatedDate = table.Column<DateTime>(type: "datetime2", nullable: false),
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Retail_StockTransfers", x => x.Id);
                    table.ForeignKey("FK_Retail_StockTransfers_Retail_Products_ProductId", x => x.ProductId, "Retail_Products", "Id", onDelete: ReferentialAction.Restrict);
                    table.ForeignKey("FK_Retail_StockTransfers_Branches_FromBranchId", x => x.FromBranchId, "Branches", "Id", onDelete: ReferentialAction.Restrict);
                    table.ForeignKey("FK_Retail_StockTransfers_Branches_ToBranchId", x => x.ToBranchId, "Branches", "Id", onDelete: ReferentialAction.Restrict);
                });
            migrationBuilder.CreateIndex(name: "IX_Retail_StockTransfers_ProductId", table: "Retail_StockTransfers", column: "ProductId");
            migrationBuilder.CreateIndex(name: "IX_Retail_StockTransfers_EffectiveDate", table: "Retail_StockTransfers", column: "EffectiveDate");

            migrationBuilder.CreateTable(
                name: "PT_PackageBranchPrices",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false).Annotation("SqlServer:Identity", "1, 1"),
                    PackageId = table.Column<int>(type: "int", nullable: false),
                    BranchId = table.Column<int>(type: "int", nullable: false),
                    Price = table.Column<decimal>(type: "decimal(12,2)", nullable: false),
                    IsAvailable = table.Column<bool>(type: "bit", nullable: false, defaultValue: true),
                    CreatedDate = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedDate = table.Column<DateTime>(type: "datetime2", nullable: true),
                    IsDeleted = table.Column<bool>(type: "bit", nullable: false, defaultValue: false),
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_PT_PackageBranchPrices", x => x.Id);
                    table.ForeignKey("FK_PT_PackageBranchPrices_PT_Packages_PackageId", x => x.PackageId, "PT_Packages", "Id", onDelete: ReferentialAction.Cascade);
                    table.ForeignKey("FK_PT_PackageBranchPrices_Branches_BranchId", x => x.BranchId, "Branches", "Id", onDelete: ReferentialAction.Restrict);
                });
            migrationBuilder.CreateIndex(
                name: "IX_PT_PackageBranchPrices_PackageId_BranchId",
                table: "PT_PackageBranchPrices",
                columns: new[] { "PackageId", "BranchId" },
                unique: true,
                filter: "[IsDeleted] = 0");

            migrationBuilder.CreateTable(
                name: "BranchClosureRecords",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false).Annotation("SqlServer:Identity", "1, 1"),
                    BranchId = table.Column<int>(type: "int", nullable: false),
                    HandlingPolicy = table.Column<string>(type: "nvarchar(2000)", maxLength: 2000, nullable: false),
                    CountsSnapshot = table.Column<string>(type: "nvarchar(2000)", maxLength: 2000, nullable: false),
                    ActingUserId = table.Column<int>(type: "int", nullable: true),
                    CreatedDate = table.Column<DateTime>(type: "datetime2", nullable: false),
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_BranchClosureRecords", x => x.Id);
                    table.ForeignKey("FK_BranchClosureRecords_Branches_BranchId", x => x.BranchId, "Branches", "Id", onDelete: ReferentialAction.Restrict);
                });
            migrationBuilder.CreateIndex(name: "IX_BranchClosureRecords_BranchId", table: "BranchClosureRecords", column: "BranchId");
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable("BranchClosureRecords");
            migrationBuilder.DropTable("PT_PackageBranchPrices");
            migrationBuilder.DropTable("Retail_StockTransfers");
            migrationBuilder.DropTable("Retail_BranchStocks");
            migrationBuilder.DropTable("GymOps_EquipmentTransfers");

            migrationBuilder.DropIndex(name: "IX_LockerMgmt_Lockers_BranchId_LockerNumber", table: "LockerMgmt_Lockers");
            migrationBuilder.DropIndex(name: "IX_LockerMgmt_Lockers_LockerNumber", table: "LockerMgmt_Lockers");
            migrationBuilder.CreateIndex(
                name: "IX_LockerMgmt_Lockers_LockerNumber",
                table: "LockerMgmt_Lockers",
                column: "LockerNumber",
                unique: true,
                filter: "[IsDeleted] = 0");

            migrationBuilder.DropIndex(name: "IX_GymOps_Equipment_BranchId", table: "GymOps_Equipment");
            migrationBuilder.DropIndex(name: "IX_GymOps_MaintenanceLogs_BranchId", table: "GymOps_MaintenanceLogs");
            migrationBuilder.DropIndex(name: "IX_GymOps_Expenses_BranchId", table: "GymOps_Expenses");
            migrationBuilder.DropIndex(name: "IX_GymOps_CleaningLogs_BranchId", table: "GymOps_CleaningLogs");
            migrationBuilder.DropIndex(name: "IX_LockerMgmt_Lockers_BranchId", table: "LockerMgmt_Lockers");
            migrationBuilder.DropIndex(name: "IX_LockerMgmt_Assignments_BranchId", table: "LockerMgmt_Assignments");
            migrationBuilder.DropIndex(name: "IX_Retail_InventoryTransactions_BranchId", table: "Retail_InventoryTransactions");
            migrationBuilder.DropIndex(name: "IX_Retail_PosOrders_BranchId", table: "Retail_PosOrders");
            migrationBuilder.DropIndex(name: "IX_PT_Sessions_BranchId", table: "PT_Sessions");
            migrationBuilder.DropIndex(name: "IX_PT_MemberPackages_SellingBranchId", table: "PT_MemberPackages");
            migrationBuilder.DropIndex(name: "IX_PT_PackageInvoices_SellingBranchId", table: "PT_PackageInvoices");

            DropBranchFk(migrationBuilder, "GymOps_Equipment", "FK_GymOps_Equipment_Branches_BranchId");
            DropBranchFk(migrationBuilder, "GymOps_MaintenanceLogs", "FK_GymOps_MaintenanceLogs_Branches_BranchId");
            DropBranchFk(migrationBuilder, "GymOps_Expenses", "FK_GymOps_Expenses_Branches_BranchId");
            DropBranchFk(migrationBuilder, "GymOps_CleaningLogs", "FK_GymOps_CleaningLogs_Branches_BranchId");
            DropBranchFk(migrationBuilder, "LockerMgmt_Lockers", "FK_LockerMgmt_Lockers_Branches_BranchId");
            DropBranchFk(migrationBuilder, "LockerMgmt_Assignments", "FK_LockerMgmt_Assignments_Branches_BranchId");
            DropBranchFk(migrationBuilder, "Retail_InventoryTransactions", "FK_Retail_InventoryTransactions_Branches_BranchId");
            DropBranchFk(migrationBuilder, "Retail_PosOrders", "FK_Retail_PosOrders_Branches_BranchId");
            DropBranchFk(migrationBuilder, "PT_Sessions", "FK_PT_Sessions_Branches_BranchId");
            DropBranchFk(migrationBuilder, "PT_MemberPackages", "FK_PT_MemberPackages_Branches_SellingBranchId");
            DropBranchFk(migrationBuilder, "PT_PackageInvoices", "FK_PT_PackageInvoices_Branches_SellingBranchId");

            migrationBuilder.DropColumn("BranchId", "GymOps_Equipment");
            migrationBuilder.DropColumn("BranchId", "GymOps_MaintenanceLogs");
            migrationBuilder.DropColumn("BranchId", "GymOps_Expenses");
            migrationBuilder.DropColumn("IsOrganizationWide", "GymOps_Expenses");
            migrationBuilder.DropColumn("BranchId", "GymOps_CleaningLogs");
            migrationBuilder.DropColumn("BranchId", "LockerMgmt_Lockers");
            migrationBuilder.DropColumn("BranchId", "LockerMgmt_Assignments");
            migrationBuilder.DropColumn("BranchId", "Retail_InventoryTransactions");
            migrationBuilder.DropColumn("BranchId", "Retail_PosOrders");
            migrationBuilder.DropColumn("BranchId", "PT_Sessions");
            migrationBuilder.DropColumn("SellingBranchId", "PT_MemberPackages");
            migrationBuilder.DropColumn("SellingBranchId", "PT_PackageInvoices");
            migrationBuilder.DropColumn("AudienceScope", "Announcements");
        }

        private static void AddBranchFk(MigrationBuilder migrationBuilder, string table, string column, string name) =>
            migrationBuilder.AddForeignKey(name, table, column, "Branches", principalColumn: "Id", onDelete: ReferentialAction.Restrict);

        private static void DropBranchFk(MigrationBuilder migrationBuilder, string table, string name) =>
            migrationBuilder.DropForeignKey(name, table);
    }
}
