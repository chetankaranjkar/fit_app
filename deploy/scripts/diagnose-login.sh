#!/usr/bin/env bash
# Quick checks for login / API connectivity on the VPS.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/_common.sh"

require_env
cd "${REPO_ROOT}"

APP_URL="$(public_app_url)"
LOCAL_API="http://127.0.0.1/api"

echo "=== Gym login diagnostics ==="
echo "Public URL: ${APP_URL}"
echo ""

echo "--- Docker ---"
docker ps --format 'table {{.Names}}\t{{.Status}}\t{{.Ports}}' | grep -E 'gym-|NAMES' || true
echo ""

echo "--- Port 80 ---"
if command -v ss >/dev/null 2>&1; then
  ss -tlnp | grep ':80 ' || echo "(nothing on :80)"
fi
if command -v systemctl >/dev/null 2>&1; then
  echo "host nginx: $(systemctl is-active nginx 2>/dev/null || echo unknown)"
fi
echo ""

echo "--- API health ---"
curl -fsS "${LOCAL_API}/health/ready" && echo "" || echo "FAIL: /api/health/ready"
echo ""

echo "--- Login (admin@gym.com) ---"
HTTP_CODE=$(curl -s -o /tmp/gym-login.json -w "%{http_code}" \
  -X POST "${LOCAL_API}/Auth/login" \
  -H "Content-Type: application/json" \
  -d '{"username":"admin@gym.com","password":"admin123","email":"admin@gym.com"}' || echo "000")
echo "HTTP ${HTTP_CODE}"
head -c 400 /tmp/gym-login.json 2>/dev/null || true
echo ""
echo ""

if [[ "${HTTP_CODE}" == "200" ]]; then
  echo "OK: API login works on the server."
  echo "If the browser still fails, rebuild frontend:"
  echo "  compose build frontend --no-cache && compose up -d frontend gateway"
else
  echo "API login failed. Try:"
  echo "  ./deploy/scripts/seed.sh"
  echo "  ./deploy/scripts/logs.sh api --tail 80"
fi

echo ""
echo "--- Via public gateway (if gateway up) ---"
curl -fsS -o /dev/null -w "GET / -> %{http_code}\n" "${APP_URL}/" || true
curl -fsS -o /dev/null -w "GET /api/health/ready -> %{http_code}\n" "${APP_URL}/api/health/ready" || true
