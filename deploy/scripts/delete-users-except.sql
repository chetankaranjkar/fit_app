/*
  Delete all users on production EXCEPT accounts listed below (default keep list).

  Target database: GymManagementDb (production).

  === SSMS ===
  1. Connect: Server = your VPS IP (or localhost,1433 if SSH tunnel), Login = sa
  2. Select database: GymManagementDb
  3. Open this file, set @DryRun below:
       @DryRun = 1  → preview only (run first)
       @DryRun = 0  → DELETE (backup first!)
  4. Execute (F5). Review Messages + result grids.

  === VPS shell ===
  ./deploy/scripts/delete-users-except.sh
  ./deploy/scripts/delete-users-except.sh --execute
*/
SET NOCOUNT ON;
SET XACT_ABORT ON;

DECLARE @DryRun BIT = 1;  -- shell script sets to 0 with --execute
DECLARE @DatabaseName SYSNAME = DB_NAME();

IF @DatabaseName <> N'GymManagementDb'
BEGIN
    RAISERROR(N'Expected database GymManagementDb but connected to %s. Aborting.', 16, 1, @DatabaseName);
    RETURN;
END;

DECLARE @KeepEmails TABLE (Email NVARCHAR(256) NOT NULL PRIMARY KEY);
INSERT INTO @KeepEmails (Email) VALUES
    (N'admin@gym.com'),
    (N'krishna.pandey@gmail.com'),
    (N'nil.garare@gmail.com');

DECLARE @KeepUserIds TABLE (Id INT NOT NULL PRIMARY KEY);
INSERT INTO @KeepUserIds (Id)
SELECT DISTINCT au.UserId
FROM dbo.AuthUsers au
INNER JOIN @KeepEmails k ON LOWER(LTRIM(RTRIM(au.Email))) = LOWER(k.Email)
WHERE au.UserId IS NOT NULL;

DECLARE @DeleteUserIds TABLE (Id INT NOT NULL PRIMARY KEY);
INSERT INTO @DeleteUserIds (Id)
SELECT u.Id
FROM dbo.Users u
WHERE u.Id NOT IN (SELECT Id FROM @KeepUserIds);

DECLARE @DeleteMemberIds TABLE (Id INT NOT NULL PRIMARY KEY);
INSERT INTO @DeleteMemberIds (Id)
SELECT m.Id
FROM dbo.Members m
WHERE m.UserId IN (SELECT Id FROM @DeleteUserIds);

DECLARE @DeleteTrainerIds TABLE (Id INT NOT NULL PRIMARY KEY);
INSERT INTO @DeleteTrainerIds (Id)
SELECT t.Id
FROM dbo.Trainer t
WHERE t.UserId IN (SELECT Id FROM @DeleteUserIds);

DECLARE @DeleteAuthUserIds TABLE (Id INT NOT NULL PRIMARY KEY);
INSERT INTO @DeleteAuthUserIds (Id)
SELECT au.Id
FROM dbo.AuthUsers au
WHERE au.UserId IN (SELECT Id FROM @DeleteUserIds)
   OR LOWER(LTRIM(RTRIM(au.Email))) NOT IN (SELECT LOWER(Email) FROM @KeepEmails);

PRINT N'=== delete-users-except (GymManagementDb) ===';
PRINT N'DryRun = ' + CASE WHEN @DryRun = 1 THEN N'1 (preview only)' ELSE N'0 (EXECUTING)' END;
PRINT N'';

PRINT N'--- Accounts to KEEP (by email) ---';
SELECT au.Id AS AuthUserId,
       au.Email,
       au.UserId,
       u.FirstName,
       u.LastName
FROM dbo.AuthUsers au
LEFT JOIN dbo.Users u ON u.Id = au.UserId
INNER JOIN @KeepEmails k ON LOWER(LTRIM(RTRIM(au.Email))) = LOWER(k.Email)
ORDER BY au.Email;

PRINT N'--- Missing keep emails (warn only) ---';
SELECT k.Email
FROM @KeepEmails k
WHERE NOT EXISTS (
    SELECT 1
    FROM dbo.AuthUsers au
    WHERE LOWER(LTRIM(RTRIM(au.Email))) = LOWER(k.Email));

PRINT N'--- Delete summary ---';
SELECT (SELECT COUNT(*) FROM @DeleteUserIds) AS UsersToDelete,
       (SELECT COUNT(*) FROM @DeleteAuthUserIds) AS AuthUsersToDelete,
       (SELECT COUNT(*) FROM @DeleteMemberIds) AS MemberProfilesToDelete,
       (SELECT COUNT(*) FROM @DeleteTrainerIds) AS TrainerProfilesToDelete;

