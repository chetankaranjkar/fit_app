#!/usr/bin/env bash
# Quick diagnosis when https://DOMAIN is unreachable after deploy.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=_common.sh
source "${SCRIPT_DIR}/_common.sh"

require_env

APP_URL="$(public_app_url)"
DOMAIN="${DOMAIN:-}"
DEPLOY_MODE_VAL="$(grep -E '^DEPLOY_MODE=' "${ENV_FILE}" 2>/dev/null | cut -d= -f2- | tr -d '\r' || echo production)"

echo "=== Site diagnosis ==="
echo "DOMAIN:       ${DOMAIN:-<not set>}"
echo "DEPLOY_MODE:  ${DEPLOY_MODE_VAL:-production}"
echo "APP URL:      ${APP_URL}"
echo ""

if is_testing_mode; then
  echo "NOTE: DEPLOY_MODE=testing — site is HTTP at http://${VPS_IP}, not https://${DOMAIN:-?}"
  echo "      For HTTPS with a domain, set DEPLOY_MODE=production and DOMAIN in deploy/.env"
  echo ""
fi

echo "=== Port listeners (80 / 443) ==="
if command -v ss >/dev/null 2>&1; then
  ss -tlnp 2>/dev/null | grep -E ':80 |:443 ' || echo "(nothing listening on 80 or 443)"
else
  echo "(install ss / iproute2 to see listeners)"
fi
echo ""

echo "=== Docker containers ==="
compose ps 2>/dev/null || docker compose ps
echo ""

echo "=== Stale testing gateway (should be absent in production) ==="
if docker ps -a --format '{{.Names}} {{.Status}}' 2>/dev/null | grep -E '^gym-gateway '; then
  echo "FOUND gym-gateway — it steals port 80 from host Nginx."
  echo "  Fix: docker rm -f gym-gateway && sudo ./deploy/scripts/setup-nginx.sh"
else
  echo "OK: no gym-gateway container"
fi
echo ""

echo "=== Host Nginx ==="
if command -v systemctl >/dev/null 2>&1; then
  systemctl is-active nginx 2>/dev/null || echo "nginx: not active"
  if [[ "${EUID}" -eq 0 ]] || sudo -n true 2>/dev/null; then
    sudo nginx -t 2>&1 || true
  else
    echo "(run: sudo nginx -t)"
  fi
else
  echo "systemctl not available"
fi
echo ""

echo "=== SSL certificate ==="
CERT="/etc/letsencrypt/live/${DOMAIN}/fullchain.pem"
if [[ -f "${CERT}" ]]; then
  echo "OK: ${CERT}"
else
  echo "MISSING: ${CERT}"
  echo "  Run: sudo ./deploy/scripts/setup-nginx.sh && sudo ./deploy/scripts/setup-ssl.sh"
fi
echo ""

echo "=== Local app health (127.0.0.1) ==="
curl -fsS -o /dev/null -w "frontend :8080 -> HTTP %{http_code}\n" "http://127.0.0.1:${FRONTEND_HOST_PORT:-8080}/health" 2>/dev/null \
  || echo "FAIL: frontend not responding on 127.0.0.1:${FRONTEND_HOST_PORT:-8080}"
curl -fsS -o /dev/null -w "api :5104   -> HTTP %{http_code}\n" "http://127.0.0.1:${API_HOST_PORT:-5104}/health/ready" 2>/dev/null \
  || echo "FAIL: API not responding on 127.0.0.1:${API_HOST_PORT:-5104}"
echo ""

echo "=== Public URL ==="
curl -fsS -o /dev/null -w "GET ${APP_URL}/ -> HTTP %{http_code}\n" "${APP_URL}/" 2>/dev/null \
  || echo "FAIL: cannot reach ${APP_URL}/ from this server"
echo ""

echo "=== deploy/.env checks ==="
grep -E '^(DEPLOY_MODE|DOMAIN|CORS_ORIGIN_0|SSL_CERT_PATH)=' "${ENV_FILE}" 2>/dev/null || true
echo ""
echo "CORS_ORIGIN_0 should be https://${DOMAIN} in production."
echo ""
echo "=== Recommended fix (production + domain) ==="
cat <<EOF
  cd ${REPO_ROOT}
  docker rm -f gym-gateway 2>/dev/null || true
  ./deploy/scripts/deploy.sh
  sudo ./deploy/scripts/setup-nginx.sh
  sudo ufw allow 'Nginx Full' 2>/dev/null || true
  curl -I ${APP_URL}/
EOF
