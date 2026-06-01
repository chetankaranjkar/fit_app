#!/usr/bin/env bash
# Pull latest code and redeploy UAT containers.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=_uat.sh
source "${SCRIPT_DIR}/_uat.sh"

require_uat_env
cd "${REPO_ROOT}"

git fetch origin
git checkout uat 2>/dev/null || git checkout main
git pull

export GIT_COMMIT_SHA="$(git rev-parse --short HEAD 2>/dev/null || echo unknown)"

compose_uat build
compose_uat up -d --remove-orphans

echo "UAT updated ($(uat_public_url)) — commit ${GIT_COMMIT_SHA}"
