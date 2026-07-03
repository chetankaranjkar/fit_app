using GymManagement.Infrastructure.Data;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace GymManagement.Infrastructure.Migrations
{
    /// <inheritdoc />
    [DbContext(typeof(ApplicationDbContext))]
    [Migration("20260628120000_AddEmailNotificationSettingsToGymSettings")]
    public partial class AddEmailNotificationSettingsToGymSettings : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("""
                IF COL_LENGTH('GymSettings', 'EmailNotificationsEnabled') IS NULL
                BEGIN
                    ALTER TABLE [GymSettings] ADD [EmailNotificationsEnabled] bit NOT NULL
                        CONSTRAINT [DF_GymSettings_EmailNotificationsEnabled] DEFAULT 0;
                END

                IF COL_LENGTH('GymSettings', 'SmtpHost') IS NULL
                    ALTER TABLE [GymSettings] ADD [SmtpHost] nvarchar(255) NULL;

                IF COL_LENGTH('GymSettings', 'SmtpPort') IS NULL
                    ALTER TABLE [GymSettings] ADD [SmtpPort] int NOT NULL
                        CONSTRAINT [DF_GymSettings_SmtpPort] DEFAULT 587;

                IF COL_LENGTH('GymSettings', 'SmtpUseStartTls') IS NULL
                    ALTER TABLE [GymSettings] ADD [SmtpUseStartTls] bit NOT NULL
                        CONSTRAINT [DF_GymSettings_SmtpUseStartTls] DEFAULT 1;

                IF COL_LENGTH('GymSettings', 'SmtpUsername') IS NULL
                    ALTER TABLE [GymSettings] ADD [SmtpUsername] nvarchar(255) NULL;

                IF COL_LENGTH('GymSettings', 'SmtpPasswordProtected') IS NULL
                    ALTER TABLE [GymSettings] ADD [SmtpPasswordProtected] nvarchar(max) NULL;

                IF COL_LENGTH('GymSettings', 'EmailFromAddress') IS NULL
                    ALTER TABLE [GymSettings] ADD [EmailFromAddress] nvarchar(255) NULL;

                IF COL_LENGTH('GymSettings', 'EmailFromDisplayName') IS NULL
                    ALTER TABLE [GymSettings] ADD [EmailFromDisplayName] nvarchar(255) NULL;

                IF COL_LENGTH('GymSettings', 'EmailSendPaymentReceipts') IS NULL
                    ALTER TABLE [GymSettings] ADD [EmailSendPaymentReceipts] bit NOT NULL
                        CONSTRAINT [DF_GymSettings_EmailSendPaymentReceipts] DEFAULT 1;

                IF COL_LENGTH('GymSettings', 'EmailSendMembershipExpiryReminders') IS NULL
                    ALTER TABLE [GymSettings] ADD [EmailSendMembershipExpiryReminders] bit NOT NULL
                        CONSTRAINT [DF_GymSettings_EmailSendMembershipExpiryReminders] DEFAULT 1;

                IF COL_LENGTH('GymSettings', 'EmailSendDietAssignments') IS NULL
                    ALTER TABLE [GymSettings] ADD [EmailSendDietAssignments] bit NOT NULL
                        CONSTRAINT [DF_GymSettings_EmailSendDietAssignments] DEFAULT 1;

                IF COL_LENGTH('GymSettings', 'EmailSettingsUpdatedDate') IS NULL
                    ALTER TABLE [GymSettings] ADD [EmailSettingsUpdatedDate] datetime2 NULL;
                """);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("""
                IF COL_LENGTH('GymSettings', 'EmailSettingsUpdatedDate') IS NOT NULL
                    ALTER TABLE [GymSettings] DROP COLUMN [EmailSettingsUpdatedDate];

                IF COL_LENGTH('GymSettings', 'EmailSendDietAssignments') IS NOT NULL
                BEGIN
                    ALTER TABLE [GymSettings] DROP CONSTRAINT [DF_GymSettings_EmailSendDietAssignments];
                    ALTER TABLE [GymSettings] DROP COLUMN [EmailSendDietAssignments];
                END

                IF COL_LENGTH('GymSettings', 'EmailSendMembershipExpiryReminders') IS NOT NULL
                BEGIN
                    ALTER TABLE [GymSettings] DROP CONSTRAINT [DF_GymSettings_EmailSendMembershipExpiryReminders];
                    ALTER TABLE [GymSettings] DROP COLUMN [EmailSendMembershipExpiryReminders];
                END

                IF COL_LENGTH('GymSettings', 'EmailSendPaymentReceipts') IS NOT NULL
                BEGIN
                    ALTER TABLE [GymSettings] DROP CONSTRAINT [DF_GymSettings_EmailSendPaymentReceipts];
                    ALTER TABLE [GymSettings] DROP COLUMN [EmailSendPaymentReceipts];
                END

                IF COL_LENGTH('GymSettings', 'EmailFromDisplayName') IS NOT NULL
                    ALTER TABLE [GymSettings] DROP COLUMN [EmailFromDisplayName];

                IF COL_LENGTH('GymSettings', 'EmailFromAddress') IS NOT NULL
                    ALTER TABLE [GymSettings] DROP COLUMN [EmailFromAddress];

                IF COL_LENGTH('GymSettings', 'SmtpPasswordProtected') IS NOT NULL
                    ALTER TABLE [GymSettings] DROP COLUMN [SmtpPasswordProtected];

                IF COL_LENGTH('GymSettings', 'SmtpUsername') IS NOT NULL
                    ALTER TABLE [GymSettings] DROP COLUMN [SmtpUsername];

                IF COL_LENGTH('GymSettings', 'SmtpUseStartTls') IS NOT NULL
                BEGIN
                    ALTER TABLE [GymSettings] DROP CONSTRAINT [DF_GymSettings_SmtpUseStartTls];
                    ALTER TABLE [GymSettings] DROP COLUMN [SmtpUseStartTls];
                END

                IF COL_LENGTH('GymSettings', 'SmtpPort') IS NOT NULL
                BEGIN
                    ALTER TABLE [GymSettings] DROP CONSTRAINT [DF_GymSettings_SmtpPort];
                    ALTER TABLE [GymSettings] DROP COLUMN [SmtpPort];
                END

                IF COL_LENGTH('GymSettings', 'SmtpHost') IS NOT NULL
                    ALTER TABLE [GymSettings] DROP COLUMN [SmtpHost];

                IF COL_LENGTH('GymSettings', 'EmailNotificationsEnabled') IS NOT NULL
                BEGIN
                    ALTER TABLE [GymSettings] DROP CONSTRAINT [DF_GymSettings_EmailNotificationsEnabled];
                    ALTER TABLE [GymSettings] DROP COLUMN [EmailNotificationsEnabled];
                END
                """);
        }
    }
}