IF @DryRun = 1
BEGIN
    PRINT N'';
    PRINT N'DRY RUN — no rows deleted. Set @DryRun = 0 and run again to delete.';
    RETURN;
END;

IF NOT EXISTS (SELECT 1 FROM @KeepUserIds)
BEGIN
    RAISERROR(N'No keep UserIds resolved from keep emails. Aborting to avoid deleting everyone.', 16, 1);
    RETURN;
END;

BEGIN TRANSACTION;

/* ---- Nullable FKs on rows we KEEP (staff references to deleted users) ---- */
UPDATE dbo.AttendanceLogs SET LoggedByUserId = NULL WHERE LoggedByUserId IN (SELECT Id FROM @DeleteUserIds);
UPDATE dbo.AttendanceLogs SET CorrectedByUserId = NULL WHERE CorrectedByUserId IN (SELECT Id FROM @DeleteUserIds);
UPDATE dbo.Coupons SET CreatedByUserId = NULL WHERE CreatedByUserId IN (SELECT Id FROM @DeleteUserIds);
UPDATE dbo.lead_followups SET CreatedByUserId = NULL WHERE CreatedByUserId IN (SELECT Id FROM @DeleteUserIds);
UPDATE dbo.gym_leads SET ConvertedMemberId = NULL WHERE ConvertedMemberId IN (SELECT Id FROM @DeleteUserIds);
UPDATE dbo.member_supplements SET AssignedByUserId = NULL WHERE AssignedByUserId IN (SELECT Id FROM @DeleteUserIds);
UPDATE dbo.Retail_PosOrders SET CashierUserId = NULL WHERE CashierUserId IN (SELECT Id FROM @DeleteUserIds);
UPDATE dbo.Retail_InventoryTransactions SET PerformedByUserId = NULL WHERE PerformedByUserId IN (SELECT Id FROM @DeleteUserIds);
UPDATE dbo.WorkoutPlanVersions SET CreatedByUserId = NULL WHERE CreatedByUserId IN (SELECT Id FROM @DeleteUserIds);
UPDATE dbo.membership_payment_transactions SET CollectedByUserId = NULL WHERE CollectedByUserId IN (SELECT Id FROM @DeleteUserIds);
UPDATE dbo.membership_payment_transactions SET ModifiedByUserId = NULL WHERE ModifiedByUserId IN (SELECT Id FROM @DeleteUserIds);
UPDATE dbo.membership_payment_transactions SET VoidedByUserId = NULL WHERE VoidedByUserId IN (SELECT Id FROM @DeleteUserIds);
UPDATE dbo.membership_payment_transactions SET RefundedByUserId = NULL WHERE RefundedByUserId IN (SELECT Id FROM @DeleteUserIds);
UPDATE dbo.membership_payments SET ReceivedByUserId = NULL WHERE ReceivedByUserId IN (SELECT Id FROM @DeleteUserIds);
UPDATE dbo.PT_PackageInvoices SET CashierUserId = NULL WHERE CashierUserId IN (SELECT Id FROM @DeleteUserIds);
UPDATE dbo.UserDietPlans SET AssignedByTrainerId = NULL
WHERE AssignedByTrainerId IN (SELECT Id FROM @DeleteTrainerIds);
UPDATE dbo.UserSchedules SET TrainerId = NULL WHERE TrainerId IN (SELECT Id FROM @DeleteTrainerIds);
UPDATE dbo.WorkoutPlans SET TrainerId = NULL WHERE TrainerId IN (SELECT Id FROM @DeleteTrainerIds);
UPDATE dbo.PT_Notifications SET TrainerId = NULL WHERE TrainerId IN (SELECT Id FROM @DeleteTrainerIds);

