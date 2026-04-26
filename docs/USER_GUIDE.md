# Gym Management Application - User Guide

## 1) Overview

This guide explains how to use the Gym Management application from login to daily operations, including members, memberships, payments, invoices, trainers, body metrics, and security.

Use this guide for onboarding staff, admins, and front-desk operators.

---

## 2) Getting Started

### 2.1 Login

1. Open the application URL in your browser.
2. Enter your **Username or email** and **Password**.
3. Click **Sign in**.
4. After successful login, you are redirected to the **Dashboard**.

PulseFit login screen with username and password fields

### 2.2 Session behavior

- If your session is near expiry, you may see a warning in the top navbar.
- If session expires, you are redirected to login.
- Login page can show session expiry message automatically.

---

## 3) Dashboard Walkthrough

The dashboard provides:

- Quick metric cards (high-level KPIs)
- Charts and trend sections
- Notification center (expiring memberships, payment failures, attendance anomalies)
- Security card (for users with required permission)
- Quick navigation from sidebar

PulseFit dashboard with KPI cards, charts, and notification center

---

## 4) Core Modules (Start to End Flow)

## 4.1 Members (Users)

Path: `Dashboard -> Users`

Typical actions:

- Add new member
- Edit member details
- View full profile
- Manage body metrics and media

Recommended process:

1. Create member profile.
2. Verify contact details.
3. Assign membership plan.
4. Record first body metrics entry.

## 4.2 Membership Plans

Path: `Dashboard -> Membership Plans`

Use this to:

- Create plan name, duration (days), and price
- Update pricing/duration
- Deactivate/delete old plans (based on policy)

## 4.3 User Memberships

Path: `Dashboard -> User Memberships`

Use this to:

- Assign a plan to a user
- Set start/end date
- Track status (Active/Expired/etc.)

## 4.4 Payments and Invoices

Path: `Dashboard -> Payments`

Use this to:

- Add payment for a membership
- Capture payment mode (Cash/UPI/Card)
- Generate or open linked invoice
- Download PDF invoice/receipt
- Export payment data by date range (CSV/XLS)

Typical payment workflow:

1. Click **+ Add payment**.
2. Select membership.
3. Confirm auto-filled amount (from plan) or adjust if editing.
4. Select payment date and mode.
5. Save payment.
6. Open **Invoice** button from payment row.
7. Download PDF when needed.

Payments page with invoice modal open and Download PDF button

## 4.5 Trainer Management

Path: `Dashboard -> Trainers`

Use this to:

- Create/update trainer profiles
- Track capacity (`max active clients`)
- Support assignment recommendations and conflict visibility

## 4.6 Workout Plans

Path: `Dashboard -> Training -> Workout Plans`

Use this to:

- Build reusable workout plans with duration, difficulty, and targeted body parts
- Attach exercises (sets x reps) to a plan
- Assign plans to clients and iterate based on body-metrics progress

Workout plans catalog with plan detail and exercises

## 4.7 Diet Plans

Path: `Dashboard -> Diet Plans`

Use this to:

- Create diet plans with daily meal schedule and macro targets (Protein / Carbs / Fat)
- Assign plans to clients aligned with their goals (Cutting / Lean Bulk / Maintenance)
- Adjust plans based on body-metric trends

Diet plans catalog with macro rings and plan detail

## 4.8 Body Metrics (CRUD)

Path: `Dashboard -> Users -> [Select User] -> Body Metrics`

Supported actions:

- **Create:** Log a new metrics entry
- **Read:** View current snapshot and history
- **Update:** Edit an existing reading
- **Delete:** Remove an entry (with audit behavior)

Common fields:

- Measurement date
- Weight, height, BMI (computed)
- Body fat, muscle mass
- Circumference measurements (waist/chest/hips/etc.)
- Notes

User detail Body Metrics tab with snapshot cards and history table

## 4.9 Roles and Permissions

Path: `Dashboard -> Roles`

Use this to:

- Control which users can access features (Payments, Reports, Security, etc.)
- Enforce least-privilege access for staff
- Attach permission codes (Reports, Config, Payments, TrainerAccess, UsersAccess, Members.Create, Members.Manage)

Permissions are enforced on both the UI (via `PermissionGate`) and the API. If a staff member cannot see a feature, grant them the matching permission code here.

Roles and permissions page with role list and permission matrix

## 4.10 Security

Path: `Dashboard -> Security` (permission-based visibility)

Use this to:

- Monitor compromised refresh-token sessions
- Filter suspicious events
- Export data (CSV)
- Copy permission/user code references

Security page showing compromised sessions table with filters and export

---

## 5) Reporting and Export

The application supports date-range reporting and export:

- Revenue trends
- Plan sales
- Churn
- Attendance trends
- Payment exports

Formats:

- CSV
- XLS (Excel-compatible)

Where to export:

- Dashboard export actions
- Payments module export actions

---

## 6) Recommended Daily Operational Checklist

1. Check Dashboard alerts and notifications.
2. Review expiring memberships.
3. Record day payments and verify invoice generation.
4. Handle attendance anomalies and corrections.
5. Update body metrics for scheduled assessments.
6. Review security incidents (if authorized).
7. Export end-of-day payments/report file for records.

---

## 7) Common Issues and Quick Fixes

- **Cannot login:** Verify credentials and backend availability.
- **Session expired quickly:** Re-login and confirm system time sync.
- **Invoice not visible for payment:** Use **Generate** from payment row, then open **Invoice**.
- **No access to menu/page:** Role may not have required permission code.
- **Exports not downloading:** Check popup/download permissions in browser.

---

## 8) Admin Setup Checklist (First-Time Deployment)

1. Create/update membership plans.
2. Configure user roles and permissions.
3. Create staff users.
4. Verify payment and invoice flow with one test transaction.
5. Verify report export (CSV/XLS).
6. Verify security page visibility for authorized roles only.

---

## 9) Screenshots included in this guide

All illustrative screenshots live in `docs/images/`:

- `user-guide-login.png`
- `user-guide-dashboard.png`
- `user-guide-payments-invoice.png`
- `user-guide-workout-plans.png`
- `user-guide-diet-plans.png`
- `user-guide-body-metrics.png`
- `user-guide-roles.png`
- `user-guide-security.png`

