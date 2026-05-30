using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace GymManagement.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddHealthProfileModule : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_WorkoutSessions_MemberId",
                table: "WorkoutSessions");

            migrationBuilder.CreateTable(
                name: "users_health_profile",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    UserId = table.Column<int>(type: "int", nullable: false),
                    HealthOverview = table.Column<string>(type: "nvarchar(4000)", maxLength: 4000, nullable: true),
                    ParqChestPainDuringExercise = table.Column<bool>(type: "bit", nullable: true),
                    ParqDoctorAdvisedAgainstExercise = table.Column<bool>(type: "bit", nullable: true),
                    ParqShortnessOfBreath = table.Column<bool>(type: "bit", nullable: true),
                    ParqDizzinessOrFainting = table.Column<bool>(type: "bit", nullable: true),
                    ParqRecentSurgery = table.Column<bool>(type: "bit", nullable: true),
                    SmokingStatus = table.Column<string>(type: "nvarchar(30)", maxLength: 30, nullable: true),
                    AlcoholFrequency = table.Column<string>(type: "nvarchar(30)", maxLength: 30, nullable: true),
                    StressLevel = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: true),
                    SleepHours = table.Column<decimal>(type: "decimal(4,1)", precision: 4, scale: 1, nullable: true),
                    DoctorName = table.Column<string>(type: "nvarchar(150)", maxLength: 150, nullable: true),
                    DoctorClinic = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: true),
                    DoctorContactNumber = table.Column<string>(type: "nvarchar(30)", maxLength: 30, nullable: true),
                    RiskLevel = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false),
                    ExerciseRestrictions = table.Column<string>(type: "nvarchar(4000)", maxLength: 4000, nullable: true),
                    IsCompleted = table.Column<bool>(type: "bit", nullable: false),
                    LastAssessedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    CreatedDate = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedDate = table.Column<DateTime>(type: "datetime2", nullable: true),
                    IsDeleted = table.Column<bool>(type: "bit", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_users_health_profile", x => x.Id);
                    table.ForeignKey(
                        name: "FK_users_health_profile_Users_UserId",
                        column: x => x.UserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "users_emergency_contacts",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    UserHealthProfileId = table.Column<int>(type: "int", nullable: false),
                    Name = table.Column<string>(type: "nvarchar(150)", maxLength: 150, nullable: false),
                    Relationship = table.Column<string>(type: "nvarchar(80)", maxLength: 80, nullable: true),
                    Mobile = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false),
                    CreatedDate = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedDate = table.Column<DateTime>(type: "datetime2", nullable: true),
                    IsDeleted = table.Column<bool>(type: "bit", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_users_emergency_contacts", x => x.Id);
                    table.ForeignKey(
                        name: "FK_users_emergency_contacts_users_health_profile_UserHealthProfileId",
                        column: x => x.UserHealthProfileId,
                        principalTable: "users_health_profile",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "users_injuries",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    UserHealthProfileId = table.Column<int>(type: "int", nullable: false),
                    BodyPart = table.Column<string>(type: "nvarchar(80)", maxLength: 80, nullable: false),
                    InjuryType = table.Column<string>(type: "nvarchar(80)", maxLength: 80, nullable: false),
                    Status = table.Column<string>(type: "nvarchar(30)", maxLength: 30, nullable: false),
                    Notes = table.Column<string>(type: "nvarchar(1000)", maxLength: 1000, nullable: true),
                    CreatedDate = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedDate = table.Column<DateTime>(type: "datetime2", nullable: true),
                    IsDeleted = table.Column<bool>(type: "bit", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_users_injuries", x => x.Id);
                    table.ForeignKey(
                        name: "FK_users_injuries_users_health_profile_UserHealthProfileId",
                        column: x => x.UserHealthProfileId,
                        principalTable: "users_health_profile",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "users_medical_conditions",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    UserHealthProfileId = table.Column<int>(type: "int", nullable: false),
                    ConditionCode = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    CustomConditionName = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: true),
                    Notes = table.Column<string>(type: "nvarchar(1000)", maxLength: 1000, nullable: true),
                    CreatedDate = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedDate = table.Column<DateTime>(type: "datetime2", nullable: true),
                    IsDeleted = table.Column<bool>(type: "bit", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_users_medical_conditions", x => x.Id);
                    table.ForeignKey(
                        name: "FK_users_medical_conditions_users_health_profile_UserHealthProfileId",
                        column: x => x.UserHealthProfileId,
                        principalTable: "users_health_profile",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "users_medications",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    UserHealthProfileId = table.Column<int>(type: "int", nullable: false),
                    MedicationName = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    Dosage = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: true),
                    Reason = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: true),
                    CreatedDate = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedDate = table.Column<DateTime>(type: "datetime2", nullable: true),
                    IsDeleted = table.Column<bool>(type: "bit", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_users_medications", x => x.Id);
                    table.ForeignKey(
                        name: "FK_users_medications_users_health_profile_UserHealthProfileId",
                        column: x => x.UserHealthProfileId,
                        principalTable: "users_health_profile",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_WorkoutSessions_OneInProgressPerMember",
                table: "WorkoutSessions",
                column: "MemberId",
                unique: true,
                filter: "[IsDeleted] = 0 AND [Status] = N'InProgress' AND [MemberId] IS NOT NULL");

            migrationBuilder.CreateIndex(
                name: "IX_users_emergency_contacts_UserHealthProfileId",
                table: "users_emergency_contacts",
                column: "UserHealthProfileId");

            migrationBuilder.CreateIndex(
                name: "IX_users_health_profile_UserId",
                table: "users_health_profile",
                column: "UserId",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_users_injuries_UserHealthProfileId",
                table: "users_injuries",
                column: "UserHealthProfileId");

            migrationBuilder.CreateIndex(
                name: "IX_users_medical_conditions_UserHealthProfileId",
                table: "users_medical_conditions",
                column: "UserHealthProfileId");

            migrationBuilder.CreateIndex(
                name: "IX_users_medications_UserHealthProfileId",
                table: "users_medications",
                column: "UserHealthProfileId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "users_emergency_contacts");

            migrationBuilder.DropTable(
                name: "users_injuries");

            migrationBuilder.DropTable(
                name: "users_medical_conditions");

            migrationBuilder.DropTable(
                name: "users_medications");

            migrationBuilder.DropTable(
                name: "users_health_profile");

            migrationBuilder.DropIndex(
                name: "IX_WorkoutSessions_OneInProgressPerMember",
                table: "WorkoutSessions");

            migrationBuilder.CreateIndex(
                name: "IX_WorkoutSessions_MemberId",
                table: "WorkoutSessions",
                column: "MemberId");
        }
    }
}
