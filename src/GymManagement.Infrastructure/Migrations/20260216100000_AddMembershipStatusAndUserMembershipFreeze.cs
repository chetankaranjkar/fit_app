using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Microsoft.EntityFrameworkCore.Infrastructure;
using GymManagement.Infrastructure.Data;

#nullable disable

namespace GymManagement.Infrastructure.Migrations
{
    [DbContext(typeof(ApplicationDbContext))]
    [Migration("20260216100000_AddMembershipStatusAndUserMembershipFreeze")]
    public partial class AddMembershipStatusAndUserMembershipFreeze : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Create membership_status table (allowed values: Active, Expired, Frozen, Cancelled, Pending)
            migrationBuilder.CreateTable(
                name: "membership_status",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    Name = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_membership_status", x => x.Id);
                });

            migrationBuilder.CreateIndex(
                name: "IX_membership_status_Name",
                table: "membership_status",
                column: "Name",
                unique: true);

            // Seed allowed status values (raw SQL to avoid model lookup during migration)
            migrationBuilder.Sql(@"
                SET IDENTITY_INSERT [membership_status] ON;
                INSERT INTO [membership_status] ([Id], [Name]) VALUES
                (1, N'Active'),
                (2, N'Expired'),
                (3, N'Frozen'),
                (4, N'Cancelled'),
                (5, N'Pending');
                SET IDENTITY_INSERT [membership_status] OFF;
            ");

            // Migrate any existing "Paused" to "Frozen" before altering column
            migrationBuilder.Sql(
                "UPDATE user_memberships SET Status = N'Frozen' WHERE Status = N'Paused';");

            // Alter user_memberships.Status to NVARCHAR(50) NOT NULL
            migrationBuilder.AlterColumn<string>(
                name: "Status",
                table: "user_memberships",
                type: "nvarchar(50)",
                maxLength: 50,
                nullable: false,
                oldClrType: typeof(string),
                oldType: "nvarchar(max)",
                oldNullable: false);

            // Add freeze columns to user_memberships
            migrationBuilder.AddColumn<DateTime>(
                name: "FreezeStartDate",
                table: "user_memberships",
                type: "datetime2",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "FreezeEndDate",
                table: "user_memberships",
                type: "datetime2",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "FreezeReason",
                table: "user_memberships",
                type: "nvarchar(500)",
                maxLength: 500,
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "FreezeReason",
                table: "user_memberships");

            migrationBuilder.DropColumn(
                name: "FreezeEndDate",
                table: "user_memberships");

            migrationBuilder.DropColumn(
                name: "FreezeStartDate",
                table: "user_memberships");

            migrationBuilder.AlterColumn<string>(
                name: "Status",
                table: "user_memberships",
                type: "nvarchar(max)",
                nullable: false,
                oldClrType: typeof(string),
                oldType: "nvarchar(50)",
                oldMaxLength: 50,
                oldNullable: false);

            migrationBuilder.DropTable(
                name: "membership_status");
        }
    }
}
