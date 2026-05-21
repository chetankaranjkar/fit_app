#!/usr/bin/env bash
# Confirm VPS is running the expected git commit and containers are up.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/_common.sh"

cd "${REPO_ROOT}"

echo "=== Git (local clone on VPS) ==="
git fetch origin main -q 2>/dev/null || true
echo "HEAD:     $(git rev-parse --short HEAD 2>/dev/null || echo '?')"
echo "origin:   $(git rev-parse --short origin/main 2>/dev/null || echo '?')"
git log -1 --oneline 2>/dev/null || true
if [[ "$(git rev-parse HEAD 2>/dev/null)" != "$(git rev-parse origin/main 2>/dev/null)" ]]; then
  echo "WARNING: HEAD is not origin/main — run: git pull --ff-only origin main"
fi
echo ""

echo "=== Docker containers ==="
compose ps 2>/dev/null || docker compose ps
echo ""

echo "=== Image build time (frontend / api) ==="
docker inspect gym-frontend --format 'frontend image: {{.Image}} created {{.Created}}' 2>/dev/null || echo "gym-frontend: not running"
docker inspect gym-api --format 'api image: {{.Image}} created {{.Created}}' 2>/dev/null || echo "gym-api: not running"
docker inspect gym-gateway --format 'gateway created {{.Created}}' 2>/dev/null || echo "gym-gateway: not running"
echo ""

echo "=== HTTP checks ==="
APP_URL="$(public_app_url)"
curl -fsS -o /dev/null -w "GET ${APP_URL}/ -> %{http_code}\n" "${APP_URL}/" || echo "FAIL: ${APP_URL}/"
curl -fsS -o /dev/null -w "GET ${APP_URL}/api/health/ready -> %{http_code}\n" "${APP_URL}/api/health/ready" 2>/dev/null \
  || curl -fsS -o /dev/null -w "GET http://127.0.0.1/health/live -> %{http_code}\n" "http://127.0.0.1/health/live" 2>/dev/null \
  || echo "FAIL: API health"
echo ""

echo "=== Frontend bundle (first JS asset hash in index.html) ==="
curl -fsS "${APP_URL}/" 2>/dev/null | grep -oE '/assets/[^"]+\.js' | head -1 || echo "(could not read index.html)"
