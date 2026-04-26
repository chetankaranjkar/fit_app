# Database Setup Instructions

## SQL Server LocalDB Connection Issues

If you're experiencing LocalDB connection errors, here are solutions:

### Option 1: Install SQL Server LocalDB (Recommended for Development)

1. Download and install SQL Server Express LocalDB from:
   - https://go.microsoft.com/fwlink/?LinkID=799012
   - Or install via Visual Studio Installer (select "SQL Server Express LocalDB")

2. After installation, restart your computer

3. Verify LocalDB is installed:
   ```powershell
   sqllocaldb info
   ```

4. Start LocalDB instance:
   ```powershell
   sqllocaldb start MSSQLLocalDB
   ```

### Option 2: Use SQL Server Express

Update `appsettings.json`:
```json
{
  "ConnectionStrings": {
    "DefaultConnection": "Server=.\\SQLEXPRESS;Database=GymManagementDb;Trusted_Connection=True;MultipleActiveResultSets=true;TrustServerCertificate=True"
  }
}
```

### Option 3: Use Full SQL Server

If you have SQL Server installed, update the connection string:
```json
{
  "ConnectionStrings": {
    "DefaultConnection": "Server=localhost;Database=GymManagementDb;User Id=sa;Password=YourPassword;TrustServerCertificate=True;MultipleActiveResultSets=true"
  }
}
```

### Option 4: Use SQLite (For Quick Development)

1. Install SQLite package:
   ```bash
   dotnet add GymManagement.Infrastructure package Microsoft.EntityFrameworkCore.Sqlite
   ```

2. Update `Program.cs`:
   ```csharp
   builder.Services.AddDbContext<ApplicationDbContext>(options =>
       options.UseSqlite("Data Source=gymmanagement.db"));
   ```

### Connection String Options

- **LocalDB (Default)**: `Server=(localdb)\\MSSQLLocalDB;Database=GymManagementDb;Trusted_Connection=True;MultipleActiveResultSets=true;TrustServerCertificate=True`
- **SQL Express**: `Server=.\\SQLEXPRESS;Database=GymManagementDb;Trusted_Connection=True;MultipleActiveResultSets=true;TrustServerCertificate=True`
- **Full SQL Server**: `Server=localhost;Database=GymManagementDb;User Id=sa;Password=YourPassword;TrustServerCertificate=True;MultipleActiveResultSets=true`

### Troubleshooting

1. **Error: Cannot create automatic instance**
   - Install SQL Server LocalDB
   - Or use SQL Server Express instead

2. **Error: Server not found**
   - Check if SQL Server service is running
   - Verify the instance name in the connection string
   - Try using `.` instead of `localhost`

3. **Error: Login failed**
   - Use `Integrated Security=True` for Windows Authentication
   - Or provide correct User Id and Password for SQL Authentication

### Quick Fix for Development

For quick development, you can skip database creation temporarily. The app will start but API calls will fail until the database is properly configured.

### Membership, User Memberships, and Payments Tables

After pulling the latest code that adds **Membership Plans**, **User Memberships**, and **Payments**, create and apply the migration from the API project folder:

```powershell
cd src\GymManagement.API
dotnet ef migrations add AddMembershipTables --project ..\GymManagement.Infrastructure\GymManagement.Infrastructure.csproj
```

Then run the API (or restart it). On startup, pending migrations are applied automatically, creating the `membership_plans`, `user_memberships`, and `payments` tables.

