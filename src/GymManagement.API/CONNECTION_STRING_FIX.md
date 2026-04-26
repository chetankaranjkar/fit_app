# Connection String Troubleshooting

## Current Error
LocalDB automatic instance cannot be created. This is a common Windows issue with SQL Server LocalDB.

## Solutions (Choose One)

### Solution 1: Use SQL Server Express (Recommended)

If you have SQL Server Express installed, update your connection string:

**appsettings.json and appsettings.Development.json:**
```json
{
  "UseSqlite": false,
  "ConnectionStrings": {
    "DefaultConnection": "Server=.\\SQLEXPRESS;Database=GymManagementDb;Trusted_Connection=true;MultipleActiveResultSets=true;TrustServerCertificate=true"
  }
}
```

**Or use the default SQL Server instance:**
```json
{
  "ConnectionStrings": {
    "DefaultConnection": "Server=.;Database=GymManagementDb;Trusted_Connection=true;MultipleActiveResultSets=true;TrustServerCertificate=true"
  }
}
```

### Solution 2: Use SQLite for Development (Quick Fix)

**Update appsettings.Development.json:**
```json
{
  "UseSqlite": true
}
```

This will use SQLite (gymmanagement.db file) instead of SQL Server. No server installation needed!

### Solution 3: Install/Repair SQL Server LocalDB

1. Download SQL Server 2022 Express LocalDB:
   - https://go.microsoft.com/fwlink/?LinkID=799012

2. Uninstall existing LocalDB if present

3. Install the new version

4. Restart your computer

5. Try starting LocalDB manually:
   ```powershell
   sqllocaldb create MSSQLLocalDB
   sqllocaldb start MSSQLLocalDB
   ```

### Solution 4: Use Full SQL Server

If you have SQL Server installed, update the connection string:
```json
{
  "ConnectionStrings": {
    "DefaultConnection": "Server=localhost;Database=GymManagementDb;User Id=sa;Password=YourPassword;TrustServerCertificate=true;MultipleActiveResultSets=true"
  }
}
```

## Current Configuration

- **appsettings.json**: Uses `Server=.` (default SQL Server instance)
- **appsettings.Development.json**: Now uses `Server=.` (updated from LocalDB)

If you're still getting errors with `Server=.`, try:
1. Install SQL Server Express: https://www.microsoft.com/sql-server/sql-server-downloads
2. Or switch to SQLite by setting `"UseSqlite": true` in appsettings.Development.json

