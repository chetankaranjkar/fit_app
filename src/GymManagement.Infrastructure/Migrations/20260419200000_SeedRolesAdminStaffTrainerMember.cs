using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;
using GymManagement.Infrastructure.Data;

#nullable disable

namespace GymManagement.Infrastructure.Migrations
{
    /// <summary>
    /// Seeds canonical Roles: ADMIN, STAFF, TRAINER, MEMBER (idempotent).
    /// </summary>
    [DbContext(typeof(ApplicationDbContext))]
    [Migration("20260419200000_SeedRolesAdminStaffTrainerMember")]
    public partial class SeedRolesAdminStaffTrainerMember : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("""
                INSERT INTO [Roles] ([Name], [Description], [IsActive], [CreatedDate], [IsDeleted])
                SELECT v.[Name], v.[Name], 1, GETDATE(), 0
                FROM (VALUES
                    (N'ADMIN'),
                    (N'STAFF'),
                    (N'TRAINER'),
                    (N'MEMBER')) AS v([Name])
                WHERE NOT EXISTS (
                    SELECT 1 FROM [Roles] r WHERE r.[Name] = v.[Name]);
                """);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("""
                DELETE r
                FROM [Roles] AS r
                WHERE r.[Name] IN (N'ADMIN', N'STAFF', N'TRAINER', N'MEMBER')
                  AND NOT EXISTS (SELECT 1 FROM [RolePermissions] rp WHERE rp.[RoleId] = r.[Id])
                  AND NOT EXISTS (SELECT 1 FROM [UserRoles] ur WHERE ur.[RoleId] = r.[Id]);
                """);
        }
    }
}