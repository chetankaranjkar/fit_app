#!/usr/bin/env bash
# Wipe Gym Docker stack + /opt/gym and clone fresh from GitHub, then deploy.
# WARNING: Deletes database volume (all gym SQL data). Uploads volume is removed too.
#
# Usage (on VPS as root or user in docker group):
#   curl -fsSL https://raw.githubusercontent.com/chetankaranjkar/fit_app/main/deploy/scripts/fresh-start.sh | bash
# Or from an existing clone:
#   sudo ./deploy/scripts/fresh-start.sh
#
# Optional env:
#   GYM_REPO_URL=https://github.com/chetankaranjkar/fit_app.git
#   GYM_INSTALL_DIR=/opt/gym
#   GYM_ENV_BACKUP=/root/gym-deploy.env.backup
set -euo pipefail

GYM_REPO_URL="${GYM_REPO_URL:-https://github.com/chetankaranjkar/fit_app.git}"
GYM_INSTALL_DIR="${GYM_INSTALL_DIR:-/opt/gym}"
GYM_ENV_BACKUP="${GYM_ENV_BACKUP:-/root/gym-deploy.env.backup}"

echo "=============================================="
echo "  Gym Management — FRESH START (destructive)"
echo "=============================================="
echo ""
echo "This will:"
echo "  - Stop and remove ALL gym Docker containers"
echo "  - Delete volumes: gym_sqlserver_data, gym_api_uploads (DATABASE WIPED)"
echo "  - Remove ${GYM_INSTALL_DIR} and ${GYM_INSTALL_DIR}_old_*"
echo "  - git clone ${GYM_REPO_URL} into ${GYM_INSTALL_DIR}"
echo "  - Run deploy/scripts/deploy.sh (if deploy/.env exists or backup restored)"
echo ""
read -r -p "Type YES to continue: " confirm
if [[ "${confirm}" != "YES" ]]; then
  echo "Aborted."
  exit 1
fi

if ! command -v docker >/dev/null 2>&1; then
  echo "Docker not found. Run: sudo ./deploy/scripts/server-bootstrap.sh"
  exit 1
fi

# Backup .env before delete
if [[ -f "${GYM_INSTALL_DIR}/deploy/.env" ]]; then
  cp "${GYM_INSTALL_DIR}/deploy/.env" "${GYM_ENV_BACKUP}"
  echo "Backed up deploy/.env -> ${GYM_ENV_BACKUP}"
fi

# Stop stack from existing install if possible
if [[ -f "${GYM_INSTALL_DIR}/deploy/.env" ]]; then
  echo "==> Stopping existing compose stack..."
  # shellcheck disable=SC1090
  set -a && source "${GYM_INSTALL_DIR}/deploy/.env" && set +a
  if [[ "${DEPLOY_MODE:-}" == "testing" ]]; then
    docker compose -f "${GYM_INSTALL_DIR}/deploy/docker-compose.yml" \
      -f "${GYM_INSTALL_DIR}/deploy/docker-compose.testing.yml" \
      --env-file "${GYM_INSTALL_DIR}/deploy/.env" down -v --remove-orphans 2>/dev/null || true
  else
    docker compose -f "${GYM_INSTALL_DIR}/deploy/docker-compose.yml" \
      --env-file "${GYM_INSTALL_DIR}/deploy/.env" down -v --remove-orphans 2>/dev/null || true
  fi
fi

echo "==> Removing gym containers (if any remain)..."
docker rm -f gym-gateway gym-frontend gym-api gym-exercise-api gym-redis gym-sqlserver 2>/dev/null || true

echo "==> Removing gym volumes..."
docker volume rm -f gym_sqlserver_data gym_api_uploads 2>/dev/null || true

echo "==> Removing old install directories..."
rm -rf "${GYM_INSTALL_DIR}"
rm -rf /opt/gym_old_* 2>/dev/null || true

echo "==> Cloning repository..."
mkdir -p "$(dirname "${GYM_INSTALL_DIR}")"
git clone "${GYM_REPO_URL}" "${GYM_INSTALL_DIR}"
cd "${GYM_INSTALL_DIR}"
chmod +x deploy/scripts/*.sh

if [[ -f "${GYM_ENV_BACKUP}" ]]; then
  cp "${GYM_ENV_BACKUP}" deploy/.env
  chmod 600 deploy/.env
  echo "Restored deploy/.env from backup."
else
  cp deploy/.env.testing.example deploy/.env
  chmod 600 deploy/.env
  echo ""
  echo "Created deploy/.env from template. EDIT REQUIRED:"
  echo "  nano ${GYM_INSTALL_DIR}/deploy/.env"
  echo ""
  echo "Set at minimum:"
  echo "  VPS_IP=<your public IP>"
  echo "  MSSQL_SA_PASSWORD=<strong password>"
  echo "  JWT_SECRET_KEY=\$(openssl rand -base64 48)"
  echo ""
  read -r -p "Press Enter after you have saved deploy/.env (or Ctrl+C to exit)..."
fi

echo "==> Opening firewall port 80 (if ufw active)..."
if command -v ufw >/dev/null 2>&1 && ufw status 2>/dev/null | grep -q "Status: active"; then
  ufw allow 80/tcp || true
  ufw allow 22/tcp || true
fi

echo "==> Running deploy..."
./deploy/scripts/deploy.sh

echo ""
echo "Fresh start complete."
if [[ -f deploy/.env ]]; then
  # shellcheck disable=SC1090
  set -a && source deploy/.env && set +a
  echo "  App URL: http://${VPS_IP:-<set VPS_IP in deploy/.env>}"
fi
echo "  Logs:    ./deploy/scripts/logs.sh api -f"
