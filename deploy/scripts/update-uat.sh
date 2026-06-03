#!/usr/bin/env bash
# Pull latest code and redeploy UAT containers.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=_uat.sh
source "${SCRIPT_DIR}/_uat.sh"

require_uat_env
cd "${REPO_ROOT}"

git fetch origin
git checkout uat
git pull origin uat

export GIT_COMMIT_SHA="$(git rev-parse --short HEAD 2>/dev/null || echo unknown)"

compose_uat build
compose_uat up -d --remove-orphans

echo "Waiting for API (migrations run on startup)..."
for i in $(seq 1 36); do
  if curl -fsS "http://127.0.0.1:${API_HOST_PORT:-5105}/health/ready" >/dev/null 2>&1; then
    break
  fi
  sleep 5
done

echo ""
echo "Recent API migration log lines:"
docker logs gym-uat-api --tail 80 2>&1 | grep -iE "migrat|schema|membership lifecycle|error" || true

echo ""
echo "UAT updated ($(uat_public_url)) — commit ${GIT_COMMIT_SHA}"
echo "If saves still fail, run: ./deploy/scripts/migrate-uat.sh"
