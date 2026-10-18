using GymManagement.Infrastructure.Data;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace GymManagement.Infrastructure.Migrations
{
    [DbContext(typeof(ApplicationDbContext))]
    [Migration("20261019003000_LockerTransfers")]
    public partial class LockerTransfers : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "LockerMgmt_Transfers",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false).Annotation("SqlServer:Identity", "1, 1"),
                    LockerId = table.Column<int>(type: "int", nullable: false),
                    FromBranchId = table.Column<int>(type: "int", nullable: true),
                    ToBranchId = table.Column<int>(type: "int", nullable: false),
                    EffectiveDate = table.Column<DateTime>(type: "datetime2", nullable: false),
                    Reason = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: false),
                    ActingUserId = table.Column<int>(type: "int", nullable: false),
                    CreatedDate = table.Column<DateTime>(type: "datetime2", nullable: false),
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_LockerMgmt_Transfers", x => x.Id);
                    table.ForeignKey("FK_LockerMgmt_Transfers_LockerMgmt_Lockers_LockerId", x => x.LockerId, "LockerMgmt_Lockers", "Id", onDelete: ReferentialAction.Restrict);
                    table.ForeignKey("FK_LockerMgmt_Transfers_Branches_FromBranchId", x => x.FromBranchId, "Branches", "Id", onDelete: ReferentialAction.Restrict);
                    table.ForeignKey("FK_LockerMgmt_Transfers_Branches_ToBranchId", x => x.ToBranchId, "Branches", "Id", onDelete: ReferentialAction.Restrict);
                });
            migrationBuilder.CreateIndex(name: "IX_LockerMgmt_Transfers_LockerId", table: "LockerMgmt_Transfers", column: "LockerId");
            migrationBuilder.CreateIndex(name: "IX_LockerMgmt_Transfers_EffectiveDate", table: "LockerMgmt_Transfers", column: "EffectiveDate");
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable("LockerMgmt_Transfers");
        }
    }
}
