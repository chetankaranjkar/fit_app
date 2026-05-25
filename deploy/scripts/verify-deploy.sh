#!/usr/bin/env bash
# Confirm VPS is running the expected git commit and containers are up.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/_common.sh"

require_env
cd "${REPO_ROOT}"

echo "=== Git (local clone on VPS) ==="
git fetch origin main -q 2>/dev/null || true
LOCAL_HEAD="$(git rev-parse --short HEAD 2>/dev/null || echo '?')"
REMOTE_HEAD="$(git rev-parse --short origin/main 2>/dev/null || echo '?')"
echo "HEAD:     ${LOCAL_HEAD}"
echo "origin:   ${REMOTE_HEAD}"
git log -1 --oneline 2>/dev/null || true
if [[ "${LOCAL_HEAD}" != "${REMOTE_HEAD}" ]]; then
  echo "WARNING: HEAD is not origin/main — run: ./deploy/scripts/sync-from-origin.sh && ./deploy/scripts/update.sh"
fi
echo ""

echo "=== Docker containers ==="
compose ps 2>/dev/null || docker compose ps
echo ""

echo "=== Image build time (frontend / api) ==="
docker inspect gym-frontend --format 'frontend container created: {{.Created}}' 2>/dev/null || echo "gym-frontend: not running"
docker inspect gym-api --format 'api container created: {{.Created}}' 2>/dev/null || echo "gym-api: not running"
docker inspect gym-gateway --format 'gateway container created: {{.Created}}' 2>/dev/null || echo "gym-gateway: not running"
echo ""

APP_URL="$(public_app_url)"
echo "=== HTTP checks (${APP_URL}) ==="
curl -fsS -o /dev/null -w "GET ${APP_URL}/ -> %{http_code}\n" "${APP_URL}/" || echo "FAIL: ${APP_URL}/"

# Testing gateway exposes /health/ at API root; production host nginx may only proxy /api/
if is_testing_mode; then
  curl -fsS -o /dev/null -w "GET ${APP_URL}/health/ready -> %{http_code}\n" "${APP_URL}/health/ready" \
    || echo "FAIL: ${APP_URL}/health/ready"
else
  curl -fsS -o /dev/null -w "GET ${APP_URL}/api/health/ready -> %{http_code}\n" "${APP_URL}/api/health/ready" 2>/dev/null \
    || curl -fsS -o /dev/null -w "GET http://127.0.0.1:${API_HOST_PORT:-5104}/health/ready -> %{http_code}\n" "http://127.0.0.1:${API_HOST_PORT:-5104}/health/ready" 2>/dev/null \
    || echo "FAIL: API health (configure host nginx /health/ or use localhost port)"
fi

echo ""
echo "=== API deploy-info (compare to HEAD above) ==="
curl -fsS "${APP_URL}/api/deploy-info" 2>/dev/null && echo "" || echo "(could not read /api/deploy-info — rebuild api after pulling latest main)"

echo ""
echo "=== Workout tracking API (401 = new API; 404 = old API still running) ==="
WT_CODE="$(curl -s -o /dev/null -w "%{http_code}" "${APP_URL}/api/workout/my-member-id" 2>/dev/null || echo "000")"
echo "GET ${APP_URL}/api/workout/my-member-id -> HTTP ${WT_CODE}"
if [[ "${WT_CODE}" == "404" ]]; then
  echo "WARNING: Workout tracking route missing — frontend build may have failed; check: compose build frontend"
fi

echo ""
echo "=== Frontend bundle (first JS asset in index.html) ==="
curl -fsS "${APP_URL}/" 2>/dev/null | grep -oE '/assets/[^"]+\.js' | head -1 || echo "(could not read index.html)"
