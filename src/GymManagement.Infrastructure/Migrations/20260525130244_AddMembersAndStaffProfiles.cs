using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace GymManagement.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddMembersAndStaffProfiles : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_PT_Packages_Organizations_OrganizationId1",
                table: "PT_Packages");

            migrationBuilder.DropIndex(
                name: "IX_PT_Packages_OrganizationId1",
                table: "PT_Packages");

            migrationBuilder.DropColumn(
                name: "OrganizationId1",
                table: "PT_Packages");

            migrationBuilder.CreateTable(
                name: "Members",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    UserId = table.Column<int>(type: "int", nullable: false),
                    FitnessGoal = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: true),
                    HeightCm = table.Column<decimal>(type: "decimal(10,2)", precision: 10, scale: 2, nullable: true),
                    WeightKg = table.Column<decimal>(type: "decimal(10,2)", precision: 10, scale: 2, nullable: true),
                    MedicalConditions = table.Column<string>(type: "nvarchar(2000)", maxLength: 2000, nullable: true),
                    EmergencyContact = table.Column<string>(type: "nvarchar(150)", maxLength: 150, nullable: true),
                    EmergencyPhone = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: true),
                    PreferredGymTime = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: true),
                    DateOfBirth = table.Column<DateTime>(type: "datetime2", nullable: true),
                    Gender = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: true),
                    RegistrationDate = table.Column<DateTime>(type: "datetime2", nullable: false),
                    IsActive = table.Column<bool>(type: "bit", nullable: false),
                    CreatedDate = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedDate = table.Column<DateTime>(type: "datetime2", nullable: true),
                    IsDeleted = table.Column<bool>(type: "bit", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Members", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Members_Users_UserId",
                        column: x => x.UserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "Staff",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    UserId = table.Column<int>(type: "int", nullable: false),
                    EmployeeCode = table.Column<string>(type: "nvarchar(30)", maxLength: 30, nullable: true),
                    Department = table.Column<string>(type: "nvarchar(80)", maxLength: 80, nullable: true),
                    JobTitle = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: true),
                    ShiftType = table.Column<string>(type: "nvarchar(30)", maxLength: 30, nullable: true),
                    JoiningDate = table.Column<DateTime>(type: "datetime2", nullable: true),
                    IsActive = table.Column<bool>(type: "bit", nullable: false),
                    CreatedDate = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedDate = table.Column<DateTime>(type: "datetime2", nullable: true),
                    IsDeleted = table.Column<bool>(type: "bit", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Staff", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Staff_Users_UserId",
                        column: x => x.UserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_Members_UserId",
                table: "Members",
                column: "UserId",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Staff_EmployeeCode",
                table: "Staff",
                column: "EmployeeCode",
                unique: true,
                filter: "[EmployeeCode] IS NOT NULL AND [IsDeleted] = 0");

            migrationBuilder.CreateIndex(
                name: "IX_Staff_UserId",
                table: "Staff",
                column: "UserId",
                unique: true);

            migrationBuilder.Sql("""
                INSERT INTO [Roles] ([Name], [Description], [IsActive], [CreatedDate], [IsDeleted])
                SELECT v.[Name], v.[Description], 1, GETUTCDATE(), 0
                FROM (VALUES
                    (N'RECEPTIONIST', N'Front desk / reception'),
                    (N'ACCOUNTANT', N'Billing and accounts')) AS v([Name], [Description])
                WHERE NOT EXISTS (SELECT 1 FROM [Roles] r WHERE r.[Name] = v.[Name]);
                """);

            migrationBuilder.Sql("""
                INSERT INTO [Members] (
                    [UserId], [EmergencyContact], [EmergencyPhone], [PreferredGymTime],
                    [DateOfBirth], [Gender], [RegistrationDate], [IsActive],
                    [CreatedDate], [IsDeleted], [FitnessGoal], [HeightCm], [WeightKg])
                SELECT
                    u.[Id],
                    u.[EmergencyContact],
                    u.[EmergencyPhone],
                    u.[PreferredGymTime],
                    u.[DateOfBirth],
                    u.[Gender],
                    u.[RegistrationDate],
                    u.[IsActive],
                    GETUTCDATE(),
                    0,
                    ud.[GoalType],
                    ud.[Height],
                    ud.[Weight]
                FROM [Users] u
                OUTER APPLY (
                    SELECT TOP 1 d.[GoalType], d.[Height], d.[Weight]
                    FROM [UserDetails] d
                    WHERE d.[UserId] = u.[Id] AND d.[IsDeleted] = 0
                    ORDER BY d.[MeasurementDate] DESC
                ) ud
                WHERE u.[IsDeleted] = 0
                  AND NOT EXISTS (SELECT 1 FROM [Members] m WHERE m.[UserId] = u.[Id])
                  AND (
                    EXISTS (
                        SELECT 1 FROM [UserUserTypes] uut
                        INNER JOIN [UserTypes] ut ON ut.[Id] = uut.[UserTypeId]
                        WHERE uut.[UserId] = u.[Id] AND uut.[IsDeleted] = 0
                          AND ut.[Name] IN (N'Member', N'member'))
                    OR EXISTS (
                        SELECT 1 FROM [user_memberships] um
                        WHERE um.[UserId] = u.[Id] AND um.[IsDeleted] = 0)
                    OR EXISTS (
                        SELECT 1 FROM [UserRoles] ur
                        INNER JOIN [Roles] r ON r.[Id] = ur.[RoleId]
                        WHERE ur.[UserId] = u.[Id] AND ur.[IsDeleted] = 0 AND r.[Name] = N'MEMBER')
                  );
                """);

            migrationBuilder.Sql("""
                INSERT INTO [Staff] (
                    [UserId], [EmployeeCode], [Department], [IsActive], [JoiningDate], [CreatedDate], [IsDeleted])
                SELECT
                    u.[Id],
                    CONCAT(N'STF-', YEAR(GETUTCDATE()), N'-', RIGHT(CONCAT(N'000000', ROW_NUMBER() OVER (ORDER BY u.[Id])), 6)),
                    CASE
                        WHEN ut.[Name] IN (N'Receptionist', N'Reception') THEN N'Reception'
                        WHEN ut.[Name] IN (N'Accountant', N'Accounts') THEN N'Accounts'
                        ELSE N'General'
                    END,
                    u.[IsActive],
                    CAST(GETUTCDATE() AS date),
                    GETUTCDATE(),
                    0
                FROM [Users] u
                INNER JOIN [UserUserTypes] uut ON uut.[UserId] = u.[Id] AND uut.[IsDeleted] = 0
                INNER JOIN [UserTypes] ut ON ut.[Id] = uut.[UserTypeId]
                WHERE u.[IsDeleted] = 0
                  AND ut.[Name] IN (N'Staff', N'Receptionist', N'Reception', N'Accountant', N'Accounts')
                  AND NOT EXISTS (SELECT 1 FROM [Staff] s WHERE s.[UserId] = u.[Id]);
                """);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "Members");

            migrationBuilder.DropTable(
                name: "Staff");

            migrationBuilder.AddColumn<int>(
                name: "OrganizationId1",
                table: "PT_Packages",
                type: "int",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_PT_Packages_OrganizationId1",
                table: "PT_Packages",
                column: "OrganizationId1");

            migrationBuilder.AddForeignKey(
                name: "FK_PT_Packages_Organizations_OrganizationId1",
                table: "PT_Packages",
                column: "OrganizationId1",
                principalTable: "Organizations",
                principalColumn: "Id");
        }
    }
}
