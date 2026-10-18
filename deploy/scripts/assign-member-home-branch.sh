#!/usr/bin/env bash
# Assign the first active branch to members who have no home branch.
# Does not change members who already have a home branch, and does not rewrite bills or attendance.
set -euo pipefail

TARGET="${1:-uat}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
cd "${REPO_ROOT}"

if [[ "${TARGET}" == "uat" ]]; then
  ENV_FILE="deploy/.env.uat"
  COMPOSE=(docker compose -f deploy/docker-compose.yml -f deploy/docker-compose.uat.yml --env-file "${ENV_FILE}")
else
  ENV_FILE="deploy/.env"
  COMPOSE=(docker compose -f deploy/docker-compose.yml --env-file "${ENV_FILE}")
fi

set -a
# shellcheck disable=SC1090
source "${ENV_FILE}"
set +a

DB_NAME="${MSSQL_DATABASE:?MSSQL_DATABASE is required}"

run_sql() {
  "${COMPOSE[@]}" exec -T sqlserver /opt/mssql-tools18/bin/sqlcmd \
    -S localhost -U sa -P "${MSSQL_SA_PASSWORD}" -C -d "${DB_NAME}" -W -b "$@"
}

echo "=== recent branch migrations ==="
run_sql -Q "SELECT MigrationId FROM __EFMigrationsHistory WHERE MigrationId LIKE '202610%' ORDER BY MigrationId;"
echo "=== active branches ==="
run_sql -Q "SELECT Id, BranchName, IsActive FROM Branches ORDER BY Id;"
echo "=== assign missing member home branches ==="
run_sql -i /dev/stdin < "${SCRIPT_DIR}/assign-member-home-branch.sql"
