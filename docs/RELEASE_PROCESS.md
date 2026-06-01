# Release process — UAT first, then production

Standard workflow for **Tiger Fitness** gym management: develop and verify on **UAT**, then promote to **production**.

| Environment | Branch | Public URL | VPS path (example) |
|---------------|--------|------------|---------------------|
| **UAT** | `uat` | https://uat.tigerfitness.tech | `/opt/gym_uat/fit_app` |
| **Production** | `main` | https://tigerfitness.tech | `/opt/gym` (or your existing prod clone) |

UAT and production use **separate** Docker stacks, env files, databases, and JWT secrets. See [deploy/DEPLOYMENT-UAT.md](../deploy/DEPLOYMENT-UAT.md) for first-time UAT setup.

---

## Principles

1. **Nothing goes to production without passing UAT** (except documented emergencies).
2. **Default merge direction:** `uat` → `main` (not the other way around for releases).
3. **Never commit** `deploy/.env` or `deploy/.env.uat` — only copy from `*.example` on each server.
4. **Database:** UAT uses volume `gym_uat_sqlserver_data` and optional DB name `GymManagementDb_UAT`. Production data is never overwritten by UAT deploys.

---

## Normal feature release

### 1. Develop locally

```bash
git checkout uat
git pull origin uat
```

Optional: use a short-lived branch off `uat`:

```bash
git checkout -b feature/short-description uat
# … edit, commit …
git push -u origin feature/short-description
# Merge to uat via GitHub PR or locally:
git checkout uat && git merge feature/short-description && git push origin uat
```

Run locally before pushing:

- API: `src/GymManagement.API`
- Client: `gym_client/` — `npm run dev`
- Migrations (if any):  
  `dotnet ef database update --project src/GymManagement.Infrastructure --startup-project src/GymManagement.API`

### 2. Push to `uat`

```bash
git add .
git commit -m "feat: clear description of the change"
git push origin uat
```

### 3. Deploy UAT (VPS)

```bash
ssh root@YOUR_VPS
cd /opt/gym_uat/fit_app
git pull origin uat
./deploy/scripts/update-uat.sh
```

First-time UAT on a server: follow [deploy/DEPLOYMENT-UAT.md](../deploy/DEPLOYMENT-UAT.md) (`deploy-uat.sh`, Nginx, SSL).

### 4. Test on UAT

Checklist (adjust per change):

- [ ] https://uat.tigerfitness.tech loads; login works
- [ ] Changed screens / APIs behave as expected
- [ ] No new errors in `docker logs gym-uat-api --tail 100`
- [ ] If DB migration: API becomes healthy (`curl -fsS http://127.0.0.1:5105/health/ready`)
- [ ] If Firebase OTP touched: test login on **uat.tigerfitness.tech** (domain authorized in Firebase Console)

### 5. Promote to `main`

After UAT sign-off:

```bash
git checkout main
git pull origin main
git merge uat
git push origin main
```

Prefer a **GitHub PR** `uat` → `main` for review and a clear audit trail.

### 6. Deploy production (VPS)

```bash
cd /opt/gym    # production clone — adjust path if different
git pull origin main
./deploy/scripts/update.sh
```

Full production deploy guide: [deploy/DEPLOYMENT.md](../deploy/DEPLOYMENT.md).

### 7. Smoke-test production

- [ ] https://tigerfitness.tech — login and critical paths
- [ ] `docker logs gym-api --tail 50` — no startup/migration failures
- [ ] Payments / member flows if billing was changed

---

## Hotfix (production emergency)

When production is broken and waiting for a full UAT cycle is unsafe:

```bash
git checkout main
# minimal fix, commit
git push origin main
# deploy production immediately

git checkout uat
git merge main
git push origin uat
# deploy UAT so environments stay aligned
```

Document the incident and still run UAT regression when possible.

---

## What runs on each server

| Action | UAT | Production |
|--------|-----|------------|
| Pull branch | `git pull origin uat` | `git pull origin main` |
| Env file | `deploy/.env.uat` | `deploy/.env` |
| Deploy script | `./deploy/scripts/update-uat.sh` | `./deploy/scripts/update.sh` |
| Compose | `docker-compose.yml` + `docker-compose.uat.yml` | `docker-compose.yml` |
| Containers | `gym-uat-*` | `gym-*` |

---

## EF Core migrations

1. Add migration locally against a dev database.
2. Deploy **UAT** first — `DATABASE_AUTO_MIGRATE=true` in `deploy/.env.uat` applies migrations on API start.
3. Confirm UAT API healthy and schema correct.
4. Merge to `main` and deploy production (production `.env` controls `DATABASE_AUTO_MIGRATE`).

Never run production migrations manually against the UAT database or vice versa.

---

## Version tags (optional)

For major releases:

```bash
git checkout main
git tag -a v1.2.0 -m "Release 1.2.0"
git push origin v1.2.0
```

Tag **after** merge to `main`, from the commit that was deployed to production.

---

## Quick reference

```text
Local work → push uat → deploy /opt/gym_uat/fit_app → test uat.tigerfitness.tech
           → merge uat → main → deploy /opt/gym → test tigerfitness.tech
```

| Document | Purpose |
|----------|---------|
| [deploy/DEPLOYMENT-UAT.md](../deploy/DEPLOYMENT-UAT.md) | First UAT install, ports, SSL |
| [deploy/DEPLOYMENT.md](../deploy/DEPLOYMENT.md) | Production VPS, Nginx, SSL |
| [FIREBASE_OTP_PRODUCTION.md](./FIREBASE_OTP_PRODUCTION.md) | Firebase domains (add `uat.tigerfitness.tech` for UAT) |
| [AGENTS.md](../AGENTS.md) | Repo overview for developers and AI tools |

---

**Last updated:** 2026-06-01
