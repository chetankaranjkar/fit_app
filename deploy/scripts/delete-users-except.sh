#!/usr/bin/env bash
# Delete all production users except fixed keep emails (see delete-users-except.sql).
#
# Usage on VPS (production /opt/gym):
#   ./deploy/scripts/delete-users-except.sh              # preview only (default)
#   ./deploy/scripts/delete-users-except.sh --execute    # deletes after typing YES
#
# Requires: deploy/.env, gym-sqlserver container, database GymManagementDb
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/_common.sh"

require_env
cd "${REPO_ROOT}"

EXECUTE=0
for arg in "$@"; do
  case "${arg}" in
    --execute) EXECUTE=1 ;;
    -h|--help)
      echo "Usage: $0 [--execute]"
      echo "  (default)   Dry run — lists keep/delete counts, no DB changes"
      echo "  --execute   Delete all users except admin@gym.com and two staff emails"
      echo ""
      echo "Backup first: ./deploy/scripts/backup.sh"
      exit 0
      ;;
    *)
      echo "Unknown option: ${arg}" >&2
      exit 1
      ;;
  esac
done

SA_PASS="$(grep -E '^MSSQL_SA_PASSWORD=' deploy/.env | cut -d= -f2- | tr -d '\r' | sed 's/^"//;s/"$//')"
DB_NAME="$(grep -E '^MSSQL_DATABASE=' deploy/.env 2>/dev/null | cut -d= -f2- | tr -d '\r' || true)"
DB_NAME="${DB_NAME:-GymManagementDb}"

if [[ "${DB_NAME}" != "GymManagementDb" ]]; then
  echo "ERROR: This script is for production GymManagementDb only (deploy/.env has MSSQL_DATABASE=${DB_NAME})." >&2
  exit 1
fi

SQL_FILE="${SCRIPT_DIR}/delete-users-except.sql"
if [[ ! -f "${SQL_FILE}" ]]; then
  echo "Missing ${SQL_FILE}" >&2
  exit 1
fi

echo "=============================================="
echo "  delete-users-except — database: ${DB_NAME}"
if [[ "${EXECUTE}" -eq 1 ]]; then
  echo "  Mode: EXECUTE (destructive)"
else
  echo "  Mode: DRY RUN (preview)"
fi
echo "  Keep: admin@gym.com, krishna.pandey@gmail.com, nil.garare@gmail.com"
echo "=============================================="

if [[ "${EXECUTE}" -eq 1 ]]; then
  echo "Take a backup first: ./deploy/scripts/backup.sh"
  read -r -p "Type YES to DELETE all other users: " confirm
  if [[ "${confirm}" != "YES" ]]; then
    echo "Aborted."
    exit 1
  fi
fi

TMP_SQL="$(mktemp)"
if [[ "${EXECUTE}" -eq 1 ]]; then
  sed 's/DECLARE @DryRun BIT = 1;/DECLARE @DryRun BIT = 0;/' "${SQL_FILE}" > "${TMP_SQL}"
else
  cp "${SQL_FILE}" "${TMP_SQL}"
fi

CONTAINER="gym-sqlserver"
docker cp "${TMP_SQL}" "${CONTAINER}:/tmp/delete-users-except.sql"

run_sqlcmd() {
  compose exec -T sqlserver /opt/mssql-tools18/bin/sqlcmd -S localhost -U sa -P "${SA_PASS}" -C -d "${DB_NAME}" -i /tmp/delete-users-except.sql "$@" \
    || compose exec -T sqlserver /opt/mssql-tools/bin/sqlcmd -S localhost -U sa -P "${SA_PASS}" -C -d "${DB_NAME}" -i /tmp/delete-users-except.sql "$@"
}

if run_sqlcmd; then
  :
else
  rm -f "${TMP_SQL}"
  docker exec "${CONTAINER}" rm -f /tmp/delete-users-except.sql 2>/dev/null || true
  echo "sqlcmd failed." >&2
  exit 1
fi

rm -f "${TMP_SQL}"
docker exec "${CONTAINER}" rm -f /tmp/delete-users-except.sql 2>/dev/null || true

echo "==> Finished."
