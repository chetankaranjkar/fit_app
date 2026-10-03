using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace GymManagement.Infrastructure.Migrations;

public partial class AddAccountThemePreference : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.AddColumn<string>(
            name: "Theme",
            table: "AuthUsers",
            type: "nvarchar(5)",
            maxLength: 5,
            nullable: false,
            defaultValue: "dark");
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.DropColumn(name: "Theme", table: "AuthUsers");
    }
}
