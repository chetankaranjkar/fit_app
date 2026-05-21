#!/usr/bin/env bash
# Reset /opt/gym to match GitHub main (discards local edits under the repo).
# Safe: deploy/.env is gitignored and is not touched.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
cd "${REPO_ROOT}"

echo "==> Fetching origin/main..."
git fetch origin main

echo "==> Resetting working tree to origin/main (local repo edits will be lost)..."
git reset --hard origin/main

chmod +x deploy/scripts/*.sh 2>/dev/null || true

echo "==> Done. Current commit:"
git log -1 --oneline
