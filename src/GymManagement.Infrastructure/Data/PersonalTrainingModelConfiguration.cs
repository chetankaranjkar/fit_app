using GymManagement.Domain.Entities;
using GymManagement.Domain.Entities.PersonalTraining;
using Microsoft.EntityFrameworkCore;

namespace GymManagement.Infrastructure.Data
{
    public static class PersonalTrainingModelConfiguration
    {
        public static void Apply(ModelBuilder modelBuilder)
        {
            ConfigurePTPackage(modelBuilder);
            ConfigurePTPackagePrice(modelBuilder);
            ConfigurePTPackageInvoice(modelBuilder);
            ConfigureMemberPTPackage(modelBuilder);
            ConfigureMemberPTPackageHistory(modelBuilder);
            ConfigureTrainerSchedule(modelBuilder);
            ConfigureTrainerLeave(modelBuilder);
            ConfigurePTSession(modelBuilder);
            ConfigurePTSessionHistory(modelBuilder);
            ConfigurePTAttendance(modelBuilder);
            ConfigureTrainerCommissionRule(modelBuilder);
            ConfigureTrainerCommission(modelBuilder);
            ConfigureTrainerPayout(modelBuilder);
            ConfigurePTNotification(modelBuilder);

            ApplySoftDeleteFilters(modelBuilder);
        }

        private static void ConfigurePTPackage(ModelBuilder modelBuilder)
        {
            modelBuilder.Entity<PTPackage>(entity =>
            {
                entity.ToTable("PT_Packages");
                entity.HasKey(e => e.Id);
                entity.Property(e => e.PackageName).IsRequired().HasMaxLength(150);
                entity.Property(e => e.Description).HasMaxLength(2000);
                entity.Property(e => e.PackageType).HasConversion<string>().HasMaxLength(30);
                entity.Property(e => e.Price).HasPrecision(12, 2);
                entity.Property(e => e.TaxPercentage).HasPrecision(5, 2);
                entity.Property(e => e.DefaultDiscountAmount).HasPrecision(12, 2);
                entity.HasIndex(e => e.PackageName);
                entity.HasIndex(e => e.IsActive);
                entity.HasOne(e => e.Organization).WithMany().HasForeignKey(e => e.OrganizationId).OnDelete(DeleteBehavior.SetNull);
            });
        }

        private static void ConfigurePTPackagePrice(ModelBuilder modelBuilder)
        {
            modelBuilder.Entity<PTPackagePrice>(entity =>
            {
                entity.ToTable("PT_PackagePrices");
                entity.HasKey(e => e.Id);
                entity.Property(e => e.Price).HasPrecision(12, 2);
                entity.HasIndex(e => new { e.PackageId, e.TrainerId }).IsUnique().HasFilter("[IsDeleted] = 0");
                entity.HasOne(e => e.Package).WithMany(p => p.TrainerPrices).HasForeignKey(e => e.PackageId).OnDelete(DeleteBehavior.Cascade);
                entity.HasOne(e => e.Trainer).WithMany().HasForeignKey(e => e.TrainerId).OnDelete(DeleteBehavior.Restrict);
            });
        }

        private static void ConfigurePTPackageInvoice(ModelBuilder modelBuilder)
        {
            modelBuilder.Entity<PTPackageInvoice>(entity =>
            {
                entity.ToTable("PT_PackageInvoices");
                entity.HasKey(e => e.Id);
                entity.Property(e => e.InvoiceNumber).IsRequired().HasMaxLength(50);
                entity.HasIndex(e => e.InvoiceNumber).IsUnique().HasFilter("[IsDeleted] = 0");
                entity.Property(e => e.Category).HasConversion<string>().HasMaxLength(30);
                entity.Property(e => e.Subtotal).HasPrecision(12, 2);
                entity.Property(e => e.TaxAmount).HasPrecision(12, 2);
                entity.Property(e => e.DiscountAmount).HasPrecision(12, 2);
                entity.Property(e => e.CouponDiscountAmount).HasPrecision(12, 2);
                entity.Property(e => e.TotalAmount).HasPrecision(12, 2);
                entity.Property(e => e.PaidAmount).HasPrecision(12, 2);
                entity.Property(e => e.PaymentStatus).HasConversion<string>().HasMaxLength(30);
                entity.Property(e => e.CouponCode).HasMaxLength(50);
                entity.HasIndex(e => e.UserId);
                entity.HasIndex(e => e.TrainerId);
                entity.HasIndex(e => e.IssueDate);
                entity.HasOne(e => e.User).WithMany().HasForeignKey(e => e.UserId).OnDelete(DeleteBehavior.Restrict);
                entity.HasOne(e => e.Trainer).WithMany().HasForeignKey(e => e.TrainerId).OnDelete(DeleteBehavior.Restrict);
                entity.HasOne(e => e.Package).WithMany().HasForeignKey(e => e.PackageId).OnDelete(DeleteBehavior.Restrict);
            });
        }

