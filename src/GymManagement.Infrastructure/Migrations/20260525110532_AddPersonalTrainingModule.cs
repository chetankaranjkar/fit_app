using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace GymManagement.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddPersonalTrainingModule : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "PT_Notifications",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    UserId = table.Column<int>(type: "int", nullable: true),
                    TrainerId = table.Column<int>(type: "int", nullable: true),
                    PTSessionId = table.Column<int>(type: "int", nullable: true),
                    MemberPTPackageId = table.Column<int>(type: "int", nullable: true),
                    NotificationType = table.Column<string>(type: "nvarchar(40)", maxLength: 40, nullable: false),
                    Title = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    Body = table.Column<string>(type: "nvarchar(2000)", maxLength: 2000, nullable: true),
                    IsRead = table.Column<bool>(type: "bit", nullable: false),
                    ScheduledForUtc = table.Column<DateTime>(type: "datetime2", nullable: true),
                    SentAtUtc = table.Column<DateTime>(type: "datetime2", nullable: true),
                    Channel = table.Column<string>(type: "nvarchar(30)", maxLength: 30, nullable: false),
                    CreatedDate = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedDate = table.Column<DateTime>(type: "datetime2", nullable: true),
                    IsDeleted = table.Column<bool>(type: "bit", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_PT_Notifications", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "PT_Packages",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    PackageName = table.Column<string>(type: "nvarchar(150)", maxLength: 150, nullable: false),
                    Description = table.Column<string>(type: "nvarchar(2000)", maxLength: 2000, nullable: true),
                    PackageType = table.Column<string>(type: "nvarchar(30)", maxLength: 30, nullable: false),
                    TotalSessions = table.Column<int>(type: "int", nullable: false),
                    ValidityDays = table.Column<int>(type: "int", nullable: false),
                    Price = table.Column<decimal>(type: "decimal(12,2)", precision: 12, scale: 2, nullable: false),
                    TaxPercentage = table.Column<decimal>(type: "decimal(5,2)", precision: 5, scale: 2, nullable: false),
                    DefaultDiscountAmount = table.Column<decimal>(type: "decimal(12,2)", precision: 12, scale: 2, nullable: false),
                    IsActive = table.Column<bool>(type: "bit", nullable: false),
                    OrganizationId = table.Column<int>(type: "int", nullable: true),
                    OrganizationId1 = table.Column<int>(type: "int", nullable: true),
                    CreatedDate = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedDate = table.Column<DateTime>(type: "datetime2", nullable: true),
                    IsDeleted = table.Column<bool>(type: "bit", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_PT_Packages", x => x.Id);
                    table.ForeignKey(
                        name: "FK_PT_Packages_Organizations_OrganizationId",
                        column: x => x.OrganizationId,
                        principalTable: "Organizations",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_PT_Packages_Organizations_OrganizationId1",
                        column: x => x.OrganizationId1,
                        principalTable: "Organizations",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateTable(
                name: "PT_Payouts",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    TrainerId = table.Column<int>(type: "int", nullable: false),
                    Year = table.Column<int>(type: "int", nullable: false),
                    Month = table.Column<int>(type: "int", nullable: false),
                    TotalAmount = table.Column<decimal>(type: "decimal(12,2)", precision: 12, scale: 2, nullable: false),
                    Status = table.Column<string>(type: "nvarchar(30)", maxLength: 30, nullable: false),
                    PaidDate = table.Column<DateTime>(type: "datetime2", nullable: true),
                    Notes = table.Column<string>(type: "nvarchar(2000)", maxLength: 2000, nullable: true),
                    CreatedDate = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedDate = table.Column<DateTime>(type: "datetime2", nullable: true),
                    IsDeleted = table.Column<bool>(type: "bit", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_PT_Payouts", x => x.Id);
                    table.ForeignKey(
                        name: "FK_PT_Payouts_Trainer_TrainerId",
                        column: x => x.TrainerId,
                        principalTable: "Trainer",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "PT_TrainerLeaves",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    TrainerId = table.Column<int>(type: "int", nullable: false),
                    StartDate = table.Column<DateTime>(type: "datetime2", nullable: false),
                    EndDate = table.Column<DateTime>(type: "datetime2", nullable: false),
                    Reason = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: true),
                    IsApproved = table.Column<bool>(type: "bit", nullable: false),
                    CreatedDate = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedDate = table.Column<DateTime>(type: "datetime2", nullable: true),
                    IsDeleted = table.Column<bool>(type: "bit", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_PT_TrainerLeaves", x => x.Id);
                    table.ForeignKey(
                        name: "FK_PT_TrainerLeaves_Trainer_TrainerId",
                        column: x => x.TrainerId,
                        principalTable: "Trainer",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "PT_TrainerSchedules",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    TrainerId = table.Column<int>(type: "int", nullable: false),
                    DayOfWeek = table.Column<int>(type: "int", nullable: false),
                    StartTime = table.Column<TimeSpan>(type: "time", nullable: false),
                    EndTime = table.Column<TimeSpan>(type: "time", nullable: false),
                    BreakStart = table.Column<TimeSpan>(type: "time", nullable: true),
                    BreakEnd = table.Column<TimeSpan>(type: "time", nullable: true),
                    SessionDurationMinutes = table.Column<int>(type: "int", nullable: false),
                    MaxSessionsPerDay = table.Column<int>(type: "int", nullable: false),
                    IsActive = table.Column<bool>(type: "bit", nullable: false),
                    CreatedDate = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedDate = table.Column<DateTime>(type: "datetime2", nullable: true),
                    IsDeleted = table.Column<bool>(type: "bit", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_PT_TrainerSchedules", x => x.Id);
                    table.ForeignKey(
                        name: "FK_PT_TrainerSchedules_Trainer_TrainerId",
                        column: x => x.TrainerId,
                        principalTable: "Trainer",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "PT_CommissionRules",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    TrainerId = table.Column<int>(type: "int", nullable: false),
                    CommissionType = table.Column<string>(type: "nvarchar(30)", maxLength: 30, nullable: false),
                    Percentage = table.Column<decimal>(type: "decimal(5,2)", precision: 5, scale: 2, nullable: true),
                    FixedAmount = table.Column<decimal>(type: "decimal(12,2)", precision: 12, scale: 2, nullable: true),
                    PackageId = table.Column<int>(type: "int", nullable: true),
                    IsActive = table.Column<bool>(type: "bit", nullable: false),
                    EffectiveFrom = table.Column<DateTime>(type: "datetime2", nullable: false),
                    EffectiveTo = table.Column<DateTime>(type: "datetime2", nullable: true),
                    CreatedDate = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedDate = table.Column<DateTime>(type: "datetime2", nullable: true),
                    IsDeleted = table.Column<bool>(type: "bit", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_PT_CommissionRules", x => x.Id);
                    table.ForeignKey(
                        name: "FK_PT_CommissionRules_PT_Packages_PackageId",
                        column: x => x.PackageId,
                        principalTable: "PT_Packages",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_PT_CommissionRules_Trainer_TrainerId",
                        column: x => x.TrainerId,
                        principalTable: "Trainer",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "PT_PackageInvoices",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    InvoiceNumber = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    Category = table.Column<string>(type: "nvarchar(30)", maxLength: 30, nullable: false),
                    UserId = table.Column<int>(type: "int", nullable: false),
                    TrainerId = table.Column<int>(type: "int", nullable: false),
                    PackageId = table.Column<int>(type: "int", nullable: false),
                    SessionCount = table.Column<int>(type: "int", nullable: false),
                    ValidityDays = table.Column<int>(type: "int", nullable: false),
                    Subtotal = table.Column<decimal>(type: "decimal(12,2)", precision: 12, scale: 2, nullable: false),
                    TaxAmount = table.Column<decimal>(type: "decimal(12,2)", precision: 12, scale: 2, nullable: false),
                    DiscountAmount = table.Column<decimal>(type: "decimal(12,2)", precision: 12, scale: 2, nullable: false),
                    CouponDiscountAmount = table.Column<decimal>(type: "decimal(12,2)", precision: 12, scale: 2, nullable: false),
                    CouponCode = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: true),
                    TotalAmount = table.Column<decimal>(type: "decimal(12,2)", precision: 12, scale: 2, nullable: false),
                    PaidAmount = table.Column<decimal>(type: "decimal(12,2)", precision: 12, scale: 2, nullable: false),
                    PaymentStatus = table.Column<string>(type: "nvarchar(30)", maxLength: 30, nullable: false),
                    IssueDate = table.Column<DateTime>(type: "datetime2", nullable: false),
                    PaidDate = table.Column<DateTime>(type: "datetime2", nullable: true),
                    Notes = table.Column<string>(type: "nvarchar(2000)", maxLength: 2000, nullable: true),
                    CashierUserId = table.Column<int>(type: "int", nullable: true),
                    OrganizationId = table.Column<int>(type: "int", nullable: true),
                    CreatedDate = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedDate = table.Column<DateTime>(type: "datetime2", nullable: true),
                    IsDeleted = table.Column<bool>(type: "bit", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_PT_PackageInvoices", x => x.Id);
                    table.ForeignKey(
                        name: "FK_PT_PackageInvoices_PT_Packages_PackageId",
                        column: x => x.PackageId,
                        principalTable: "PT_Packages",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_PT_PackageInvoices_Trainer_TrainerId",
                        column: x => x.TrainerId,
                        principalTable: "Trainer",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_PT_PackageInvoices_Users_UserId",
                        column: x => x.UserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "PT_PackagePrices",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    PackageId = table.Column<int>(type: "int", nullable: false),
                    TrainerId = table.Column<int>(type: "int", nullable: false),
                    Price = table.Column<decimal>(type: "decimal(12,2)", precision: 12, scale: 2, nullable: false),
                    IsActive = table.Column<bool>(type: "bit", nullable: false),
                    CreatedDate = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedDate = table.Column<DateTime>(type: "datetime2", nullable: true),
                    IsDeleted = table.Column<bool>(type: "bit", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_PT_PackagePrices", x => x.Id);
                    table.ForeignKey(
                        name: "FK_PT_PackagePrices_PT_Packages_PackageId",
                        column: x => x.PackageId,
                        principalTable: "PT_Packages",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_PT_PackagePrices_Trainer_TrainerId",
                        column: x => x.TrainerId,
                        principalTable: "Trainer",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "PT_MemberPackages",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    UserId = table.Column<int>(type: "int", nullable: false),
                    TrainerId = table.Column<int>(type: "int", nullable: false),
                    PackageId = table.Column<int>(type: "int", nullable: false),
                    InvoiceNumber = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: true),
                    PTPackageInvoiceId = table.Column<int>(type: "int", nullable: true),
                    TotalSessions = table.Column<int>(type: "int", nullable: false),
                    RemainingSessions = table.Column<int>(type: "int", nullable: false),
                    StartDate = table.Column<DateTime>(type: "datetime2", nullable: false),
                    ExpiryDate = table.Column<DateTime>(type: "datetime2", nullable: false),
                    FrozenUntil = table.Column<DateTime>(type: "datetime2", nullable: true),
                    Status = table.Column<string>(type: "nvarchar(30)", maxLength: 30, nullable: false),
                    Subtotal = table.Column<decimal>(type: "decimal(12,2)", precision: 12, scale: 2, nullable: false),
                    TaxAmount = table.Column<decimal>(type: "decimal(12,2)", precision: 12, scale: 2, nullable: false),
                    DiscountAmount = table.Column<decimal>(type: "decimal(12,2)", precision: 12, scale: 2, nullable: false),
                    TotalAmount = table.Column<decimal>(type: "decimal(12,2)", precision: 12, scale: 2, nullable: false),
                    PaidAmount = table.Column<decimal>(type: "decimal(12,2)", precision: 12, scale: 2, nullable: false),
                    PaymentStatus = table.Column<string>(type: "nvarchar(30)", maxLength: 30, nullable: false),
                    CouponCode = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: true),
                    CouponDiscountAmount = table.Column<decimal>(type: "decimal(12,2)", precision: 12, scale: 2, nullable: false),
                    UpgradedFromMemberPackageId = table.Column<int>(type: "int", nullable: true),
                    OrganizationId = table.Column<int>(type: "int", nullable: true),
                    Notes = table.Column<string>(type: "nvarchar(2000)", maxLength: 2000, nullable: true),
                    CreatedDate = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedDate = table.Column<DateTime>(type: "datetime2", nullable: true),
                    IsDeleted = table.Column<bool>(type: "bit", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_PT_MemberPackages", x => x.Id);
                    table.ForeignKey(
                        name: "FK_PT_MemberPackages_PT_MemberPackages_UpgradedFromMemberPackageId",
                        column: x => x.UpgradedFromMemberPackageId,
                        principalTable: "PT_MemberPackages",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_PT_MemberPackages_PT_PackageInvoices_PTPackageInvoiceId",
                        column: x => x.PTPackageInvoiceId,
                        principalTable: "PT_PackageInvoices",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_PT_MemberPackages_PT_Packages_PackageId",
                        column: x => x.PackageId,
                        principalTable: "PT_Packages",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_PT_MemberPackages_Trainer_TrainerId",
                        column: x => x.TrainerId,
                        principalTable: "Trainer",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_PT_MemberPackages_Users_UserId",
                        column: x => x.UserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "PT_MemberPackageHistory",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    MemberPTPackageId = table.Column<int>(type: "int", nullable: false),
                    Action = table.Column<string>(type: "nvarchar(40)", maxLength: 40, nullable: false),
                    SessionsDelta = table.Column<int>(type: "int", nullable: true),
                    RemainingSessionsAfter = table.Column<int>(type: "int", nullable: true),
                    ExpiryDateAfter = table.Column<DateTime>(type: "datetime2", nullable: true),
                    Notes = table.Column<string>(type: "nvarchar(2000)", maxLength: 2000, nullable: true),
                    PerformedByUserId = table.Column<int>(type: "int", nullable: true),
                    CreatedDate = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedDate = table.Column<DateTime>(type: "datetime2", nullable: true),
                    IsDeleted = table.Column<bool>(type: "bit", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_PT_MemberPackageHistory", x => x.Id);
                    table.ForeignKey(
                        name: "FK_PT_MemberPackageHistory_PT_MemberPackages_MemberPTPackageId",
                        column: x => x.MemberPTPackageId,
                        principalTable: "PT_MemberPackages",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "PT_Sessions",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    MemberPTPackageId = table.Column<int>(type: "int", nullable: false),
                    UserId = table.Column<int>(type: "int", nullable: false),
                    TrainerId = table.Column<int>(type: "int", nullable: false),
                    ScheduledStartUtc = table.Column<DateTime>(type: "datetime2", nullable: false),
                    ScheduledEndUtc = table.Column<DateTime>(type: "datetime2", nullable: false),
                    Status = table.Column<string>(type: "nvarchar(30)", maxLength: 30, nullable: false),
                    RescheduledFromSessionId = table.Column<int>(type: "int", nullable: true),
                    Notes = table.Column<string>(type: "nvarchar(2000)", maxLength: 2000, nullable: true),
                    OrganizationId = table.Column<int>(type: "int", nullable: true),
                    CreatedDate = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedDate = table.Column<DateTime>(type: "datetime2", nullable: true),
                    IsDeleted = table.Column<bool>(type: "bit", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_PT_Sessions", x => x.Id);
                    table.ForeignKey(
                        name: "FK_PT_Sessions_PT_MemberPackages_MemberPTPackageId",
                        column: x => x.MemberPTPackageId,
                        principalTable: "PT_MemberPackages",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_PT_Sessions_PT_Sessions_RescheduledFromSessionId",
                        column: x => x.RescheduledFromSessionId,
                        principalTable: "PT_Sessions",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_PT_Sessions_Trainer_TrainerId",
                        column: x => x.TrainerId,
                        principalTable: "Trainer",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_PT_Sessions_Users_UserId",
                        column: x => x.UserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "PT_Attendance",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    PTSessionId = table.Column<int>(type: "int", nullable: false),
                    MemberPresent = table.Column<bool>(type: "bit", nullable: false),
                    TrainerPresent = table.Column<bool>(type: "bit", nullable: false),
                    IsLate = table.Column<bool>(type: "bit", nullable: false),
                    IsNoShow = table.Column<bool>(type: "bit", nullable: false),
                    CompletedAtUtc = table.Column<DateTime>(type: "datetime2", nullable: true),
                    CreatedDate = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedDate = table.Column<DateTime>(type: "datetime2", nullable: true),
                    IsDeleted = table.Column<bool>(type: "bit", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_PT_Attendance", x => x.Id);
                    table.ForeignKey(
                        name: "FK_PT_Attendance_PT_Sessions_PTSessionId",
                        column: x => x.PTSessionId,
                        principalTable: "PT_Sessions",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "PT_Commissions",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    TrainerId = table.Column<int>(type: "int", nullable: false),
                    PTSessionId = table.Column<int>(type: "int", nullable: true),
                    MemberPTPackageId = table.Column<int>(type: "int", nullable: true),
                    Amount = table.Column<decimal>(type: "decimal(12,2)", precision: 12, scale: 2, nullable: false),
                    CommissionType = table.Column<string>(type: "nvarchar(30)", maxLength: 30, nullable: false),
                    Status = table.Column<string>(type: "nvarchar(30)", maxLength: 30, nullable: false),
                    EarnedDate = table.Column<DateTime>(type: "datetime2", nullable: false),
                    PaidDate = table.Column<DateTime>(type: "datetime2", nullable: true),
                    PayoutId = table.Column<int>(type: "int", nullable: true),
                    BaseAmount = table.Column<decimal>(type: "decimal(12,2)", precision: 12, scale: 2, nullable: true),
                    CreatedDate = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedDate = table.Column<DateTime>(type: "datetime2", nullable: true),
                    IsDeleted = table.Column<bool>(type: "bit", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_PT_Commissions", x => x.Id);
                    table.ForeignKey(
                        name: "FK_PT_Commissions_PT_MemberPackages_MemberPTPackageId",
                        column: x => x.MemberPTPackageId,
                        principalTable: "PT_MemberPackages",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_PT_Commissions_PT_Payouts_PayoutId",
                        column: x => x.PayoutId,
                        principalTable: "PT_Payouts",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_PT_Commissions_PT_Sessions_PTSessionId",
                        column: x => x.PTSessionId,
                        principalTable: "PT_Sessions",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_PT_Commissions_Trainer_TrainerId",
                        column: x => x.TrainerId,
                        principalTable: "Trainer",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "PT_SessionHistory",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    PTSessionId = table.Column<int>(type: "int", nullable: false),
                    FromStatus = table.Column<string>(type: "nvarchar(30)", maxLength: 30, nullable: false),
                    ToStatus = table.Column<string>(type: "nvarchar(30)", maxLength: 30, nullable: false),
                    Notes = table.Column<string>(type: "nvarchar(2000)", maxLength: 2000, nullable: true),
                    PerformedByUserId = table.Column<int>(type: "int", nullable: true),
                    CreatedDate = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedDate = table.Column<DateTime>(type: "datetime2", nullable: true),
                    IsDeleted = table.Column<bool>(type: "bit", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_PT_SessionHistory", x => x.Id);
                    table.ForeignKey(
                        name: "FK_PT_SessionHistory_PT_Sessions_PTSessionId",
                        column: x => x.PTSessionId,
                        principalTable: "PT_Sessions",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_PT_Attendance_PTSessionId",
                table: "PT_Attendance",
                column: "PTSessionId",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_PT_CommissionRules_PackageId",
                table: "PT_CommissionRules",
                column: "PackageId");

            migrationBuilder.CreateIndex(
                name: "IX_PT_CommissionRules_TrainerId",
                table: "PT_CommissionRules",
                column: "TrainerId");

            migrationBuilder.CreateIndex(
                name: "IX_PT_Commissions_MemberPTPackageId",
                table: "PT_Commissions",
                column: "MemberPTPackageId");

            migrationBuilder.CreateIndex(
                name: "IX_PT_Commissions_PayoutId",
                table: "PT_Commissions",
                column: "PayoutId");

            migrationBuilder.CreateIndex(
                name: "IX_PT_Commissions_PTSessionId",
                table: "PT_Commissions",
                column: "PTSessionId");

            migrationBuilder.CreateIndex(
                name: "IX_PT_Commissions_Status",
                table: "PT_Commissions",
                column: "Status");

            migrationBuilder.CreateIndex(
                name: "IX_PT_Commissions_TrainerId",
                table: "PT_Commissions",
                column: "TrainerId");

            migrationBuilder.CreateIndex(
                name: "IX_PT_MemberPackageHistory_MemberPTPackageId",
                table: "PT_MemberPackageHistory",
                column: "MemberPTPackageId");

            migrationBuilder.CreateIndex(
                name: "IX_PT_MemberPackages_ExpiryDate",
                table: "PT_MemberPackages",
                column: "ExpiryDate");

            migrationBuilder.CreateIndex(
                name: "IX_PT_MemberPackages_PackageId",
                table: "PT_MemberPackages",
                column: "PackageId");

            migrationBuilder.CreateIndex(
                name: "IX_PT_MemberPackages_PTPackageInvoiceId",
                table: "PT_MemberPackages",
                column: "PTPackageInvoiceId",
                unique: true,
                filter: "[PTPackageInvoiceId] IS NOT NULL");

            migrationBuilder.CreateIndex(
                name: "IX_PT_MemberPackages_Status",
                table: "PT_MemberPackages",
                column: "Status");

            migrationBuilder.CreateIndex(
                name: "IX_PT_MemberPackages_TrainerId",
                table: "PT_MemberPackages",
                column: "TrainerId");

            migrationBuilder.CreateIndex(
                name: "IX_PT_MemberPackages_UpgradedFromMemberPackageId",
                table: "PT_MemberPackages",
                column: "UpgradedFromMemberPackageId");

            migrationBuilder.CreateIndex(
                name: "IX_PT_MemberPackages_UserId",
                table: "PT_MemberPackages",
                column: "UserId");

            migrationBuilder.CreateIndex(
                name: "IX_PT_Notifications_IsRead",
                table: "PT_Notifications",
                column: "IsRead");

            migrationBuilder.CreateIndex(
                name: "IX_PT_Notifications_TrainerId",
                table: "PT_Notifications",
                column: "TrainerId");

            migrationBuilder.CreateIndex(
                name: "IX_PT_Notifications_UserId",
                table: "PT_Notifications",
                column: "UserId");

            migrationBuilder.CreateIndex(
                name: "IX_PT_PackageInvoices_InvoiceNumber",
                table: "PT_PackageInvoices",
                column: "InvoiceNumber",
                unique: true,
                filter: "[IsDeleted] = 0");

            migrationBuilder.CreateIndex(
                name: "IX_PT_PackageInvoices_IssueDate",
                table: "PT_PackageInvoices",
                column: "IssueDate");

            migrationBuilder.CreateIndex(
                name: "IX_PT_PackageInvoices_PackageId",
                table: "PT_PackageInvoices",
                column: "PackageId");

            migrationBuilder.CreateIndex(
                name: "IX_PT_PackageInvoices_TrainerId",
                table: "PT_PackageInvoices",
                column: "TrainerId");

            migrationBuilder.CreateIndex(
                name: "IX_PT_PackageInvoices_UserId",
                table: "PT_PackageInvoices",
                column: "UserId");

            migrationBuilder.CreateIndex(
                name: "IX_PT_PackagePrices_PackageId_TrainerId",
                table: "PT_PackagePrices",
                columns: new[] { "PackageId", "TrainerId" },
                unique: true,
                filter: "[IsDeleted] = 0");

            migrationBuilder.CreateIndex(
                name: "IX_PT_PackagePrices_TrainerId",
                table: "PT_PackagePrices",
                column: "TrainerId");

            migrationBuilder.CreateIndex(
                name: "IX_PT_Packages_IsActive",
                table: "PT_Packages",
                column: "IsActive");

            migrationBuilder.CreateIndex(
                name: "IX_PT_Packages_OrganizationId",
                table: "PT_Packages",
                column: "OrganizationId");

            migrationBuilder.CreateIndex(
                name: "IX_PT_Packages_OrganizationId1",
                table: "PT_Packages",
                column: "OrganizationId1");

            migrationBuilder.CreateIndex(
                name: "IX_PT_Packages_PackageName",
                table: "PT_Packages",
                column: "PackageName");

            migrationBuilder.CreateIndex(
                name: "IX_PT_Payouts_TrainerId_Year_Month",
                table: "PT_Payouts",
                columns: new[] { "TrainerId", "Year", "Month" },
                unique: true,
                filter: "[IsDeleted] = 0");

            migrationBuilder.CreateIndex(
                name: "IX_PT_SessionHistory_PTSessionId",
                table: "PT_SessionHistory",
                column: "PTSessionId");

            migrationBuilder.CreateIndex(
                name: "IX_PT_Sessions_MemberPTPackageId",
                table: "PT_Sessions",
                column: "MemberPTPackageId");

            migrationBuilder.CreateIndex(
                name: "IX_PT_Sessions_RescheduledFromSessionId",
                table: "PT_Sessions",
                column: "RescheduledFromSessionId");

            migrationBuilder.CreateIndex(
                name: "IX_PT_Sessions_ScheduledStartUtc",
                table: "PT_Sessions",
                column: "ScheduledStartUtc");

            migrationBuilder.CreateIndex(
                name: "IX_PT_Sessions_TrainerId",
                table: "PT_Sessions",
                column: "TrainerId");

            migrationBuilder.CreateIndex(
                name: "IX_PT_Sessions_TrainerId_ScheduledStartUtc_ScheduledEndUtc",
                table: "PT_Sessions",
                columns: new[] { "TrainerId", "ScheduledStartUtc", "ScheduledEndUtc" });

            migrationBuilder.CreateIndex(
                name: "IX_PT_Sessions_UserId",
                table: "PT_Sessions",
                column: "UserId");

            migrationBuilder.CreateIndex(
                name: "IX_PT_TrainerLeaves_TrainerId_StartDate_EndDate",
                table: "PT_TrainerLeaves",
                columns: new[] { "TrainerId", "StartDate", "EndDate" });

            migrationBuilder.CreateIndex(
                name: "IX_PT_TrainerSchedules_TrainerId_DayOfWeek",
                table: "PT_TrainerSchedules",
                columns: new[] { "TrainerId", "DayOfWeek" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "PT_Attendance");

            migrationBuilder.DropTable(
                name: "PT_CommissionRules");

            migrationBuilder.DropTable(
                name: "PT_Commissions");

            migrationBuilder.DropTable(
                name: "PT_MemberPackageHistory");

            migrationBuilder.DropTable(
                name: "PT_Notifications");

            migrationBuilder.DropTable(
                name: "PT_PackagePrices");

            migrationBuilder.DropTable(
                name: "PT_SessionHistory");

            migrationBuilder.DropTable(
                name: "PT_TrainerLeaves");

            migrationBuilder.DropTable(
                name: "PT_TrainerSchedules");

            migrationBuilder.DropTable(
                name: "PT_Payouts");

            migrationBuilder.DropTable(
                name: "PT_Sessions");

            migrationBuilder.DropTable(
                name: "PT_MemberPackages");

            migrationBuilder.DropTable(
                name: "PT_PackageInvoices");

            migrationBuilder.DropTable(
                name: "PT_Packages");
        }
    }
}
