# Gym Management — VPS deployment guide (Hostinger / Ubuntu 24)

Production deployment for this repository using **Docker Compose**, **host Nginx** (reverse proxy + SSL), and **Let's Encrypt**. No PM2 — containers use `restart: unless-stopped` and survive reboots.

> **No domain yet?** Use **[DEPLOYMENT-TESTING.md](./DEPLOYMENT-TESTING.md)** — access the app at `http://YOUR_VPS_IP` with no DNS or SSL.

---

## What you are deploying

| Component | Technology | Notes |
|-----------|------------|--------|
| Frontend | React 19 + Vite (`gym_client/`) | Static build served by Nginx container |
| Main API | ASP.NET Core 9 (`src/GymManagement.API/`) | SQL Server + optional Redis |
| Exercise API | Node.js Express (`exercise_management_api/`) | Workout studio / plan builder / AI |
| Database | **SQL Server 2022** (Express in Docker) | Persistent volume |
| Cache | **Redis 7** (Alpine) | QR replay protection & rate limits |
| Reverse proxy | **Nginx on host** | TLS, gzip, security headers |
| Mobile app | Flutter (`mobile app/`) | Not deployed to VPS (separate build) |

**Environment variables (production)** — set in `deploy/.env`, not in source code:

- `DOMAIN`, `MSSQL_SA_PASSWORD`, `JWT_SECRET_KEY` (required)
- `ConnectionStrings__DefaultConnection` is built by Compose from SQL password
- `Redis__ConnectionString` → `redis:6379`
- `Cors__AllowedOrigins__0` → `https://YOUR_DOMAIN`
- `VITE_*` are baked at **frontend build** (`/api`, `/exercise-api/api`)

---

## Recommended VPS specs

| Tier | RAM | vCPU | Disk | Notes |
|------|-----|------|------|--------|
| Minimum | 2 GB | 2 | 40 GB | Tight; set `MSSQL_MEMORY_LIMIT_MB=1024`, disable exercise API if unused |
| **Recommended** | **4 GB** | **2** | **60 GB SSD** | Comfortable for full stack |
| Busy gym | 8 GB | 4 | 80 GB | More headroom for SQL + uploads |

### Estimated RAM usage (full stack)

| Service | Typical RAM |
|---------|-------------|
| SQL Server Express | 1.0–1.5 GB (capped via `MSSQL_MEMORY_LIMIT_MB`) |
| API (.NET) | 200–400 MB |
| Redis | 30–128 MB |
| Exercise API | 80–150 MB |
| Frontend (Nginx) | 10–30 MB |
| Host Nginx + OS | 300–500 MB |
| **Total** | **~2.0–2.8 GB** (leave buffer on a 4 GB VPS) |

---

## Folder layout on the VPS

```text
/opt/gym/                          # git clone root
├── gym_client/
├── src/
├── exercise_management_api/
├── deploy/
│   ├── .env                       # secrets (create locally, never commit)
│   ├── docker-compose.yml
│   ├── docker/
│   ├── nginx/
│   ├── scripts/
│   ├── backups/                   # created by backup.sh
│   ├── DEPLOYMENT.md
│   └── PRODUCTION_CHECKLIST.md
```

---

## Part 1 — Connect from Windows (SSH)

1. In Hostinger hPanel, note the VPS **public IP** and set the root password (or add SSH key).
2. Open **PowerShell** or **Windows Terminal**:

```powershell
ssh root@YOUR_VPS_IP
```

3. (Recommended) Create a deploy user and use keys:

```bash
adduser gymdeploy
usermod -aG sudo gymdeploy
rsync --version   # optional
```

Copy your public key to `/home/gymdeploy/.ssh/authorized_keys`, then log in as `gymdeploy`.

---

## Part 2 — One-time server bootstrap

On the VPS (as root):

```bash
cd /opt
git clone https://github.com/YOUR_ORG/GYM.git gym
cd gym
chmod +x deploy/scripts/*.sh
sudo ./deploy/scripts/server-bootstrap.sh
```

