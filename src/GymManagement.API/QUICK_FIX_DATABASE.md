# Quick Fix for Database Connection Issue

## Problem
LocalDB automatic instance cannot be created. This is a common Windows issue.

## Quick Solutions (Choose One)

### Solution 1: Use SQLite (Easiest for Development)

1. Install SQLite package:
```bash
cd GymManagement.Infrastructure
dotnet add package Microsoft.EntityFrameworkCore.Sqlite
```

2. Update `GymManagement.API/Program.cs`:
   Replace:
   ```csharp
   builder.Services.AddDbContext<ApplicationDbContext>(options =>
       options.UseSqlServer(connectionString, sqlOptions => sqlOptions.EnableRetryOnFailure()));
   ```
   
   With:
   ```csharp
   builder.Services.AddDbContext<ApplicationDbContext>(options =>
       options.UseSqlite("Data Source=gymmanagement.db"));
   ```

3. Update `GymManagement.Infrastructure/Data/ApplicationDbContext.cs`:
   - Remove any SQL Server-specific configurations if needed
   - The existing code should work with SQLite

4. Run the application - database file will be created automatically

### Solution 2: Reinstall LocalDB

1. Uninstall LocalDB from Windows
2. Download and install SQL Server 2022 Express LocalDB:
   - https://go.microsoft.com/fwlink/?LinkID=799012
3. Restart your computer
4. Try running the application again

### Solution 3: Use SQL Server Express

1. Install SQL Server Express (free)
2. Update `appsettings.json`:
```json
{
  "ConnectionStrings": {
    "DefaultConnection": "Server=.\\SQLEXPRESS;Database=GymManagementDb;Trusted_Connection=True;MultipleActiveResultSets=true;TrustServerCertificate=True"
  }
}
```

### Solution 4: Use Named LocalDB Instance

Try updating the connection string to use a named instance:

```json
{
  "ConnectionStrings": {
    "DefaultConnection": "Server=(localdb)\\ProjectsV13;Database=GymManagementDb;Trusted_Connection=True;MultipleActiveResultSets=true;TrustServerCertificate=True"
  }
}
```

### Solution 5: Run as Administrator

1. Right-click on Visual Studio or your terminal
2. Select "Run as Administrator"
3. Try running the application again

## "There is already an object named 'Admins' (or similar) in the database" (Error 2714)

This happens when the database **already has tables** (e.g. from a previous run or `EnsureCreated`) but the **migration history table** (`__EFMigrationsHistory`) is empty or out of sync. EF then tries to run migrations from the start and fails because tables like `Admins` already exist.

**Fix: sync the migration history**

1. In **SQL Server Management Studio** (or sqlcmd), connect to your server and select the **GymManagementDb** database.
2. Open and run the script:  
   **`src/GymManagement.Infrastructure/Migrations/SyncMigrationHistory.sql`**  
   That script creates `__EFMigrationsHistory` if needed and inserts all current migration IDs so EF considers them already applied.
3. Restart the API. It will see no pending migrations and will not try to create tables again.

**When to use:** Only when your database schema already has the tables (e.g. Admins, Users, etc.) and you just need to stop EF from re-running migrations. If the database is empty or from an old backup, run `dotnet ef database update` instead and do **not** run this script.

---

## "Could not determine SQL Server data path" when attaching

If the API says "Database file already exists. Attempting to attach it..." but then "Could not determine SQL Server data path", set the path explicitly:

1. In **appsettings.Development.json** (or appsettings.json), set **SqlServerDataPath** to the folder that contains `GymManagementDb.mdf`, for example:
   - `"SqlServerDataPath": "C:\\Program Files\\Microsoft SQL Server\\MSSQL16.MSSQLSERVER\\MSSQL\\DATA"`
2. Restart the API. It will use this path when attaching the database.

The API also tries to discover the path from `sys.master_files` and the registry; if your instance uses a custom path, setting **SqlServerDataPath** is the most reliable.

---

## Error: "Cannot create file ... GymManagementDb.mdf because it already exists" (Error 5170)

This happens when the database file is on disk but SQL Server doesn't have the database attached (e.g. after a failed create or a detached DB).

**Option A – Attach the existing file (keeps data if any)**

1. Open **SQL Server Management Studio** and connect to your instance (e.g. `.\MSSQLSERVER` or `(localdb)\MSSQLLocalDB`).
2. Run (adjust the path if your error shows a different one):

```sql
CREATE DATABASE [GymManagementDb] ON (FILENAME = N'C:\Program Files\Microsoft SQL Server\MSSQL16.MSSQLSERVER\MSSQL\DATA\GymManagementDb.mdf') FOR ATTACH;
```

3. If you also have a log file, use:

```sql
CREATE DATABASE [GymManagementDb] ON
  (FILENAME = N'C:\Program Files\Microsoft SQL Server\MSSQL16.MSSQLSERVER\MSSQL\DATA\GymManagementDb.mdf'),
  (FILENAME = N'C:\Program Files\Microsoft SQL Server\MSSQL16.MSSQLSERVER\MSSQL\DATA\GymManagementDb_log.ldf')
FOR ATTACH;
```

4. Then apply migrations from the API folder:

```bash
dotnet ef database update --project src/GymManagement.Infrastructure --startup-project src/GymManagement.API
```

5. Restart the API.

**Option B – Start with a new database (deletes existing file/data)**

1. In SSMS, if the database `GymManagementDb` exists, run: `DROP DATABASE GymManagementDb;`
2. Delete the files `GymManagementDb.mdf` and `GymManagementDb_log.ldf` from the SQL Server DATA folder (path shown in the error). You may need to stop the SQL Server service first.
3. Restart the API so it can create the database and run migrations.

Or run migrations manually after the DB is created:

```bash
dotnet ef database update --project src/GymManagement.Infrastructure --startup-project src/GymManagement.API
```

---

## Recommended: Use SQLite for Development

SQLite is the easiest solution for development and requires no server installation. The database will be a single file (`gymmanagement.db`) in your project directory.

