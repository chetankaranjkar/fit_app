/*
  Delete trainer profile rows (and PT / assignment dependencies) on production.

  Modes (set @Mode below):
    DEMO  — only seeded demo trainers (Alex Johnson, Sam Williams)
    ALL   — every row in dbo.Trainer

  Does NOT delete dbo.Users / AuthUsers unless @AlsoRemoveTrainerUsers = 1 (demo mode only).

  Run on VPS:
    ./deploy/scripts/delete-trainers.sh

  Or SSMS (after SSH tunnel): open this file, set @Mode, execute against GymManagementDb.
*/
SET NOCOUNT ON;
SET XACT_ABORT ON;

DECLARE @Mode VARCHAR(10) = N'DEMO';  -- DEMO | ALL
DECLARE @AlsoRemoveTrainerUsers BIT = 0; -- 1 = remove demo Users + Trainer UserType links (DEMO trainers only)

IF @Mode NOT IN (N'DEMO', N'ALL')
BEGIN
    RAISERROR(N'@Mode must be DEMO or ALL.', 16, 1);
    RETURN;
END;

DECLARE @TrainerIds TABLE (Id INT PRIMARY KEY);
DECLARE @UserIds TABLE (Id INT PRIMARY KEY);

IF @Mode = N'DEMO'
BEGIN
    INSERT INTO @TrainerIds (Id)
    SELECT t.Id
    FROM dbo.Trainer t
    INNER JOIN dbo.Users u ON u.Id = t.UserId
    WHERE (u.FirstName = N'Alex' AND u.LastName = N'Johnson')
       OR (u.FirstName = N'Sam' AND u.LastName = N'Williams');

    INSERT INTO @UserIds (Id)
    SELECT t.UserId FROM dbo.Trainer t WHERE t.Id IN (SELECT Id FROM @TrainerIds);
END
ELSE
BEGIN
    INSERT INTO @TrainerIds (Id)
    SELECT Id FROM dbo.Trainer;

    INSERT INTO @UserIds (Id)
    SELECT DISTINCT UserId FROM dbo.Trainer WHERE Id IN (SELECT Id FROM @TrainerIds);
END;

IF NOT EXISTS (SELECT 1 FROM @TrainerIds)
BEGIN
    PRINT N'No trainers matched. Nothing to do.';
    RETURN;
END;

PRINT N'Trainers to remove:';
SELECT t.Id AS TrainerId, t.UserId, t.EmployeeCode, u.FirstName, u.LastName
FROM dbo.Trainer t
INNER JOIN dbo.Users u ON u.Id = t.UserId
WHERE t.Id IN (SELECT Id FROM @TrainerIds);

BEGIN TRANSACTION;

-- Nullable FKs
UPDATE dbo.UserDietPlans SET AssignedByTrainerId = NULL WHERE AssignedByTrainerId IN (SELECT Id FROM @TrainerIds);
UPDATE dbo.WorkoutPlans SET TrainerId = NULL WHERE TrainerId IN (SELECT Id FROM @TrainerIds);
UPDATE dbo.UserSchedules SET TrainerId = NULL WHERE TrainerId IN (SELECT Id FROM @TrainerIds);
UPDATE dbo.PT_Notifications SET TrainerId = NULL WHERE TrainerId IN (SELECT Id FROM @TrainerIds);

-- Lead trials (AssignedTrainerId is required)
DELETE FROM dbo.lead_trials WHERE AssignedTrainerId IN (SELECT Id FROM @TrainerIds);

-- PT: sessions and children
DELETE h
FROM dbo.PT_SessionHistory h
INNER JOIN dbo.PT_Sessions s ON s.Id = h.PTSessionId
WHERE s.TrainerId IN (SELECT Id FROM @TrainerIds);

DELETE a
FROM dbo.PT_Attendance a
INNER JOIN dbo.PT_Sessions s ON s.Id = a.PTSessionId
WHERE s.TrainerId IN (SELECT Id FROM @TrainerIds);

DELETE FROM dbo.PT_Sessions WHERE TrainerId IN (SELECT Id FROM @TrainerIds);

-- PT: commissions before payouts
UPDATE dbo.PT_Commissions SET PayoutId = NULL WHERE TrainerId IN (SELECT Id FROM @TrainerIds);
DELETE FROM dbo.PT_Commissions WHERE TrainerId IN (SELECT Id FROM @TrainerIds);
DELETE FROM dbo.PT_Payouts WHERE TrainerId IN (SELECT Id FROM @TrainerIds);

-- PT: member packages
DELETE h
FROM dbo.PT_MemberPackageHistory h
INNER JOIN dbo.PT_MemberPackages mp ON mp.Id = h.MemberPTPackageId
WHERE mp.TrainerId IN (SELECT Id FROM @TrainerIds);

DELETE FROM dbo.PT_MemberPackages WHERE TrainerId IN (SELECT Id FROM @TrainerIds);
DELETE FROM dbo.PT_PackageInvoices WHERE TrainerId IN (SELECT Id FROM @TrainerIds);
DELETE FROM dbo.PT_PackagePrices WHERE TrainerId IN (SELECT Id FROM @TrainerIds);

-- PT: schedules / leaves / rules (also removed when Trainer row goes; explicit for clarity)
DELETE FROM dbo.PT_TrainerSchedules WHERE TrainerId IN (SELECT Id FROM @TrainerIds);
DELETE FROM dbo.PT_TrainerLeaves WHERE TrainerId IN (SELECT Id FROM @TrainerIds);
DELETE FROM dbo.PT_CommissionRules WHERE TrainerId IN (SELECT Id FROM @TrainerIds);

-- Trainer children
DELETE FROM dbo.UserInstructors WHERE TrainerId IN (SELECT Id FROM @TrainerIds);
DELETE FROM dbo.TrainerFeedbacks WHERE TrainerId IN (SELECT Id FROM @TrainerIds);
DELETE FROM dbo.TrainerCertifications WHERE TrainerId IN (SELECT Id FROM @TrainerIds);
DELETE FROM dbo.TrainerSpecializations WHERE TrainerId IN (SELECT Id FROM @TrainerIds);

DELETE FROM dbo.Trainer WHERE Id IN (SELECT Id FROM @TrainerIds);

IF @AlsoRemoveTrainerUsers = 1 AND @Mode = N'DEMO'
BEGIN
    DECLARE @TrainerTypeId INT = (SELECT TOP 1 Id FROM dbo.UserTypes WHERE Name = N'Trainer');

    IF @TrainerTypeId IS NOT NULL
        DELETE uut
        FROM dbo.UserUserTypes uut
        WHERE uut.UserId IN (SELECT Id FROM @UserIds)
          AND uut.UserTypeId = @TrainerTypeId;

    DECLARE @TrainerRoleId INT = (SELECT TOP 1 Id FROM dbo.Roles WHERE Name = N'TRAINER');
    IF @TrainerRoleId IS NOT NULL
        DELETE ur
        FROM dbo.UserRoles ur
        WHERE ur.UserId IN (SELECT Id FROM @UserIds)
          AND ur.RoleId = @TrainerRoleId;

    -- Demo seed trainers have no AuthUsers; safe to remove Users rows
    DELETE FROM dbo.Users WHERE Id IN (SELECT Id FROM @UserIds);
END;

COMMIT TRANSACTION;

PRINT N'Done. Remaining trainers:';
SELECT COUNT(*) AS TrainerCount FROM dbo.Trainer;
