#!/usr/bin/env bash
# Run deploy/scripts/delete-trainers.sql on production SQL Server (docker gym-sqlserver).
# Usage on VPS:
#   cd /opt/gym
#   ./deploy/scripts/delete-trainers.sh              # DEMO trainers only (default)
#   ./deploy/scripts/delete-trainers.sh --all        # all trainers
#   ./deploy/scripts/delete-trainers.sh --demo-users # also remove demo User rows
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/_common.sh"

require_env
cd "${REPO_ROOT}"

MODE="DEMO"
ALSO_USERS=0
for arg in "$@"; do
  case "${arg}" in
    --all) MODE="ALL" ;;
    --demo-users) ALSO_USERS=1 ;;
    -h|--help)
      echo "Usage: $0 [--all] [--demo-users]"
      echo "  --all         Delete every trainer (not just Alex/Sam demo)"
      echo "  --demo-users  After DEMO delete, remove demo Users + Trainer UserType/role links"
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

SQL_FILE="${SCRIPT_DIR}/delete-trainers.sql"
if [[ ! -f "${SQL_FILE}" ]]; then
  echo "Missing ${SQL_FILE}" >&2
  exit 1
fi

echo "=============================================="
echo "  Delete trainers — mode: ${MODE}"
if [[ "${ALSO_USERS}" -eq 1 ]]; then
  echo "  Also remove demo User rows: yes"
fi
echo "  Database: ${DB_NAME}"
echo "=============================================="
read -r -p "Type YES to continue: " confirm
if [[ "${confirm}" != "YES" ]]; then
  echo "Aborted."
  exit 1
fi

# Patch mode variables in a temp copy (avoid editing repo file on server)
TMP_SQL="$(mktemp)"
sed -e "s/DECLARE @Mode VARCHAR(10) = N'DEMO';/DECLARE @Mode VARCHAR(10) = N'${MODE}';/" \
    -e "s/DECLARE @AlsoRemoveTrainerUsers BIT = 0;/DECLARE @AlsoRemoveTrainerUsers BIT = ${ALSO_USERS};/" \
    "${SQL_FILE}" > "${TMP_SQL}"

CONTAINER="gym-sqlserver"
docker cp "${TMP_SQL}" "${CONTAINER}:/tmp/delete-trainers.sql"

if compose exec -T sqlserver /opt/mssql-tools18/bin/sqlcmd -S localhost -U sa -P "${SA_PASS}" -C -d "${DB_NAME}" -i /tmp/delete-trainers.sql; then
  :
elif compose exec -T sqlserver /opt/mssql-tools/bin/sqlcmd -S localhost -U sa -P "${SA_PASS}" -C -d "${DB_NAME}" -i /tmp/delete-trainers.sql; then
  :
else
  rm -f "${TMP_SQL}"
  docker exec "${CONTAINER}" rm -f /tmp/delete-trainers.sql 2>/dev/null || true
  echo "sqlcmd failed." >&2
  exit 1
fi

rm -f "${TMP_SQL}"
docker exec "${CONTAINER}" rm -f /tmp/delete-trainers.sql 2>/dev/null || true

echo "==> Done."
