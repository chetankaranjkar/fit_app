#!/usr/bin/env bash
set -euo pipefail
TARGET="${1:-uat}"
if [[ "${TARGET}" == "uat" ]]; then
  cd /opt/gym_uat/fit_app
  ENV_FILE=deploy/.env.uat
  SQL_CONTAINER=gym-uat-sqlserver
else
  cd /opt/gym
  ENV_FILE=deploy/.env
  SQL_CONTAINER=gym-sqlserver
fi
set -a
source "${ENV_FILE}"
set +a
docker cp /tmp/assign-member-home-branch.sql "${SQL_CONTAINER}:/tmp/assign-member-home-branch.sql"
echo "=== migrations ==="
docker exec "${SQL_CONTAINER}" /opt/mssql-tools18/bin/sqlcmd -S localhost -U sa -P "${MSSQL_SA_PASSWORD}" -C -d "${MSSQL_DATABASE}" -W -Q "SELECT MigrationId FROM __EFMigrationsHistory WHERE MigrationId LIKE '202610%' ORDER BY MigrationId;"
echo "=== branches ==="
docker exec "${SQL_CONTAINER}" /opt/mssql-tools18/bin/sqlcmd -S localhost -U sa -P "${MSSQL_SA_PASSWORD}" -C -d "${MSSQL_DATABASE}" -W -Q "SELECT Id, BranchName, IsActive FROM Branches ORDER BY Id;"
echo "=== assign ==="
docker exec "${SQL_CONTAINER}" /opt/mssql-tools18/bin/sqlcmd -S localhost -U sa -P "${MSSQL_SA_PASSWORD}" -C -I -d "${MSSQL_DATABASE}" -W -i /tmp/assign-member-home-branch.sql
