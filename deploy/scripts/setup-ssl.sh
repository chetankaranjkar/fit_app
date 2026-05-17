#!/usr/bin/env bash
# Obtain Let's Encrypt certificate and switch Nginx to HTTPS config (run with sudo).
set -euo pipefail

if [[ "${EUID}" -ne 0 ]]; then
  echo "Run with sudo: sudo $0"
  exit 1
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DEPLOY_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
ENV_FILE="${DEPLOY_DIR}/.env"

set -a && source "${ENV_FILE}" && set +a

: "${DOMAIN:?}"
: "${CERTBOT_EMAIL:?Set CERTBOT_EMAIL in deploy/.env}"

apt-get update -qq
apt-get install -y certbot

mkdir -p /var/www/certbot

# Ensure HTTP site is active for ACME challenge
"${SCRIPT_DIR}/setup-nginx.sh"

certbot certonly --webroot \
  -w /var/www/certbot \
  -d "${DOMAIN}" \
  -d "www.${DOMAIN}" \
  --email "${CERTBOT_EMAIL}" \
  --agree-tos \
  --non-interactive \
  --keep-until-expiring

export SSL_CERT_PATH="/etc/letsencrypt/live/${DOMAIN}"
export FRONTEND_HOST_PORT="${FRONTEND_HOST_PORT:-8080}"
export API_HOST_PORT="${API_HOST_PORT:-5104}"
export EXERCISE_API_HOST_PORT="${EXERCISE_API_HOST_PORT:-4300}"

envsubst '${DOMAIN} ${FRONTEND_HOST_PORT} ${API_HOST_PORT} ${EXERCISE_API_HOST_PORT} ${SSL_CERT_PATH}' \
  < "${DEPLOY_DIR}/nginx/gym.conf.template" > /etc/nginx/sites-available/gym

nginx -t
systemctl reload nginx

# Automatic renewal (certbot timer is installed with the package)
systemctl enable certbot.timer 2>/dev/null || true
systemctl start certbot.timer 2>/dev/null || true

echo "SSL installed for https://${DOMAIN}"
