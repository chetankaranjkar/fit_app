# PulseFit Member Mobile App (Flutter)

Customer-facing Flutter app for gym members (iOS-first Cupertino UI).

## Run

```bash
cd "mobile app"
flutter pub get
flutter run
```

**Physical device / VPS testing** — point at your API:

```bash
flutter run --dart-define=API_BASE_URL=http://187.127.169.135
```

Rebuild the APK after changing the URL:

```bash
flutter build apk --release --dart-define=API_BASE_URL=http://187.127.169.135
```

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
7. **QR check-in** — Home → scan; test near branch GPS. Expect clear messages for rate limit, replay, distance, and session errors.

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
