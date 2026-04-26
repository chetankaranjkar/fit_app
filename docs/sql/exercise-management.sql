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
