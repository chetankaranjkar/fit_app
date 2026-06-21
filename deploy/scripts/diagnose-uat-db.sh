#!/usr/bin/env bash
# UAT SQL connectivity — run on the VPS when gym-uat-api fails with "Cannot connect to SQL catalog".
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=_uat.sh
source "${SCRIPT_DIR}/_uat.sh"

require_uat_env
cd "${REPO_ROOT}"

SA_PASS="$(grep -E '^MSSQL_SA_PASSWORD=' "${ENV_FILE}" | cut -d= -f2- | tr -d '\r' | sed 's/^"//;s/"$//')"
DB_NAME="$(grep -E '^MSSQL_DATABASE=' "${ENV_FILE}" 2>/dev/null | cut -d= -f2- | tr -d '\r' | sed 's/^"//;s/"$//')"
DB_NAME="${DB_NAME:-GymManagementDb_UAT}"

sqlcmd_uat() {
  compose_uat exec -T sqlserver /opt/mssql-tools18/bin/sqlcmd -S localhost -U sa -P "${SA_PASS}" -C "$@" \
    || compose_uat exec -T sqlserver /opt/mssql-tools/bin/sqlcmd -S localhost -U sa -P "${SA_PASS}" -C "$@"
}

echo "=== UAT SQL diagnostics ==="
echo "Env file: ${ENV_FILE}"
echo "Database: ${DB_NAME}"
echo ""

echo "--- sys.databases (all) ---"
sqlcmd_uat -Q "SELECT name, state_desc, create_date FROM sys.databases ORDER BY name"

echo ""
echo "--- Target catalog ---"
sqlcmd_uat -Q "
SELECT name, state_desc, user_access_desc, is_read_only
FROM sys.databases
WHERE name = N'${DB_NAME}';
"

echo ""
echo "--- Login test to catalog ---"
if sqlcmd_uat -d "${DB_NAME}" -Q "SELECT DB_NAME() AS current_db, 1 AS ok"; then
  echo "OK: sa can connect to ${DB_NAME} from sqlserver container."
else
  echo "FAIL: sa cannot connect to ${DB_NAME}."
  echo ""
  echo "If the database is MISSING, create it:"
  echo "  sqlcmd ... -Q \"CREATE DATABASE [${DB_NAME}]\""
  echo ""
  echo "If MSSQL_SA_PASSWORD was changed after the volume was first created,"
  echo "reset the password inside SQL or recreate the UAT SQL volume (data loss)."
fi

echo ""
echo "--- API container connection string (password redacted) ---"
if docker ps --format '{{.Names}}' | grep -qx 'gym-uat-api'; then
  docker exec gym-uat-api printenv ConnectionStrings__DefaultConnection 2>/dev/null \
    | sed -E 's/Password=[^;]*/Password=***/' || echo "(gym-uat-api not running or env missing)"
else
  echo "(gym-uat-api container not running)"
fi

echo ""
echo "--- Network: api → sqlserver:1433 ---"
if docker ps --format '{{.Names}}' | grep -qx 'gym-uat-api'; then
  docker exec gym-uat-api sh -c 'nc -zvw3 sqlserver 1433 2>&1 || wget -qO- --timeout=3 telnet://sqlserver:1433 2>&1 || echo "install netcat or check DNS"' \
    || true
fi

echo ""
echo "Done. If catalog is ONLINE and login works above, rebuild API after pulling latest uat:"
echo "  ./deploy/scripts/update-uat.sh"
