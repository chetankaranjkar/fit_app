using System.Data;
using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Diagnostics;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using Microsoft.Extensions.Diagnostics.HealthChecks;
using Microsoft.Extensions.Options;
using System.Text;
using System.Linq;
using GymManagement.Infrastructure.Data;
using GymManagement.Infrastructure.Repositories;
using GymManagement.Infrastructure.Hosting;
using GymManagement.Core.Interfaces;
using GymManagement.Core.Options;
using GymManagement.Core.Services;
using GymManagement.Infrastructure.Services;
using GymManagement.API.Middleware;
using StackExchange.Redis;
using HealthChecks.Redis;
using GymManagement.API.Swagger;

using GymManagement.API;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddHttpContextAccessor();

// Add services to the container
builder.Services.AddControllers()
    .AddJsonOptions(options =>
    {
        options.JsonSerializerOptions.PropertyNamingPolicy = System.Text.Json.JsonNamingPolicy.CamelCase;
        options.JsonSerializerOptions.Converters.Add(new System.Text.Json.Serialization.JsonStringEnumConverter());
    });
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(options =>
{
    options.SwaggerDoc("v1", new Microsoft.OpenApi.Models.OpenApiInfo
    {
        Title = "Gym Management API",
        Version = "v1",
        Description = "Use **POST /api/Auth/login** to get a JWT. Then click **Authorize** above and paste the token (or \"Bearer \" + token)."
    });
    options.AddSecurityDefinition("Bearer", new Microsoft.OpenApi.Models.OpenApiSecurityScheme
    {
        Description = "JWT Bearer. 1) Call POST /api/Auth/login to get a token. 2) Click **Authorize**. 3) Paste **only the token** (do not type \"Bearer \" – Swagger adds it). 4) Click Authorize, then Close.",
        Name = "Authorization",
        In = Microsoft.OpenApi.Models.ParameterLocation.Header,
        Type = Microsoft.OpenApi.Models.SecuritySchemeType.Http,
        Scheme = "bearer",
        BearerFormat = "JWT"
    });
    options.OperationFilter<UnauthorizedAndForbiddenOperationFilter>();
});

// Add CORS — production origins via Cors:AllowedOrigins (env: Cors__AllowedOrigins__0=https://yourdomain.com)
var corsOrigins = builder.Configuration.GetSection("Cors:AllowedOrigins").Get<string[]>()
    ?? new[]
    {
        "http://localhost:3000", "http://localhost:5173", "http://localhost:5174",
        "http://localhost:4173", "http://127.0.0.1:5173", "http://127.0.0.1:4173"
    };
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowReactApp", policy =>
    {
        policy.WithOrigins(corsOrigins)
              .AllowAnyHeader()
              .AllowAnyMethod()
              .AllowCredentials();
    });
});

// Database Configuration
// Check if we should use SQLite (for development when LocalDB is not available)
var useSqlite = builder.Configuration.GetValue<bool>("UseSqlite", false);
var connectionString = builder.Configuration.GetConnectionString("DefaultConnection");

if (useSqlite)
{
    // Use SQLite for development (no server required)
    builder.Services.AddDbContext<ApplicationDbContext>(options =>
    {
        options.UseSqlite("Data Source=gymmanagement.db");
        options.ConfigureWarnings(w => w.Ignore(RelationalEventId.PendingModelChangesWarning));
    });
    Console.WriteLine("Using SQLite database: gymmanagement.db");
}
else
{
    // Use SQL Server - connection string must be provided in appsettings.json
    if (string.IsNullOrEmpty(connectionString))
    {
        throw new InvalidOperationException(
            "SQL Server connection string is required. Please set 'ConnectionStrings:DefaultConnection' in appsettings.json " +
            "or set 'UseSqlite=true' to use SQLite instead."
        );
    }

    builder.Services.AddDbContext<ApplicationDbContext>(options =>
    {
        options.UseSqlServer(connectionString, sqlOptions => sqlOptions.EnableRetryOnFailure());
        options.ConfigureWarnings(w => w.Ignore(RelationalEventId.PendingModelChangesWarning));
    });
}

// JWT: bearer middleware validates tokens on each request (UseAuthentication); signing key matches JwtTokenService.
var jwtKey = builder.Configuration["Jwt:Key"];
if (string.IsNullOrWhiteSpace(jwtKey) || jwtKey.Length < 32)
{
    throw new InvalidOperationException(
        "Missing or weak JWT signing key. Configure 'Jwt:Key' with at least 32 characters.");
}
var jwtIssuer = builder.Configuration["Jwt:Issuer"] ?? "GymManagement";
var jwtAudience = builder.Configuration["Jwt:Audience"] ?? "GymManagement";

