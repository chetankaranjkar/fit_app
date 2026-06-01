#!/usr/bin/env bash
# Build and start the UAT Docker stack (does not affect production gym-* containers).
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=_uat.sh
source "${SCRIPT_DIR}/_uat.sh"

require_uat_env

cd "${REPO_ROOT}"

echo "==> UAT deploy — ${DOMAIN}"
echo "    Frontend → 127.0.0.1:${FRONTEND_HOST_PORT:-8081}"
echo "    API      → 127.0.0.1:${API_HOST_PORT:-5105}"

compose_uat build --pull
compose_uat up -d --remove-orphans

echo "==> Waiting for UAT API..."
for i in $(seq 1 60); do
  if curl -fsS "http://127.0.0.1:${API_HOST_PORT:-5105}/health/ready" >/dev/null 2>&1; then
    echo "UAT API is ready."
    break
  fi
  if [[ "$i" -eq 60 ]]; then
    echo "UAT API did not become ready. Logs: docker logs gym-uat-api"
    exit 1
  fi
  sleep 3
done

if [[ "${DATABASE_SEED_DEFAULTS:-false}" == "true" ]]; then
  echo "==> Seeding UAT defaults (if script supports custom env)..."
  ENV_FILE="${ENV_FILE}" "${SCRIPT_DIR}/seed.sh" 2>/dev/null || true
fi

APP_URL="$(uat_public_url)"
echo ""
echo "UAT containers are up."
echo "  Configure Nginx + SSL (once per server):"
echo "    sudo ./deploy/scripts/setup-nginx-uat.sh"
echo "    sudo ./deploy/scripts/setup-ssl-uat.sh"
echo ""
echo "  Then open: ${APP_URL}/dashboard"
echo "  DNS: A record ${DOMAIN} → this server's public IP"
