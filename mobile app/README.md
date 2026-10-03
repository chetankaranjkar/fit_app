# PulseFit Member Mobile App (Flutter)

Customer-facing Flutter app for gym members (iOS-first Cupertino UI).

## Run locally

```bash
cd "mobile app"
flutter pub get
flutter analyze
flutter test
flutter run
```

`pubspec.yaml` requires Dart `>=3.3.0`. CI and the APK workflow pin **Flutter 3.41.9** (matches `pubspec.lock` `flutter: ">=3.41.0"`).

## API URL (`API_BASE_URL`)

Compile-time host for the gym API. **No `/api` suffix** (the client appends `/api`). Override with `--dart-define`.

| Environment | URL |
|-------------|-----|
| **Production** | `https://tigerfitness.tech` |
| **UAT** | `https://uat.tigerfitness.tech` |
| App default (no dart-define) | `https://tigerfitness.tech` (see `lib/core/app_config.dart`) |

Production and UAT are **HTTPS** via Hostinger / Nginx (see [docs/RELEASE_PROCESS.md](../docs/RELEASE_PROCESS.md)). Do not bake `http://` production hosts into store/release APKs.

**UAT / production device:**

```bash
flutter run --dart-define=API_BASE_URL=https://uat.tigerfitness.tech
flutter build apk --dart-define=API_BASE_URL=https://tigerfitness.tech
```

`flutter build apk` (no `--release`) produces a **debug** APK signed with the Android **debug** keystore — fine for internal testing.

**Physical phone → local API on your PC (HTTP is OK for development):**

```bash
flutter run --dart-define=API_BASE_URL=http://192.168.x.x:5104
```

**Android emulator → PC localhost:** `http://10.0.2.2:5104`

Do **not** use `:5104` against the VPS unless that port is exposed. The hosted stack serves the API on **443** (HTTPS) through the gateway.

The login screen shows the API URL the binary was built with. Rebuild after changing `API_BASE_URL`.

**Test API:**

```bash
curl -s https://tigerfitness.tech/api/Auth/login -H "Content-Type: application/json" -d "{\"username\":\"admin@gym.com\",\"password\":\"admin123\",\"email\":\"admin@gym.com\"}"
```

Use a **member** account on mobile (not admin). Create a member in the web app first.

## Android signing

| Build | Signing |
|-------|---------|
| **debug / profile** (`flutter run`, `flutter build apk`) | Android debug keystore |
| **release** (`flutter build apk --release`) | **Required** `mobile app/android/key.properties` + upload `.jks`. **Fails closed** if missing — no silent debug-keystore fallback |

Do **not** commit `key.properties`, `*.jks`, or `*.keystore` (gitignored).

Local `key.properties` (paths relative to `mobile app/android/`):

```properties
storePassword=...
keyPassword=...
keyAlias=upload
storeFile=upload-keystore.jks
```

### GitHub Actions (manual APK workflow)

Workflow: **Mobile app — Android APK** (`.github/workflows/mobile-app-android-apk.yml`).

1. **development** — debug APK, debug signing. Default API URL `https://uat.tigerfitness.tech`. HTTP LAN/emulator URLs are allowed.
2. **production** — release APK. Fails if `api_base_url` is empty or not `https://…`, or if any signing secret is missing.

Repo **Actions secrets** (never commit these):

| Secret | Purpose |
|--------|---------|
| `ANDROID_KEYSTORE_BASE64` | Base64 of the upload `.jks` (`base64 -w0 upload-keystore.jks`) |
| `ANDROID_KEYSTORE_PASSWORD` | Keystore password |
| `ANDROID_KEY_ALIAS` | Key alias |
| `ANDROID_KEY_PASSWORD` | Key password |

iOS code signing is **not** configured in CI.

## Member test account workflow (E2E)

Use this checklist to verify Phase 2 flows on a real phone or emulator.

1. **Admin (web)** — Sign in as admin at `/login` (`admin@gym.com` / change default password on VPS).
2. **Create member** — Dashboard → Members → add user with role **Member** and active membership plan.
3. **Assign workout** — Training → Workout Assignments (or User detail) → assign an active **Workout plan** to that member with schedule days.
4. **Assign diet (optional)** — Diet → Assign to Users → assign an active diet plan to the member.
5. **Mobile login** — Install APK or `flutter run` with `API_BASE_URL` pointing at the same API as web.
6. **Verify tabs**
   - **Workouts** — Only assigned plans appear (not every plan in the gym).
   - **Diet** — Assigned plan with meals, or empty state if none.
   - **Progress** — Attendance / weight when data exists.
   - **Home** — Membership card → opens full-screen membership details.
7. **QR check-in** — Home → scan (disabled offline). Device checklist (camera, location while using, GPS off, too far, duplicate, rate limit, expired membership, success) is in `docs/knowledge-base/APPLICATION_FLOWS.md` §12b. Automated: `test/qr_check_in_test.dart`.

## API endpoints used

| Feature | Endpoint |
|---------|----------|
| Dashboard | `GET /api/me/dashboard` |
| Workouts (assigned only) | `GET /api/me/workout-plans` |
| Diet | `GET /api/me/diet-plan` |
| QR scan | `POST /api/Attendance/scan` |
| Token refresh | `POST /api/Auth/refresh` |

## Notes

- Bottom nav: Home, Workouts, Diet, Progress, Profile. Membership opens from the home card (`/membership`).
- Session refresh: on `401`, the app retries once with the refresh token before signing out.
- Pull request CI (`.github/workflows/ci.yml`) runs `flutter analyze` and `flutter test` in `mobile app/`.
