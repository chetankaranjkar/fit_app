# Firebase OTP login — production setup (customer-owned billing)

This guide is for **gym owners / customers** who deploy Tiger Fitness and want **Password | OTP** login on the web app.  
The customer creates their own Firebase project, attaches **their credit card (Blaze plan)**, and pays Google directly for SMS usage.

**No React code changes** are required for production OTP — only Firebase Console + server configuration + member phone numbers in the database.

---

## Overview

| Layer | Who configures | Who pays |
|-------|----------------|----------|
| Firebase project, Phone auth, SMS regions, Blaze billing | **Customer** (gym owner) | **Customer → Google** |
| API `Firebase` settings + service account file on VPS | **You / DevOps** | — |
| Member `Users.Phone` in gym database | **Gym admin** | — |

**Flow after setup:**

1. User opens `https://your-domain.com/login` → **OTP** tab  
2. Browser loads public config from `GET /api/Auth/firebase-config`  
3. Firebase sends SMS (customer’s Firebase bill)  
4. Browser sends Firebase ID token to `POST /api/Auth/firebase-login`  
5. API verifies token and returns normal gym JWT  

---

## Part 1 — Customer: create Firebase project (one time)

### Step 1.1 — Create project

1. Go to [Firebase Console](https://console.firebase.google.com)
2. **Add project** (e.g. `Tiger Fitness Production`)
3. Complete the wizard (Google Analytics optional)

### Step 1.2 — Register Web app

1. **Project settings** (gear) → **General**
2. Under **Your apps**, click **`</>` Web**
3. App nickname: e.g. `Tiger Fitness Web`
4. **Register app**
5. Copy the config block — you will need:

| Firebase field | Used in API as |
|----------------|----------------|
| `apiKey` | `Firebase:ApiKey` |
| `authDomain` | `Firebase:AuthDomain` |
| `projectId` | `Firebase:ProjectId` |
| `appId` | `Firebase:AppId` |
| `messagingSenderId` | `Firebase:MessagingSenderId` |

> Use the **Web** app (`appId` contains `:web:`), not Flutter/Android/iOS.

### Step 1.3 — Enable Authentication

1. **Build** → **Authentication**
2. If shown, click **Get started**
3. **Sign-in method** tab → **Phone** → **Enable** → **Save**

### Step 1.4 — SMS region policy (required for India)

1. **Authentication** → **Settings** tab  
2. Scroll to **SMS region policy**
3. Choose **Allowlist**
4. Add **India (IN)** (and any other countries you need)
5. **Save**

Without this, users see:  
`SMS unable to be sent until this region enabled by the app developer`

Reference: [SMS regions (Google Cloud)](https://cloud.google.com/identity-platform/docs/admin/sms-regions)

### Step 1.5 — Authorized domains

1. **Authentication** → **Settings** → **Authorized domains**
2. Add your production domains, for example:
   - `tigerfitness.tech`
   - `www.tigerfitness.tech`
3. `localhost` is usually present for local dev

### Step 1.6 — Blaze billing (customer pays Google)

Real SMS to non-test numbers requires the **Blaze (pay-as-you-go)** plan.

1. Firebase Console → **Upgrade** (or **Usage and billing**)
2. Customer links **their** payment method
3. Google bills the customer for SMS / Identity Platform usage

Typical costs depend on volume and region; customer manages budget alerts in Google Cloud Console.

> **Staging / UAT:** use **Phone numbers for testing** in Firebase (fixed OTP, no SMS charge) before go-live.

### Step 1.7 — Test phone numbers (optional, recommended before go-live)

1. **Authentication** → **Sign-in method** → **Phone**
2. **Phone numbers for testing**
3. Example: `+91 9876543210` → code `123456`
4. Remove test numbers before public launch if desired

### Step 1.8 — Service account key (server only — secret)

1. **Project settings** → **Service accounts**
2. **Generate new private key** → download JSON
3. Store securely — **never** commit to git or put in the React app

This file is used only by the **.NET API** to verify OTP tokens.

### Step 1.9 — API key restrictions (recommended)

1. [Google Cloud Console → Credentials](https://console.cloud.google.com/apis/credentials) (same project)
2. Open the **Browser API key** used by Firebase
3. **Application restrictions** → **HTTP referrers**, add:
   ```
   https://tigerfitness.tech/*
   https://www.tigerfitness.tech/*
   http://localhost:*
   ```
4. **API restrictions** → enable at least **Identity Toolkit API**
5. Save

---

## Part 2 — Deploy: configure the API on the VPS

Production uses `ASPNETCORE_ENVIRONMENT=Production`. OTP is **off** until you set `Firebase:Enabled=true` and provide the service account.

### Step 2.1 — Place service account on server

On the VPS (inside your deploy folder):

```bash
mkdir -p /opt/gym/deploy/secrets
chmod 700 /opt/gym/deploy/secrets
# Upload the JSON from Step 1.8 (SCP/SFTP — do not paste in chat)
nano /opt/gym/deploy/secrets/firebase-service-account.json
chmod 600 /opt/gym/deploy/secrets/firebase-service-account.json
```

### Step 2.2 — Add variables to `deploy/.env`

Edit `/opt/gym/deploy/.env` (copy from `deploy/.env.production.example` if needed):

```env
# --- Firebase OTP (customer project) ---
FIREBASE_ENABLED=true
FIREBASE_API_KEY=AIzaSy...
FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_APP_ID=1:123456789:web:abcdef
FIREBASE_MESSAGING_SENDER_ID=123456789012
FIREBASE_CREDENTIALS_PATH=firebase-service-account.json
```

Values come from **Step 1.2** (Web app config).

### Step 2.3 — Redeploy API

From `/opt/gym/deploy`:

```bash
docker compose up -d --build api
```

The compose file mounts `deploy/secrets/firebase-service-account.json` into the API container and passes `Firebase__*` environment variables.

**Mount the secret file** (only when OTP is enabled):

```bash
cd /opt/gym/deploy
cp docker-compose.firebase-otp.example.yml docker-compose.override.yml
docker compose up -d --build api
```

Or add this volume under `api` in `docker-compose.yml`:

```yaml
- ./secrets/firebase-service-account.json:/app/firebase-service-account.json:ro
```

### Step 2.4 — Verify API

```bash
curl -s https://tigerfitness.tech/api/Auth/firebase-config | jq
```

Expected:

```json
{
  "enabled": true,
  "apiKey": "AIzaSy...",
  "authDomain": "your-project.firebaseapp.com",
  "projectId": "your-project-id",
  "appId": "1:...:web:...",
  "messagingSenderId": "..."
}
```

If `"enabled": false`:

- Check `FIREBASE_ENABLED=true` in `.env`
- Check service account file exists and is mounted
- Check API logs: `docker compose logs api --tail 100`

---

## Part 3 — Verify web login

1. Open `https://tigerfitness.tech/login`
2. You should see tabs: **Password | OTP**
3. Enter a mobile number that exists on a user’s **gym profile** (`Users.Phone`)
4. Complete OTP → redirect to dashboard

**Diagnostics panel** is off in production by default. To enable temporarily:

```env
# gym_client build-time only — rebuild frontend
VITE_FIREBASE_DEBUG=true
```

---

## Part 4 — Gym data (admin)

OTP links Firebase phone → **`Users.Phone`** in SQL Server.

| Rule | Example |
|------|---------|
| Profile phone must match login number | Profile: `8087441424`, OTP: same or `+918087441424` |
| Admin/staff/trainers/members | All need phone on **Users** record |
| New members | Collect phone at registration |

If OTP succeeds in Firebase but login fails with “No gym account linked to this phone”, fix the phone on the user profile in the admin dashboard.

---

## Part 5 — Go-live checklist

### Customer (Firebase + billing)

- [ ] Firebase project created
- [ ] **Web** app registered (`:web:` in App ID)
- [ ] Authentication → **Phone** enabled
- [ ] **SMS region policy** → Allowlist → **India (IN)** added
- [ ] **Authorized domains** → production domain(s)
- [ ] **Blaze** billing enabled (customer payment method)
- [ ] Service account JSON downloaded (stored securely)
- [ ] API key HTTP referrers restricted to production domain
- [ ] Test numbers removed or limited for production (optional)

### Server (VPS)

- [ ] `deploy/secrets/firebase-service-account.json` on server (mode 600)
- [ ] `FIREBASE_*` variables in `deploy/.env`
- [ ] `FIREBASE_ENABLED=true`
- [ ] API redeployed
- [ ] `GET /api/Auth/firebase-config` → `"enabled": true`
- [ ] Login page shows **OTP** tab over HTTPS

### Gym operations

- [ ] Member/staff phones correct in database
- [ ] Support process if user changes phone number
- [ ] Customer understands Google SMS charges on Blaze plan

---

## Part 6 — Troubleshooting

| Symptom | Likely cause | Fix |
|---------|--------------|-----|
| No OTP tab on login | API `enabled: false` | Step 2.2–2.4 |
| `region enabled by the app developer` | India not allowlisted | Step 1.4 |
| `auth/unauthorized-domain` | Domain missing in Firebase | Step 1.5 |
| `auth/network-request-failed` | Ad blocker / API key referrers | Step 1.9, disable extensions |
| OTP OK, gym login 401 | Phone not on `Users.Phone` | Step 4 |
| `auth/billing-not-enabled` | No Blaze plan | Step 1.6 |
| Works on localhost, not production | Production domain / `.env` | Steps 1.5, 2.2 |

Check API logs:

```bash
cd /opt/gym/deploy && docker compose logs api --tail 200
```

---

## Part 7 — Security notes

- **Never** commit `firebase-service-account.json` to git  
- **Never** put the service account JSON in `gym_client` or any browser bundle  
- Public Firebase web keys (`ApiKey`, `AppId`) are safe in `/api/Auth/firebase-config`  
- Rotate service account keys if leaked  
- Use Firebase budget alerts in Google Cloud for the customer  

---

## Part 8 — Local development (reference)

Developers use `src/GymManagement.API/appsettings.Development.json`:

```json
"Firebase": {
  "Enabled": true,
  "ApiKey": "...",
  "AuthDomain": "...",
  "ProjectId": "...",
  "AppId": "...",
  "MessagingSenderId": "...",
  "CredentialsPath": "firebase-service-account.json"
}
```

Place `firebase-service-account.json` next to the API project locally (gitignored).

---

## Related files in this repo

| File | Purpose |
|------|---------|
| `deploy/.env.production.example` | Template `FIREBASE_*` variables |
| `deploy/docker-compose.yml` | `Firebase__*` env vars to API |
| `deploy/docker-compose.firebase-otp.example.yml` | Optional volume mount for service account |
| `src/GymManagement.API/appsettings.json` | Default `Firebase:Enabled: false` |
| `gym_client/.env.example` | Optional `VITE_FIREBASE_DEBUG` |
| `docs/knowledge-base/APPLICATION_FLOWS.md` | OTP flow summary |

---

## Support handoff text (for customer)

> OTP login uses **your** Firebase project. You pay Google directly for SMS on the Blaze plan. We configure the server to use your Web app keys and service account. Ensure Phone auth is enabled, India is allowlisted in SMS regions, and your domain is authorized. Member mobile numbers must match profiles in the gym system.
