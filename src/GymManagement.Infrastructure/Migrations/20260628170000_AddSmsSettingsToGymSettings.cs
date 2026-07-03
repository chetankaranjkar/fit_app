using GymManagement.Infrastructure.Data;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace GymManagement.Infrastructure.Migrations
{
    /// <inheritdoc />
    [DbContext(typeof(ApplicationDbContext))]
    [Migration("20260628170000_AddSmsSettingsToGymSettings")]
    public partial class AddSmsSettingsToGymSettings : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("""
                IF COL_LENGTH('GymSettings', 'SmsNotificationsEnabled') IS NULL
                    ALTER TABLE [GymSettings] ADD [SmsNotificationsEnabled] bit NOT NULL
                        CONSTRAINT [DF_GymSettings_SmsNotificationsEnabled] DEFAULT 0;

                IF COL_LENGTH('GymSettings', 'SmsWebhookUrl') IS NULL
                    ALTER TABLE [GymSettings] ADD [SmsWebhookUrl] nvarchar(500) NULL;

                IF COL_LENGTH('GymSettings', 'SmsSenderId') IS NULL
                    ALTER TABLE [GymSettings] ADD [SmsSenderId] nvarchar(50) NULL;

                IF COL_LENGTH('GymSettings', 'SmsAuthHeaderProtected') IS NULL
                    ALTER TABLE [GymSettings] ADD [SmsAuthHeaderProtected] nvarchar(max) NULL;

                IF COL_LENGTH('GymSettings', 'SmsSendPaymentReceipts') IS NULL
                    ALTER TABLE [GymSettings] ADD [SmsSendPaymentReceipts] bit NOT NULL
                        CONSTRAINT [DF_GymSettings_SmsSendPaymentReceipts] DEFAULT 1;

                IF COL_LENGTH('GymSettings', 'SmsSendMembershipExpiryReminders') IS NULL
                    ALTER TABLE [GymSettings] ADD [SmsSendMembershipExpiryReminders] bit NOT NULL
                        CONSTRAINT [DF_GymSettings_SmsSendMembershipExpiryReminders] DEFAULT 1;

                IF COL_LENGTH('GymSettings', 'SmsSettingsUpdatedDate') IS NULL
                    ALTER TABLE [GymSettings] ADD [SmsSettingsUpdatedDate] datetime2 NULL;
                """);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("""
                IF COL_LENGTH('GymSettings', 'SmsNotificationsEnabled') IS NOT NULL
                BEGIN
                    ALTER TABLE [GymSettings] DROP CONSTRAINT [DF_GymSettings_SmsNotificationsEnabled];
                    ALTER TABLE [GymSettings] DROP COLUMN [SmsNotificationsEnabled];
                END

                IF COL_LENGTH('GymSettings', 'SmsWebhookUrl') IS NOT NULL
                    ALTER TABLE [GymSettings] DROP COLUMN [SmsWebhookUrl];

                IF COL_LENGTH('GymSettings', 'SmsSenderId') IS NOT NULL
                    ALTER TABLE [GymSettings] DROP COLUMN [SmsSenderId];

                IF COL_LENGTH('GymSettings', 'SmsAuthHeaderProtected') IS NOT NULL
                    ALTER TABLE [GymSettings] DROP COLUMN [SmsAuthHeaderProtected];

                IF COL_LENGTH('GymSettings', 'SmsSendPaymentReceipts') IS NOT NULL
                BEGIN
                    ALTER TABLE [GymSettings] DROP CONSTRAINT [DF_GymSettings_SmsSendPaymentReceipts];
                    ALTER TABLE [GymSettings] DROP COLUMN [SmsSendPaymentReceipts];
                END

                IF COL_LENGTH('GymSettings', 'SmsSendMembershipExpiryReminders') IS NOT NULL
                BEGIN
                    ALTER TABLE [GymSettings] DROP CONSTRAINT [DF_GymSettings_SmsSendMembershipExpiryReminders];
                    ALTER TABLE [GymSettings] DROP COLUMN [SmsSendMembershipExpiryReminders];
                END

                IF COL_LENGTH('GymSettings', 'SmsSettingsUpdatedDate') IS NOT NULL
                    ALTER TABLE [GymSettings] DROP COLUMN [SmsSettingsUpdatedDate];
                """);
        }
    }
}
