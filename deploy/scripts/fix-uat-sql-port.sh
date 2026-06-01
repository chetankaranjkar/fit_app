#!/usr/bin/env bash
# Free 127.0.0.1:SQLSERVER_PUBLISH_PORT (default 1434) for gym-uat-sqlserver.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=_uat.sh
source "${SCRIPT_DIR}/_uat.sh"

require_uat_env

PORT="${SQLSERVER_PUBLISH_PORT:-1434}"
HOST_BIND="127.0.0.1:${PORT}"

echo "==> UAT SQL host port: ${HOST_BIND}"

if docker ps -a --format '{{.Names}}' | grep -qx 'gym-uat-sqlserver'; then
  echo "==> Removing existing gym-uat-sqlserver (container only; volume kept)..."
  docker rm -f gym-uat-sqlserver
  sleep 1
fi

port_in_use() {
  if command -v ss >/dev/null 2>&1; then
    ss -tln 2>/dev/null | grep -qE ":${PORT}[[:space:]]"
    return $?
  fi
  if command -v netstat >/dev/null 2>&1; then
    netstat -tln 2>/dev/null | grep -qE ":${PORT}[[:space:]]"
    return $?
  fi
  return 1
}

if port_in_use; then
  echo ""
  echo "ERROR: ${HOST_BIND} is still in use."
  echo ""
  echo "Listeners:"
  ss -tlnp 2>/dev/null | grep -E ":${PORT}[[:space:]]" || netstat -tlnp 2>/dev/null | grep ":${PORT} " || true
  echo ""
  echo "Docker containers publishing this port:"
  docker ps -a --format 'table {{.Names}}\t{{.Status}}\t{{.Ports}}' 2>/dev/null | grep -E "${PORT}|sqlserver" || true
  echo ""
  echo "Fix options:"
  echo "  1) Stop/remove the container above:  docker rm -f <name>"
  echo "  2) Use another port in deploy/.env.uat:  SQLSERVER_PUBLISH_PORT=1435"
  echo "     Then: ./deploy/scripts/deploy-uat.sh"
  exit 1
fi

echo "==> Port ${HOST_BIND} is free. Run: ./deploy/scripts/deploy-uat.sh"
