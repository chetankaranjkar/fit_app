#!/usr/bin/env bash
# Backup SQL Server database and uploaded files.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/_common.sh"

require_env

BACKUP_ROOT="${DEPLOY_DIR}/backups"
STAMP="$(date +%Y%m%d_%H%M%S)"
DEST="${BACKUP_ROOT}/${STAMP}"
mkdir -p "${DEST}"

DB_NAME="${MSSQL_DATABASE:-GymManagementDb}"
SA_PASSWORD="${MSSQL_SA_PASSWORD}"

echo "==> Backing up database ${DB_NAME}..."
docker exec gym-sqlserver bash -c "
  /opt/mssql-tools18/bin/sqlcmd -S localhost -U sa -P \"${SA_PASSWORD}\" -C -Q \"
    BACKUP DATABASE [${DB_NAME}]
    TO DISK = N'/var/opt/mssql/data/${DB_NAME}_${STAMP}.bak'
    WITH INIT, COMPRESSION, STATS = 10;
  \"
" || docker exec gym-sqlserver bash -c "
  /opt/mssql-tools/bin/sqlcmd -S localhost -U sa -P \"${SA_PASSWORD}\" -C -Q \"
    BACKUP DATABASE [${DB_NAME}]
    TO DISK = N'/var/opt/mssql/data/${DB_NAME}_${STAMP}.bak'
    WITH INIT, STATS = 10;
  \"
"

docker cp "gym-sqlserver:/var/opt/mssql/data/${DB_NAME}_${STAMP}.bak" "${DEST}/database.bak"

echo "==> Backing up uploads volume..."
docker run --rm \
  -v gym_api_uploads:/data:ro \
  -v "${DEST}:/backup" \
  alpine:3.20 \
  tar czf /backup/uploads.tar.gz -C /data .

echo "==> Writing manifest..."
cat > "${DEST}/manifest.txt" <<EOF
timestamp=${STAMP}
domain=${DOMAIN}
database=${DB_NAME}
EOF

# Keep last 7 daily-style backups (by folder count)
cd "${BACKUP_ROOT}"
ls -1dt */ 2>/dev/null | tail -n +8 | xargs -r rm -rf

echo "Backup saved to ${DEST}"
