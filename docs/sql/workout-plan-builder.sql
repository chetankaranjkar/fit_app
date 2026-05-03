-- Workout Plan Builder extension (SQL Server)
-- This script is idempotent and safe to rerun.

IF OBJECT_ID('dbo.WorkoutPlanDays', 'U') IS NULL
BEGIN
  CREATE TABLE dbo.WorkoutPlanDays (
      Id UNIQUEIDENTIFIER NOT NULL PRIMARY KEY DEFAULT NEWID(),
      WorkoutPlanId UNIQUEIDENTIFIER NOT NULL,
      DayNumber INT NOT NULL,
      Name NVARCHAR(80) NOT NULL,
      IsRestDay BIT NOT NULL DEFAULT 0,
      OrderIndex INT NOT NULL,
      CreatedAt DATETIME NOT NULL DEFAULT GETDATE(),
      UpdatedAt DATETIME NULL
  );
END;
GO

IF COL_LENGTH('dbo.WorkoutPlanExercises', 'WorkoutPlanDayId') IS NULL
BEGIN
  ALTER TABLE dbo.WorkoutPlanExercises
  ADD WorkoutPlanDayId UNIQUEIDENTIFIER NULL;
END;
GO

IF OBJECT_ID('dbo.WorkoutPlans', 'U') IS NOT NULL
   AND NOT EXISTS (
     SELECT 1
     FROM sys.foreign_keys
     WHERE name = 'FK_WorkoutPlanDays_WorkoutPlans'
   )
BEGIN
  ALTER TABLE dbo.WorkoutPlanDays
  ADD CONSTRAINT FK_WorkoutPlanDays_WorkoutPlans
      FOREIGN KEY (WorkoutPlanId) REFERENCES dbo.WorkoutPlans(Id)
      ON DELETE CASCADE;
END;
GO

IF OBJECT_ID('dbo.WorkoutPlanDays', 'U') IS NOT NULL
   AND OBJECT_ID('dbo.WorkoutPlanExercises', 'U') IS NOT NULL
   AND NOT EXISTS (
     SELECT 1
     FROM sys.foreign_keys
     WHERE name = 'FK_WorkoutPlanExercises_WorkoutPlanDays'
   )
BEGIN
  ALTER TABLE dbo.WorkoutPlanExercises
  ADD CONSTRAINT FK_WorkoutPlanExercises_WorkoutPlanDays
      FOREIGN KEY (WorkoutPlanDayId) REFERENCES dbo.WorkoutPlanDays(Id)
      ON DELETE CASCADE;
END;
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_WorkoutPlanDays_WorkoutPlanId_OrderIndex')
BEGIN
  CREATE INDEX IX_WorkoutPlanDays_WorkoutPlanId_OrderIndex
    ON dbo.WorkoutPlanDays(WorkoutPlanId, OrderIndex);
END;
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_WorkoutPlanExercises_WorkoutPlanDayId_OrderIndex')
BEGIN
  CREATE INDEX IX_WorkoutPlanExercises_WorkoutPlanDayId_OrderIndex
    ON dbo.WorkoutPlanExercises(WorkoutPlanDayId, OrderIndex);
END;
GO
