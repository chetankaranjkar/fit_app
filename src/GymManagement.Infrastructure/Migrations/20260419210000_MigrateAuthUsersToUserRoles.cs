using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;
using GymManagement.Infrastructure.Data;

#nullable disable

namespace GymManagement.Infrastructure.Migrations
{
    /// <summary>
    /// Backfills <c>UserRoles</c> from auth accounts:
    /// — If <c>AuthUsers.RoleId</c> still exists (DB never applied RemoveAuthUserRoleId): copies (UserId, RoleId) as originally intended.
    /// — Otherwise: maps users to ADMIN / TRAINER / MEMBER / STAFF using <c>AuthUsers</c>, <c>Trainer</c>, and <c>UserTypes</c>.
    /// </summary>
    [DbContext(typeof(ApplicationDbContext))]
    [Migration("20260419210000_MigrateAuthUsersToUserRoles")]
    public partial class MigrateAuthUsersToUserRoles : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Legacy path must use dynamic SQL: SQL Server validates column names for the whole batch,
            // so referencing AuthUsers.RoleId fails after RoleId was dropped even inside IF.
            migrationBuilder.Sql("""
                IF EXISTS (
                    SELECT 1 FROM sys.columns
                    WHERE object_id = OBJECT_ID(N'dbo.AuthUsers') AND name = N'RoleId')
                BEGIN
                    EXEC(N'
                    INSERT INTO [UserRoles] ([UserId], [RoleId], [CreatedDate], [UpdatedDate], [IsDeleted])
                    SELECT a.[UserId], a.[RoleId], SYSUTCDATETIME(), NULL, 0
                    FROM [AuthUsers] a
                    WHERE a.[UserId] IS NOT NULL
                      AND NOT EXISTS (
                          SELECT 1 FROM [UserRoles] ur
                          WHERE ur.[UserId] = a.[UserId] AND ur.[RoleId] = a.[RoleId] AND ur.[IsDeleted] = 0);');
                END
                ELSE
                BEGIN
                    -- ADMIN (default admin login)
                    INSERT INTO [UserRoles] ([UserId], [RoleId], [CreatedDate], [UpdatedDate], [IsDeleted])
                    SELECT DISTINCT a.[UserId], r.[Id], GETUTCDATE(), NULL, 0
                    FROM [AuthUsers] a
                    INNER JOIN [Roles] r ON r.[Name] = N'ADMIN' AND r.[IsDeleted] = 0
                    WHERE a.[UserId] IS NOT NULL
                      AND (LOWER(a.[Username]) = N'admin' OR LOWER(a.[Email]) = N'admin@gym.com')
                      AND NOT EXISTS (
                          SELECT 1 FROM [UserRoles] ur
                          WHERE ur.[UserId] = a.[UserId] AND ur.[RoleId] = r.[Id] AND ur.[IsDeleted] = 0);

                    -- TRAINER (auth linked to Trainer)
                    INSERT INTO [UserRoles] ([UserId], [RoleId], [CreatedDate], [UpdatedDate], [IsDeleted])
                    SELECT DISTINCT COALESCE(a.[UserId], tr.[UserId]), r.[Id], GETUTCDATE(), NULL, 0
                    FROM [AuthUsers] a
                    INNER JOIN [Roles] r ON r.[Name] = N'TRAINER' AND r.[IsDeleted] = 0
                    LEFT JOIN [Trainer] tr ON tr.[Id] = a.[TrainerId] AND tr.[IsDeleted] = 0
                    WHERE a.[TrainerId] IS NOT NULL
                      AND COALESCE(a.[UserId], tr.[UserId]) IS NOT NULL
                      AND NOT EXISTS (
                          SELECT 1 FROM [UserRoles] ur
                          WHERE ur.[UserId] = COALESCE(a.[UserId], tr.[UserId]) AND ur.[RoleId] = r.[Id] AND ur.[IsDeleted] = 0);

                    -- STAFF (UserTypes.Name = 'Staff')
                    INSERT INTO [UserRoles] ([UserId], [RoleId], [CreatedDate], [UpdatedDate], [IsDeleted])
                    SELECT DISTINCT a.[UserId], r.[Id], GETUTCDATE(), NULL, 0
                    FROM [AuthUsers] a
                    INNER JOIN [Roles] r ON r.[Name] = N'STAFF' AND r.[IsDeleted] = 0
                    INNER JOIN [UserUserTypes] uut ON uut.[UserId] = a.[UserId] AND uut.[IsDeleted] = 0
                    INNER JOIN [UserTypes] ut ON ut.[Id] = uut.[UserTypeId] AND ut.[IsDeleted] = 0 AND ut.[Name] = N'Staff'
                    WHERE a.[UserId] IS NOT NULL
                      AND NOT EXISTS (
                          SELECT 1 FROM [UserRoles] ur
                          WHERE ur.[UserId] = a.[UserId] AND ur.[RoleId] = r.[Id] AND ur.[IsDeleted] = 0);

                    -- MEMBER (remaining accounts with a User profile, not admin / not trainer-only path above)
                    INSERT INTO [UserRoles] ([UserId], [RoleId], [CreatedDate], [UpdatedDate], [IsDeleted])
                    SELECT DISTINCT a.[UserId], r.[Id], GETUTCDATE(), NULL, 0
                    FROM [AuthUsers] a
                    INNER JOIN [Roles] r ON r.[Name] = N'MEMBER' AND r.[IsDeleted] = 0
                    WHERE a.[UserId] IS NOT NULL
                      AND NOT (LOWER(a.[Username]) = N'admin' OR LOWER(a.[Email]) = N'admin@gym.com')
                      AND a.[TrainerId] IS NULL
                      AND NOT EXISTS (
                          SELECT 1 FROM [UserRoles] ur
                          WHERE ur.[UserId] = a.[UserId] AND ur.[RoleId] = r.[Id] AND ur.[IsDeleted] = 0);
                END
                """);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            // Data migration: no safe rollback.
        }
    }
}