        private static void ConfigureMemberPTPackage(ModelBuilder modelBuilder)
        {
            modelBuilder.Entity<MemberPTPackage>(entity =>
            {
                entity.ToTable("PT_MemberPackages");
                entity.HasKey(e => e.Id);
                entity.Property(e => e.InvoiceNumber).HasMaxLength(50);
                entity.Property(e => e.Status).HasConversion<string>().HasMaxLength(30);
                entity.Property(e => e.PaymentStatus).HasConversion<string>().HasMaxLength(30);
                entity.Property(e => e.Subtotal).HasPrecision(12, 2);
                entity.Property(e => e.TaxAmount).HasPrecision(12, 2);
                entity.Property(e => e.DiscountAmount).HasPrecision(12, 2);
                entity.Property(e => e.TotalAmount).HasPrecision(12, 2);
                entity.Property(e => e.PaidAmount).HasPrecision(12, 2);
                entity.Property(e => e.CouponDiscountAmount).HasPrecision(12, 2);
                entity.Property(e => e.CouponCode).HasMaxLength(50);
                entity.HasIndex(e => e.UserId);
                entity.HasIndex(e => e.TrainerId);
                entity.HasIndex(e => e.Status);
                entity.HasIndex(e => e.ExpiryDate);
                entity.HasOne(e => e.User).WithMany().HasForeignKey(e => e.UserId).OnDelete(DeleteBehavior.Restrict);
                entity.HasOne(e => e.Trainer).WithMany().HasForeignKey(e => e.TrainerId).OnDelete(DeleteBehavior.Restrict);
                entity.HasOne(e => e.Package).WithMany(p => p.MemberPackages).HasForeignKey(e => e.PackageId).OnDelete(DeleteBehavior.Restrict);
                entity.HasOne(e => e.PackageInvoice).WithOne(i => i.MemberPackage).HasForeignKey<MemberPTPackage>(e => e.PTPackageInvoiceId).OnDelete(DeleteBehavior.SetNull);
                entity.HasOne(e => e.UpgradedFrom).WithMany().HasForeignKey(e => e.UpgradedFromMemberPackageId).OnDelete(DeleteBehavior.NoAction);
            });
        }

        private static void ConfigureMemberPTPackageHistory(ModelBuilder modelBuilder)
        {
            modelBuilder.Entity<MemberPTPackageHistory>(entity =>
            {
                entity.ToTable("PT_MemberPackageHistory");
                entity.HasKey(e => e.Id);
                entity.Property(e => e.Action).HasConversion<string>().HasMaxLength(40);
                entity.HasIndex(e => e.MemberPTPackageId);
                entity.HasOne(e => e.MemberPTPackage).WithMany(p => p.History).HasForeignKey(e => e.MemberPTPackageId).OnDelete(DeleteBehavior.Cascade);
            });
        }

        private static void ConfigureTrainerSchedule(ModelBuilder modelBuilder)
        {
            modelBuilder.Entity<TrainerSchedule>(entity =>
            {
                entity.ToTable("PT_TrainerSchedules");
                entity.HasKey(e => e.Id);
                entity.HasIndex(e => new { e.TrainerId, e.DayOfWeek });
                entity.HasOne(e => e.Trainer).WithMany().HasForeignKey(e => e.TrainerId).OnDelete(DeleteBehavior.Cascade);
            });
        }

