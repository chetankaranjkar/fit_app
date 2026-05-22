#!/usr/bin/env bash
# Troubleshoot gym-sqlserver unhealthy / failed to start.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/_common.sh"

require_env
cd "${REPO_ROOT}"

echo "=== Memory ==="
free -h 2>/dev/null || true
echo ""

echo "=== Port 1433 ==="
ss -tlnp 2>/dev/null | grep ':1433 ' || echo "(nothing listening on 1433)"
echo ""

echo "=== Container status ==="
docker ps -a --filter name=gym-sqlserver --format 'table {{.Names}}\t{{.Status}}\t{{.Ports}}'
echo ""

echo "=== Health (last 5 lines) ==="
docker inspect gym-sqlserver --format '{{json .State.Health}}' 2>/dev/null | python3 -m json.tool 2>/dev/null \
  || docker inspect gym-sqlserver --format 'Status={{.State.Status}} ExitCode={{.State.ExitCode}}' 2>/dev/null \
  || echo "Container not found"
echo ""

echo "=== SQL Server logs (last 80 lines) ==="
compose logs --tail 80 sqlserver 2>/dev/null || docker logs gym-sqlserver --tail 80 2>/dev/null || true
echo ""

echo "=== Manual health probe (uses SQLCMDPASSWORD from container env) ==="
if docker exec gym-sqlserver printenv MSSQL_SA_PASSWORD >/dev/null 2>&1; then
  if docker exec gym-sqlserver bash -c \
    'export SQLCMDPASSWORD="$MSSQL_SA_PASSWORD"; /opt/mssql-tools18/bin/sqlcmd -S localhost -U sa -C -Q "SELECT 1" -b -o /dev/null'; then
    echo "OK: sqlcmd connected as sa."
  else
    echo "FAIL: sqlcmd could not connect."
    echo ""
    echo "Common fixes:"
    echo "  1) MSSQL_SA_PASSWORD in deploy/.env was CHANGED after first install —"
    echo "     SQL keeps the OLD password in volume gym_sqlserver_data."
    echo "     Fix: use the original password in .env, OR wipe volume (deletes DB):"
    echo "       docker compose ... down"
    echo "       docker volume rm gym_sqlserver_data"
    echo "       ./deploy/scripts/deploy.sh"
    echo "  2) Password must be 8+ chars with upper, lower, digit, symbol."
    echo "  3) VPS low RAM — set in deploy/.env: MSSQL_MEMORY_LIMIT_MB=1024"
    echo "       SQLSERVER_MEMORY_LIMIT=1200m"
  fi
else
  echo "Container not running — check logs above (OOM, port conflict, or crash on startup)."
fi
