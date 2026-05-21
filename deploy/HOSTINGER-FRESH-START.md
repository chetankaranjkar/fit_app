# Hostinger VPS — fresh start guide

Complete reset for **Ubuntu 24** on Hostinger (IP-only testing, no domain).  
Target URL: **http://187.127.169.135/** (replace with your VPS IP if different).

> **Warning:** A fresh start **deletes the database** and all uploaded files. Back up first if you need old data.

---

## Part A — From your Windows PC (SSH)

### 1. Connect

```powershell
ssh root@187.127.169.135
```

Use the root password from Hostinger hPanel → VPS → SSH access.

### 2. One-command fresh install (recommended)

On the VPS:

```bash
curl -fsSL https://raw.githubusercontent.com/chetankaranjkar/fit_app/main/deploy/scripts/fresh-start.sh -o /tmp/fresh-start.sh
chmod +x /tmp/fresh-start.sh
sudo /tmp/fresh-start.sh
```

When prompted, type **`YES`** to confirm wipe.

If you **do not** have a saved `deploy/.env`, the script opens the template — edit:

| Variable | What to set |
|----------|-------------|
| `DEPLOY_MODE` | `testing` |
| `VPS_IP` | Your public IP (e.g. `187.127.169.135`) |
| `MSSQL_SA_PASSWORD` | Strong password (16+ chars) |
| `JWT_SECRET_KEY` | Run on VPS: `openssl rand -base64 48` |

Save in nano: **Ctrl+O**, Enter, **Ctrl+X**.

Deploy takes **15–25 minutes** the first time (SQL Server image + builds).

---

## Part B — Manual steps (if you prefer control)

### 1. Install Docker (once per server)

```bash
cd /opt
git clone https://github.com/chetankaranjkar/fit_app.git gym
cd gym
chmod +x deploy/scripts/*.sh
sudo ./deploy/scripts/server-bootstrap.sh
sudo usermod -aG docker $USER
```

Log out and SSH back in so `docker` works without `sudo`.

### 2. Wipe old install

```bash
cd /opt/gym
# backup secrets if you want to reuse them
cp deploy/.env /root/gym-deploy.env.backup 2>/dev/null || true

docker rm -f gym-gateway gym-frontend gym-api gym-exercise-api gym-redis gym-sqlserver 2>/dev/null || true
docker volume rm -f gym_sqlserver_data gym_api_uploads 2>/dev/null || true

cd /opt
rm -rf gym gym_old_* 
```

### 3. Clone again

```bash
git clone https://github.com/chetankaranjkar/fit_app.git gym
cd gym
chmod +x deploy/scripts/*.sh
```

### 4. Configure environment

```bash
cp deploy/.env.testing.example deploy/.env
# OR restore: cp /root/gym-deploy.env.backup deploy/.env
nano deploy/.env
chmod 600 deploy/.env
```

### 5. Deploy

```bash
./deploy/scripts/deploy.sh
```

### 6. Firewall

```bash
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw status
```

In **Hostinger hPanel** → VPS → **Firewall**, allow **TCP 80** (and 22 for SSH).

---

## Part C — Verify

On the VPS:

```bash
cd /opt/gym
docker ps
curl -s http://127.0.0.1/api/health/ready
./deploy/scripts/logs.sh api --tail 30
```

In your browser:

- Site: http://187.127.169.135/
- API: http://187.127.169.135/api/health/ready

Default login (change after first login): `admin@gym.com` / `admin123`

---

## After `git pull` — changes not visible?

Run a **full** update (rebuild + force recreate), not only `up -d`:

```bash
cd /opt/gym
git pull --ff-only origin main
chmod +x deploy/scripts/*.sh
./deploy/scripts/update.sh
```

Or manually:

```bash
docker compose -f deploy/docker-compose.yml -f deploy/docker-compose.testing.yml \
  --env-file deploy/.env build --no-cache frontend api
docker compose -f deploy/docker-compose.yml -f deploy/docker-compose.testing.yml \
  --env-file deploy/.env up -d --force-recreate
```

Then in the browser: **Ctrl+Shift+R** or open a **private/incognito** window.

Check what the server is running:

```bash
./deploy/scripts/verify-deploy.sh
```

**Mobile app** changes are **not** in the website — rebuild the APK on your PC after `git pull`.

---

## `gym-api` failed to start / dependency failed?

