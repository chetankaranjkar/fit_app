using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace GymManagement.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class UserAadhaarPhoneMobileUniqueness : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(
                """
                IF COL_LENGTH('Users', 'AadhaarNumber') IS NULL
                    ALTER TABLE [Users] ADD [AadhaarNumber] nvarchar(12) NULL;
                """);

            migrationBuilder.Sql(
                """
                UPDATE u
                SET Phone = CASE
                    WHEN LEN(d.DigitsOnly) >= 10
                         AND SUBSTRING(d.DigitsOnly, LEN(d.DigitsOnly) - 9, 10) LIKE '[6789][0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9]'
                    THEN SUBSTRING(d.DigitsOnly, LEN(d.DigitsOnly) - 9, 10)
                    ELSE NULL
                END
                FROM Users u
                CROSS APPLY (
                    SELECT REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(ISNULL(u.Phone, ''), '+', ''), ' ', ''), '-', ''), '(', ''), ')', ''), '.', ''), CHAR(9), '') AS DigitsOnly
                ) d
                WHERE u.Phone IS NOT NULL AND LTRIM(RTRIM(u.Phone)) <> '';

                UPDATE u
                SET EmergencyPhone = CASE
                    WHEN LEN(d.DigitsOnly) >= 10
                         AND SUBSTRING(d.DigitsOnly, LEN(d.DigitsOnly) - 9, 10) LIKE '[6789][0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9]'
                    THEN SUBSTRING(d.DigitsOnly, LEN(d.DigitsOnly) - 9, 10)
                    ELSE NULL
                END
                FROM Users u
                CROSS APPLY (
                    SELECT REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(ISNULL(u.EmergencyPhone, ''), '+', ''), ' ', ''), '-', ''), '(', ''), ')', ''), '.', ''), CHAR(9), '') AS DigitsOnly
                ) d
                WHERE u.EmergencyPhone IS NOT NULL AND LTRIM(RTRIM(u.EmergencyPhone)) <> '';

                ;WITH DupPhones AS (
                    SELECT Id, ROW_NUMBER() OVER (PARTITION BY Phone ORDER BY Id) AS rn
                    FROM Users
                    WHERE Phone IS NOT NULL
                )
                UPDATE Users SET Phone = NULL
                WHERE Id IN (SELECT Id FROM DupPhones WHERE rn > 1);

                IF EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_Users_Phone' AND object_id = OBJECT_ID(N'Users'))
                    DROP INDEX [IX_Users_Phone] ON [Users];
                IF EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_Users_MobileNumber' AND object_id = OBJECT_ID(N'Users'))
                    DROP INDEX [IX_Users_MobileNumber] ON [Users];
                IF EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'UQ_Users_MobileNumber' AND object_id = OBJECT_ID(N'Users'))
                    DROP INDEX [UQ_Users_MobileNumber] ON [Users];

                IF COL_LENGTH('Users', 'Phone') IS NOT NULL
                    ALTER TABLE [Users] ALTER COLUMN [Phone] nvarchar(10) NULL;
                IF COL_LENGTH('Users', 'EmergencyPhone') IS NOT NULL
                    ALTER TABLE [Users] ALTER COLUMN [EmergencyPhone] nvarchar(10) NULL;
                """);

            migrationBuilder.Sql(
                """
                IF COL_LENGTH('Users', 'AadhaarNumber') IS NOT NULL
                   AND NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_Users_AadhaarNumber' AND object_id = OBJECT_ID(N'Users'))
                    CREATE UNIQUE INDEX [IX_Users_AadhaarNumber] ON [Users]([AadhaarNumber])
                    WHERE [AadhaarNumber] IS NOT NULL AND [IsDeleted] = 0;

                IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'UQ_Users_MobileNumber' AND object_id = OBJECT_ID(N'Users'))
                    CREATE UNIQUE INDEX [UQ_Users_MobileNumber] ON [Users]([Phone])
                    WHERE [Phone] IS NOT NULL;

                IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_Users_MobileNumber' AND object_id = OBJECT_ID(N'Users'))
                    CREATE INDEX [IX_Users_MobileNumber] ON [Users]([Phone])
                    WHERE [Phone] IS NOT NULL;
                """);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(
                """
                IF EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_Users_MobileNumber' AND object_id = OBJECT_ID(N'Users'))
                    DROP INDEX [IX_Users_MobileNumber] ON [Users];
                IF EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'UQ_Users_MobileNumber' AND object_id = OBJECT_ID(N'Users'))
                    DROP INDEX [UQ_Users_MobileNumber] ON [Users];
                IF EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_Users_AadhaarNumber' AND object_id = OBJECT_ID(N'Users'))
                    DROP INDEX [IX_Users_AadhaarNumber] ON [Users];

                IF COL_LENGTH('Users', 'AadhaarNumber') IS NOT NULL
                    ALTER TABLE [Users] DROP COLUMN [AadhaarNumber];

                IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_Users_Phone' AND object_id = OBJECT_ID(N'Users'))
                    CREATE UNIQUE INDEX [IX_Users_Phone] ON [Users]([Phone])
                    WHERE [Phone] IS NOT NULL;
                """);
        }
    }
}
