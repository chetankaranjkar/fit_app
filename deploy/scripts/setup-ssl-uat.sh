#!/usr/bin/env bash
# Let's Encrypt certificate for uat.tigerfitness.tech (run with sudo).
set -euo pipefail

if [[ "${EUID}" -ne 0 ]]; then
  echo "Run with sudo: sudo $0"
  exit 1
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DEPLOY_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
ENV_FILE="${DEPLOY_DIR}/.env.uat"

# shellcheck disable=SC1090
set -a && source "${ENV_FILE}" && set +a

: "${DOMAIN:?}"
: "${CERTBOT_EMAIL:?Set CERTBOT_EMAIL in deploy/.env.uat}"

apt-get update -qq
apt-get install -y certbot

mkdir -p /var/www/certbot

"${SCRIPT_DIR}/setup-nginx-uat.sh"

certbot certonly --webroot \
  -w /var/www/certbot \
  -d "${DOMAIN}" \
  --email "${CERTBOT_EMAIL}" \
  --agree-tos \
  --non-interactive \
  --keep-until-expiring

export SSL_CERT_PATH="/etc/letsencrypt/live/${DOMAIN}"
export FRONTEND_HOST_PORT="${FRONTEND_HOST_PORT:-8081}"
export API_HOST_PORT="${API_HOST_PORT:-5105}"
export EXERCISE_API_HOST_PORT="${EXERCISE_API_HOST_PORT:-4301}"

envsubst '${DOMAIN} ${FRONTEND_HOST_PORT} ${API_HOST_PORT} ${EXERCISE_API_HOST_PORT} ${SSL_CERT_PATH}' \
  < "${DEPLOY_DIR}/nginx/gym-uat.conf.template" > /etc/nginx/sites-available/gym-uat

ln -sf /etc/nginx/sites-available/gym-uat /etc/nginx/sites-enabled/gym-uat

nginx -t
systemctl reload nginx

systemctl enable certbot.timer 2>/dev/null || true
systemctl start certbot.timer 2>/dev/null || true

echo "UAT SSL ready: https://${DOMAIN}/dashboard"
