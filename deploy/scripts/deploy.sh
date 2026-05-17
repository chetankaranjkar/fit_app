#!/usr/bin/env bash
# First-time or full redeploy from the VPS (run as deploy user with Docker access).
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=_common.sh
source "${SCRIPT_DIR}/_common.sh"

require_env

cd "${REPO_ROOT}"

if is_testing_mode; then
  echo "==> Testing mode (no domain) — gateway will listen on port 80"
else
  echo "==> Production mode — containers bind to 127.0.0.1 (use host Nginx + SSL)"
fi

echo "==> Building and starting containers..."
compose build --pull
compose up -d

echo "==> Waiting for API readiness..."
for i in $(seq 1 60); do
  ready=false
  if is_testing_mode; then
    if compose exec -T api curl -fsS http://127.0.0.1:8080/health/ready >/dev/null 2>&1; then
      ready=true
    fi
  elif curl -fsS "http://127.0.0.1:${API_HOST_PORT:-5104}/health/ready" >/dev/null 2>&1; then
    ready=true
  fi
  if [[ "${ready}" == "true" ]]; then
    echo "API is ready."
    break
  fi
  if [[ "$i" -eq 60 ]]; then
    echo "API did not become ready in time. Check: ./deploy/scripts/logs.sh api"
    exit 1
  fi
  sleep 3
done

APP_URL="$(public_app_url)"

echo ""
echo "Deploy complete."
if is_testing_mode; then
  echo "  Open in browser: ${APP_URL}"
  echo "  (HTTP only — no SSL until you add a domain later)"
  echo ""
  echo "Ensure Hostinger firewall / UFW allows port 80:"
  echo "  sudo ufw allow 80/tcp && sudo ufw status"
  echo ""
  echo "Default login (change after first login): admin@gym.com / admin123"
else
  echo "  Frontend (local): http://127.0.0.1:${FRONTEND_HOST_PORT:-8080}"
  echo "  API (local):      http://127.0.0.1:${API_HOST_PORT:-5104}/health/ready"
  echo ""
  echo "Next steps:"
  echo "  1) sudo ./deploy/scripts/setup-nginx.sh"
  echo "  2) sudo ./deploy/scripts/setup-ssl.sh"
  echo "  3) DNS A record for ${DOMAIN} → this server"
fi
