#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DEPLOY_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
REPO_ROOT="$(cd "${DEPLOY_DIR}/.." && pwd)"
ENV_FILE="${DEPLOY_DIR}/.env"
COMPOSE_FILE="${DEPLOY_DIR}/docker-compose.yml"
COMPOSE_TESTING_FILE="${DEPLOY_DIR}/docker-compose.testing.yml"

compose_files() {
  echo -f "${COMPOSE_FILE}"
  if is_testing_mode; then
    echo -f "${COMPOSE_TESTING_FILE}"
  fi
}

is_testing_mode() {
  if [[ ! -f "${ENV_FILE}" ]]; then
    return 1
  fi
  # shellcheck disable=SC1090
  local mode
  mode="$(grep -E '^DEPLOY_MODE=' "${ENV_FILE}" 2>/dev/null | cut -d= -f2- | tr -d '\r' || true)"
  [[ "${mode}" == "testing" ]]
}

compose() {
  # shellcheck disable=SC2046
  docker compose $(compose_files) --env-file "${ENV_FILE}" "$@"
}

require_env() {
  if [[ ! -f "${ENV_FILE}" ]]; then
    echo "Missing ${ENV_FILE}."
    echo "  Testing (no domain): cp deploy/.env.testing.example deploy/.env"
    echo "  Production:          cp deploy/.env.production.example deploy/.env"
    exit 1
  fi
  # shellcheck disable=SC1090
  set -a && source "${ENV_FILE}" && set +a

  : "${MSSQL_SA_PASSWORD:?MSSQL_SA_PASSWORD is required in deploy/.env}"
  : "${JWT_SECRET_KEY:?JWT_SECRET_KEY is required in deploy/.env}"

  if is_testing_mode; then
    : "${VPS_IP:?VPS_IP is required in testing mode (your VPS public IP)}"
  else
    : "${DOMAIN:?DOMAIN is required for production deploy/.env}"
  fi
}

public_app_url() {
  if is_testing_mode; then
    echo "http://${VPS_IP}"
  else
    echo "https://${DOMAIN}"
  fi
}

# Testing mode uses Docker gateway on :80. Host nginx/apache must not bind the same port.
ensure_port_80_for_testing_gateway() {
  if ! is_testing_mode; then
    return 0
  fi
  if ! command -v ss >/dev/null 2>&1; then
    return 0
  fi
  if ! ss -tlnH 2>/dev/null | grep -qE ':80(\s|$)'; then
    return 0
  fi

  echo "==> Port 80 is in use — freeing it for gym-gateway (testing mode)..."

  if command -v systemctl >/dev/null 2>&1; then
    systemctl stop nginx 2>/dev/null || true
    systemctl disable nginx 2>/dev/null || true
    systemctl stop apache2 2>/dev/null || true
    systemctl disable apache2 2>/dev/null || true
  fi

  # Another Docker container may still hold :80
  local cid
  cid="$(docker ps -q --filter "publish=80" 2>/dev/null | head -n1 || true)"
  if [[ -n "${cid}" ]]; then
    docker rm -f "${cid}" 2>/dev/null || true
  fi

  if ss -tlnH 2>/dev/null | grep -qE ':80(\s|$)'; then
    echo "ERROR: Port 80 is still in use. Run: ss -tlnp | grep ':80'"
    echo "Stop that process, then: cd ${REPO_ROOT} && ./deploy/scripts/deploy.sh"
    exit 1
  fi

  echo "Port 80 is free for gym-gateway."
}

# Production uses host Nginx on :80/:443. Testing uses Docker gym-gateway on :80.
ensure_production_host_nginx() {
  if is_testing_mode; then
    return 0
  fi

  echo "==> Production mode — ensuring host Nginx (not Docker gateway) serves ${DOMAIN}..."

  # Leftover testing gateway binds public :80 and blocks Certbot / Nginx HTTP.
  if docker ps -a --format '{{.Names}}' 2>/dev/null | grep -qx 'gym-gateway'; then
    echo "    Removing stale gym-gateway container (testing overlay)..."
    docker rm -f gym-gateway 2>/dev/null || true
  fi

  if ! command -v systemctl >/dev/null 2>&1; then
    echo "WARN: systemctl not found — enable host Nginx manually."
    return 0
  fi

  if [[ ! -f "/etc/letsencrypt/live/${DOMAIN}/fullchain.pem" ]]; then
    echo "WARN: SSL cert not found at /etc/letsencrypt/live/${DOMAIN}/"
    echo "  After DNS points here, run:"
    echo "    sudo ./deploy/scripts/setup-nginx.sh"
    echo "    sudo ./deploy/scripts/setup-ssl.sh"
    return 0
  fi

  if [[ "${EUID}" -eq 0 ]]; then
    "${SCRIPT_DIR}/setup-nginx.sh"
  elif command -v sudo >/dev/null 2>&1; then
    sudo "${SCRIPT_DIR}/setup-nginx.sh"
  else
    echo "WARN: Run as root or with sudo: sudo ./deploy/scripts/setup-nginx.sh"
  fi
}
