#!/usr/bin/env bash
# Install host Nginx site from template (run with sudo).
set -euo pipefail

if [[ "${EUID}" -ne 0 ]]; then
  echo "Run with sudo: sudo $0"
  exit 1
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DEPLOY_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
ENV_FILE="${DEPLOY_DIR}/.env"

if [[ ! -f "${ENV_FILE}" ]]; then
  echo "Missing ${ENV_FILE}"
  exit 1
fi

# shellcheck disable=SC1090
set -a && source "${ENV_FILE}" && set +a

export FRONTEND_HOST_PORT="${FRONTEND_HOST_PORT:-8080}"
export API_HOST_PORT="${API_HOST_PORT:-5104}"
export EXERCISE_API_HOST_PORT="${EXERCISE_API_HOST_PORT:-4300}"

DEPLOY_MODE="${DEPLOY_MODE:-production}"

apt-get update -qq
apt-get install -y nginx gettext-base

# Testing gateway must not hold port 80 when host Nginx is used.
docker rm -f gym-gateway 2>/dev/null || true

mkdir -p /etc/nginx/snippets
cp "${DEPLOY_DIR}/nginx/snippets/ssl-params.conf" /etc/nginx/snippets/ssl-params.conf

if [[ "${DEPLOY_MODE}" == "testing" ]]; then
  echo "Testing mode — installing IP-only HTTP Nginx (port 80, no SSL)."
  echo "Tip: testing mode can skip host Nginx and use the Docker gateway on port 80 instead."
  envsubst '${FRONTEND_HOST_PORT} ${API_HOST_PORT} ${EXERCISE_API_HOST_PORT}' \
    < "${DEPLOY_DIR}/nginx/gym-testing.conf.template" > /etc/nginx/sites-available/gym
elif [[ -n "${DOMAIN:-}" && -f "${SSL_CERT_PATH:-/etc/letsencrypt/live/${DOMAIN}}/fullchain.pem" ]]; then
  export DOMAIN SSL_CERT_PATH="${SSL_CERT_PATH:-/etc/letsencrypt/live/${DOMAIN}}"
  envsubst '${DOMAIN} ${FRONTEND_HOST_PORT} ${API_HOST_PORT} ${EXERCISE_API_HOST_PORT} ${SSL_CERT_PATH}' \
    < "${DEPLOY_DIR}/nginx/gym.conf.template" > /etc/nginx/sites-available/gym
else
  if [[ -z "${DOMAIN:-}" ]]; then
    echo "DOMAIN not set. Use DEPLOY_MODE=testing or set DOMAIN in deploy/.env"
    exit 1
  fi
  export DOMAIN
  echo "SSL certs not found — installing HTTP-only config (for Certbot or temporary use)."
  envsubst '${DOMAIN} ${FRONTEND_HOST_PORT} ${API_HOST_PORT} ${EXERCISE_API_HOST_PORT}' \
    < "${DEPLOY_DIR}/nginx/gym-http-only.conf.template" > /etc/nginx/sites-available/gym
fi

ln -sf /etc/nginx/sites-available/gym /etc/nginx/sites-enabled/gym
rm -f /etc/nginx/sites-enabled/default

# Drop other enabled vhosts that duplicate ${DOMAIN} (common after manual Certbot edits).
shopt -s nullglob
for enabled in /etc/nginx/sites-enabled/*; do
  base="$(basename "${enabled}")"
  if [[ "${base}" != "gym" ]]; then
    echo "Removing extra enabled site: ${base}"
    rm -f "${enabled}"
  fi
done
shopt -u nullglob

nginx -t
systemctl enable nginx
if systemctl is-active --quiet nginx; then
  systemctl reload nginx
else
  systemctl start nginx
fi

if ! systemctl is-active --quiet nginx; then
  echo "ERROR: nginx failed to start. Check: journalctl -u nginx -n 40 --no-pager"
  exit 1
fi

if [[ "${DEPLOY_MODE}" == "testing" ]]; then
  echo "Nginx ready — open http://YOUR_VPS_IP (port 80)"
else
  echo "Nginx configured for ${DOMAIN}"
fi