        private static void ConfigureTrainerLeave(ModelBuilder modelBuilder)
        {
            modelBuilder.Entity<TrainerLeave>(entity =>
            {
                entity.ToTable("PT_TrainerLeaves");
                entity.HasKey(e => e.Id);
                entity.Property(e => e.Reason).HasMaxLength(500);
                entity.HasIndex(e => new { e.TrainerId, e.StartDate, e.EndDate });
                entity.HasOne(e => e.Trainer).WithMany().HasForeignKey(e => e.TrainerId).OnDelete(DeleteBehavior.Cascade);
            });
        }

        private static void ConfigurePTSession(ModelBuilder modelBuilder)
        {
            modelBuilder.Entity<PTSession>(entity =>
            {
                entity.ToTable("PT_Sessions");
                entity.HasKey(e => e.Id);
                entity.Property(e => e.Status).HasConversion<string>().HasMaxLength(30);
                entity.Property(e => e.Notes).HasMaxLength(2000);
                entity.HasIndex(e => e.TrainerId);
                entity.HasIndex(e => e.UserId);
                entity.HasIndex(e => e.ScheduledStartUtc);
                entity.HasIndex(e => new { e.TrainerId, e.ScheduledStartUtc, e.ScheduledEndUtc });
                entity.HasOne(e => e.MemberPTPackage).WithMany(p => p.Sessions).HasForeignKey(e => e.MemberPTPackageId).OnDelete(DeleteBehavior.Restrict);
                entity.HasOne(e => e.User).WithMany().HasForeignKey(e => e.UserId).OnDelete(DeleteBehavior.Restrict);
                entity.HasOne(e => e.Trainer).WithMany().HasForeignKey(e => e.TrainerId).OnDelete(DeleteBehavior.Restrict);
                entity.HasOne(e => e.RescheduledFrom).WithMany().HasForeignKey(e => e.RescheduledFromSessionId).OnDelete(DeleteBehavior.NoAction);
            });
        }

        private static void ConfigurePTSessionHistory(ModelBuilder modelBuilder)
        {
            modelBuilder.Entity<PTSessionHistory>(entity =>
            {
                entity.ToTable("PT_SessionHistory");
                entity.HasKey(e => e.Id);
                entity.Property(e => e.FromStatus).HasConversion<string>().HasMaxLength(30);
                entity.Property(e => e.ToStatus).HasConversion<string>().HasMaxLength(30);
                entity.HasIndex(e => e.PTSessionId);
                entity.HasOne(e => e.PTSession).WithMany(s => s.History).HasForeignKey(e => e.PTSessionId).OnDelete(DeleteBehavior.Cascade);
            });
        }

        private static void ConfigurePTAttendance(ModelBuilder modelBuilder)
        {
            modelBuilder.Entity<PTAttendance>(entity =>
            {
                entity.ToTable("PT_Attendance");
                entity.HasKey(e => e.Id);
                entity.HasIndex(e => e.PTSessionId).IsUnique();
                entity.HasOne(e => e.PTSession).WithOne(s => s.Attendance).HasForeignKey<PTAttendance>(e => e.PTSessionId).OnDelete(DeleteBehavior.Cascade);
            });
        }

        private static void ConfigureTrainerCommissionRule(ModelBuilder modelBuilder)
        {
            modelBuilder.Entity<TrainerCommissionRule>(entity =>
            {
                entity.ToTable("PT_CommissionRules");
                entity.HasKey(e => e.Id);
                entity.Property(e => e.CommissionType).HasConversion<string>().HasMaxLength(30);
                entity.Property(e => e.Percentage).HasPrecision(5, 2);
                entity.Property(e => e.FixedAmount).HasPrecision(12, 2);
                entity.HasIndex(e => e.TrainerId);
                entity.HasOne(e => e.Trainer).WithMany().HasForeignKey(e => e.TrainerId).OnDelete(DeleteBehavior.Cascade);
                entity.HasOne(e => e.Package).WithMany().HasForeignKey(e => e.PackageId).OnDelete(DeleteBehavior.SetNull);
            });
        }

