-- Migration Script: Convert BodyPart Camera Position from Separate Columns to JSON
-- This script migrates existing data and updates the schema

-- Step 1: Add the new CameraPositionJson column (if it doesn't exist)
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[dbo].[BodyParts]') AND name = 'CameraPositionJson')
BEGIN
    ALTER TABLE [BodyParts]
    ADD [CameraPositionJson] nvarchar(max) NULL;
    PRINT 'Added CameraPositionJson column';
END
ELSE
BEGIN
    PRINT 'CameraPositionJson column already exists';
END
GO

-- Step 2: Migrate existing data from old columns to JSON format
-- Only update rows where CameraPositionX is not NULL (has camera position data)
-- Check if old columns exist before attempting migration
DECLARE @OldColumnsExist BIT = 0;
IF EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[dbo].[BodyParts]') AND name = 'CameraPositionX')
BEGIN
    SET @OldColumnsExist = 1;
END

IF @OldColumnsExist = 1
BEGIN
    -- Migrate data using dynamic SQL to avoid compilation errors if columns don't exist
    DECLARE @sql NVARCHAR(MAX) = N'
    UPDATE bp
    SET bp.[CameraPositionJson] = (
        SELECT 
            bp2.[CameraPositionX] AS cameraPositionX,
            bp2.[CameraPositionY] AS cameraPositionY,
            bp2.[CameraPositionZ] AS cameraPositionZ,
            bp2.[CameraRotationX] AS cameraRotationX,
            bp2.[CameraRotationY] AS cameraRotationY,
            bp2.[CameraRotationZ] AS cameraRotationZ,
            bp2.[CameraDistance] AS cameraDistance
        FOR JSON PATH, WITHOUT_ARRAY_WRAPPER
    )
    FROM [BodyParts] bp
    INNER JOIN [BodyParts] bp2 ON bp.Id = bp2.Id
    WHERE bp2.[CameraPositionX] IS NOT NULL
        AND (bp.[CameraPositionJson] IS NULL OR bp.[CameraPositionJson] = '''');
    ';
    
    EXEC sp_executesql @sql;
    PRINT 'Migrated existing camera position data to JSON format';
END
ELSE
BEGIN
    PRINT 'Old camera position columns do not exist - skipping data migration';
END
GO

-- Step 3: Drop the old camera position columns (if they exist)
IF EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[dbo].[BodyParts]') AND name = 'CameraPositionX')
BEGIN
    ALTER TABLE [BodyParts]
    DROP COLUMN [CameraPositionX];
    PRINT 'Dropped CameraPositionX column';
END

IF EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[dbo].[BodyParts]') AND name = 'CameraPositionY')
BEGIN
    ALTER TABLE [BodyParts]
    DROP COLUMN [CameraPositionY];
    PRINT 'Dropped CameraPositionY column';
END

IF EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[dbo].[BodyParts]') AND name = 'CameraPositionZ')
BEGIN
    ALTER TABLE [BodyParts]
    DROP COLUMN [CameraPositionZ];
    PRINT 'Dropped CameraPositionZ column';
END

IF EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[dbo].[BodyParts]') AND name = 'CameraRotationX')
BEGIN
    ALTER TABLE [BodyParts]
    DROP COLUMN [CameraRotationX];
    PRINT 'Dropped CameraRotationX column';
END

IF EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[dbo].[BodyParts]') AND name = 'CameraRotationY')
BEGIN
    ALTER TABLE [BodyParts]
    DROP COLUMN [CameraRotationY];
    PRINT 'Dropped CameraRotationY column';
END

IF EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[dbo].[BodyParts]') AND name = 'CameraRotationZ')
BEGIN
    ALTER TABLE [BodyParts]
    DROP COLUMN [CameraRotationZ];
    PRINT 'Dropped CameraRotationZ column';
END

IF EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[dbo].[BodyParts]') AND name = 'CameraDistance')
BEGIN
    ALTER TABLE [BodyParts]
    DROP COLUMN [CameraDistance];
    PRINT 'Dropped CameraDistance column';
END
GO

PRINT 'Migration completed successfully!';