/* ---- Trainer profile dependencies (same order as delete-trainers.sql) ---- */
IF EXISTS (SELECT 1 FROM @DeleteTrainerIds)
BEGIN
    UPDATE dbo.WorkoutPlans SET TrainerId = NULL WHERE TrainerId IN (SELECT Id FROM @DeleteTrainerIds);

    DELETE FROM dbo.lead_trials WHERE AssignedTrainerId IN (SELECT Id FROM @DeleteTrainerIds);

    DELETE h
    FROM dbo.PT_SessionHistory h
    INNER JOIN dbo.PT_Sessions s ON s.Id = h.PTSessionId
    WHERE s.TrainerId IN (SELECT Id FROM @DeleteTrainerIds);

    DELETE a
    FROM dbo.PT_Attendance a
    INNER JOIN dbo.PT_Sessions s ON s.Id = a.PTSessionId
    WHERE s.TrainerId IN (SELECT Id FROM @DeleteTrainerIds);

    DELETE FROM dbo.PT_Sessions WHERE TrainerId IN (SELECT Id FROM @DeleteTrainerIds)
        OR UserId IN (SELECT Id FROM @DeleteUserIds);

    UPDATE dbo.PT_Commissions SET PayoutId = NULL WHERE TrainerId IN (SELECT Id FROM @DeleteTrainerIds);
    DELETE FROM dbo.PT_Commissions WHERE TrainerId IN (SELECT Id FROM @DeleteTrainerIds);
    DELETE FROM dbo.PT_Payouts WHERE TrainerId IN (SELECT Id FROM @DeleteTrainerIds);

    DELETE h
    FROM dbo.PT_MemberPackageHistory h
    INNER JOIN dbo.PT_MemberPackages mp ON mp.Id = h.MemberPTPackageId
    WHERE mp.TrainerId IN (SELECT Id FROM @DeleteTrainerIds);

    DELETE FROM dbo.PT_MemberPackages
    WHERE TrainerId IN (SELECT Id FROM @DeleteTrainerIds)
       OR UserId IN (SELECT Id FROM @DeleteUserIds);

    DELETE FROM dbo.PT_PackageInvoices
    WHERE TrainerId IN (SELECT Id FROM @DeleteTrainerIds)
       OR UserId IN (SELECT Id FROM @DeleteUserIds);

    DELETE FROM dbo.PT_PackagePrices WHERE TrainerId IN (SELECT Id FROM @DeleteTrainerIds);
    DELETE FROM dbo.PT_TrainerSchedules WHERE TrainerId IN (SELECT Id FROM @DeleteTrainerIds);
    DELETE FROM dbo.PT_TrainerLeaves WHERE TrainerId IN (SELECT Id FROM @DeleteTrainerIds);
    DELETE FROM dbo.PT_CommissionRules WHERE TrainerId IN (SELECT Id FROM @DeleteTrainerIds);

    DELETE FROM dbo.TrainerFeedbacks WHERE TrainerId IN (SELECT Id FROM @DeleteTrainerIds);
    DELETE FROM dbo.TrainerCertifications WHERE TrainerId IN (SELECT Id FROM @DeleteTrainerIds);
    DELETE FROM dbo.TrainerSpecializations WHERE TrainerId IN (SELECT Id FROM @DeleteTrainerIds);
    DELETE FROM dbo.UserInstructors WHERE TrainerId IN (SELECT Id FROM @DeleteTrainerIds);
END;

/* ---- Member / coach assignments ---- */
DELETE FROM dbo.UserInstructors WHERE UserId IN (SELECT Id FROM @DeleteUserIds);
DELETE FROM dbo.TrainerFeedbacks WHERE UserId IN (SELECT Id FROM @DeleteUserIds);

/* ---- Messages ---- */
DELETE FROM dbo.Messages
WHERE SenderId IN (SELECT Id FROM @DeleteUserIds)
   OR ReceiverId IN (SELECT Id FROM @DeleteUserIds);

/* ---- Gym QR workouts ---- */
DELETE l
FROM dbo.GymQrWorkoutLogs l
INNER JOIN dbo.GymQrWorkoutSessions s ON s.Id = l.SessionId
WHERE s.MemberUserId IN (SELECT Id FROM @DeleteUserIds);

DELETE FROM dbo.GymQrWorkoutSessions WHERE MemberUserId IN (SELECT Id FROM @DeleteUserIds);

/* ---- Workout tracking ---- */
DELETE e
FROM dbo.WorkoutSessionExercises e
INNER JOIN dbo.WorkoutSessions s ON s.Id = e.WorkoutSessionId
WHERE s.UserId IN (SELECT Id FROM @DeleteUserIds)
   OR s.MemberId IN (SELECT Id FROM @DeleteMemberIds);

DELETE l
FROM dbo.WorkoutLogs l
INNER JOIN dbo.WorkoutSessions s ON s.Id = l.WorkoutSessionId
WHERE s.UserId IN (SELECT Id FROM @DeleteUserIds)
   OR s.MemberId IN (SELECT Id FROM @DeleteMemberIds);

DELETE FROM dbo.WorkoutSessions
WHERE UserId IN (SELECT Id FROM @DeleteUserIds)
   OR MemberId IN (SELECT Id FROM @DeleteMemberIds);

