CREATE TABLE Exercises (
    Id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    Name NVARCHAR(150) NOT NULL,
    Slug NVARCHAR(150) UNIQUE,
    Category NVARCHAR(50),
    MuscleGroupPrimary NVARCHAR(100),
    Difficulty NVARCHAR(50),
    Description NVARCHAR(MAX),
    CreatedAt DATETIME DEFAULT GETDATE(),
    UpdatedAt DATETIME
);

CREATE TABLE ExerciseDetails (
    Id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    ExerciseId UNIQUEIDENTIFIER FOREIGN KEY REFERENCES Exercises(Id),
    ForceType NVARCHAR(50),
    Mechanic NVARCHAR(50),
    Equipment NVARCHAR(200),
    IsUnilateral BIT,
    IsTimeBased BIT
);

CREATE TABLE ExerciseMedia (
    Id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    ExerciseId UNIQUEIDENTIFIER FOREIGN KEY REFERENCES Exercises(Id),
    ImageUrl NVARCHAR(MAX),
    VideoUrl NVARCHAR(MAX)
);

CREATE INDEX IX_Exercises_Name ON Exercises(Name);
CREATE INDEX IX_Exercises_Category ON Exercises(Category);
CREATE INDEX IX_Exercises_MuscleGroupPrimary ON Exercises(MuscleGroupPrimary);
CREATE INDEX IX_Exercises_Difficulty ON Exercises(Difficulty);
CREATE INDEX IX_ExerciseDetails_ExerciseId ON ExerciseDetails(ExerciseId);
CREATE INDEX IX_ExerciseMedia_ExerciseId ON ExerciseMedia(ExerciseId);

CREATE TABLE Workouts (
    Id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    Name NVARCHAR(150) NOT NULL,
    Description NVARCHAR(MAX),
    Goal NVARCHAR(50),
    Difficulty NVARCHAR(50),
    Duration INT,
    IsTemplate BIT NOT NULL DEFAULT 0,
    CreatedAt DATETIME NOT NULL DEFAULT GETDATE(),
    UpdatedAt DATETIME
);

CREATE TABLE WorkoutDays (
    Id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    WorkoutId UNIQUEIDENTIFIER NOT NULL FOREIGN KEY REFERENCES Workouts(Id) ON DELETE CASCADE,
    DayName NVARCHAR(50) NOT NULL,
    OrderIndex INT NOT NULL,
    CreatedAt DATETIME NOT NULL DEFAULT GETDATE()
);

CREATE TABLE WorkoutExercises (
    Id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    WorkoutId UNIQUEIDENTIFIER NOT NULL FOREIGN KEY REFERENCES Workouts(Id) ON DELETE CASCADE,
    WorkoutDayId UNIQUEIDENTIFIER NULL FOREIGN KEY REFERENCES WorkoutDays(Id) ON DELETE SET NULL,
    ExerciseId UNIQUEIDENTIFIER NOT NULL,
    OrderIndex INT NOT NULL,
    Sets INT NULL,
    Reps INT NULL,
    Weight FLOAT NULL,
    Duration INT NULL,
    RestTime INT NULL,
    Notes NVARCHAR(MAX) NULL,
    SupersetGroup NVARCHAR(60) NULL,
    CreatedAt DATETIME NOT NULL DEFAULT GETDATE(),
    UpdatedAt DATETIME
);

CREATE INDEX IX_Workouts_Goal ON Workouts(Goal);
CREATE INDEX IX_Workouts_Difficulty ON Workouts(Difficulty);
CREATE INDEX IX_WorkoutDays_WorkoutId_OrderIndex ON WorkoutDays(WorkoutId, OrderIndex);
CREATE INDEX IX_WorkoutExercises_WorkoutId_OrderIndex ON WorkoutExercises(WorkoutId, OrderIndex);
CREATE INDEX IX_WorkoutExercises_WorkoutDayId_OrderIndex ON WorkoutExercises(WorkoutDayId, OrderIndex);
CREATE INDEX IX_WorkoutExercises_ExerciseId ON WorkoutExercises(ExerciseId);
