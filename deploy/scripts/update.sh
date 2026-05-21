#!/usr/bin/env bash
# Pull latest code and rebuild containers (zero-ish downtime).
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/_common.sh"

require_env
cd "${REPO_ROOT}"

echo "==> Pulling latest code..."
git fetch origin main
git checkout main 2>/dev/null || git checkout -B main
git pull --ff-only origin main

echo "==> Rebuilding images (frontend + api, no cache)..."
compose build --no-cache frontend api

echo "==> Recreating all stack containers..."
compose up -d --force-recreate --remove-orphans

echo "==> Waiting for API..."
sleep 5
if is_testing_mode; then
  for i in $(seq 1 40); do
    if compose exec -T api curl -fsS http://127.0.0.1:8080/health/live >/dev/null 2>&1; then
      echo "API is up."
      break
    fi
    sleep 3
  done
fi

echo ""
"${SCRIPT_DIR}/verify-deploy.sh" || true

echo "==> Pruning unused images (optional cleanup)..."
docker image prune -f >/dev/null 2>&1 || true

echo "Update finished."