builder.Services.AddAuthentication(options =>
{
    options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
    options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
})
.AddJwtBearer(options =>
{
    options.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuer = true,
        ValidateAudience = true,
        ValidateLifetime = true,
        ValidateIssuerSigningKey = true,
        ValidIssuer = jwtIssuer,
        ValidAudience = jwtAudience,
        IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey)),
        ClockSkew = TimeSpan.Zero,
        // JWT: sub = AuthUser.Id, roles = app roles; Identity.Name maps to sub.
        NameClaimType = "sub",
        RoleClaimType = System.Security.Claims.ClaimTypes.Role
    };
    // Normalize double "Bearer " (e.g. Swagger sends "Bearer " + user input "Bearer <token>") so token is valid
    options.Events = new Microsoft.AspNetCore.Authentication.JwtBearer.JwtBearerEvents
    {
        OnMessageReceived = ctx =>
        {
            var auth = ctx.Request.Headers.Authorization.FirstOrDefault();
            if (string.IsNullOrEmpty(auth)) return System.Threading.Tasks.Task.CompletedTask;
            if (auth.StartsWith("Bearer Bearer ", StringComparison.OrdinalIgnoreCase))
                ctx.Token = auth.Substring(14).Trim(); // "Bearer Bearer " length = 14
            return System.Threading.Tasks.Task.CompletedTask;
        },
        // Expose JWT session id (jti) to the request pipeline for auth-related code (e.g. logout / LoginActivity).
        OnTokenValidated = ctx =>
        {
            var jti = ctx.Principal?.FindFirst(System.IdentityModel.Tokens.Jwt.JwtRegisteredClaimNames.Jti)?.Value
                ?? ctx.Principal?.FindFirst("jti")?.Value;
            if (!string.IsNullOrEmpty(jti))
                ctx.HttpContext.Items["JwtSessionId"] = jti;
            return System.Threading.Tasks.Task.CompletedTask;
        }
    };
});

builder.Services.AddAuthorization(o => o.AddAppAuthorizationPolicies());

builder.Services.Configure<NotificationWebhookOptions>(builder.Configuration.GetSection(NotificationWebhookOptions.SectionName));
builder.Services.Configure<DoorDeviceOptions>(builder.Configuration.GetSection(DoorDeviceOptions.SectionName));
builder.Services.PostConfigure<NotificationWebhookOptions>(opts =>
{
    if (string.IsNullOrWhiteSpace(opts.EmailWebhookUrl))
        opts.EmailWebhookUrl = Environment.GetEnvironmentVariable("NOTIFICATIONS_EMAIL_WEBHOOK_URL");
    if (string.IsNullOrWhiteSpace(opts.WhatsAppWebhookUrl))
        opts.WhatsAppWebhookUrl = Environment.GetEnvironmentVariable("NOTIFICATIONS_WHATSAPP_WEBHOOK_URL");
});

builder.Services.AddHttpClient("notification-webhooks", (sp, client) =>
{
    var o = sp.GetRequiredService<IOptions<NotificationWebhookOptions>>().Value;
    var sec = o.TimeoutSeconds > 0 ? o.TimeoutSeconds : 15;
    client.Timeout = TimeSpan.FromSeconds(sec);
});
builder.Services.AddHttpClient("door-device", (sp, client) =>
{
    var o = sp.GetRequiredService<IOptions<DoorDeviceOptions>>().Value;
    var sec = o.TimeoutSeconds > 0 ? o.TimeoutSeconds : 5;
    client.Timeout = TimeSpan.FromSeconds(sec);
});
builder.Services.AddScoped<INotificationWebhookDispatcher, NotificationWebhookDispatcher>();
builder.Services.AddHostedService<MembershipExpiryReminderHostedService>();
builder.Services.AddHostedService<GymQrExpiryReminderHostedService>();

// Register Unit of Work
builder.Services.AddScoped<IUnitOfWork, UnitOfWork>();

