#!/usr/bin/env bash
# Skip 20260524142624_AddRetailPosModule when coupon columns already exist (duplicate of EnterpriseCouponBilling).
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/_common.sh"

require_env
cd "${REPO_ROOT}"

SA_PASS="$(grep -E '^MSSQL_SA_PASSWORD=' deploy/.env | cut -d= -f2- | tr -d '\r' | sed 's/^"//;s/"$//')"
DB_NAME="$(grep -E '^MSSQL_DATABASE=' deploy/.env 2>/dev/null | cut -d= -f2- | tr -d '\r' || true)"
DB_NAME="${DB_NAME:-GymManagementDb}"

MIGRATION_ID="20260524142624_AddRetailPosModule"

echo "=== Mark ${MIGRATION_ID} applied when schema already exists ==="
compose exec -T sqlserver /opt/mssql-tools18/bin/sqlcmd -S localhost -U sa -P "${SA_PASS}" -C -d "${DB_NAME}" -Q "
IF COL_LENGTH('membership_payments', 'CouponAppliedAt') IS NOT NULL
   AND NOT EXISTS (SELECT 1 FROM dbo.__EFMigrationsHistory WHERE MigrationId = N'${MIGRATION_ID}')
BEGIN
    INSERT INTO dbo.__EFMigrationsHistory (MigrationId, ProductVersion)
    VALUES (N'${MIGRATION_ID}', N'9.0.0');
    PRINT 'Inserted migration history row for ${MIGRATION_ID}.';
END
ELSE IF EXISTS (SELECT 1 FROM dbo.__EFMigrationsHistory WHERE MigrationId = N'${MIGRATION_ID}')
    PRINT 'Migration already recorded.';
ELSE
    PRINT 'CouponAppliedAt not found — pull latest main (no-op migration) and restart API instead.';
"

echo ""
echo "=== Rebuild API (includes no-op migration fix) and restart ==="
git fetch origin main -q 2>/dev/null || true
git pull --ff-only origin main 2>/dev/null || git reset --hard origin/main

export GIT_COMMIT_SHA="$(git rev-parse --short HEAD)"
compose build --no-cache api
compose up -d --force-recreate api

echo ""
echo "=== API logs (migrations) ==="
sleep 6
compose logs --tail 60 api 2>/dev/null || docker logs gym-api --tail 60 2>/dev/null || true

echo ""
echo "=== Health ==="
APP_URL="$(public_app_url)"
for i in $(seq 1 30); do
  if curl -fsS "${APP_URL}/health/ready" >/dev/null 2>&1; then
    echo "API ready at ${APP_URL}/health/ready"
    curl -fsS "${APP_URL}/api/deploy-info" 2>/dev/null && echo "" || true
    exit 0
  fi
  sleep 4
done
echo "API not ready — run: ./deploy/scripts/logs.sh api --tail 120"
exit 1
