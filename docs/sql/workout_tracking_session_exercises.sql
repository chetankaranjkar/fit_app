-- Reference script for live workout tracking (also applied via EF migration AddWorkoutTrackingSessionExercises).
-- Extends WorkoutSessions; adds WorkoutSessionExercises. Does not alter WorkoutPlans.

IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'WorkoutSessionExercises')
BEGIN
    CREATE TABLE dbo.WorkoutSessionExercises (
        Id BIGINT IDENTITY(1,1) NOT NULL PRIMARY KEY,
        WorkoutSessionId INT NOT NULL,
        ExerciseId INT NOT NULL,
        ExerciseName NVARCHAR(200) NOT NULL,
        SetNumber INT NOT NULL,
        TargetReps INT NOT NULL,
        ActualReps INT NULL,
        TargetWeight DECIMAL(10,2) NULL,
        ActualWeight DECIMAL(10,2) NULL,
        DurationSeconds INT NULL,
        RestSeconds INT NULL,
        IsCompleted BIT NOT NULL DEFAULT 0,
        Notes NVARCHAR(500) NULL,
        CreatedAt DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
        CONSTRAINT FK_WorkoutSessionExercises_WorkoutSessions
            FOREIGN KEY (WorkoutSessionId) REFERENCES dbo.WorkoutSessions(Id) ON DELETE CASCADE,
        CONSTRAINT FK_WorkoutSessionExercises_Exercises
            FOREIGN KEY (ExerciseId) REFERENCES dbo.Exercises(Id)
    );
    CREATE INDEX IX_WorkoutSessionExercises_Session_Exercise_Set
        ON dbo.WorkoutSessionExercises (WorkoutSessionId, ExerciseId, SetNumber);
END;
