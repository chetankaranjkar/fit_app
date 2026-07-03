using GymManagement.Infrastructure.Data;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace GymManagement.Infrastructure.Migrations
{
    [DbContext(typeof(ApplicationDbContext))]
    [Migration("20260628160000_AddNotificationTemplateEngine")]
    public partial class AddNotificationTemplateEngine : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("""
                IF OBJECT_ID(N'[NotificationTemplates]', N'U') IS NULL
                BEGIN
                    CREATE TABLE [NotificationTemplates] (
                        [Id] int NOT NULL IDENTITY,
                        [TemplateCode] nvarchar(100) NOT NULL,
                        [TemplateName] nvarchar(200) NOT NULL,
                        [Channel] nvarchar(20) NOT NULL,
                        [Subject] nvarchar(500) NULL,
                        [Body] nvarchar(max) NOT NULL,
                        [IsHtml] bit NOT NULL CONSTRAINT [DF_NotificationTemplates_IsHtml] DEFAULT 0,
                        [IsActive] bit NOT NULL CONSTRAINT [DF_NotificationTemplates_IsActive] DEFAULT 1,
                        [IsCustomized] bit NOT NULL CONSTRAINT [DF_NotificationTemplates_IsCustomized] DEFAULT 0,
                        [CreatedDate] datetime2 NOT NULL,
                        [UpdatedDate] datetime2 NULL,
                        [IsDeleted] bit NOT NULL CONSTRAINT [DF_NotificationTemplates_IsDeleted] DEFAULT 0,
                        CONSTRAINT [PK_NotificationTemplates] PRIMARY KEY ([Id])
                    );
                    CREATE UNIQUE INDEX [IX_NotificationTemplates_Code_Channel]
                        ON [NotificationTemplates]([TemplateCode], [Channel]) WHERE [IsDeleted] = 0;
                END

                IF OBJECT_ID(N'[NotificationHistories]', N'U') IS NULL
                BEGIN
                    CREATE TABLE [NotificationHistories] (
                        [Id] int NOT NULL IDENTITY,
                        [MemberId] int NULL,
                        [NotificationType] nvarchar(100) NOT NULL,
                        [Channel] nvarchar(20) NOT NULL,
                        [Recipient] nvarchar(320) NOT NULL,
                        [Subject] nvarchar(500) NULL,
                        [Message] nvarchar(max) NOT NULL,
                        [Status] nvarchar(50) NOT NULL,
                        [SentDate] datetime2 NULL,
                        [ErrorMessage] nvarchar(2000) NULL,
                        [RetryCount] int NOT NULL CONSTRAINT [DF_NotificationHistories_RetryCount] DEFAULT 0,
                        [CreatedByUserId] int NULL,
                        [DurationMs] int NULL,
                        [CreatedDate] datetime2 NOT NULL,
                        [UpdatedDate] datetime2 NULL,
                        [IsDeleted] bit NOT NULL CONSTRAINT [DF_NotificationHistories_IsDeleted] DEFAULT 0,
                        CONSTRAINT [PK_NotificationHistories] PRIMARY KEY ([Id])
                    );
                    CREATE INDEX [IX_NotificationHistories_MemberId_CreatedDate]
                        ON [NotificationHistories]([MemberId], [CreatedDate] DESC);
                END

                IF OBJECT_ID(N'[NotificationOutboxes]', N'U') IS NULL
                BEGIN
                    CREATE TABLE [NotificationOutboxes] (
                        [Id] int NOT NULL IDENTITY,
                        [TemplateCode] nvarchar(100) NOT NULL,
                        [NotificationType] nvarchar(100) NOT NULL,
                        [Channel] nvarchar(20) NOT NULL,
                        [MemberId] int NULL,
                        [Recipient] nvarchar(320) NOT NULL,
                        [Subject] nvarchar(500) NULL,
                        [Body] nvarchar(max) NOT NULL,
                        [IsHtml] bit NOT NULL CONSTRAINT [DF_NotificationOutboxes_IsHtml] DEFAULT 0,
                        [Status] nvarchar(50) NOT NULL CONSTRAINT [DF_NotificationOutboxes_Status] DEFAULT 'Pending',
                        [PayloadJson] nvarchar(max) NULL,
                        [AttachmentPathsJson] nvarchar(max) NULL,
                        [RetryCount] int NOT NULL CONSTRAINT [DF_NotificationOutboxes_RetryCount] DEFAULT 0,
                        [MaxRetries] int NOT NULL CONSTRAINT [DF_NotificationOutboxes_MaxRetries] DEFAULT 3,
                        [ScheduledForUtc] datetime2 NULL,
                        [ProcessedAtUtc] datetime2 NULL,
                        [ErrorMessage] nvarchar(2000) NULL,
                        [CreatedByUserId] int NULL,
                        [CreatedDate] datetime2 NOT NULL,
                        [UpdatedDate] datetime2 NULL,
                        [IsDeleted] bit NOT NULL CONSTRAINT [DF_NotificationOutboxes_IsDeleted] DEFAULT 0,
                        CONSTRAINT [PK_NotificationOutboxes] PRIMARY KEY ([Id])
                    );
                    CREATE INDEX [IX_NotificationOutboxes_Status_Scheduled]
                        ON [NotificationOutboxes]([Status], [ScheduledForUtc]);
                END
                """);
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("""
                IF OBJECT_ID(N'[NotificationOutboxes]', N'U') IS NOT NULL DROP TABLE [NotificationOutboxes];
                IF OBJECT_ID(N'[NotificationHistories]', N'U') IS NOT NULL DROP TABLE [NotificationHistories];
                IF OBJECT_ID(N'[NotificationTemplates]', N'U') IS NOT NULL DROP TABLE [NotificationTemplates];
                """);
        }
    }
}