// Register Services
builder.Services.AddScoped<IUserService, UserService>();
builder.Services.AddScoped<IExerciseService, ExerciseService>();
builder.Services.AddScoped<IBodyPartService, BodyPartService>();
builder.Services.AddScoped<IBodyPartMuscleService, BodyPartMuscleService>();
builder.Services.AddScoped<IWorkoutPlanService, WorkoutPlanService>();
builder.Services.AddScoped<IUserScheduleService, UserScheduleService>();
builder.Services.AddScoped<ITrainerService, TrainerService>();
builder.Services.AddScoped<ILoginPayloadFactory, LoginPayloadFactory>();
builder.Services.AddScoped<IJwtTokenService, JwtTokenService>();
builder.Services.AddScoped<IAuthService, AuthService>();
builder.Services.AddScoped<IDashboardService, DashboardService>();
builder.Services.AddScoped<IUserInstructorService, UserInstructorService>();
builder.Services.AddScoped<ITrainerFeedbackService, TrainerFeedbackService>();
builder.Services.AddScoped<IBodyMetricsService, BodyMetricsService>();
builder.Services.AddScoped<IAttendanceLogService, AttendanceLogService>();
builder.Services.AddScoped<IUserBodyImageService, UserBodyImageService>();
builder.Services.AddScoped<IMembershipPlanService, MembershipPlanService>();
builder.Services.AddScoped<IUserMembershipService, UserMembershipService>();
builder.Services.AddScoped<IPaymentService, PaymentService>();
builder.Services.AddScoped<IInvoiceService, InvoiceService>();
builder.Services.AddScoped<IReportService, ReportService>();
builder.Services.AddScoped<IRolePermissionService, RolePermissionService>();
builder.Services.AddScoped<IRbacService, RbacService>();
builder.Services.AddScoped<IUserTypeService, UserTypeService>();
builder.Services.AddScoped<IDietPlanService, DietPlanService>();
builder.Services.AddScoped<IUserDietPlanService, UserDietPlanService>();
builder.Services.AddSingleton<IFileMalwareScanner, NoOpFileMalwareScanner>();

// Gym Operations module (isolated)
builder.Services.AddScoped<GymManagement.Core.Services.GymOps.IEquipmentService, GymManagement.Infrastructure.Services.GymOps.EquipmentService>();
builder.Services.AddScoped<GymManagement.Core.Services.GymOps.IMaintenanceLogService, GymManagement.Infrastructure.Services.GymOps.MaintenanceLogService>();
builder.Services.AddScoped<GymManagement.Core.Services.GymOps.IExpenseService, GymManagement.Infrastructure.Services.GymOps.ExpenseService>();
builder.Services.AddScoped<GymManagement.Core.Services.GymOps.ICleaningLogService, GymManagement.Infrastructure.Services.GymOps.CleaningLogService>();
builder.Services.AddScoped<GymManagement.Core.Services.GymOps.IVendorService, GymManagement.Infrastructure.Services.GymOps.VendorService>();

// Locker Management module (isolated)
builder.Services.AddScoped<GymManagement.Core.Services.LockerMgmt.ILockerService, GymManagement.Infrastructure.Services.LockerMgmt.LockerService>();
builder.Services.AddScoped<GymManagement.Core.Services.LockerMgmt.ILockerAssignmentService, GymManagement.Infrastructure.Services.LockerMgmt.LockerAssignmentService>();
builder.Services.AddScoped<GymManagement.Core.Services.LockerMgmt.ILockerAccessLogService, GymManagement.Infrastructure.Services.LockerMgmt.LockerAccessLogService>();
builder.Services.AddScoped<GymManagement.Core.Services.LockerMgmt.ILockerMaintenanceService, GymManagement.Infrastructure.Services.LockerMgmt.LockerMaintenanceService>();

builder.Services.AddScoped<IBranchCrudService, BranchCrudService>();
builder.Services.AddScoped<IBranchQrAccessService, BranchQrAccessService>();
builder.Services.AddScoped<IGymQrService, GymQrService>();
builder.Services.AddScoped<IDoorUnlockService, DoorUnlockService>();
builder.Services.AddScoped<IQrExpiryReminderService, QrExpiryReminderService>();

builder.Services.AddScoped<IGymQrFloorWorkoutService, GymQrFloorWorkoutService>();
builder.Services.AddScoped<IAttendanceScanOrchestrator, AttendanceScanOrchestrator>();

var redisConn = builder.Configuration["Redis:ConnectionString"]?.Trim();
if (!string.IsNullOrEmpty(redisConn))
{
    builder.Services.AddSingleton<IConnectionMultiplexer>(_ => ConnectionMultiplexer.Connect(redisConn));
    builder.Services.AddSingleton<IRedisGymSecurityService, RedisGymSecurityService>();
}
else
{
    builder.Services.AddSingleton<IRedisGymSecurityService, NoOpRedisGymSecurityService>();
}

