# UAT — https://uat.tigerfitness.tech

> **Release workflow (UAT → main):** [docs/RELEASE_PROCESS.md](../docs/RELEASE_PROCESS.md)

UAT runs as a **second Docker stack** on the same VPS as production, with **different host ports** and a **separate Nginx vhost** + SSL certificate.

| | Production | UAT |
|---|------------|-----|
| URL | `https://tigerfitness.tech` | `https://uat.tigerfitness.tech` |
| Compose project | `gym` | `gym-uat` |
| Frontend (localhost) | `8080` | `8081` |
| API (localhost) | `5104` | `5105` |
| Exercise API | `4300` | `4301` |
| SQL (optional host access) | `1433` | `1434` |
| Env file | `deploy/.env` | `deploy/.env.uat` |

Inside containers, ports stay the same (API `8080`, frontend `80`). Only **host bindings** differ.

## 1. DNS

Add an **A record**:

```text
uat.tigerfitness.tech  →  <same VPS public IP as tigerfitness.tech>
```

Wait until `dig uat.tigerfitness.tech` shows the correct IP.

## 2. Configure UAT env on the VPS

```bash
cd /opt/gym   # or your clone path
cp deploy/.env.uat.example deploy/.env.uat
nano deploy/.env.uat
```

Set at minimum:

- `MSSQL_SA_PASSWORD` — strong password (UAT-only)
- `JWT_SECRET_KEY` — **new** random key (`openssl rand -base64 48`), not production’s
- `CERTBOT_EMAIL` — for Let’s Encrypt
- `CORS_ORIGIN_0=https://uat.tigerfitness.tech`

## 3. Deploy UAT containers

```bash
chmod +x deploy/scripts/*.sh
./deploy/scripts/deploy-uat.sh
```

## 4. Nginx + HTTPS (once)

```bash
sudo ./deploy/scripts/setup-nginx-uat.sh
sudo ./deploy/scripts/setup-ssl-uat.sh
```

Open **https://uat.tigerfitness.tech/dashboard**

Production (`tigerfitness.tech`) is not modified except for an extra Nginx site `gym-uat`.

## 5. Updates from the `uat` branch

```bash
./deploy/scripts/update-uat.sh
```

Or manually:

```bash
git checkout uat && git pull
docker compose -f deploy/docker-compose.yml -f deploy/docker-compose.uat.yml \
  --env-file deploy/.env.uat up -d --build
```

## Firebase / phone OTP (optional)

If UAT uses Firebase login, add in [Firebase Console](https://console.firebase.google.com/) → Authentication → Settings → **Authorized domains**:

- `uat.tigerfitness.tech`

And allow the redirect origin in your OAuth / App Check settings if applicable.

## Troubleshooting

| Symptom | Check |
|---------|--------|
| 502 / blank page | `docker ps` includes `gym-uat-frontend`, `gym-uat-api`; `curl http://127.0.0.1:8081/health` |
| API CORS error | `CORS_ORIGIN_0` in `deploy/.env.uat` must be `https://uat.tigerfitness.tech` |
| SSL error | `sudo certbot certificates`; re-run `setup-ssl-uat.sh` |
| Wrong database | UAT uses volume `gym_uat_sqlserver_data`, not production’s |

```bash
docker logs gym-uat-api --tail 80
sudo nginx -t
curl -fsS http://127.0.0.1:5105/health/ready
```
