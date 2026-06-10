using GymManagement.Infrastructure.Data;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace GymManagement.Infrastructure.Migrations
{
    [DbContext(typeof(ApplicationDbContext))]
    [Migration("20260605120000_LockerNumberUniqueAmongActive")]
    public partial class LockerNumberUniqueAmongActive : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_LockerMgmt_Lockers_LockerNumber",
                table: "LockerMgmt_Lockers");

            migrationBuilder.CreateIndex(
                name: "IX_LockerMgmt_Lockers_LockerNumber",
                table: "LockerMgmt_Lockers",
                column: "LockerNumber",
                unique: true,
                filter: "[IsDeleted] = 0");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_LockerMgmt_Lockers_LockerNumber",
                table: "LockerMgmt_Lockers");

            migrationBuilder.CreateIndex(
                name: "IX_LockerMgmt_Lockers_LockerNumber",
                table: "LockerMgmt_Lockers",
                column: "LockerNumber",
                unique: true);
        }
    }
}
