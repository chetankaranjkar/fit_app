using GymManagement.Infrastructure.Data;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace GymManagement.Infrastructure.Migrations
{
    /// <inheritdoc />
    [DbContext(typeof(ApplicationDbContext))]
    [Migration("20260628180000_AddWhatsAppSettingsToGymSettings")]
    public partial class AddWhatsAppSettingsToGymSettings : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("""
                IF COL_LENGTH('GymSettings', 'WhatsAppNotificationsEnabled') IS NULL
                    ALTER TABLE [GymSettings] ADD [WhatsAppNotificationsEnabled] bit NOT NULL
                        CONSTRAINT [DF_GymSettings_WhatsAppNotificationsEnabled] DEFAULT 0;

                IF COL_LENGTH('GymSettings', 'WhatsAppWebhookUrl') IS NULL
                    ALTER TABLE [GymSettings] ADD [WhatsAppWebhookUrl] nvarchar(500) NULL;

                IF COL_LENGTH('GymSettings', 'WhatsAppSenderId') IS NULL
                    ALTER TABLE [GymSettings] ADD [WhatsAppSenderId] nvarchar(50) NULL;

                IF COL_LENGTH('GymSettings', 'WhatsAppAuthHeaderProtected') IS NULL
                    ALTER TABLE [GymSettings] ADD [WhatsAppAuthHeaderProtected] nvarchar(max) NULL;

                IF COL_LENGTH('GymSettings', 'WhatsAppSendPaymentReceipts') IS NULL
                    ALTER TABLE [GymSettings] ADD [WhatsAppSendPaymentReceipts] bit NOT NULL
                        CONSTRAINT [DF_GymSettings_WhatsAppSendPaymentReceipts] DEFAULT 1;

                IF COL_LENGTH('GymSettings', 'WhatsAppSendMembershipExpiryReminders') IS NULL
                    ALTER TABLE [GymSettings] ADD [WhatsAppSendMembershipExpiryReminders] bit NOT NULL
                        CONSTRAINT [DF_GymSettings_WhatsAppSendMembershipExpiryReminders] DEFAULT 1;
                """);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("""
                IF COL_LENGTH('GymSettings', 'WhatsAppNotificationsEnabled') IS NOT NULL
                BEGIN
                    ALTER TABLE [GymSettings] DROP CONSTRAINT [DF_GymSettings_WhatsAppNotificationsEnabled];
                    ALTER TABLE [GymSettings] DROP COLUMN [WhatsAppNotificationsEnabled];
                END

                IF COL_LENGTH('GymSettings', 'WhatsAppWebhookUrl') IS NOT NULL
                    ALTER TABLE [GymSettings] DROP COLUMN [WhatsAppWebhookUrl];

                IF COL_LENGTH('GymSettings', 'WhatsAppSenderId') IS NOT NULL
                    ALTER TABLE [GymSettings] DROP COLUMN [WhatsAppSenderId];

                IF COL_LENGTH('GymSettings', 'WhatsAppAuthHeaderProtected') IS NOT NULL
                    ALTER TABLE [GymSettings] DROP COLUMN [WhatsAppAuthHeaderProtected];

                IF COL_LENGTH('GymSettings', 'WhatsAppSendPaymentReceipts') IS NOT NULL
                BEGIN
                    ALTER TABLE [GymSettings] DROP CONSTRAINT [DF_GymSettings_WhatsAppSendPaymentReceipts];
                    ALTER TABLE [GymSettings] DROP COLUMN [WhatsAppSendPaymentReceipts];
                END

                IF COL_LENGTH('GymSettings', 'WhatsAppSendMembershipExpiryReminders') IS NOT NULL
                BEGIN
                    ALTER TABLE [GymSettings] DROP CONSTRAINT [DF_GymSettings_WhatsAppSendMembershipExpiryReminders];
                    ALTER TABLE [GymSettings] DROP COLUMN [WhatsAppSendMembershipExpiryReminders];
                END
                """);
        }
    }
}
