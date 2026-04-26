# Run this script when the API is stopped to apply pending EF migrations.
# From repo root: .\scripts\update-database.ps1
Set-Location $PSScriptRoot\..

Write-Host "Applying database migrations (API can be stopped)..." -ForegroundColor Cyan
dotnet ef database update --project src/GymManagement.Infrastructure --startup-project src/GymManagement.API

if ($LASTEXITCODE -eq 0) {
    Write-Host "Database updated successfully." -ForegroundColor Green
} else {
    Write-Host "Migration failed. Check connection string in appsettings.json and that SQL Server is running." -ForegroundColor Red
    exit 1
}
