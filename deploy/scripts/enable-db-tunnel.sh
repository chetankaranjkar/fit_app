#!/usr/bin/env bash
# SQL access from your PC via SSH tunnel. If deploy already published :1433, this only prints instructions.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/_common.sh"

require_env
cd "${REPO_ROOT}"

VPS_IP="$(grep -E '^VPS_IP=' deploy/.env 2>/dev/null | cut -d= -f2- | tr -d '\r' || echo YOUR_VPS_IP)"
DB_NAME="${MSSQL_DATABASE:-GymManagementDb}"

print_ssms_instructions() {
  echo ""
  echo "From your Windows PC (PowerShell, keep window open):"
  echo "  ssh -N -L 14333:127.0.0.1:1433 root@${VPS_IP}"
  echo ""
  echo "Test tunnel (second PowerShell window):"
  echo "  Test-NetConnection localhost -Port 14333"
  echo ""
  echo "SSMS / Azure Data Studio:"
  echo "  Server:   localhost,14333"
  echo "  Login:    sa"
  echo "  Password: (grep MSSQL_SA_PASSWORD deploy/.env on VPS)"
  echo "  Database: ${DB_NAME}"
  echo "  Trust server certificate: Yes"
  echo ""
  echo "Optional direct (if firewall allows 1433): ${VPS_IP},1433"
}

if ss -tlnp 2>/dev/null | grep -qE ':(1433)\s'; then
  echo "==> Port 1433 is already in use (SQL is reachable on this VPS)."
  ss -tlnp | grep ':1433 ' || true
  echo ""
  echo "No need to run enable-db-tunnel again — deploy.sh already published SQL."
  echo "Use SSH tunnel from Windows (recommended) or connect to ${VPS_IP},1433 if port 1433 is open."
  print_ssms_instructions
  exit 0
fi

echo "==> Recreating sqlserver with 127.0.0.1:1433 only..."
docker compose \
  -f "${DEPLOY_DIR}/docker-compose.yml" \
  $(is_testing_mode && echo -f "${COMPOSE_TESTING_FILE}") \
  -f "${DEPLOY_DIR}/docker-compose.db-tunnel.yml" \
  --env-file "${ENV_FILE}" \
  up -d sqlserver

echo ""
ss -tlnp | grep ':1433 ' || echo "(wait for gym-sqlserver healthy)"
print_ssms_instructions
