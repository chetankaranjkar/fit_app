#!/usr/bin/env bash
# Repair UAT when GymManagementDb_UAT is RECOVERY_PENDING (API cannot connect / migrate).
#
# Usage:
#   ./deploy/scripts/fix-uat-db-recovery-pending.sh          # restart SQL + try SET ONLINE
#   FORCE=1 ./deploy/scripts/fix-uat-db-recovery-pending.sh  # drop stuck catalog + recreate (UAT data loss)
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=_uat.sh
source "${SCRIPT_DIR}/_uat.sh"

require_uat_env
cd "${REPO_ROOT}"

SA_PASS="$(grep -E '^MSSQL_SA_PASSWORD=' "${ENV_FILE}" | cut -d= -f2- | tr -d '\r' | sed 's/^"//;s/"$//')"
DB_NAME="$(grep -E '^MSSQL_DATABASE=' "${ENV_FILE}" 2>/dev/null | cut -d= -f2- | tr -d '\r' | sed 's/^"//;s/"$//')"
DB_NAME="${DB_NAME:-GymManagementDb_UAT}"
VOLUME_NAME="gym_uat_sqlserver_data"
FORCE="${FORCE:-0}"

sqlcmd_master() {
  compose_uat exec -T sqlserver /opt/mssql-tools18/bin/sqlcmd -S localhost -U sa -P "${SA_PASS}" -C "$@"
}

db_state() {
  sqlcmd_master -h -1 -W -Q "SET NOCOUNT ON; SELECT state_desc FROM sys.databases WHERE name = N'${DB_NAME}'" \
    | tr -d '\r' | head -1 | xargs
}

wait_sql_healthy() {
  echo "==> Waiting for gym-uat-sqlserver to be healthy..."
  for _ in $(seq 1 40); do
    status="$(docker inspect gym-uat-sqlserver --format='{{.State.Health.Status}}' 2>/dev/null || echo unknown)"
    if [[ "${status}" == "healthy" ]]; then
      return 0
    fi
    sleep 3
  done
  echo "WARN: SQL container health not confirmed; continuing anyway."
}

echo "=== Fix UAT database: ${DB_NAME} (FORCE=${FORCE}) ==="

echo "==> Stopping API containers (avoid crash loop during SQL repair)..."
compose_uat stop api exercise-api frontend 2>/dev/null || true

echo "==> Restarting SQL Server (recovery may complete on clean start)..."
docker restart gym-uat-sqlserver
wait_sql_healthy

state="$(db_state || true)"
echo "==> Catalog state after restart: ${state:-MISSING}"

if [[ "${state}" == "ONLINE" ]]; then
  echo "OK: ${DB_NAME} is ONLINE."
elif [[ "${state}" == "RECOVERY_PENDING" ]]; then
  echo "==> Trying ALTER DATABASE ... SET ONLINE..."
  if sqlcmd_master -Q "ALTER DATABASE [${DB_NAME}] SET ONLINE;" 2>/dev/null; then
    state="$(db_state || true)"
    echo "==> State after SET ONLINE: ${state:-MISSING}"
  else
    echo "SET ONLINE did not succeed."
  fi
fi

if [[ "${state}" == "ONLINE" ]]; then
  echo "==> Starting API stack..."
  compose_uat up -d api
  echo "Run: ./deploy/scripts/diagnose-uat-db.sh"
  exit 0
fi

if [[ "${FORCE}" != "1" ]]; then
  echo ""
  echo "FAIL: ${DB_NAME} is still '${state:-MISSING}' (not ONLINE)."
  echo ""
  echo "Recent SQL log lines for this database:"
  docker logs gym-uat-sqlserver 2>&1 | grep -iE "${DB_NAME}|recovery|error" | tail -20 || true
  echo ""
  echo "To drop the stuck UAT catalog and recreate empty (UAT gym data only — TrackFlow untouched):"
  echo "  FORCE=1 ./deploy/scripts/fix-uat-db-recovery-pending.sh"
  exit 1
fi

echo ""
echo "==> FORCE=1: removing stuck catalog files for ${DB_NAME} only..."
compose_uat stop sqlserver

docker run --rm \
  -v "${VOLUME_NAME}:/var/opt/mssql" \
  alpine:3.20 \
  sh -c "
    set -eu
    cd /var/opt/mssql/data
    ls -la ${DB_NAME}* 2>/dev/null || true
    rm -f ${DB_NAME}.mdf ${DB_NAME}_log.ldf ${DB_NAME}*.ndf 2>/dev/null || true
    echo 'Removed data files (if any).'
  "

echo "==> Starting SQL Server..."
compose_uat up -d sqlserver
wait_sql_healthy

state="$(db_state || true)"
if [[ -n "${state}" ]]; then
  echo "WARN: Catalog still registered as ${state}; attempting DROP..."
  sqlcmd_master -Q "
    IF EXISTS (SELECT 1 FROM sys.databases WHERE name = N'${DB_NAME}')
    BEGIN
      ALTER DATABASE [${DB_NAME}] SET SINGLE_USER WITH ROLLBACK IMMEDIATE;
      DROP DATABASE [${DB_NAME}];
    END
  " 2>/dev/null || true
fi

echo "==> Creating fresh empty catalog ${DB_NAME}..."
sqlcmd_master -Q "CREATE DATABASE [${DB_NAME}];"

state="$(db_state || true)"
if [[ "${state}" != "ONLINE" ]]; then
  echo "FAIL: ${DB_NAME} state is ${state:-MISSING} after recreate."
  exit 1
fi

echo "OK: ${DB_NAME} is ONLINE (empty). Starting API — migrations run on startup..."
compose_uat up -d api exercise-api frontend

echo ""
echo "Watch migration: docker logs -f gym-uat-api"
echo "When ready: curl -fsS http://127.0.0.1:${API_HOST_PORT:-5105}/health/ready"