This installs Docker, enables UFW (SSH + Nginx), and configures fail2ban.

Add your user to the docker group:

```bash
sudo usermod -aG docker gymdeploy
# log out and back in
```

---

## Part 3 — Configure environment

```bash
cd /opt/gym
cp deploy/.env.production.example deploy/.env
nano deploy/.env
```

**Important values:**

```bash
DOMAIN=app.yourgym.com
CERTBOT_EMAIL=you@yourgym.com
MSSQL_SA_PASSWORD='YourVeryStrong!Passw0rd'
JWT_SECRET_KEY='your-random-32-plus-character-secret-key-here'
SSL_CERT_PATH=/etc/letsencrypt/live/app.yourgym.com
```

Generate a JWT secret (on VPS):

```bash
openssl rand -base64 48
```

Secure the file:

```bash
chmod 600 deploy/.env
```

---

## Part 4 — DNS

At your domain registrar (or Hostinger DNS):

| Type | Name | Value |
|------|------|--------|
| A | `@` or `app` | VPS public IP |
| A | `www` | VPS public IP (optional) |

Wait for propagation (`dig app.yourgym.com`).

---

## Part 5 — Deploy application (Docker)

From repo root as a user in the `docker` group:

```bash
cd /opt/gym
./deploy/scripts/deploy.sh
```

This builds and starts:

- `gym-sqlserver` — database (internal network only)
- `gym-redis` — cache
- `gym-api` — .NET API on `127.0.0.1:5104`
- `gym-exercise-api` — Node API on `127.0.0.1:4300`
- `gym-frontend` — static UI on `127.0.0.1:8080`

Verify:

```bash
curl -s http://127.0.0.1:5104/health/ready
curl -s http://127.0.0.1:8080/health
```

**First admin login:** On first login, the API can create `admin@gym.com` / `admin123` if no admin exists. **Change this password immediately** after first login.

Migrations run automatically when `DATABASE_AUTO_MIGRATE=true` (default).

---

## Part 6 — Host Nginx + HTTPS

### 6a — HTTP (for Certbot)

```bash
sudo ./deploy/scripts/setup-nginx.sh
```

### 6b — Let's Encrypt SSL

```bash
sudo ./deploy/scripts/setup-ssl.sh
```

Certbot installs a certificate and reloads Nginx with the full HTTPS config.

Test renewal:

```bash
sudo certbot renew --dry-run
```

---

## Part 7 — Verify production

Open `https://YOUR_DOMAIN` in a browser.

| Check | URL |
|-------|-----|
| SPA | `https://DOMAIN/` |
| API health | `https://DOMAIN/api/` (Swagger blocked by Nginx) |
| Ready probe | `curl https://DOMAIN/api/` — use internal `health/ready` via localhost |
| Uploads | `https://DOMAIN/uploads/...` |

See [PRODUCTION_CHECKLIST.md](./PRODUCTION_CHECKLIST.md).

---

## Day-2 operations

| Task | Command |
|------|---------|
| Update app | `./deploy/scripts/update.sh` |
| Restart all | `./deploy/scripts/restart.sh` |
| Logs | `./deploy/scripts/logs.sh` or `./deploy/scripts/logs.sh api -f` |
| Backup DB + uploads | `./deploy/scripts/backup.sh` |
| Migrations | Automatic on API start; or `./deploy/scripts/migrate.sh` |

### Scheduled backups (cron)

```bash
crontab -e
```

```cron
0 3 * * * /opt/gym/deploy/scripts/backup.sh >> /var/log/gym-backup.log 2>&1
```

---

## Architecture diagram

