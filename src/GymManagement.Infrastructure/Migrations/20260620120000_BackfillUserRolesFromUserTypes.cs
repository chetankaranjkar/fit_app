using GymManagement.Infrastructure.Data;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace GymManagement.Infrastructure.Migrations
{
    /// <summary>Backfills missing <c>UserRoles</c> rows from legacy <c>UserUserTypes</c> mappings.</summary>
    [DbContext(typeof(ApplicationDbContext))]
    [Migration("20260620120000_BackfillUserRolesFromUserTypes")]
    public partial class BackfillUserRolesFromUserTypes : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("""
                SELECT DISTINCT uut.[UserId], r.[Id] AS [RoleId]
                INTO #BackfillRoles
                FROM [UserUserTypes] uut
                INNER JOIN [UserTypes] ut ON ut.[Id] = uut.[UserTypeId] AND ut.[IsDeleted] = 0
                INNER JOIN [Roles] r ON r.[IsDeleted] = 0 AND r.[IsActive] = 1 AND r.[Name] = CASE ut.[Name]
                    WHEN N'Admin' THEN N'ADMIN'
                    WHEN N'Member' THEN N'MEMBER'
                    WHEN N'Trainer' THEN N'TRAINER'
                    WHEN N'Staff' THEN N'STAFF'
                    WHEN N'Receptionist' THEN N'RECEPTIONIST'
                    WHEN N'Reception' THEN N'RECEPTIONIST'
                    WHEN N'Accountant' THEN N'ACCOUNTANT'
                    WHEN N'Accounts' THEN N'ACCOUNTANT'
                    ELSE NULL
                END
                WHERE uut.[IsDeleted] = 0
                  AND r.[Name] IS NOT NULL;

                UPDATE ur
                SET ur.[IsDeleted] = 0,
                    ur.[UpdatedDate] = SYSUTCDATETIME()
                FROM [UserRoles] ur
                INNER JOIN #BackfillRoles src ON src.[UserId] = ur.[UserId] AND src.[RoleId] = ur.[RoleId]
                WHERE ur.[IsDeleted] = 1;

                INSERT INTO [UserRoles] ([UserId], [RoleId], [CreatedDate], [UpdatedDate], [IsDeleted])
                SELECT src.[UserId], src.[RoleId], SYSUTCDATETIME(), NULL, 0
                FROM #BackfillRoles src
                WHERE NOT EXISTS (
                    SELECT 1 FROM [UserRoles] ur
                    WHERE ur.[UserId] = src.[UserId] AND ur.[RoleId] = src.[RoleId]);

                DROP TABLE #BackfillRoles;
                """);
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            // Data backfill — no-op on rollback.
        }
    }
}
