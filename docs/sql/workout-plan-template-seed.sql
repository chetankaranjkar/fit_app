-- Idempotent seed for workout categories (if not already seeded by DatabaseSeeder).
-- Run against Gym Management database after template migration.

SET NOCOUNT ON;

DECLARE @now DATETIME2 = SYSUTCDATETIME();

IF NOT EXISTS (SELECT 1 FROM WorkoutCategories WHERE Name = N'Upper Body' AND IsDeleted = 0)
BEGIN
    INSERT INTO WorkoutCategories (Name, Description, IsActive, CreatedDate, IsDeleted)
    VALUES
        (N'Upper Body', N'Upper body training focus', 1, @now, 0),
        (N'Lower Body', N'Lower body training focus', 1, @now, 0),
        (N'Push', N'Push movement patterns', 1, @now, 0),
        (N'Pull', N'Pull movement patterns', 1, @now, 0),
        (N'Legs', N'Leg and glute focus', 1, @now, 0),
        (N'Chest', N'Chest emphasis', 1, @now, 0),
        (N'Back', N'Back emphasis', 1, @now, 0),
        (N'Shoulders', N'Shoulder emphasis', 1, @now, 0),
        (N'Arms', N'Arm emphasis', 1, @now, 0),
        (N'Cardio', N'Cardiovascular conditioning', 1, @now, 0),
        (N'HIIT', N'High intensity intervals', 1, @now, 0),
        (N'Full Body', N'Full body sessions', 1, @now, 0);
END

PRINT 'Workout category seed complete.';
