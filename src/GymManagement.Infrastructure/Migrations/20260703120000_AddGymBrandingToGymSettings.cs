using GymManagement.Infrastructure.Data;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace GymManagement.Infrastructure.Migrations
{
    [DbContext(typeof(ApplicationDbContext))]
    [Migration("20260703120000_AddGymBrandingToGymSettings")]
    public partial class AddGymBrandingToGymSettings : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("""
                IF COL_LENGTH('GymSettings', 'GymName') IS NULL
                    ALTER TABLE [GymSettings] ADD [GymName] nvarchar(200) NULL;

                IF COL_LENGTH('GymSettings', 'GymLogoUrl') IS NULL
                    ALTER TABLE [GymSettings] ADD [GymLogoUrl] nvarchar(500) NULL;

                IF COL_LENGTH('GymSettings', 'InvoiceLogoUrl') IS NULL
                    ALTER TABLE [GymSettings] ADD [InvoiceLogoUrl] nvarchar(500) NULL;
                """);
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("""
                IF COL_LENGTH('GymSettings', 'InvoiceLogoUrl') IS NOT NULL
                    ALTER TABLE [GymSettings] DROP COLUMN [InvoiceLogoUrl];

                IF COL_LENGTH('GymSettings', 'GymLogoUrl') IS NOT NULL
                    ALTER TABLE [GymSettings] DROP COLUMN [GymLogoUrl];

                IF COL_LENGTH('GymSettings', 'GymName') IS NOT NULL
                    ALTER TABLE [GymSettings] DROP COLUMN [GymName];
                """);
        }
    }
}
