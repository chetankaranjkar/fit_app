#!/usr/bin/env bash
# Run EF migrations manually (normally handled by Database__AutoMigrate on API start).
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/_common.sh"

require_env

echo "Restarting API to apply migrations (Database__AutoMigrate=${DATABASE_AUTO_MIGRATE:-true})..."
compose up -d api
compose logs -f --tail=100 api
