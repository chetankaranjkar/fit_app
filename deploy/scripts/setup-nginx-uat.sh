#!/usr/bin/env bash
# Install host Nginx site for UAT (alongside production gym site).
set -euo pipefail

if [[ "${EUID}" -ne 0 ]]; then
  echo "Run with sudo: sudo $0"
  exit 1
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DEPLOY_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
ENV_FILE="${DEPLOY_DIR}/.env.uat"

if [[ ! -f "${ENV_FILE}" ]]; then
  echo "Missing ${ENV_FILE} — cp deploy/.env.uat.example deploy/.env.uat"
  exit 1
fi

# shellcheck disable=SC1090
set -a && source "${ENV_FILE}" && set +a

: "${DOMAIN:?Set DOMAIN in deploy/.env.uat}"

export FRONTEND_HOST_PORT="${FRONTEND_HOST_PORT:-8081}"
export API_HOST_PORT="${API_HOST_PORT:-5105}"
export EXERCISE_API_HOST_PORT="${EXERCISE_API_HOST_PORT:-4301}"

apt-get update -qq
apt-get install -y nginx gettext-base

mkdir -p /etc/nginx/snippets
cp "${DEPLOY_DIR}/nginx/snippets/ssl-params.conf" /etc/nginx/snippets/ssl-params.conf

SITE="gym-uat"
if [[ -f "${SSL_CERT_PATH:-/etc/letsencrypt/live/${DOMAIN}}/fullchain.pem" ]]; then
  export SSL_CERT_PATH="${SSL_CERT_PATH:-/etc/letsencrypt/live/${DOMAIN}}"
  envsubst '${DOMAIN} ${FRONTEND_HOST_PORT} ${API_HOST_PORT} ${EXERCISE_API_HOST_PORT} ${SSL_CERT_PATH}' \
    < "${DEPLOY_DIR}/nginx/gym-uat.conf.template" > "/etc/nginx/sites-available/${SITE}"
else
  echo "SSL not found — installing HTTP-only UAT config (run setup-ssl-uat.sh next)."
  envsubst '${DOMAIN} ${FRONTEND_HOST_PORT} ${API_HOST_PORT} ${EXERCISE_API_HOST_PORT}' \
    < "${DEPLOY_DIR}/nginx/gym-uat-http-only.conf.template" > "/etc/nginx/sites-available/${SITE}"
fi

ln -sf "/etc/nginx/sites-available/${SITE}" "/etc/nginx/sites-enabled/${SITE}"

nginx -t
systemctl enable nginx
if systemctl is-active --quiet nginx; then
  systemctl reload nginx
else
  systemctl start nginx
fi

echo "UAT Nginx site enabled: ${SITE} → ${DOMAIN}"
echo "Production site (gym) is unchanged."
