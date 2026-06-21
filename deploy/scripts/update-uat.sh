#!/usr/bin/env bash
# Pull latest code and redeploy UAT containers.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=_uat.sh
source "${SCRIPT_DIR}/_uat.sh"

require_uat_env
cd "${REPO_ROOT}"

git fetch origin
git checkout uat
git pull origin uat

export GIT_COMMIT_SHA="$(git rev-parse --short HEAD 2>/dev/null || echo unknown)"

compose_uat build
compose_uat up -d --remove-orphans

echo "Waiting for API (migrations run on startup)..."
api_ready=false
for i in $(seq 1 36); do
  if curl -fsS "http://127.0.0.1:${API_HOST_PORT:-5105}/health/ready" >/dev/null 2>&1; then
    api_ready=true
    break
  fi
  sleep 5
done

echo ""
if [[ "${api_ready}" != "true" ]]; then
  echo "ERROR: UAT API did not become healthy."
  echo ""
  echo "=== gym-uat-api logs (last 100 lines) ==="
  docker logs gym-uat-api --tail 100 2>&1 || true
  echo ""
  echo "Checks:"
  echo "  docker compose ... exec sqlserver bash -c 'export SQLCMDPASSWORD=\"\$MSSQL_SA_PASSWORD\"; sqlcmd -S localhost -U sa -C -d master -Q \"SELECT name FROM sys.databases\"'"
  echo "  grep MSSQL_DATABASE deploy/.env.uat   # expect GymManagementDb_UAT"
  exit 1
fi

echo "Recent API migration log lines:"
docker logs gym-uat-api --tail 80 2>&1 | grep -iE "migrat|schema|membership lifecycle|error" || true

echo ""
echo "UAT updated ($(uat_public_url)) — commit ${GIT_COMMIT_SHA}"
echo "If saves still fail, run: ./deploy/scripts/migrate-uat.sh"
