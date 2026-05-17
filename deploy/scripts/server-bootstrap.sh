#!/usr/bin/env bash
# One-time VPS hardening: Docker, UFW, fail2ban (run with sudo on Ubuntu 24).
set -euo pipefail

if [[ "${EUID}" -ne 0 ]]; then
  echo "Run with sudo: sudo $0"
  exit 1
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DEPLOY_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"

export DEBIAN_FRONTEND=noninteractive

echo "==> System updates..."
apt-get update -qq
apt-get upgrade -y -qq

echo "==> Installing base packages..."
apt-get install -y -qq \
  ca-certificates curl git ufw fail2ban unattended-upgrades \
  apt-transport-https gnupg lsb-release

echo "==> Installing Docker..."
if ! command -v docker >/dev/null; then
  install -m 0755 -d /etc/apt/keyrings
  curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
  chmod a+r /etc/apt/keyrings/docker.asc
  echo \
    "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu \
    $(. /etc/os-release && echo "${VERSION_CODENAME}") stable" \
    > /etc/apt/sources.list.d/docker.list
  apt-get update -qq
  apt-get install -y -qq docker-ce docker-ce-cli containerd.io docker-compose-plugin
fi

systemctl enable docker
systemctl start docker

echo "==> UFW firewall..."
ufw --force reset
ufw default deny incoming
ufw default allow outgoing
ufw allow OpenSSH
ufw allow 'Nginx Full'
ufw --force enable

echo "==> fail2ban..."
cp "${DEPLOY_DIR}/fail2ban/jail.local" /etc/fail2ban/jail.local
systemctl enable fail2ban
systemctl restart fail2ban

echo "==> Unattended security upgrades..."
dpkg-reconfigure -plow unattended-upgrades || true

echo "==> Create deploy user (optional)..."
if ! id gymdeploy &>/dev/null; then
  useradd -m -s /bin/bash gymdeploy
  usermod -aG docker gymdeploy
  echo "Created user 'gymdeploy' — add your SSH key to /home/gymdeploy/.ssh/authorized_keys"
fi

echo ""
echo "Bootstrap complete. Next:"
echo "  1) Clone repo to /opt/gym (or home directory)"
echo "  2) cp deploy/.env.production.example deploy/.env && nano deploy/.env"
echo "  3) ./deploy/scripts/deploy.sh"
echo "  4) sudo ./deploy/scripts/setup-nginx.sh && sudo ./deploy/scripts/setup-ssl.sh"