var healthChecksBuilder = builder.Services.AddHealthChecks()
    .AddDbContextCheck<ApplicationDbContext>(
        name: "database",
        failureStatus: HealthStatus.Unhealthy,
        tags: new[] { "ready" });

if (!string.IsNullOrEmpty(redisConn))
{
    healthChecksBuilder.AddRedis(
        redisConnectionString: redisConn,
        name: "redis",
        failureStatus: HealthStatus.Unhealthy,
        tags: new[] { "ready" });
}
else
{
    healthChecksBuilder.AddCheck(
        "redis",
        () => HealthCheckResult.Healthy(
            "Redis not configured — QR replay and rate limiting are disabled."),
        tags: new[] { "ready" });
}

builder.Services.AddHostedService<GymQrSessionExpiryHostedService>();

var app = builder.Build();

// One-off: sync migration history so next "database update" only runs Trainer rename (when DB already has tables).
if (args.Length > 0 && args[0] == "baseline-migration")
{
    using var scope = app.Services.CreateScope();
    var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
    var conn = db.Database.GetDbConnection();
    await conn.OpenAsync();
    try
    {
        await using var cmd = conn.CreateCommand();
        cmd.CommandText = @"
            IF NOT EXISTS (SELECT 1 FROM [__EFMigrationsHistory] WHERE [MigrationId] = N'20260215131447_AddUserTypesAndUserUserTypes')
            BEGIN
                INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion]) VALUES (N'20260215131447_AddUserTypesAndUserUserTypes', N'9.0.0');
            END";
        await cmd.ExecuteNonQueryAsync();
        Console.WriteLine("Baseline migration history updated. Run: dotnet ef database update --project src/GymManagement.Infrastructure --startup-project src/GymManagement.API");
    }
    finally { if (conn.State == ConnectionState.Open) conn.Close(); }
    Environment.Exit(0);
}

// Configure the HTTP request pipeline
app.UseCors("AllowReactApp");

app.UseSwagger();
app.UseSwaggerUI(c =>
{
    c.SwaggerEndpoint("/swagger/v1/swagger.json", "Gym Management API V1");
    c.RoutePrefix = "swagger";
    c.DocumentTitle = "Gym Management API – use Authorize to add Bearer token";
});

// Note: UseHttpsRedirection can cause issues with Swagger, comment out if needed for development
// app.UseHttpsRedirection();

app.UseMiddleware<GlobalExceptionMiddleware>();

// Enable static file serving for uploaded images (before authentication so images are publicly accessible)
var uploadsPath = Path.Combine(Directory.GetCurrentDirectory(), "wwwroot", "uploads");
if (!Directory.Exists(uploadsPath))
{
    Directory.CreateDirectory(uploadsPath);
}
app.UseStaticFiles(new StaticFileOptions
{
    FileProvider = new Microsoft.Extensions.FileProviders.PhysicalFileProvider(uploadsPath),
    RequestPath = "/uploads",
    OnPrepareResponse = ctx =>
    {
        // Allow images to be cached and accessed without authentication
        ctx.Context.Response.Headers.Append("Cache-Control", "public,max-age=31536000");
    }
});

// JWT Bearer: validates the Bearer token in the Authorization header; builds ClaimsPrincipal (sub, userId, role claims).
app.UseAuthentication();
// JWT claims → HttpContext.User; mirror ids/roles on Items.
app.UseJwtUserContext();
// Profile UserId → DB permissions (UserRoles → RolePermissions) → HttpContext.Items for permission checks.
app.UsePermissionResolution();
app.UseAuthorization();
app.MapControllers();
app.MapHealthChecks("/health/live", new Microsoft.AspNetCore.Diagnostics.HealthChecks.HealthCheckOptions
{
    Predicate = _ => false
});
app.MapHealthChecks("/health/ready", new Microsoft.AspNetCore.Diagnostics.HealthChecks.HealthCheckOptions
{
    Predicate = h => h.Tags.Contains("ready")
});