Usually the API **crashed during database migration**. Check logs on the VPS:

```bash
cd /opt/gym
./deploy/scripts/logs.sh api --tail 120
```

Common fix (migration order + restart):

```bash
cd /opt/gym
git pull --ff-only origin main   # or: git reset --hard origin/main
compose build --no-cache api
./deploy/scripts/fix-api-migration-order.sh
compose up -d --force-recreate
```

If logs show `Invalid object name 'membership_payments'`, pull latest `main` (coupon migration must run **after** `MembershipPaymentsEnterprise`).

---

## `git pull` blocked by local changes?

On the VPS you may see:

```text
error: Your local changes to the following files would be overwritten by merge:
        deploy/scripts/update.sh
```

That means someone edited deploy scripts on the server (or an old copy). **Do not commit on the VPS** — reset to GitHub instead. Your secrets in `deploy/.env` are **not** in git and stay as-is.

```bash
cd /opt/gym
git fetch origin main
git reset --hard origin/main
chmod +x deploy/scripts/*.sh
./deploy/scripts/update.sh
```

After the next pull, you can use `./deploy/scripts/sync-from-origin.sh` for the same reset step.

---

## Part D — Future updates (after fresh install)

`/opt/gym` must be a **git clone** (folder contains `.git`).

```bash
cd /opt/gym
git pull --ff-only origin main || ./deploy/scripts/sync-from-origin.sh
./deploy/scripts/update.sh
```

Or push to GitHub `main` and use [GITHUB-DEPLOY.md](./GITHUB-DEPLOY.md) (SSH secrets required).

---

## Troubleshooting

| Problem | What to do |
|---------|------------|
| `fatal: not a git repository` | You uploaded files without git — run **fresh-start.sh** or clone again (Part B). |
| `address already in use` on port 80 | Host nginx conflicts with Docker gateway. Run: `sudo systemctl stop nginx && sudo systemctl disable nginx` then `cd /opt/gym && ./deploy/scripts/deploy.sh` |
| Site not loading on IP | Check `docker ps` includes `gym-gateway`; open port 80 in UFW + Hostinger firewall. |
| API not ready | `./deploy/scripts/logs.sh api -f` — wait for SQL Server (can take 2–3 min). |
| `CheckInRadiusOffsetMeters` error | Ensure latest `main` is deployed; API runs schema patch on start. |
| Login: "Cannot reach the server" | Frontend was built with localhost API URL. Run `git pull` and rebuild: `compose build frontend --no-cache && compose up -d frontend gateway` |
| Login: invalid password / no user | Fresh DB has no admin. Run: `./deploy/scripts/seed.sh` then `./deploy/scripts/diagnose-login.sh` |
| Diagnose everything | `cd /opt/gym && ./deploy/scripts/diagnose-login.sh` |

**Default login:** `admin@gym.com` / `admin123` (or username `admin`)
| Out of memory | In `.env` set `MSSQL_MEMORY_LIMIT_MB=1024`, `API_MEMORY_LIMIT=384m`; need **4 GB RAM** VPS for full stack. |
| Old folder still there | `rm -rf /opt/gym_old_*` after you confirm the new site works. |

---

## What gets installed

| Service | Container | Port (testing mode) |
|---------|-----------|------------------------|
| Gateway (Nginx) | `gym-gateway` | **80** (public) |
| Frontend | `gym-frontend` | internal |
| .NET API | `gym-api` | internal |
| Exercise API | `gym-exercise-api` | internal |
| SQL Server | `gym-sqlserver` | internal |
| Redis | `gym-redis` | internal |

---

## Security checklist

- [ ] New `MSSQL_SA_PASSWORD` and `JWT_SECRET_KEY` (do not reuse leaked values)
- [ ] `chmod 600 deploy/.env`
- [ ] Change default admin password after login
- [ ] When you add a domain, follow [DEPLOYMENT.md](./DEPLOYMENT.md) for SSL

---

## Quick reference

```bash
cd /opt/gym
./deploy/scripts/deploy.sh    # first time / full rebuild
./deploy/scripts/update.sh    # git pull + rebuild
./deploy/scripts/restart.sh   # restart containers
./deploy/scripts/logs.sh      # all logs
./deploy/scripts/backup.sh    # database backup
./deploy/scripts/fresh-start.sh   # wipe + clone + deploy
```
