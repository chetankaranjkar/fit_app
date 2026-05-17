#!/usr/bin/env bash
# Usage: ./logs.sh [service] [--follow]
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/_common.sh"

require_env

SERVICE="${1:-}"
shift || true

if [[ -n "${SERVICE}" ]]; then
  compose logs "$@" "${SERVICE}"
else
  compose logs "$@" 
fi