```text
Internet
   │
   ▼
[ Host Nginx :443 TLS ]
   │
   ├── /  ──────────────► 127.0.0.1:8080  (frontend container)
   ├── /api/  ──────────► 127.0.0.1:5104  (api container)
   ├── /uploads/  ─────► 127.0.0.1:5104
   └── /exercise-api/ ► 127.0.0.1:4300  (exercise-api container)
                              │
                    Docker network (gym_internal)
                              │
              ┌───────────────┼───────────────┐
              ▼               ▼               ▼
         sqlserver         redis          (volumes)
```

---

## Security summary

- Only ports **22**, **80**, **443** open on the firewall (UFW).
- App containers bind to **127.0.0.1** — not directly exposed.
- SQL Server and Redis have **no** public ports.
- JWT, DB password, and API keys live in `deploy/.env` only.
- Swagger disabled on public Nginx (`/swagger` → 404).
- fail2ban watches SSH and Nginx rate-limit errors.

---

## Troubleshooting

### API container keeps restarting

```bash
./deploy/scripts/logs.sh api
```

Common causes: wrong `MSSQL_SA_PASSWORD`, SQL not healthy yet, weak `JWT_SECRET_KEY` (< 32 chars).

### SQL Server health check fails

Some images use `/opt/mssql-tools/bin/sqlcmd` instead of `mssql-tools18`. Edit `deploy/docker-compose.yml` healthcheck path or wait longer (`start_period`).

### 502 Bad Gateway from Nginx

```bash
docker ps
curl http://127.0.0.1:8080/health
curl http://127.0.0.1:5104/health/live
sudo nginx -t
```

### CORS errors in browser

Production should use **same origin** (`VITE_API_URL=/api`). If you use a separate API subdomain, add it to `Cors__AllowedOrigins__0` in `deploy/.env` and rebuild the API container.

### Out of memory

- Lower `MSSQL_MEMORY_LIMIT_MB` to `1024`
- Set `REDIS_MAXMEMORY=64mb`
- Remove exercise API from compose if unused (comment service + rebuild frontend without exercise routes)

### Certbot fails

- Confirm DNS points to this server
- Port 80 reachable: `sudo ufw allow 'Nginx Full'`
- Use HTTP-only config: `setup-nginx.sh` before `setup-ssl.sh`

### Restore database from backup

```bash
docker cp deploy/backups/TIMESTAMP/database.bak gym-sqlserver:/var/opt/mssql/data/restore.bak
docker exec -it gym-sqlserver /opt/mssql-tools18/bin/sqlcmd -S localhost -U sa -P 'PASSWORD' -C -Q "
  ALTER DATABASE GymManagementDb SET SINGLE_USER WITH ROLLBACK IMMEDIATE;
  RESTORE DATABASE GymManagementDb FROM DISK = N'/var/opt/mssql/data/restore.bak' WITH REPLACE;
  ALTER DATABASE GymManagementDb SET MULTI_USER;
"
```

---

## Optional: disable exercise API

If you do not need workout studio / AI features, remove the `exercise-api` service from `deploy/docker-compose.yml` and set frontend build arg `VITE_EXERCISE_API_URL` to a stub or remove those UI modules.

---

## Build commands reference (local development)

| App | Command |
|-----|---------|
| Frontend | `cd gym_client && npm ci && npm run build` |
| API | `cd src/GymManagement.API && dotnet publish -c Release` |
| Exercise API | `cd exercise_management_api && npm ci && npm run build` |

---

## Files created by this deployment pack

- `deploy/docker-compose.yml` — orchestration
- `deploy/docker/api/Dockerfile` — multi-stage .NET 9 Alpine
- `deploy/docker/frontend/Dockerfile` — Vite build + Nginx
- `deploy/docker/exercise-api/Dockerfile` — Node production image
- `deploy/nginx/*.template` — host reverse proxy
- `deploy/scripts/*.sh` — deploy, update, backup, SSL, bootstrap
- `deploy/.env.production.example` — safe template
- `src/GymManagement.API/appsettings.Production.json` — production defaults

**PM2 is not used** — Docker `restart: unless-stopped` and `systemctl enable docker` handle process lifecycle after reboot.
