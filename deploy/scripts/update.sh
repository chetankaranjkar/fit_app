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
if ! git pull --ff-only origin main; then
  echo "WARN: fast-forward pull failed — resetting to origin/main..."
  git reset --hard origin/main
fi

export GIT_COMMIT_SHA="$(git rev-parse --short HEAD)"
echo "==> Deploying commit ${GIT_COMMIT_SHA}"
if [[ "$(git rev-parse HEAD)" != "$(git rev-parse origin/main)" ]]; then
  echo "ERROR: HEAD does not match origin/main after pull."
  exit 1
fi

echo "==> Rebuilding images (frontend + api, no cache)..."
if ! compose build --no-cache frontend api; then
  echo ""
  echo "ERROR: Docker build failed. Common cause: frontend vite build error."
  echo "  Re-run: compose build --no-cache frontend 2>&1 | tail -40"
  echo "  Fix the error, commit, push, then run this script again."
  exit 1
fi

echo "==> Recreating all stack containers..."
if ! compose up -d --force-recreate --remove-orphans; then
  echo "ERROR: compose up failed. API logs:"
  compose logs --tail 80 api 2>/dev/null || true
  exit 1
fi

if ! is_testing_mode; then
  ensure_production_host_nginx
fi

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

APP_URL="$(public_app_url)"
echo "==> Verifying deployed API commit..."
DEPLOYED_SHA=""
if is_testing_mode; then
  DEPLOYED_SHA="$(curl -fsS "${APP_URL}/api/deploy-info" 2>/dev/null | grep -oE '"gitCommit":"[^"]+"' | head -1 | cut -d'"' -f4 || true)"
else
  DEPLOYED_SHA="$(curl -fsS "https://${DOMAIN}/api/deploy-info" 2>/dev/null | grep -oE '"gitCommit":"[^"]+"' | head -1 | cut -d'"' -f4 || true)"
fi
if [[ -n "${DEPLOYED_SHA}" && "${DEPLOYED_SHA}" == "${GIT_COMMIT_SHA}" ]]; then
  echo "OK: API reports git commit ${DEPLOYED_SHA}"
elif [[ -n "${DEPLOYED_SHA}" ]]; then
  echo "WARNING: API reports ${DEPLOYED_SHA} but expected ${GIT_COMMIT_SHA}"
else
  echo "WARNING: could not read /api/deploy-info (old API image or gateway not reachable)"
fi

echo ""
"${SCRIPT_DIR}/verify-deploy.sh"

echo "==> Pruning unused images (optional cleanup)..."
docker image prune -f >/dev/null 2>&1 || true

echo "Update finished. Commit ${GIT_COMMIT_SHA} — hard-refresh the browser (Ctrl+Shift+R)."
