using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Microsoft.EntityFrameworkCore.Infrastructure;
using GymManagement.Infrastructure.Data;

#nullable disable

namespace GymManagement.Infrastructure.Migrations
{
    [DbContext(typeof(ApplicationDbContext))]
    [Migration("20260219140000_AddOrganizationsAndOrganizationId")]
    public partial class AddOrganizationsAndOrganizationId : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "Organizations",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    Name = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    OrganizationType = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: true),
                    SubscriptionPlanId = table.Column<int>(type: "int", nullable: true),
                    IsActive = table.Column<bool>(type: "bit", nullable: false),
                    CreatedDate = table.Column<DateTime>(type: "datetime2", nullable: false, defaultValueSql: "GETDATE()")
                },
                constraints: table => table.PrimaryKey("PK_Organizations", x => x.Id));

            migrationBuilder.AddColumn<int>(
                name: "OrganizationId",
                table: "Branches",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "OrganizationId",
                table: "Users",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "OrganizationId",
                table: "Trainer",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "OrganizationId",
                table: "WorkoutPlans",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "OrganizationId",
                table: "DietPlans",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "OrganizationId",
                table: "membership_plans",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "OrganizationId",
                table: "payments",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "OrganizationId",
                table: "Announcements",
                type: "int",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_Branches_OrganizationId",
                table: "Branches",
                column: "OrganizationId");

            migrationBuilder.CreateIndex(
                name: "IX_Users_OrganizationId",
                table: "Users",
                column: "OrganizationId");

            migrationBuilder.CreateIndex(
                name: "IX_Trainer_OrganizationId",
                table: "Trainer",
                column: "OrganizationId");

            migrationBuilder.CreateIndex(
                name: "IX_WorkoutPlans_OrganizationId",
                table: "WorkoutPlans",
                column: "OrganizationId");

            migrationBuilder.CreateIndex(
                name: "IX_DietPlans_OrganizationId",
                table: "DietPlans",
                column: "OrganizationId");

            migrationBuilder.CreateIndex(
                name: "IX_membership_plans_OrganizationId",
                table: "membership_plans",
                column: "OrganizationId");

            migrationBuilder.CreateIndex(
                name: "IX_payments_OrganizationId",
                table: "payments",
                column: "OrganizationId");

            migrationBuilder.CreateIndex(
                name: "IX_Announcements_OrganizationId",
                table: "Announcements",
                column: "OrganizationId");

            migrationBuilder.AddForeignKey(
                name: "FK_Branches_Organizations_OrganizationId",
                table: "Branches",
                column: "OrganizationId",
                principalTable: "Organizations",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);

            migrationBuilder.AddForeignKey(
                name: "FK_Users_Organizations_OrganizationId",
                table: "Users",
                column: "OrganizationId",
                principalTable: "Organizations",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);

            migrationBuilder.AddForeignKey(
                name: "FK_Trainer_Organizations_OrganizationId",
                table: "Trainer",
                column: "OrganizationId",
                principalTable: "Organizations",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);

            migrationBuilder.AddForeignKey(
                name: "FK_WorkoutPlans_Organizations_OrganizationId",
                table: "WorkoutPlans",
                column: "OrganizationId",
                principalTable: "Organizations",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);

            migrationBuilder.AddForeignKey(
                name: "FK_DietPlans_Organizations_OrganizationId",
                table: "DietPlans",
                column: "OrganizationId",
                principalTable: "Organizations",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);

            migrationBuilder.AddForeignKey(
                name: "FK_membership_plans_Organizations_OrganizationId",
                table: "membership_plans",
                column: "OrganizationId",
                principalTable: "Organizations",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);

            migrationBuilder.AddForeignKey(
                name: "FK_payments_Organizations_OrganizationId",
                table: "payments",
                column: "OrganizationId",
                principalTable: "Organizations",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);

            migrationBuilder.AddForeignKey(
                name: "FK_Announcements_Organizations_OrganizationId",
                table: "Announcements",
                column: "OrganizationId",
                principalTable: "Organizations",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Announcements_Organizations_OrganizationId",
                table: "Announcements");

            migrationBuilder.DropForeignKey(
                name: "FK_Branches_Organizations_OrganizationId",
                table: "Branches");

            migrationBuilder.DropForeignKey(
                name: "FK_DietPlans_Organizations_OrganizationId",
                table: "DietPlans");

            migrationBuilder.DropForeignKey(
                name: "FK_membership_plans_Organizations_OrganizationId",
                table: "membership_plans");

            migrationBuilder.DropForeignKey(
                name: "FK_payments_Organizations_OrganizationId",
                table: "payments");

            migrationBuilder.DropForeignKey(
                name: "FK_Trainer_Organizations_OrganizationId",
                table: "Trainer");

            migrationBuilder.DropForeignKey(
                name: "FK_Users_Organizations_OrganizationId",
                table: "Users");

            migrationBuilder.DropForeignKey(
                name: "FK_WorkoutPlans_Organizations_OrganizationId",
                table: "WorkoutPlans");

            migrationBuilder.DropIndex(
                name: "IX_Announcements_OrganizationId",
                table: "Announcements");

            migrationBuilder.DropIndex(
                name: "IX_Branches_OrganizationId",
                table: "Branches");

            migrationBuilder.DropIndex(
                name: "IX_DietPlans_OrganizationId",
                table: "DietPlans");

            migrationBuilder.DropIndex(
                name: "IX_membership_plans_OrganizationId",
                table: "membership_plans");

            migrationBuilder.DropIndex(
                name: "IX_payments_OrganizationId",
                table: "payments");

            migrationBuilder.DropIndex(
                name: "IX_Trainer_OrganizationId",
                table: "Trainer");

            migrationBuilder.DropIndex(
                name: "IX_Users_OrganizationId",
                table: "Users");

            migrationBuilder.DropIndex(
                name: "IX_WorkoutPlans_OrganizationId",
                table: "WorkoutPlans");

            migrationBuilder.DropColumn(
                name: "OrganizationId",
                table: "Announcements");

            migrationBuilder.DropColumn(
                name: "OrganizationId",
                table: "Branches");

            migrationBuilder.DropColumn(
                name: "OrganizationId",
                table: "DietPlans");

            migrationBuilder.DropColumn(
                name: "OrganizationId",
                table: "membership_plans");

            migrationBuilder.DropColumn(
                name: "OrganizationId",
                table: "payments");

            migrationBuilder.DropColumn(
                name: "OrganizationId",
                table: "Trainer");

            migrationBuilder.DropColumn(
                name: "OrganizationId",
                table: "Users");

            migrationBuilder.DropColumn(
                name: "OrganizationId",
                table: "WorkoutPlans");

            migrationBuilder.DropTable(
                name: "Organizations");
        }
    }
}
