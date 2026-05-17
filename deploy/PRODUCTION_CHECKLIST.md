# Production checklist

Use this before and after going live on Hostinger VPS (Ubuntu 24).

## Before deploy

- [ ] VPS meets minimum specs (see [DEPLOYMENT.md](./DEPLOYMENT.md#recommended-vps-specs))
- [ ] Domain purchased; DNS **A** record points to VPS public IP
- [ ] `deploy/.env` created from `.env.production.example` (never committed)
- [ ] `MSSQL_SA_PASSWORD` is strong (16+ chars, mixed case, numbers, symbols)
- [ ] `JWT_SECRET_KEY` is at least 32 random characters (unique per environment)
- [ ] `DOMAIN` matches DNS (no `localhost` in production URLs)
- [ ] `CERTBOT_EMAIL` set for Let's Encrypt expiry notices
- [ ] SSH key login configured; password auth disabled (recommended)
- [ ] Repository cloned on server (e.g. `/opt/gym`)

## Server hardening

- [ ] Ran `sudo ./deploy/scripts/server-bootstrap.sh`
- [ ] UFW active: `sudo ufw status` shows **22**, **Nginx Full** allowed only
- [ ] fail2ban running: `sudo systemctl status fail2ban`
- [ ] Docker starts on boot: `sudo systemctl is-enabled docker`

## Application deploy

- [ ] `chmod +x deploy/scripts/*.sh`
- [ ] `./deploy/scripts/deploy.sh` completes; API `/health/ready` returns 200
- [ ] `sudo ./deploy/scripts/setup-nginx.sh`
- [ ] `sudo ./deploy/scripts/setup-ssl.sh` (HTTPS works)
- [ ] `https://YOUR_DOMAIN` loads the React app
- [ ] Login/API works via `https://YOUR_DOMAIN/api/`
- [ ] Uploads work (`/uploads/` proxied to API)
- [ ] Exercise features work (`/exercise-api/` if using workout studio)

## Security

- [ ] `deploy/.env` permissions: `chmod 600 deploy/.env`
- [ ] Swagger blocked in Nginx (`/swagger` returns 404)
- [ ] SQL Server and Redis **not** exposed publicly (no host ports except 127.0.0.1 app ports)
- [ ] Default dev passwords **not** used in production
- [ ] First admin user created (see DEPLOYMENT.md — seed runs only in Development)

## Backups & maintenance

- [ ] `./deploy/scripts/backup.sh` tested
- [ ] Cron scheduled for daily backups (example in DEPLOYMENT.md)
- [ ] `certbot renew --dry-run` succeeds
- [ ] `./deploy/scripts/update.sh` tested on staging or maintenance window

## Post-go-live

- [ ] Change any bootstrap credentials
- [ ] Monitor RAM: `docker stats`
- [ ] Monitor disk: `df -h` and backup folder size
- [ ] Document recovery: restore from `deploy/backups/`
