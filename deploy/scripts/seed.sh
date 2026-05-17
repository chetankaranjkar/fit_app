#!/usr/bin/env bash
# Enable seed on next API restart, wait for healthy, then disable (seeder is idempotent).
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/_common.sh"

require_env

ENV_FILE="${DEPLOY_DIR}/.env"
if grep -q '^DATABASE_SEED_DEFAULTS=' "${ENV_FILE}"; then
  sed -i 's/^DATABASE_SEED_DEFAULTS=.*/DATABASE_SEED_DEFAULTS=true/' "${ENV_FILE}"
else
  echo 'DATABASE_SEED_DEFAULTS=true' >> "${ENV_FILE}"
fi

echo "==> Restarting API with DATABASE_SEED_DEFAULTS=true..."
compose up -d --force-recreate api

echo "==> Waiting for API..."
for i in $(seq 1 90); do
  if compose exec -T api curl -fsS http://127.0.0.1:8080/health/ready >/dev/null 2>&1; then
    break
  fi
  sleep 3
done

sleep 5
echo "==> Seed log lines:"
compose logs --tail=40 api 2>&1 | grep -iE 'seed|Seeder' || compose logs --tail=20 api

if grep -q '^DATABASE_SEED_DEFAULTS=' "${ENV_FILE}"; then
  sed -i 's/^DATABASE_SEED_DEFAULTS=.*/DATABASE_SEED_DEFAULTS=false/' "${ENV_FILE}"
else
  echo 'DATABASE_SEED_DEFAULTS=false' >> "${ENV_FILE}"
fi

echo "==> Seed run finished (DATABASE_SEED_DEFAULTS reset to false)."
