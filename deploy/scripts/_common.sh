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
