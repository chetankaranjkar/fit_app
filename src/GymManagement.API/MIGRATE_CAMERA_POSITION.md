# Migration Guide: BodyPart Camera Position to JSON

This guide explains how to migrate the database to store camera positions as JSON instead of separate columns.

## Prerequisites

- SQL Server or SQL Server Express/LocalDB installed
- Database connection configured in `appsettings.json`

## Migration Steps

### Option 1: Using SQL Script (Recommended for Existing Databases)

If your database was created using `EnsureCreated()` and already has data:

1. **Backup your database** (important!)

2. **Open SQL Server Management Studio** or use `sqlcmd`

3. **Connect to your database** (GymManagementDb)

4. **Run the migration script**:
   ```sql
   -- Execute the script from:
   -- GymManagement.Infrastructure/Migrations/MigrateBodyPartCameraPositionToJson.sql
   ```

5. **Verify the migration**:
   ```sql
   -- Check that CameraPositionJson column exists
   SELECT TOP 5 Id, Name, CameraPositionJson 
   FROM BodyParts;

   -- Verify old columns are removed
   SELECT COLUMN_NAME 
   FROM INFORMATION_SCHEMA.COLUMNS 
   WHERE TABLE_NAME = 'BodyParts';
   ```

### Option 2: Using Entity Framework Migrations

If you want to use EF Core migrations:

1. **Remove the InitialCreate migration** (if database already exists):
   ```bash
   cd GymManagement.API
   dotnet ef migrations remove --project ../GymManagement.Infrastructure --startup-project .
   ```

2. **Mark existing database as migrated** (to sync with EF Core):
   ```sql
   -- Run this in SQL Server to mark InitialCreate as applied
   INSERT INTO __EFMigrationsHistory (MigrationId, ProductVersion)
   VALUES ('20251121103136_InitialCreate', '9.0.0');
   ```

3. **Create a new migration for the column change**:
   ```bash
   dotnet ef migrations add UpdateBodyPartCameraPositionToJson --project ../GymManagement.Infrastructure --startup-project .
   ```

4. **Update the migration file** to include data migration logic

5. **Apply the migration**:
   ```bash
   dotnet ef database update --project ../GymManagement.Infrastructure --startup-project .
   ```

## What the Migration Does

1. **Adds** `CameraPositionJson` column (nvarchar(max), nullable)
2. **Migrates** existing data from old columns (CameraPositionX, CameraPositionY, etc.) to JSON format
3. **Drops** the old columns (CameraPositionX, CameraPositionY, CameraPositionZ, CameraRotationX, CameraRotationY, CameraRotationZ, CameraDistance)

## JSON Format

The camera position is stored as JSON with the following structure:
```json
{
  "cameraPositionX": 6.65,
  "cameraPositionY": 2.66,
  "cameraPositionZ": -0.92,
  "cameraRotationX": -109.19,
  "cameraRotationY": 67.06,
  "cameraRotationZ": 110.70,
  "cameraDistance": 7.22
}
```

## Rollback (If Needed)

If you need to rollback, you'll need to:

1. Add back the old columns
2. Parse JSON and populate the columns
3. Drop the CameraPositionJson column

However, **it's recommended to restore from a backup** instead of manually rolling back.

## Troubleshooting

### Error: "Column already exists"
- The column may have already been added. Check with:
  ```sql
  SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'BodyParts';
  ```

### Error: "Column does not exist"
- The old columns may have already been removed. Check the current schema.

### Data Migration Issues
- Check the JSON format:
  ```sql
  SELECT Id, Name, CameraPositionJson FROM BodyParts WHERE CameraPositionJson IS NOT NULL;
  ```

## After Migration

1. **Test the application** to ensure camera positions are working correctly
2. **Verify data integrity** - check that existing camera positions are accessible
3. **Update any stored procedures** or views that reference the old columns

