using GymManagement.Infrastructure.Data;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace GymManagement.Infrastructure.Migrations
{
    /// <inheritdoc />
    [DbContext(typeof(ApplicationDbContext))]
    [Migration("20260628140000_AddUserNotificationOptIn")]
    public partial class AddUserNotificationOptIn : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Add as opt-in (default 0). Existing rows become OFF automatically.
            migrationBuilder.Sql("""
                IF COL_LENGTH('Users', 'ReceiveEmailNotifications') IS NULL
                    ALTER TABLE [Users] ADD [ReceiveEmailNotifications] bit NOT NULL
                        CONSTRAINT [DF_Users_ReceiveEmailNotifications] DEFAULT 0;

                IF COL_LENGTH('Users', 'ReceiveSmsNotifications') IS NULL
                    ALTER TABLE [Users] ADD [ReceiveSmsNotifications] bit NOT NULL
                        CONSTRAINT [DF_Users_ReceiveSmsNotifications] DEFAULT 0;
                """);
            // ADD ... DEFAULT 0 is a metadata-only op: every existing row is OFF without a table scan.
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("""
                IF COL_LENGTH('Users', 'ReceiveSmsNotifications') IS NOT NULL
                BEGIN
                    ALTER TABLE [Users] DROP CONSTRAINT [DF_Users_ReceiveSmsNotifications];
                    ALTER TABLE [Users] DROP COLUMN [ReceiveSmsNotifications];
                END

                IF COL_LENGTH('Users', 'ReceiveEmailNotifications') IS NOT NULL
                BEGIN
                    ALTER TABLE [Users] DROP CONSTRAINT [DF_Users_ReceiveEmailNotifications];
                    ALTER TABLE [Users] DROP COLUMN [ReceiveEmailNotifications];
                END
                """);
        }
    }
}
