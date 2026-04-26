using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;
using GymManagement.Infrastructure.Data;

#nullable disable

namespace GymManagement.Infrastructure.Migrations
{
    /// <summary>
    /// Ensures a plain unique index (no WHERE clause), matching:
    /// CREATE UNIQUE INDEX IX_UserRoles_UserId_RoleId ON UserRoles(UserId, RoleId);
    /// </summary>
    [DbContext(typeof(ApplicationDbContext))]
    [Migration("20260419170000_UserRolesUniqueIndexExactSql")]
    public partial class UserRolesUniqueIndexExactSql : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("""
                IF EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_UserRoles_UserId_RoleId' AND object_id = OBJECT_ID(N'[dbo].[UserRoles]'))
                    DROP INDEX [IX_UserRoles_UserId_RoleId] ON [UserRoles];
                CREATE UNIQUE INDEX [IX_UserRoles_UserId_RoleId] ON [UserRoles]([UserId], [RoleId]);
                """);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("""
                IF EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_UserRoles_UserId_RoleId' AND object_id = OBJECT_ID(N'[dbo].[UserRoles]'))
                    DROP INDEX [IX_UserRoles_UserId_RoleId] ON [UserRoles];
                CREATE UNIQUE INDEX [IX_UserRoles_UserId_RoleId] ON [UserRoles]([UserId], [RoleId]) WHERE [IsDeleted] = 0;
                """);
        }
    }
}
