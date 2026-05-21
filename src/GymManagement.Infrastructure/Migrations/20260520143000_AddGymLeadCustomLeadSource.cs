using GymManagement.Infrastructure.Data;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace GymManagement.Infrastructure.Migrations
{
    [DbContext(typeof(ApplicationDbContext))]
    [Migration("20260520143000_AddGymLeadCustomLeadSource")]
    public class AddGymLeadCustomLeadSource : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_gym_leads_LeadSource",
                table: "gym_leads");

            migrationBuilder.AlterColumn<string>(
                name: "LeadSource",
                table: "gym_leads",
                type: "nvarchar(100)",
                maxLength: 100,
                nullable: true,
                oldClrType: typeof(string),
                oldType: "nvarchar(120)",
                oldMaxLength: 120,
                oldNullable: true);

            migrationBuilder.AddColumn<string>(
                name: "CustomLeadSource",
                table: "gym_leads",
                type: "nvarchar(150)",
                maxLength: 150,
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_gym_leads_LeadSource",
                table: "gym_leads",
                column: "LeadSource");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_gym_leads_LeadSource",
                table: "gym_leads");

            migrationBuilder.DropColumn(
                name: "CustomLeadSource",
                table: "gym_leads");

            migrationBuilder.AlterColumn<string>(
                name: "LeadSource",
                table: "gym_leads",
                type: "nvarchar(120)",
                maxLength: 120,
                nullable: true,
                oldClrType: typeof(string),
                oldType: "nvarchar(100)",
                oldMaxLength: 100,
                oldNullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_gym_leads_LeadSource",
                table: "gym_leads",
                column: "LeadSource");
        }
    }
}
