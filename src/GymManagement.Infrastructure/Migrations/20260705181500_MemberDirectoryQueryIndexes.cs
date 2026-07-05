using GymManagement.Infrastructure.Data;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace GymManagement.Infrastructure.Migrations
{
    [DbContext(typeof(ApplicationDbContext))]
    [Migration("20260705181500_MemberDirectoryQueryIndexes")]
    public partial class MemberDirectoryQueryIndexes : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("""
                IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_AuthUsers_Email' AND object_id = OBJECT_ID('AuthUsers'))
                    CREATE INDEX [IX_AuthUsers_Email] ON [AuthUsers] ([Email]) WHERE [IsDeleted] = 0;

                IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_Members_UserId_PreferredGymTime' AND object_id = OBJECT_ID('Members'))
                    CREATE INDEX [IX_Members_UserId_PreferredGymTime] ON [Members] ([UserId], [PreferredGymTime]) WHERE [IsDeleted] = 0;

                IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_UserInstructors_TrainerId_UserId' AND object_id = OBJECT_ID('UserInstructors'))
                    CREATE INDEX [IX_UserInstructors_TrainerId_UserId] ON [UserInstructors] ([TrainerId], [UserId])
                        WHERE [IsDeleted] = 0 AND [IsActive] = 1 AND [EndDate] IS NULL;

                IF EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_UserRoles_RoleId' AND object_id = OBJECT_ID('UserRoles'))
                    DROP INDEX [IX_UserRoles_RoleId] ON [UserRoles];

                IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_UserRoles_RoleId_UserId' AND object_id = OBJECT_ID('UserRoles'))
                    CREATE INDEX [IX_UserRoles_RoleId_UserId] ON [UserRoles] ([RoleId], [UserId]) WHERE [IsDeleted] = 0;

                IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_Users_IsActive_RegistrationDate_Id' AND object_id = OBJECT_ID('Users'))
                    CREATE INDEX [IX_Users_IsActive_RegistrationDate_Id] ON [Users] ([IsActive], [RegistrationDate], [Id]) WHERE [IsDeleted] = 0;
                """);
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("""
                IF EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_Users_IsActive_RegistrationDate_Id' AND object_id = OBJECT_ID('Users'))
                    DROP INDEX [IX_Users_IsActive_RegistrationDate_Id] ON [Users];

                IF EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_UserRoles_RoleId_UserId' AND object_id = OBJECT_ID('UserRoles'))
                    DROP INDEX [IX_UserRoles_RoleId_UserId] ON [UserRoles];

                IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_UserRoles_RoleId' AND object_id = OBJECT_ID('UserRoles'))
                    CREATE INDEX [IX_UserRoles_RoleId] ON [UserRoles] ([RoleId]);

                IF EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_UserInstructors_TrainerId_UserId' AND object_id = OBJECT_ID('UserInstructors'))
                    DROP INDEX [IX_UserInstructors_TrainerId_UserId] ON [UserInstructors];

                IF EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_Members_UserId_PreferredGymTime' AND object_id = OBJECT_ID('Members'))
                    DROP INDEX [IX_Members_UserId_PreferredGymTime] ON [Members];

                IF EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_AuthUsers_Email' AND object_id = OBJECT_ID('AuthUsers'))
                    DROP INDEX [IX_AuthUsers_Email] ON [AuthUsers];
                """);
        }
    }
}
