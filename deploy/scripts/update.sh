#!/usr/bin/env bash
# Pull latest code and rebuild containers (zero-ish downtime).
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/_common.sh"

require_env
cd "${REPO_ROOT}"

echo "==> Pulling latest code..."
git pull --ff-only

echo "==> Rebuilding and restarting..."
compose build
compose up -d --remove-orphans

echo "==> Pruning unused images (optional cleanup)..."
docker image prune -f >/dev/null 2>&1 || true

echo "Update finished."