DELETE FROM dbo.workout_plan_audit_logs
WHERE AssignedToUserId IN (SELECT Id FROM @DeleteUserIds)
   OR PerformedByUserId IN (SELECT Id FROM @DeleteUserIds);

DELETE FROM dbo.UserSchedules WHERE UserId IN (SELECT Id FROM @DeleteUserIds);

DELETE FROM dbo.WorkoutPlans WHERE AssignedToUserId IN (SELECT Id FROM @DeleteUserIds);

/* ---- Membership & billing ---- */
DELETE o
FROM dbo.online_payment_orders o
LEFT JOIN dbo.membership_payments mp ON mp.Id = o.MembershipPaymentId
WHERE o.UserId IN (SELECT Id FROM @DeleteUserIds)
   OR mp.UserId IN (SELECT Id FROM @DeleteUserIds);

DELETE t
FROM dbo.membership_payment_transactions t
INNER JOIN dbo.membership_payments mp ON mp.Id = t.PaymentId
WHERE mp.UserId IN (SELECT Id FROM @DeleteUserIds);

DELETE FROM dbo.invoice_coupon_usage WHERE UserId IN (SELECT Id FROM @DeleteUserIds);
DELETE FROM dbo.CouponUsages WHERE UserId IN (SELECT Id FROM @DeleteUserIds);

DELETE FROM dbo.membership_payments WHERE UserId IN (SELECT Id FROM @DeleteUserIds);

DELETE ii
FROM dbo.InvoiceItems ii
INNER JOIN dbo.Invoices i ON i.Id = ii.InvoiceId
INNER JOIN dbo.user_memberships um ON um.Id = i.UserMembershipId
WHERE um.UserId IN (SELECT Id FROM @DeleteUserIds);

DELETE i
FROM dbo.Invoices i
INNER JOIN dbo.user_memberships um ON um.Id = i.UserMembershipId
WHERE um.UserId IN (SELECT Id FROM @DeleteUserIds);

DELETE p
FROM dbo.payments p
INNER JOIN dbo.user_memberships um ON um.Id = p.MembershipId
WHERE um.UserId IN (SELECT Id FROM @DeleteUserIds);

DELETE FROM dbo.membership_approval_requests
WHERE MemberId IN (SELECT Id FROM @DeleteUserIds)
   OR RequestedByUserId IN (SELECT Id FROM @DeleteUserIds)
   OR ApprovedByUserId IN (SELECT Id FROM @DeleteUserIds)
   OR RejectedByUserId IN (SELECT Id FROM @DeleteUserIds)
   OR MembershipId IN (
       SELECT um.Id FROM dbo.user_memberships um WHERE um.UserId IN (SELECT Id FROM @DeleteUserIds));

DELETE FROM dbo.membership_audit_logs
WHERE PerformedByUserId IN (SELECT Id FROM @DeleteUserIds)
   OR MembershipId IN (
       SELECT um.Id FROM dbo.user_memberships um WHERE um.UserId IN (SELECT Id FROM @DeleteUserIds));

DELETE FROM dbo.waive_off_requests
WHERE UserId IN (SELECT Id FROM @DeleteUserIds)
   OR RequestedByUserId IN (SELECT Id FROM @DeleteUserIds)
   OR ApprovedByUserId IN (SELECT Id FROM @DeleteUserIds)
   OR RejectedByUserId IN (SELECT Id FROM @DeleteUserIds);

DELETE FROM dbo.user_memberships WHERE UserId IN (SELECT Id FROM @DeleteUserIds);

/* ---- Retail POS ---- */
DELETE oi
FROM dbo.Retail_PosOrderItems oi
INNER JOIN dbo.Retail_PosOrders o ON o.Id = oi.OrderId
WHERE o.CustomerUserId IN (SELECT Id FROM @DeleteUserIds);

DELETE FROM dbo.Retail_PosOrders WHERE CustomerUserId IN (SELECT Id FROM @DeleteUserIds);

DELETE FROM dbo.PT_Notifications
WHERE UserId IN (SELECT Id FROM @DeleteUserIds)
   OR TrainerId IN (SELECT Id FROM @DeleteTrainerIds);

/* ---- Lockers ---- */
DELETE FROM dbo.LockerMgmt_Assignments WHERE UserId IN (SELECT Id FROM @DeleteUserIds);

