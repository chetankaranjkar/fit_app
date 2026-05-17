# Auto-deploy to Hostinger (GitHub Actions)

Pushes to **`main`** run CI first; when CI succeeds, the **Deploy to Hostinger** workflow SSHs into your VPS and runs `deploy/scripts/update.sh` (pull + Docker rebuild).

Manual deploy: **Actions → Deploy to Hostinger → Run workflow**.

Production URL (testing): [http://187.127.169.135/](http://187.127.169.135/)

---

## 1. One-time: deploy key on the VPS

On your PC:

```powershell
ssh-keygen -t ed25519 -f $env:USERPROFILE\.ssh\gym_hostinger_deploy -N '""'
```

Copy the **public** key to the server (replace user/host if needed):

```powershell
type $env:USERPROFILE\.ssh\gym_hostinger_deploy.pub | ssh root@187.127.169.135 "mkdir -p ~/.ssh && chmod 700 ~/.ssh && cat >> ~/.ssh/authorized_keys && chmod 600 ~/.ssh/authorized_keys"
```

Test login:

```powershell
ssh -i $env:USERPROFILE\.ssh\gym_hostinger_deploy root@187.127.169.135 "cd /opt/gym && git status"
```

Use `gymdeploy` instead of `root` if that is your deploy user.

---

## 2. GitHub repository secrets

Open: **GitHub repo → Settings → Secrets and variables → Actions → New repository secret**

| Secret | Value | Required |
|--------|--------|----------|
| `HOSTINGER_SSH_HOST` | `187.127.169.135` | Yes |
| `HOSTINGER_SSH_USER` | `root` or `gymdeploy` | Yes |
| `HOSTINGER_SSH_KEY` | Full private key (`gym_hostinger_deploy`, including `BEGIN`/`END` lines) | Yes |
| `HOSTINGER_SSH_PORT` | `22` (only if non-default) | No |
| `HOSTINGER_DEPLOY_PATH` | `/opt/gym` (only if clone is elsewhere) | No |
| `HOSTINGER_HEALTH_URL` | `http://187.127.169.135/api/health/ready` | No |

---

## 3. GitHub Environment (optional)

The workflow uses environment **`production`**. You can add approval rules:

**Settings → Environments → production → Required reviewers**

If you do not want that, delete the `environment: production` line in `.github/workflows/deploy-hostinger.yml`.

---

## 4. First deploy on the server

The VPS must be a **git clone** (not an FTP upload). For a full wipe and reinstall see **[HOSTINGER-FRESH-START.md](./HOSTINGER-FRESH-START.md)**.

Otherwise configure `deploy/.env` (see [DEPLOYMENT-TESTING.md](./DEPLOYMENT-TESTING.md)):

```bash
cd /opt/gym
git remote -v   # must point to this GitHub repo
./deploy/scripts/deploy.sh   # first time only
```

After secrets are set, push to `main` or run the workflow manually.

---

## 5. Verify

- **Actions** tab: green **CI**, then green **Deploy to Hostinger**
- Browser: [http://187.127.169.135/](http://187.127.169.135/)
- API: `curl http://187.127.169.135/api/health/ready`

---

## Troubleshooting

| Issue | Fix |
|-------|-----|
| SSH permission denied | Check `HOSTINGER_SSH_KEY` and `authorized_keys` on VPS |
| `git pull` fails | On VPS: `cd /opt/gym && git remote set-url origin https://github.com/chetankaranjkar/fit_app.git` |
| Health check fails | `./deploy/scripts/logs.sh api` on VPS; wait for SQL Server to start |
| Deploy skipped | CI failed on `main` — fix tests or use **Run workflow** manually |
