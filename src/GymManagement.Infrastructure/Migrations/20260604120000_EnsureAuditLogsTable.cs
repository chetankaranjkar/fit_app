using GymManagement.Infrastructure.Data;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace GymManagement.Infrastructure.Migrations
{
    /// <summary>
    /// Creates <c>AuditLogs</c> when the entity was added to the model without a prior applied migration
    /// (orphan <c>20260602130000_AddPerformanceIndexesAndAuditLogs</c> was never in the EF chain).
    /// </summary>
    [DbContext(typeof(ApplicationDbContext))]
    [Migration("20260604120000_EnsureAuditLogsTable")]
    public partial class EnsureAuditLogsTable : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("""
                IF OBJECT_ID(N'AuditLogs', N'U') IS NULL
                BEGIN
                    CREATE TABLE [AuditLogs] (
                        [Id] bigint NOT NULL IDENTITY,
                        [UserId] int NULL,
                        [Action] nvarchar(100) NOT NULL,
                        [Entity] nvarchar(100) NOT NULL,
                        [OldValue] nvarchar(max) NULL,
                        [NewValue] nvarchar(max) NULL,
                        [CreatedAt] datetime2 NOT NULL,
                        CONSTRAINT [PK_AuditLogs] PRIMARY KEY ([Id])
                    );
                    CREATE INDEX [IX_AuditLogs_CreatedAt] ON [AuditLogs] ([CreatedAt]);
                    CREATE INDEX [IX_AuditLogs_Entity_CreatedAt] ON [AuditLogs] ([Entity], [CreatedAt]);
                    CREATE INDEX [IX_AuditLogs_UserId] ON [AuditLogs] ([UserId]);
                END
                """);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(name: "AuditLogs");
        }
    }
}