/* ---- Profile / activity (Restrict FKs) ---- */
DELETE FROM dbo.PersonalRecords WHERE UserId IN (SELECT Id FROM @DeleteUserIds);
DELETE FROM dbo.UserGoals WHERE UserId IN (SELECT Id FROM @DeleteUserIds);
DELETE FROM dbo.UserSupplements WHERE UserId IN (SELECT Id FROM @DeleteUserIds);
DELETE FROM dbo.UserMedicalLogs WHERE UserId IN (SELECT Id FROM @DeleteUserIds);
DELETE FROM dbo.UserAchievements WHERE UserId IN (SELECT Id FROM @DeleteUserIds);
DELETE FROM dbo.BodyMetricsLogs WHERE UserId IN (SELECT Id FROM @DeleteUserIds);
DELETE FROM dbo.UserBodyImages WHERE UserId IN (SELECT Id FROM @DeleteUserIds);
DELETE FROM dbo.Notifications WHERE UserId IN (SELECT Id FROM @DeleteUserIds);
DELETE FROM dbo.UserDietPlans WHERE UserId IN (SELECT Id FROM @DeleteUserIds);
DELETE FROM dbo.AttendanceLogs WHERE UserId IN (SELECT Id FROM @DeleteUserIds);
DELETE FROM dbo.AuditLogs WHERE UserId IN (SELECT Id FROM @DeleteUserIds);
DELETE FROM dbo.financial_audit_logs
WHERE UserId IN (SELECT Id FROM @DeleteUserIds)
   OR ActorUserId IN (SELECT Id FROM @DeleteUserIds);
DELETE FROM dbo.MemberActivitySummary WHERE UserId IN (SELECT Id FROM @DeleteUserIds);
DELETE FROM dbo.member_supplements WHERE UserId IN (SELECT Id FROM @DeleteUserIds);

DELETE ec
FROM dbo.users_emergency_contacts ec
INNER JOIN dbo.users_health_profile hp ON hp.Id = ec.UserHealthProfileId
WHERE hp.UserId IN (SELECT Id FROM @DeleteUserIds);

DELETE inj
FROM dbo.users_injuries inj
INNER JOIN dbo.users_health_profile hp ON hp.Id = inj.UserHealthProfileId
WHERE hp.UserId IN (SELECT Id FROM @DeleteUserIds);

DELETE med
FROM dbo.users_medications med
INNER JOIN dbo.users_health_profile hp ON hp.Id = med.UserHealthProfileId
WHERE hp.UserId IN (SELECT Id FROM @DeleteUserIds);

DELETE mc
FROM dbo.users_medical_conditions mc
INNER JOIN dbo.users_health_profile hp ON hp.Id = mc.UserHealthProfileId
WHERE hp.UserId IN (SELECT Id FROM @DeleteUserIds);

DELETE FROM dbo.users_health_profile WHERE UserId IN (SELECT Id FROM @DeleteUserIds);
DELETE FROM dbo.UserDetails WHERE UserId IN (SELECT Id FROM @DeleteUserIds);

/* ---- Auth / devices ---- */
DELETE FROM dbo.LoginActivity
WHERE UserId IN (SELECT Id FROM @DeleteUserIds)
   OR AuthUserId IN (SELECT Id FROM @DeleteAuthUserIds);

DELETE FROM dbo.LoginHistory WHERE UserId IN (SELECT Id FROM @DeleteUserIds);
DELETE FROM dbo.UserSessions WHERE UserId IN (SELECT Id FROM @DeleteUserIds);
DELETE FROM dbo.UserDevices WHERE UserId IN (SELECT Id FROM @DeleteUserIds);

DELETE FROM dbo.AuthUsers WHERE Id IN (SELECT Id FROM @DeleteAuthUserIds);

/* ---- Identity profiles ---- */
DELETE FROM dbo.UserRoles WHERE UserId IN (SELECT Id FROM @DeleteUserIds);
DELETE FROM dbo.UserUserTypes WHERE UserId IN (SELECT Id FROM @DeleteUserIds);
DELETE FROM dbo.Members WHERE UserId IN (SELECT Id FROM @DeleteUserIds);
DELETE FROM dbo.Staff WHERE UserId IN (SELECT Id FROM @DeleteUserIds);
DELETE FROM dbo.Trainer WHERE UserId IN (SELECT Id FROM @DeleteUserIds);
DELETE FROM dbo.Users WHERE Id IN (SELECT Id FROM @DeleteUserIds);

COMMIT TRANSACTION;

PRINT N'';
PRINT N'Done. Remaining users:';
SELECT COUNT(*) AS UserCount FROM dbo.Users;
SELECT au.Email, au.UserId, u.FirstName, u.LastName
FROM dbo.AuthUsers au
LEFT JOIN dbo.Users u ON u.Id = au.UserId
ORDER BY au.Email;
