#!/usr/bin/env bash
# Wipe production SQL volume, redeploy gym stack, run default database seed.
#
# WARNING: Deletes ALL data in gym_sqlserver_data (GymManagementDb). UAT volumes are NOT touched.
#
# After seed: admin@gym.com / admin123 (+ demo trainers from DatabaseSeeder). Custom users are gone.
#
# Usage (on production VPS, /opt/gym):
#   ./deploy/scripts/reset-production.sh
#   REMOVE_UPLOADS=1 ./deploy/scripts/reset-production.sh   # also wipe profile/upload files volume
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=_common.sh
source "${SCRIPT_DIR}/_common.sh"

require_env
cd "${REPO_ROOT}"

if is_testing_mode; then
  echo "ERROR: reset-production.sh is for production (DEPLOY_MODE=production with DOMAIN)." >&2
  echo "Testing mode: use fresh-start.sh or wipe volumes manually." >&2
  exit 1
fi

DB_NAME="${MSSQL_DATABASE:-GymManagementDb}"
VOLUME_SQL="gym_sqlserver_data"
VOLUME_UPLOADS="gym_api_uploads"
REMOVE_UPLOADS="${REMOVE_UPLOADS:-0}"

echo "=== PRODUCTION reset (SQL volume wiped + reseed) ==="
echo "  Database:       ${DB_NAME}"
echo "  SQL volume:     ${VOLUME_SQL}  (WILL BE DELETED)"
echo "  Uploads volume: ${VOLUME_UPLOADS}  (kept unless REMOVE_UPLOADS=1)"
echo "  UAT volumes:    NOT touched (gym_uat_*)"
echo ""
echo "After seed, default login: admin@gym.com / admin123"
echo "Take a backup first: ./deploy/scripts/backup.sh"
echo ""
read -r -p "Type YES to DELETE production SQL data and reseed: " confirm
if [[ "${confirm}" != "YES" ]]; then
  echo "Aborted."
  exit 1
fi

echo "==> Stopping production stack..."
compose down --remove-orphans || true

for name in gym-sqlserver gym-redis gym-api gym-exercise-api gym-frontend gym-gateway; do
  docker rm -f "${name}" 2>/dev/null || true
done

echo "==> Removing SQL volume ${VOLUME_SQL}..."
docker volume rm -f "${VOLUME_SQL}" 2>/dev/null || true

if [[ "${REMOVE_UPLOADS}" == "1" ]]; then
  echo "==> Removing uploads volume ${VOLUME_UPLOADS}..."
  docker volume rm -f "${VOLUME_UPLOADS}" 2>/dev/null || true
fi

if ! grep -qE '^DATABASE_AUTO_MIGRATE=true' "${ENV_FILE}"; then
  echo "WARN: Set DATABASE_AUTO_MIGRATE=true in deploy/.env so migrations run on API startup."
fi

if ! grep -qE '^NOTIFICATIONS_ENABLE_SCHEDULED_REMINDERS=' "${ENV_FILE}"; then
  echo 'NOTIFICATIONS_ENABLE_SCHEDULED_REMINDERS=false' >> "${ENV_FILE}"
  echo "Added NOTIFICATIONS_ENABLE_SCHEDULED_REMINDERS=false to deploy/.env"
fi

export GIT_COMMIT_SHA="$(git rev-parse --short HEAD 2>/dev/null || echo unknown)"

echo "==> Building and starting production stack..."
compose build --pull
compose up -d --remove-orphans

echo "==> Waiting for SQL healthy..."
for _ in $(seq 1 40); do
  status="$(docker inspect gym-sqlserver --format='{{.State.Health.Status}}' 2>/dev/null || echo unknown)"
  if [[ "${status}" == "healthy" ]]; then
    break
  fi
  sleep 3
done

echo "==> Waiting for API..."
api_ready=false
for _ in $(seq 1 40); do
  if curl -fsS "http://127.0.0.1:${API_HOST_PORT:-5104}/health/live" >/dev/null 2>&1; then
    api_ready=true
    break
  fi
  sleep 5
done

if [[ "${api_ready}" != "true" ]]; then
  echo "ERROR: API did not become healthy."
  docker logs gym-api --tail 120 2>&1 || true
  exit 1
fi

echo "==> Running default seed (roles, admin, plans, demo trainers)..."
"${SCRIPT_DIR}/seed.sh"

echo ""
echo "Production reset complete."
echo "  Login: admin@gym.com / admin123  (change password after first login)"
echo "  URL:   https://${DOMAIN}/dashboard"
echo "  curl http://127.0.0.1:${API_HOST_PORT:-5104}/health/live"
