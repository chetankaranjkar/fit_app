#!/usr/bin/env bash
# Fix EF history after AddCouponModule migration id was reordered (20260521091039 → 20260521120500).
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/_common.sh"

require_env
cd "${REPO_ROOT}"

echo "=== API container logs (last 80 lines) ==="
compose logs --tail 80 api 2>/dev/null || docker logs gym-api --tail 80 2>/dev/null || true
echo ""

SA_PASS="$(grep -E '^MSSQL_SA_PASSWORD=' deploy/.env | cut -d= -f2- | tr -d '\r' | sed 's/^"//;s/"$//')"
DB_NAME="$(grep -E '^MSSQL_DATABASE=' deploy/.env 2>/dev/null | cut -d= -f2- | tr -d '\r' || true)"
DB_NAME="${DB_NAME:-GymManagementDb}"

echo "=== Updating __EFMigrationsHistory if old coupon migration id exists ==="
compose exec -T sqlserver /opt/mssql-tools18/bin/sqlcmd -S localhost -U sa -P "${SA_PASS}" -C -d "${DB_NAME}" -Q "
IF EXISTS (SELECT 1 FROM dbo.__EFMigrationsHistory WHERE MigrationId = N'20260521091039_AddCouponModule')
   AND NOT EXISTS (SELECT 1 FROM dbo.__EFMigrationsHistory WHERE MigrationId = N'20260521120500_AddCouponModule')
BEGIN
    UPDATE dbo.__EFMigrationsHistory
    SET MigrationId = N'20260521120500_AddCouponModule'
    WHERE MigrationId = N'20260521091039_AddCouponModule';
    PRINT 'Renamed migration history row.';
END
ELSE
    PRINT 'No history rename needed.';
" || echo "sqlcmd failed — check MSSQL_SA_PASSWORD in deploy/.env"

echo ""
echo "=== Restarting API ==="
compose up -d api
sleep 8
compose logs --tail 40 api || true

echo ""
echo "=== Health ==="
for i in $(seq 1 30); do
  if compose exec -T api curl -fsS http://127.0.0.1:8080/health/ready >/dev/null 2>&1; then
    echo "API ready."
    exit 0
  fi
  sleep 4
done
echo "API still not ready. Run: ./deploy/scripts/logs.sh api --tail 120"
exit 1
