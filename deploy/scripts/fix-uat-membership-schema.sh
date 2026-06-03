#!/usr/bin/env bash
# Repair UAT when membership lifecycle tables are missing (500 / "Database schema is out of date").
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=_uat.sh
source "${SCRIPT_DIR}/_uat.sh"

require_uat_env
cd "${REPO_ROOT}"

MIGRATION_ID="20260603092400_MembershipLifecycleAndUniqueActiveMembership"
SA_PASS="$(grep -E '^MSSQL_SA_PASSWORD=' "${ENV_FILE}" | cut -d= -f2- | tr -d '\r' | sed 's/^"//;s/"$//')"
DB_NAME="$(grep -E '^MSSQL_DATABASE=' "${ENV_FILE}" 2>/dev/null | cut -d= -f2- | tr -d '\r' || true)"
DB_NAME="${DB_NAME:-GymManagementDb_UAT}"

sqlcmd_uat() {
  compose_uat exec -T sqlserver /opt/mssql-tools18/bin/sqlcmd -S localhost -U sa -P "${SA_PASS}" -C -d "${DB_NAME}" "$@" \
    || compose_uat exec -T sqlserver /opt/mssql-tools/bin/sqlcmd -S localhost -U sa -P "${SA_PASS}" -C -d "${DB_NAME}" "$@"
}

echo "=== UAT database: ${DB_NAME} ==="
echo "=== Checking membership lifecycle tables ==="
sqlcmd_uat -Q "
SELECT
  OBJECT_ID(N'membership_audit_logs', N'U') AS audit_logs,
  OBJECT_ID(N'membership_approval_requests', N'U') AS approval_requests;
SELECT MigrationId FROM dbo.__EFMigrationsHistory
WHERE MigrationId LIKE N'%MembershipLifecycle%' OR MigrationId LIKE N'%20260603%';
"

echo ""
echo "=== Fix stuck migration history (recorded but tables missing) ==="
sqlcmd_uat -Q "
IF OBJECT_ID(N'membership_audit_logs', N'U') IS NULL
   AND EXISTS (SELECT 1 FROM dbo.__EFMigrationsHistory WHERE MigrationId = N'${MIGRATION_ID}')
BEGIN
    DELETE FROM dbo.__EFMigrationsHistory WHERE MigrationId = N'${MIGRATION_ID}';
    PRINT 'Removed stuck migration history row so EF can re-apply.';
END
ELSE IF OBJECT_ID(N'membership_audit_logs', N'U') IS NOT NULL
    PRINT 'Tables already exist — no history fix needed.';
ELSE
    PRINT 'Tables missing; migration not in history — API startup will apply it.';
"

echo ""
echo "=== Pull latest uat and rebuild API ==="
git fetch origin
git checkout uat
git pull origin uat

export GIT_COMMIT_SHA="$(git rev-parse --short HEAD 2>/dev/null || echo unknown)"
compose_uat build api
compose_uat up -d --force-recreate api

echo ""
echo "Waiting for API (migrations on startup)..."
for i in $(seq 1 40); do
  if curl -fsS "http://127.0.0.1:${API_HOST_PORT:-5105}/health/ready" >/dev/null 2>&1; then
    echo "API ready."
    break
  fi
  if [[ "$i" -eq 40 ]]; then
    echo "API not ready. Logs:"
    docker logs gym-uat-api --tail 100
    exit 1
  fi
  sleep 5
done

echo ""
echo "=== Verify tables after restart ==="
sqlcmd_uat -Q "
SELECT
  OBJECT_ID(N'membership_audit_logs', N'U') AS audit_logs,
  OBJECT_ID(N'membership_approval_requests', N'U') AS approval_requests;
SELECT MigrationId FROM dbo.__EFMigrationsHistory WHERE MigrationId = N'${MIGRATION_ID}';
"

echo ""
echo "=== Recent API migration logs ==="
docker logs gym-uat-api --tail 80 2>&1 | grep -iE "migrat|membership lifecycle|schema|error" || true

AUDIT_OK="$(sqlcmd_uat -h -1 -W -Q "SET NOCOUNT ON; SELECT CASE WHEN OBJECT_ID(N'membership_audit_logs', N'U') IS NOT NULL THEN 1 ELSE 0 END" | tr -d ' \r\n' | tail -1)"
if [ "${AUDIT_OK}" = "1" ]; then
  echo ""
  echo "SUCCESS: membership_audit_logs exists. Retry saving a user in the browser."
else
  echo ""
  echo "FAIL: Tables still missing. Paste: docker logs gym-uat-api --tail 150"
  exit 1
fi
