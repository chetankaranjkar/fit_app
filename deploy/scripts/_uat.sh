#!/usr/bin/env bash
# Shared helpers for UAT deploy (sources production _common patterns with UAT paths).
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DEPLOY_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
REPO_ROOT="$(cd "${DEPLOY_DIR}/.." && pwd)"
ENV_FILE="${DEPLOY_DIR}/.env.uat"
COMPOSE_FILE="${DEPLOY_DIR}/docker-compose.yml"
COMPOSE_UAT_FILE="${DEPLOY_DIR}/docker-compose.uat.yml"

compose_uat() {
  # shellcheck disable=SC2046
  docker compose -f "${COMPOSE_FILE}" -f "${COMPOSE_UAT_FILE}" --env-file "${ENV_FILE}" "$@"
}

require_uat_env() {
  if [[ ! -f "${ENV_FILE}" ]]; then
    echo "Missing ${ENV_FILE}."
    echo "  cp deploy/.env.uat.example deploy/.env.uat"
    echo "  Edit DOMAIN, secrets, and ports — then re-run."
    exit 1
  fi
  # shellcheck disable=SC1090
  set -a && source "${ENV_FILE}" && set +a

  : "${DOMAIN:?DOMAIN is required in deploy/.env.uat}"
  : "${MSSQL_SA_PASSWORD:?MSSQL_SA_PASSWORD is required in deploy/.env.uat}"
  : "${JWT_SECRET_KEY:?JWT_SECRET_KEY is required in deploy/.env.uat}"
  : "${CORS_ORIGIN_0:?CORS_ORIGIN_0 is required (https://uat.tigerfitness.tech)}"
}

uat_public_url() {
  echo "https://${DOMAIN}"
}
