# syntax=docker/dockerfile:1

FROM mcr.microsoft.com/dotnet/sdk:9.0-alpine AS build
WORKDIR /src

COPY src/GymManagement.Domain/GymManagement.Domain.csproj src/GymManagement.Domain/
COPY src/GymManagement.Core/GymManagement.Core.csproj src/GymManagement.Core/
COPY src/GymManagement.Infrastructure/GymManagement.Infrastructure.csproj src/GymManagement.Infrastructure/
COPY src/GymManagement.API/GymManagement.API.csproj src/GymManagement.API/

RUN dotnet restore src/GymManagement.API/GymManagement.API.csproj

COPY src/ src/

RUN dotnet publish src/GymManagement.API/GymManagement.API.csproj \
    -c Release \
    -o /app/publish \
    --no-restore \
    /p:UseAppHost=false

FROM mcr.microsoft.com/dotnet/aspnet:9.0-alpine AS runtime
WORKDIR /app

RUN apk add --no-cache curl icu-libs

ENV ASPNETCORE_URLS=http://+:8080 \
    DOTNET_SYSTEM_GLOBALIZATION_INVARIANT=false \
    ASPNETCORE_ENVIRONMENT=Production

COPY --from=build /app/publish .
COPY deploy/docker/api/entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh \
    && mkdir -p /app/wwwroot/uploads

USER app
EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=5s --start-period=40s --retries=3 \
  CMD curl -fsS http://127.0.0.1:8080/health/live || exit 1

ENTRYPOINT ["/entrypoint.sh"]
