#!/usr/bin/env bash
# Restart UAT API and confirm EF migrations ran (membership lifecycle, etc.).
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=_uat.sh
source "${SCRIPT_DIR}/_uat.sh"

require_uat_env
cd "${REPO_ROOT}"

echo "Restarting gym-uat-api (Database__AutoMigrate=${DATABASE_AUTO_MIGRATE:-true})..."
compose_uat up -d --force-recreate api

echo "Waiting for API health..."
for i in $(seq 1 36); do
  if curl -fsS "http://127.0.0.1:${API_HOST_PORT:-5105}/health/ready" >/dev/null 2>&1; then
    echo "API is ready."
    break
  fi
  if [[ "$i" -eq 36 ]]; then
    echo "API did not become ready in time. Check logs:"
    docker logs gym-uat-api --tail 80
    exit 1
  fi
  sleep 5
done

echo ""
echo "Recent migration-related log lines:"
docker logs gym-uat-api --tail 120 2>&1 | grep -iE "migrat|schema|membership lifecycle" || true
echo ""
echo "UAT API OK — $(uat_public_url)"
