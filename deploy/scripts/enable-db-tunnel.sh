#!/usr/bin/env bash
# Bind SQL Server to 127.0.0.1:1433 on the VPS (for SSH tunnel from your PC).
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/_common.sh"

require_env
cd "${REPO_ROOT}"

echo "==> Recreating sqlserver with 127.0.0.1:1433 published..."
docker compose \
  -f "${DEPLOY_DIR}/docker-compose.yml" \
  $(is_testing_mode && echo -f "${COMPOSE_TESTING_FILE}") \
  -f "${DEPLOY_DIR}/docker-compose.db-tunnel.yml" \
  --env-file "${ENV_FILE}" \
  up -d sqlserver

echo ""
echo "On the VPS, SQL should listen on loopback only:"
if command -v ss >/dev/null 2>&1; then
  ss -tlnp | grep ':1433 ' || echo "(nothing on :1433 yet — wait for container healthy)"
fi

echo ""
echo "From your Windows PC (keep this window open):"
echo "  ssh -L 14333:127.0.0.1:1433 root@$(grep -E '^VPS_IP=' deploy/.env 2>/dev/null | cut -d= -f2- || echo YOUR_VPS_IP)"
echo ""
echo "SSMS / Azure Data Studio:"
echo "  Server: localhost,14333"
echo "  Login:  sa"
echo "  Password: (value of MSSQL_SA_PASSWORD in deploy/.env — not the word MSSQL_SA_PASSWORD)"
echo "  Database: ${MSSQL_DATABASE:-GymManagementDb}"
echo "  Trust server certificate: Yes"