// Automatically create/update database on application start
if (app.Environment.IsDevelopment())
{
    try
    {
        using (var scope = app.Services.CreateScope())
        {
            var dbContext = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
            var logger = scope.ServiceProvider.GetRequiredService<ILogger<Program>>();
            
            logger.LogInformation("Attempting to connect to database...");
            if (useSqlite)
            {
                logger.LogInformation("Using SQLite database: gymmanagement.db");
            }
            else
            {
                var safeConnectionString = connectionString ?? "";
                if (safeConnectionString.Contains("Password="))
                {
                    safeConnectionString = System.Text.RegularExpressions.Regex.Replace(safeConnectionString, @"Password=[^;]+;", "Password=***;");
                }
                logger.LogInformation($"Connection String: {safeConnectionString}");
                // Ensure database exists (avoids "Cannot open database requested by the login" when DB never created)
                try
                {
                    await EnsureSqlServerDatabaseExistsAsync(connectionString!, logger);
                }
                catch (Exception ex)
                {
                    logger.LogWarning(ex, "Could not ensure database exists. Migrations may fail if GymManagementDb does not exist.");
                }
            }

        static async Task EnsureSqlServerDatabaseExistsAsync(string connectionString, ILogger logger)
        {
            var builder = new SqlConnectionStringBuilder(connectionString) { InitialCatalog = "master" };
            await using var conn = new SqlConnection(builder.ConnectionString);
            await conn.OpenAsync();
            using var cmd = conn.CreateCommand();
            cmd.CommandText = @"
IF NOT EXISTS (SELECT 1 FROM sys.databases WHERE name = N'GymManagementDb')
BEGIN
    CREATE DATABASE [GymManagementDb];
    SELECT 1;
END
ELSE
    SELECT 0;";
            var created = Convert.ToInt32(await cmd.ExecuteScalarAsync() ?? 0) == 1;
            if (created) logger.LogInformation("Database GymManagementDb was created.");
        }

        static bool TryAttachExistingDatabase(string appConnectionString, ILogger log, string? configuredDataPath = null)
        {
            try
            {
                var builder = new SqlConnectionStringBuilder(appConnectionString) { InitialCatalog = "master" };
                using var masterConn = new SqlConnection(builder.ConnectionString);
                masterConn.Open();

                string? dataPath = configuredDataPath?.Trim().TrimEnd('\\', '/');

                // 1) Use path from appsettings if set
                if (!string.IsNullOrEmpty(dataPath) && Directory.Exists(dataPath))
                {
                    var mdf = Path.Combine(dataPath, "GymManagementDb.mdf");
                    if (!File.Exists(mdf)) dataPath = null;
                }
                else
                    dataPath = null;

                // 2) Get DATA folder from master database file location (works for any instance)
                if (string.IsNullOrEmpty(dataPath))
                {
                    using (var cmd = masterConn.CreateCommand())
                    {
                        cmd.CommandText = "SELECT physical_name FROM sys.master_files WHERE database_id = 1 AND file_id = 1";
                        var masterPath = cmd.ExecuteScalar()?.ToString()?.Trim();
                        if (!string.IsNullOrEmpty(masterPath))
                        {
                            try
                            {
                                dataPath = Path.GetDirectoryName(masterPath);
                                if (!string.IsNullOrEmpty(dataPath) && File.Exists(Path.Combine(dataPath, "GymManagementDb.mdf")))
                                {
                                    // Keep discovered path.
                                }
                                else
                                    dataPath = null;
                            }
                            catch { dataPath = null; }
                        }
                    }
                }

                // 3) Registry DefaultData
                if (string.IsNullOrEmpty(dataPath))
                {
                    using (var cmd = masterConn.CreateCommand())
                    {
                        cmd.CommandText = "EXEC xp_instance_regread N'HKEY_LOCAL_MACHINE', N'Software\\Microsoft\\MSSQLServer\\MSSQLServer', N'DefaultData'";
                        using var r = cmd.ExecuteReader();
                        if (r.Read())
                        {
                            for (int i = 0; i < r.FieldCount; i++)
                            {
                                var v = r.GetValue(i)?.ToString()?.Trim();
                                if (!string.IsNullOrEmpty(v) && (v.Contains('\\') || v.Contains("Data")))
                                {
                                    dataPath = v.TrimEnd('\\');
                                    break;
                                }
                            }
                        }
                    }
                }

                // 4) Try common paths
                if (string.IsNullOrEmpty(dataPath))
                {
                    var possiblePaths = new[]
                    {
                        @"C:\Program Files\Microsoft SQL Server\MSSQL16.MSSQLSERVER\MSSQL\DATA",
                        @"C:\Program Files\Microsoft SQL Server\MSSQL15.MSSQLSERVER\MSSQL\DATA",
                        @"C:\Program Files\Microsoft SQL Server\MSSQL14.MSSQLSERVER\MSSQL\DATA",
                    };
                    foreach (var dir in possiblePaths)
                    {
                        var mdf = Path.Combine(dir, "GymManagementDb.mdf");
                        if (File.Exists(mdf)) { dataPath = dir; break; }
                    }
                }

                if (string.IsNullOrEmpty(dataPath)) { log.LogWarning("Could not determine SQL Server data path. Set SqlServerDataPath in appsettings to the folder containing GymManagementDb.mdf, or attach the database manually in SSMS."); return false; }

                dataPath = dataPath!.TrimEnd('\\');
                var mdfPath = Path.Combine(dataPath, "GymManagementDb.mdf");
                var ldfPath = Path.Combine(dataPath, "GymManagementDb_log.ldf");
                if (!File.Exists(mdfPath)) { log.LogWarning("GymManagementDb.mdf not found at {Path}", mdfPath); return false; }

                var mdfEscaped = mdfPath.Replace("'", "''");
                var ldfEscaped = ldfPath.Replace("'", "''");
                var attachSql = File.Exists(ldfPath)
                    ? $"CREATE DATABASE [GymManagementDb] ON (FILENAME = N'{mdfEscaped}'), (FILENAME = N'{ldfEscaped}') FOR ATTACH;"
                    : $"CREATE DATABASE [GymManagementDb] ON (FILENAME = N'{mdfEscaped}') FOR ATTACH;";

                using (var attachCmd = masterConn.CreateCommand())
                {
                    attachCmd.CommandText = attachSql;
                    attachCmd.ExecuteNonQuery();
                }
                return true;
            }
            catch (Exception ex)
            {
                log.LogWarning(ex, "TryAttachExistingDatabase failed.");
                return false;
            }
        }

        // Apply migrations so that all tables are created (Migrate is idempotent — no-op if already up to date)
        try
        {
            logger.LogInformation("Applying database migrations...");
            dbContext.Database.Migrate();

            // If migration history says "up to date" but schema is missing, clear history and apply again
            if (!useSqlite)
            {
                var hasUsersTable = await TableExistsAsync(dbContext, logger);
                if (!hasUsersTable)
                {
                    logger.LogWarning("Database has no tables (Users missing). Clearing migration history and applying migrations again...");
                    await ClearMigrationHistoryAsync(dbContext);
                    dbContext.Database.Migrate();
                }
            }
            logger.LogInformation("Database migrations applied successfully.");
        }
        catch (Exception migrateEx)
        {
            var sqlEx = migrateEx is SqlException se ? se : migrateEx.InnerException as SqlException;
            if (sqlEx?.Number == 5170 && !useSqlite)
            {
                logger.LogInformation("Database file already exists. Attempting to attach...");
                try
                {
                    var config = scope.ServiceProvider.GetRequiredService<IConfiguration>();
                    if (TryAttachExistingDatabase(connectionString!, logger, config["SqlServerDataPath"]))
                    {
                        logger.LogInformation("Database attached. Retrying migrations...");
                        dbContext.Database.Migrate();
                        if (!await TableExistsAsync(dbContext, logger))
                        {
                            await ClearMigrationHistoryAsync(dbContext);
                            dbContext.Database.Migrate();
                        }
                        logger.LogInformation("Database migrations applied successfully.");
                    }
                    else
                        logger.LogWarning("Attach failed. Run: dotnet ef database update --project GymManagement.Infrastructure --startup-project GymManagement.API");
                }
                catch (Exception attachEx)
                {
                    logger.LogWarning(attachEx, "Attach and migration failed. Run: dotnet ef database update --project GymManagement.Infrastructure --startup-project GymManagement.API");
                }
            }
            else
            {
                logger.LogWarning(migrateEx, "Migration failed. API will still start. Run: dotnet ef database update --project GymManagement.Infrastructure --startup-project GymManagement.API");
            }
        }

        static async Task<bool> TableExistsAsync(ApplicationDbContext ctx, ILogger logger)
        {
            try
            {
                var conn = ctx.Database.GetDbConnection();
                var wasOpen = conn.State == ConnectionState.Open;
                if (!wasOpen) await conn.OpenAsync();
                try
                {
                    using var cmd = conn.CreateCommand();
                    // Use sys.tables (current database) — no parameters, reliable
                    cmd.CommandText = "SELECT CASE WHEN EXISTS (SELECT 1 FROM sys.tables WHERE name = N'Users' AND schema_id = SCHEMA_ID(N'dbo')) THEN 1 ELSE 0 END";
                    return Convert.ToInt32(await cmd.ExecuteScalarAsync() ?? 0) == 1;
                }
                finally
                {
                    if (!wasOpen && conn.State == ConnectionState.Open) conn.Close();
                }
            }
            catch (Exception ex)
            {
                logger.LogWarning(ex, "Could not check if Users table exists; assuming schema is missing.");
                return false;
            }
        }

        static async Task ClearMigrationHistoryAsync(ApplicationDbContext ctx)
        {
            var conn = ctx.Database.GetDbConnection();
            var wasOpen = conn.State == ConnectionState.Open;
            if (!wasOpen) await conn.OpenAsync();
            try
            {
                using var cmd = conn.CreateCommand();
                cmd.CommandText = "IF OBJECT_ID(N'[__EFMigrationsHistory]', N'U') IS NOT NULL DELETE FROM [__EFMigrationsHistory]";
                await cmd.ExecuteNonQueryAsync();
            }
            finally
            {
                if (!wasOpen && conn.State == ConnectionState.Open) conn.Close();
            }
        }

        // Ensure AuthUsers table exists (fallback if migration was skipped or failed) — required for login
        if (!useSqlite)
        {
            try { await EnsureAuthUsersTableExistsAsync(dbContext, logger); }
            catch (Exception authEx) { logger.LogWarning(authEx, "Could not ensure AuthUsers table."); }
        }

        static async Task<bool> AuthUsersTableExistsAsync(ApplicationDbContext ctx)
        {
            var conn = ctx.Database.GetDbConnection();
            var wasOpen = conn.State == ConnectionState.Open;
            if (!wasOpen) await conn.OpenAsync();
            try
            {
                using var cmd = conn.CreateCommand();
                cmd.CommandText = "SELECT CASE WHEN OBJECT_ID('dbo.AuthUsers','U') IS NOT NULL THEN 1 ELSE 0 END";
                return Convert.ToInt32(await cmd.ExecuteScalarAsync() ?? 0) == 1;
            }
            finally
            {
                if (!wasOpen && conn.State == ConnectionState.Open) conn.Close();
            }
        }

        static async Task EnsureAuthUsersTableExistsAsync(ApplicationDbContext ctx, ILogger logger)
        {
            var conn = ctx.Database.GetDbConnection();
            if (conn.State != ConnectionState.Open)
                await conn.OpenAsync();
            try
            {
                using var checkCmd = conn.CreateCommand();
                checkCmd.CommandText = "SELECT CASE WHEN OBJECT_ID('dbo.AuthUsers','U') IS NOT NULL THEN 1 ELSE 0 END";
                var exists = Convert.ToInt32(await checkCmd.ExecuteScalarAsync() ?? 0) == 1;
                if (exists) return;

                // AuthUsers depends on Users, Trainer, and Roles — only create if migrations have already created those tables
                checkCmd.CommandText = @"
SELECT CASE WHEN OBJECT_ID('dbo.Users','U') IS NOT NULL AND OBJECT_ID('dbo.Roles','U') IS NOT NULL THEN 1 ELSE 0 END";
                var dependenciesExist = Convert.ToInt32(await checkCmd.ExecuteScalarAsync() ?? 0) == 1;
                if (!dependenciesExist)
                {
                    logger.LogWarning("AuthUsers table is missing and required tables (Users, Roles) are not present. Apply migrations first: dotnet ef database update --project GymManagement.Infrastructure --startup-project GymManagement.API");
                    return;
                }

                logger.LogWarning("AuthUsers table is missing. Creating it now (migration may have failed or not run).");
                using var createCmd = conn.CreateCommand();
                createCmd.CommandText = """
                    CREATE TABLE [dbo].[AuthUsers](
                        [Id] int IDENTITY(1,1) NOT NULL,
                        [Email] nvarchar(255) NOT NULL,
                        [PasswordHash] nvarchar(max) NOT NULL,
                        [UserId] int NULL,
                        [RefreshToken] nvarchar(max) NULL,
                        [RefreshTokenExpiry] datetime2 NULL,
                        [PreviousRefreshTokenHash] nvarchar(128) NULL,
                        [RefreshTokenCompromisedAt] datetime2 NULL,
                        [FailedLoginAttempts] int NOT NULL DEFAULT 0,
                        [LockoutEnd] datetime2 NULL,
                        [CreatedDate] datetime2 NOT NULL,
                        [UpdatedDate] datetime2 NULL,
                        [IsDeleted] bit NOT NULL DEFAULT 0,
                        CONSTRAINT [PK_AuthUsers] PRIMARY KEY ([Id]),
                        CONSTRAINT [FK_AuthUsers_Users_UserId] FOREIGN KEY ([UserId]) REFERENCES [Users]([Id]) ON DELETE CASCADE
                    );
                    CREATE UNIQUE INDEX [IX_AuthUsers_Email] ON [dbo].[AuthUsers]([Email]) WHERE [IsDeleted] = 0;
                    CREATE INDEX [IX_AuthUsers_UserId] ON [dbo].[AuthUsers]([UserId]);
                    """;
                await createCmd.ExecuteNonQueryAsync();
                logger.LogInformation("AuthUsers table created successfully.");
            }
            finally
            {
                if (conn.State == ConnectionState.Open)
                    conn.Close();
            }
        }

        // Seed default data (only if schema exists — e.g. migrations or EnsureCreated have run)
        try
        {
            if (!useSqlite && !await AuthUsersTableExistsAsync(dbContext))
            {
                logger.LogWarning("Skipping seed: AuthUsers table is missing. Apply migrations first: dotnet ef database update --project GymManagement.Infrastructure --startup-project GymManagement.API");
            }
            else
            {
                logger.LogInformation("Seeding default data...");
                var unitOfWork = scope.ServiceProvider.GetRequiredService<IUnitOfWork>();
                var appDbContext = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
                var seeder = new GymManagement.Infrastructure.Data.DatabaseSeeder(unitOfWork, appDbContext);
                await seeder.SeedAsync();
                logger.LogInformation("Default data seeded successfully.");
                logger.LogInformation("Default Admin User - Email: admin@gym.com, Password: admin123 (or login id: admin)");
            }
        }
        catch (Exception seedEx)
        {
            logger.LogWarning(seedEx, "An error occurred while seeding default data. The application will continue.");
        }
        }
    }
    catch (Exception ex)
    {
        var logger = app.Services.GetRequiredService<ILogger<Program>>();
        logger.LogError(ex, "An error occurred while creating/updating the database.");
        logger.LogError("The application will continue to start, but database operations may fail.");
        logger.LogError("To fix this issue:");
        logger.LogError("1. Install SQL Server LocalDB from: https://go.microsoft.com/fwlink/?LinkID=799012");
        logger.LogError("2. Or update the connection string in appsettings.json to use SQL Server Express or a remote SQL Server instance");
        logger.LogError("3. Or use SQLite for development by setting UseSqlite=true in appsettings.json");
        logger.LogError("4. For production, use EF Core migrations: dotnet ef migrations add InitialCreate --project ../GymManagement.Infrastructure --startup-project .");
    }
}
else
{
    var logger = app.Services.GetRequiredService<ILogger<Program>>();
    var autoMigrate = builder.Configuration.GetValue<bool>("Database:AutoMigrate", false);
    if (autoMigrate && !useSqlite)
    {
        try
        {
            using var scope = app.Services.CreateScope();
            var dbContext = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
            logger.LogInformation("Applying production database migrations (Database:AutoMigrate=true)...");
            await dbContext.Database.MigrateAsync();
            logger.LogInformation("Production database migrations applied.");
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Production database migration failed.");
            throw;
        }
    }
    else
    {
        logger.LogInformation(
            "Skipping database auto-migration. Set Database:AutoMigrate=true or run deploy/scripts/migrate.sh.");
    }

    var seedDefaults = builder.Configuration.GetValue<bool>("Database:SeedDefaults", false);
    if (seedDefaults && !useSqlite)
    {
        try
        {
            using var scope = app.Services.CreateScope();
            var dbContext = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
            var unitOfWork = scope.ServiceProvider.GetRequiredService<IUnitOfWork>();
            logger.LogInformation("Seeding database (Database:SeedDefaults=true)...");
            var seeder = new GymManagement.Infrastructure.Data.DatabaseSeeder(unitOfWork, dbContext);
            await seeder.SeedAsync();
            logger.LogInformation("Database seed completed successfully.");
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Database seed failed.");
            throw;
        }
    }
}

app.Run();
