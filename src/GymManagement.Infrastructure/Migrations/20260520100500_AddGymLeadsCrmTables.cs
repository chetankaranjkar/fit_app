using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace GymManagement.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddGymLeadsCrmTables : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "gym_leads",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    FullName = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    Phone = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: true),
                    Email = table.Column<string>(type: "nvarchar(256)", maxLength: 256, nullable: true),
                    Gender = table.Column<string>(type: "nvarchar(32)", maxLength: 32, nullable: false),
                    Age = table.Column<int>(type: "int", nullable: true),
                    Occupation = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: true),
                    FitnessGoal = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: true),
                    LeadSource = table.Column<string>(type: "nvarchar(120)", maxLength: 120, nullable: true),
                    ReferenceName = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: true),
                    Notes = table.Column<string>(type: "nvarchar(4000)", maxLength: 4000, nullable: true),
                    Status = table.Column<string>(type: "nvarchar(32)", maxLength: 32, nullable: false),
                    NextFollowUpAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    ConvertedMemberId = table.Column<int>(type: "int", nullable: true),
                    ConvertedAtUtc = table.Column<DateTime>(type: "datetime2", nullable: true),
                    OrganizationId = table.Column<int>(type: "int", nullable: true),
                    CreatedDate = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedDate = table.Column<DateTime>(type: "datetime2", nullable: true),
                    IsDeleted = table.Column<bool>(type: "bit", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_gym_leads", x => x.Id);
                    table.ForeignKey(
                        name: "FK_gym_leads_Organizations_OrganizationId",
                        column: x => x.OrganizationId,
                        principalTable: "Organizations",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_gym_leads_Users_ConvertedMemberId",
                        column: x => x.ConvertedMemberId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                });

            migrationBuilder.CreateTable(
                name: "lead_followups",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    GymLeadId = table.Column<int>(type: "int", nullable: false),
                    Notes = table.Column<string>(type: "nvarchar(4000)", maxLength: 4000, nullable: false),
                    NextFollowUpAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    CallRemarks = table.Column<string>(type: "nvarchar(2000)", maxLength: 2000, nullable: true),
                    CreatedByUserId = table.Column<int>(type: "int", nullable: true),
                    CreatedDate = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedDate = table.Column<DateTime>(type: "datetime2", nullable: true),
                    IsDeleted = table.Column<bool>(type: "bit", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_lead_followups", x => x.Id);
                    table.ForeignKey(
                        name: "FK_lead_followups_Users_CreatedByUserId",
                        column: x => x.CreatedByUserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_lead_followups_gym_leads_GymLeadId",
                        column: x => x.GymLeadId,
                        principalTable: "gym_leads",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "lead_trials",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    GymLeadId = table.Column<int>(type: "int", nullable: false),
                    TrialDate = table.Column<DateTime>(type: "datetime2", nullable: false),
                    AssignedTrainerId = table.Column<int>(type: "int", nullable: false),
                    Feedback = table.Column<string>(type: "nvarchar(4000)", maxLength: 4000, nullable: true),
                    ConversionProbability = table.Column<int>(type: "int", nullable: true),
                    CreatedDate = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedDate = table.Column<DateTime>(type: "datetime2", nullable: true),
                    IsDeleted = table.Column<bool>(type: "bit", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_lead_trials", x => x.Id);
                    table.ForeignKey(
                        name: "FK_lead_trials_Trainer_AssignedTrainerId",
                        column: x => x.AssignedTrainerId,
                        principalTable: "Trainer",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_lead_trials_gym_leads_GymLeadId",
                        column: x => x.GymLeadId,
                        principalTable: "gym_leads",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_gym_leads_ConvertedMemberId",
                table: "gym_leads",
                column: "ConvertedMemberId");

            migrationBuilder.CreateIndex(
                name: "IX_gym_leads_CreatedDate",
                table: "gym_leads",
                column: "CreatedDate");

            migrationBuilder.CreateIndex(
                name: "IX_gym_leads_LeadSource",
                table: "gym_leads",
                column: "LeadSource");

            migrationBuilder.CreateIndex(
                name: "IX_gym_leads_NextFollowUpAt",
                table: "gym_leads",
                column: "NextFollowUpAt");

            migrationBuilder.CreateIndex(
                name: "IX_gym_leads_OrganizationId",
                table: "gym_leads",
                column: "OrganizationId");

            migrationBuilder.CreateIndex(
                name: "IX_gym_leads_Status",
                table: "gym_leads",
                column: "Status");

            migrationBuilder.CreateIndex(
                name: "IX_lead_followups_CreatedByUserId",
                table: "lead_followups",
                column: "CreatedByUserId");

            migrationBuilder.CreateIndex(
                name: "IX_lead_followups_GymLeadId",
                table: "lead_followups",
                column: "GymLeadId");

            migrationBuilder.CreateIndex(
                name: "IX_lead_followups_NextFollowUpAt",
                table: "lead_followups",
                column: "NextFollowUpAt");

            migrationBuilder.CreateIndex(
                name: "IX_lead_trials_AssignedTrainerId",
                table: "lead_trials",
                column: "AssignedTrainerId");

            migrationBuilder.CreateIndex(
                name: "IX_lead_trials_GymLeadId",
                table: "lead_trials",
                column: "GymLeadId");

            migrationBuilder.CreateIndex(
                name: "IX_lead_trials_TrialDate",
                table: "lead_trials",
                column: "TrialDate");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "lead_followups");

            migrationBuilder.DropTable(
                name: "lead_trials");

            migrationBuilder.DropTable(
                name: "gym_leads");
        }
    }
}
