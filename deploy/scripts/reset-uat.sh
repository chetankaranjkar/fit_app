#!/usr/bin/env bash
# Tear down all UAT containers, keep Docker volumes, repair gym catalog if needed, full redeploy.
#
# Keeps:  gym_uat_sqlserver_data (SQL files — TrackFlow and other DBs on the instance)
#         gym_uat_api_uploads
# Removes: gym-uat-* containers (and optionally local UAT images with REMOVE_IMAGES=1)
#
# If GymManagementDb_UAT is RECOVERY_PENDING / not ONLINE, recreates that catalog only (gym UAT data).
# Other databases on the same SQL volume are not touched.
#
# Usage:
#   ./deploy/scripts/reset-uat.sh
#   REMOVE_IMAGES=1 ./deploy/scripts/reset-uat.sh   # also remove locally built gym-uat images
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=_uat.sh
source "${SCRIPT_DIR}/_uat.sh"

require_uat_env
cd "${REPO_ROOT}"

DB_NAME="${MSSQL_DATABASE:-GymManagementDb_UAT}"
VOLUME_SQL="gym_uat_sqlserver_data"
VOLUME_UPLOADS="gym_uat_api_uploads"
REMOVE_IMAGES="${REMOVE_IMAGES:-0}"
SA_PASS="$(grep -E '^MSSQL_SA_PASSWORD=' "${ENV_FILE}" | cut -d= -f2- | tr -d '\r' | sed 's/^"//;s/"$//')"

echo "=== UAT reset (containers only — volumes kept) ==="
echo "  SQL volume:     ${VOLUME_SQL}"
echo "  Uploads volume: ${VOLUME_UPLOADS}"
echo "  Gym catalog:    ${DB_NAME} (recreated if not ONLINE)"
echo ""

echo "==> Stopping and removing UAT containers..."
compose_uat down --remove-orphans || true

for name in gym-uat-sqlserver gym-uat-redis gym-uat-api gym-uat-exercise-api gym-uat-frontend; do
  docker rm -f "${name}" 2>/dev/null || true
done

if [[ "${REMOVE_IMAGES}" == "1" ]]; then
  echo "==> Removing local UAT compose images..."
  compose_uat down --rmi local 2>/dev/null || true
fi

echo "==> Volumes still present:"
docker volume ls | grep -E 'gym_uat_' || echo "(none — first deploy will create them)"

echo ""
echo "==> Starting SQL Server only..."
"${SCRIPT_DIR}/fix-uat-sql-port.sh"
compose_uat up -d sqlserver

echo "==> Waiting for SQL healthy..."
for _ in $(seq 1 40); do
  status="$(docker inspect gym-uat-sqlserver --format='{{.State.Health.Status}}' 2>/dev/null || echo unknown)"
  if [[ "${status}" == "healthy" ]]; then
    break
  fi
  sleep 3
done

sqlcmd_master() {
  compose_uat exec -T sqlserver /opt/mssql-tools18/bin/sqlcmd -S localhost -U sa -P "${SA_PASS}" -C "$@"
}

db_state() {
  sqlcmd_master -h -1 -W -Q "SET NOCOUNT ON; SELECT state_desc FROM sys.databases WHERE name = N'${DB_NAME}'" \
    2>/dev/null | tr -d '\r' | head -1 | xargs || true
}

state="$(db_state)"
echo "==> ${DB_NAME} state: ${state:-MISSING}"

if [[ "${state}" != "ONLINE" ]]; then
  echo "==> Catalog not ONLINE — recreating ${DB_NAME} (gym UAT data only; other DBs on volume kept)..."
  compose_uat stop sqlserver

  docker run --rm \
    -v "${VOLUME_SQL}:/var/opt/mssql" \
    alpine:3.20 \
    sh -c "
      set -eu
      cd /var/opt/mssql/data
      ls -la ${DB_NAME}* 2>/dev/null || true
      rm -f ${DB_NAME}.mdf ${DB_NAME}_log.ldf ${DB_NAME}*.ndf 2>/dev/null || true
    "

  compose_uat up -d sqlserver
  for _ in $(seq 1 40); do
    status="$(docker inspect gym-uat-sqlserver --format='{{.State.Health.Status}}' 2>/dev/null || echo unknown)"
    [[ "${status}" == "healthy" ]] && break
    sleep 3
  done

  sqlcmd_master -Q "
    IF EXISTS (SELECT 1 FROM sys.databases WHERE name = N'${DB_NAME}')
    BEGIN
      ALTER DATABASE [${DB_NAME}] SET SINGLE_USER WITH ROLLBACK IMMEDIATE;
      DROP DATABASE [${DB_NAME}];
    END
  " 2>/dev/null || true

  sqlcmd_master -Q "CREATE DATABASE [${DB_NAME}];"
  state="$(db_state)"
  if [[ "${state}" != "ONLINE" ]]; then
    echo "FAIL: ${DB_NAME} is still ${state:-MISSING} after recreate."
    exit 1
  fi
  echo "OK: fresh empty ${DB_NAME} is ONLINE."
else
  echo "OK: ${DB_NAME} already ONLINE — keeping existing gym data."
fi

echo ""
echo "==> Full UAT deploy (build + all services)..."
export GIT_COMMIT_SHA="$(git rev-parse --short HEAD 2>/dev/null || echo unknown)"
compose_uat build --pull
compose_uat up -d --remove-orphans

echo "==> Waiting for API..."
api_ready=false
for i in $(seq 1 40); do
  if curl -fsS "http://127.0.0.1:${API_HOST_PORT:-5105}/health/ready" >/dev/null 2>&1; then
    api_ready=true
    break
  fi
  sleep 5
done

echo ""
if [[ "${api_ready}" != "true" ]]; then
  echo "ERROR: UAT API did not become healthy."
  docker logs gym-uat-api --tail 120 2>&1 || true
  exit 1
fi

echo "UAT reset complete — $(uat_public_url) (commit ${GIT_COMMIT_SHA})"
echo "  curl http://127.0.0.1:${API_HOST_PORT:-5105}/health/ready"
echo "  docker logs gym-uat-api --tail 50"
