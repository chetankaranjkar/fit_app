# Testing deployment (no domain)

Use this when you only have a **VPS public IP** (Hostinger) and want to try the app over **HTTP** — no DNS, no SSL, no Certbot.

> **Broken or old upload without git?** Use **[HOSTINGER-FRESH-START.md](./HOSTINGER-FRESH-START.md)** — wipe Docker + reinstall from GitHub.

## 1. Connect to VPS

```powershell
ssh root@YOUR_VPS_IP
```

## 2. Install Docker (once)

```bash
cd /opt
git clone YOUR_REPO_URL gym
cd gym
chmod +x deploy/scripts/*.sh
sudo ./deploy/scripts/server-bootstrap.sh
sudo usermod -aG docker $USER
# log out and back in
```

## 3. Configure for testing

```bash
cd /opt/gym
cp deploy/.env.testing.example deploy/.env
nano deploy/.env
```

Set:

| Variable | Example |
|----------|---------|
| `VPS_IP` | Your Hostinger public IP (e.g. `123.45.67.89`) |
| `MSSQL_SA_PASSWORD` | Strong password |
| `JWT_SECRET_KEY` | 32+ random characters (`openssl rand -base64 48`) |

Keep `DEPLOY_MODE=testing`.

```bash
chmod 600 deploy/.env
```

## 4. Deploy

```bash
./deploy/scripts/deploy.sh
```

This starts all containers plus a **gateway** on **port 80** that routes:

- `/` → frontend  
- `/api/` → .NET API  
- `/exercise-api/` → exercise service  

## 5. Open firewall port 80

```bash
sudo ufw allow 80/tcp
sudo ufw status
```

In **Hostinger hPanel**, ensure the VPS firewall also allows **HTTP (80)** if enabled there.

## 6. Open in browser

```text
http://YOUR_VPS_IP
```

Login (first time): `admin@gym.com` / `admin123` — change the password after login.

---

## 7. Connect SQL from your PC (SSMS)

Compose matches:

```bash
docker run -d --name gym-sqlserver -e ACCEPT_EULA=Y \
  -e MSSQL_SA_PASSWORD='your-password' -p 1433:1433 \
  mcr.microsoft.com/mssql/server:2022-latest
```

(`MSSQL_SA_PASSWORD` in `.env` = `SA_PASSWORD` in older docker run examples.)

**Safer (recommended):** bind SQL to VPS loopback only, then SSH tunnel from Windows:

```bash
./deploy/scripts/enable-db-tunnel.sh
```

Windows (leave open): `ssh -N -L 14333:127.0.0.1:1433 root@YOUR_VPS_IP`  
SSMS: `localhost,14333` · Login `sa` · Password from `MSSQL_SA_PASSWORD` in `.env`

**Direct (less secure):** after `deploy.sh`, SQL is on `YOUR_VPS_IP,1433` if the host firewall allows 1433. Block 1433 on the public internet in production.

---

## Notes

- **Not HTTPS** — browsers may warn on some features; fine for internal testing.
- **Do not use `localhost`** in `deploy/.env` for `VPS_IP` — use the real public IP so CORS matches if you open the site from your PC.
- Same machine test from VPS: `curl -s http://127.0.0.1/health` on gateway, or `curl http://YOUR_VPS_IP`.

## Useful commands

```bash
./deploy/scripts/logs.sh          # all logs
./deploy/scripts/logs.sh api -f   # follow API logs
./deploy/scripts/restart.sh
./deploy/scripts/backup.sh
./deploy/scripts/update.sh        # after git pull
```

## Auto-deploy from GitHub (optional)

After CI passes on `main`, GitHub Actions can SSH to this VPS and run `update.sh` automatically.

See **[GITHUB-DEPLOY.md](./GITHUB-DEPLOY.md)** — add `HOSTINGER_SSH_*` secrets, then every push to `main` updates the site at your VPS IP.

## When you get a domain later

1. Set `DEPLOY_MODE=production` (or remove it) in `deploy/.env`
2. Add `DOMAIN`, `CORS_ORIGIN_*`, `CERTBOT_EMAIL`
3. Redeploy without testing compose file (remove testing overlay — use production `.env` only)
4. Run `sudo ./deploy/scripts/setup-nginx.sh` and `setup-ssl.sh`

See [DEPLOYMENT.md](./DEPLOYMENT.md) for full production steps.