        private static void ConfigureTrainerCommission(ModelBuilder modelBuilder)
        {
            modelBuilder.Entity<TrainerCommission>(entity =>
            {
                entity.ToTable("PT_Commissions");
                entity.HasKey(e => e.Id);
                entity.Property(e => e.Amount).HasPrecision(12, 2);
                entity.Property(e => e.BaseAmount).HasPrecision(12, 2);
                entity.Property(e => e.CommissionType).HasConversion<string>().HasMaxLength(30);
                entity.Property(e => e.Status).HasConversion<string>().HasMaxLength(30);
                entity.HasIndex(e => e.TrainerId);
                entity.HasIndex(e => e.Status);
                entity.HasOne(e => e.Trainer).WithMany().HasForeignKey(e => e.TrainerId).OnDelete(DeleteBehavior.Restrict);
                entity.HasOne(e => e.PTSession).WithMany().HasForeignKey(e => e.PTSessionId).OnDelete(DeleteBehavior.SetNull);
                entity.HasOne(e => e.MemberPTPackage).WithMany().HasForeignKey(e => e.MemberPTPackageId).OnDelete(DeleteBehavior.SetNull);
                entity.HasOne(e => e.Payout).WithMany(p => p.Commissions).HasForeignKey(e => e.PayoutId).OnDelete(DeleteBehavior.SetNull);
            });
        }

        private static void ConfigureTrainerPayout(ModelBuilder modelBuilder)
        {
            modelBuilder.Entity<TrainerPayout>(entity =>
            {
                entity.ToTable("PT_Payouts");
                entity.HasKey(e => e.Id);
                entity.Property(e => e.TotalAmount).HasPrecision(12, 2);
                entity.Property(e => e.Status).HasConversion<string>().HasMaxLength(30);
                entity.HasIndex(e => new { e.TrainerId, e.Year, e.Month }).IsUnique().HasFilter("[IsDeleted] = 0");
                entity.HasOne(e => e.Trainer).WithMany().HasForeignKey(e => e.TrainerId).OnDelete(DeleteBehavior.Restrict);
            });
        }

        private static void ConfigurePTNotification(ModelBuilder modelBuilder)
        {
            modelBuilder.Entity<PTNotification>(entity =>
            {
                entity.ToTable("PT_Notifications");
                entity.HasKey(e => e.Id);
                entity.Property(e => e.Title).IsRequired().HasMaxLength(200);
                entity.Property(e => e.Body).HasMaxLength(2000);
                entity.Property(e => e.NotificationType).HasConversion<string>().HasMaxLength(40);
                entity.Property(e => e.Channel).HasMaxLength(30);
                entity.HasIndex(e => e.UserId);
                entity.HasIndex(e => e.TrainerId);
                entity.HasIndex(e => e.IsRead);
            });
        }

        private static void ApplySoftDeleteFilters(ModelBuilder modelBuilder)
        {
            modelBuilder.Entity<PTPackage>().HasQueryFilter(e => !e.IsDeleted);
            modelBuilder.Entity<PTPackagePrice>().HasQueryFilter(e => !e.IsDeleted);
            modelBuilder.Entity<PTPackageInvoice>().HasQueryFilter(e => !e.IsDeleted);
            modelBuilder.Entity<MemberPTPackage>().HasQueryFilter(e => !e.IsDeleted);
            modelBuilder.Entity<MemberPTPackageHistory>().HasQueryFilter(e => !e.IsDeleted);
            modelBuilder.Entity<TrainerSchedule>().HasQueryFilter(e => !e.IsDeleted);
            modelBuilder.Entity<TrainerLeave>().HasQueryFilter(e => !e.IsDeleted);
            modelBuilder.Entity<PTSession>().HasQueryFilter(e => !e.IsDeleted);
            modelBuilder.Entity<PTSessionHistory>().HasQueryFilter(e => !e.IsDeleted);
            modelBuilder.Entity<PTAttendance>().HasQueryFilter(e => !e.IsDeleted);
            modelBuilder.Entity<TrainerCommissionRule>().HasQueryFilter(e => !e.IsDeleted);
            modelBuilder.Entity<TrainerCommission>().HasQueryFilter(e => !e.IsDeleted);
            modelBuilder.Entity<TrainerPayout>().HasQueryFilter(e => !e.IsDeleted);
            modelBuilder.Entity<PTNotification>().HasQueryFilter(e => !e.IsDeleted);
        }
    }
}
