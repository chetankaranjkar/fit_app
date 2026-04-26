# Minimal-Create.ps1
dotnet new sln -n GymManagement
dotnet new webapi -n GymManagement.API -o src/GymManagement.API
dotnet new classlib -n GymManagement.Core -o src/GymManagement.Core
dotnet new classlib -n GymManagement.Infrastructure -o src/GymManagement.Infrastructure
dotnet new classlib -n GymManagement.Domain -o src/GymManagement.Domain
dotnet sln add src/GymManagement.API src/GymManagement.Core src/GymManagement.Infrastructure src/GymManagement.Domain
Write-Host "Basic project structure created!" -ForegroundColor Green