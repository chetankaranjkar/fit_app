/*
  TrackFlow seed — Gym Management (TigerFitness)
  Source: docs/knowledge-base/APPLICATION_FLOWS.md, PRODUCT_BACKLOG.md
  Idempotent: safe to re-run (skips existing rows by Code/Name)
*/
SET NOCOUNT ON;
SET QUOTED_IDENTIFIER ON;
SET ANSI_NULLS ON;

DECLARE @TenantId   uniqueidentifier = '671D3189-8279-4A43-83B3-C4810BBA839E';
DECLARE @ProjectId  uniqueidentifier = '49F7F932-5139-42AD-9664-ECAA30302CA8';
DECLARE @CreatedBy  uniqueidentifier = 'D46A2A70-D0CE-4F1A-B373-3A0DD3633681';
DECLARE @Now        datetimeoffset   = SYSUTCDATETIME();

-- ── Project metadata ─────────────────────────────────────────────
UPDATE Projects SET
  Name = N'TigerFitness Gym Management',
  Description = N'Full-stack gym ops: ASP.NET Core 9 API + React web dashboard + Flutter mobile (PulseFit). SQL Server GymManagementDb. Covers members, trainers, staff, memberships, billing, QR attendance, workouts, diet, notifications, and front-desk workflows.',
  ModifiedDate = @Now
WHERE Id = @ProjectId;

-- ── New business modules (sort 16+) ──────────────────────────────
DECLARE @mods TABLE (Id uniqueidentifier, Code nvarchar(50), Name nvarchar(200), SortOrder int, Description nvarchar(max));
INSERT INTO @mods VALUES
 ('A1000001-0001-4000-8000-000000000001', N'TRAINER',      N'Trainer Management',      16, N'Coach profiles, clients, schedules, employee codes TRN-{year}-{seq}. APIs /api/Trainers.'),
 ('A1000001-0001-4000-8000-000000000002', N'STAFF',        N'Staff Management',        17, N'Front-desk and ops staff profiles. APIs /api/Staff.'),
 ('A1000001-0001-4000-8000-000000000003', N'ACCESS',       N'Access & QR',             18, N'Branch QR, geo check-in, membership gate, owner door device. POST /api/Attendance/scan.'),
 ('A1000001-0001-4000-8000-000000000004', N'HEALTH',       N'Health Profile',          19, N'Medical screening, risk level, injuries, emergency contacts. /api/HealthProfile.'),
 ('A1000001-0001-4000-8000-000000000005', N'SUPPLEMENTS',  N'Supplement Tracking',     20, N'Catalog + member supplement assignments. /api/SupplementMaster, /api/MemberSupplements.'),
 ('A1000001-0001-4000-8000-000000000006', N'PT',           N'Personal Training',       21, N'PT packages and sessions. See docs/PT_MODULE.md.'),
 ('A1000001-0001-4000-8000-000000000007', N'MOBILE',       N'Mobile App (PulseFit)',   22, N'Flutter member app: home, QR, workouts, progress, notifications, device security.'),
 ('A1000001-0001-4000-8000-000000000008', N'FRONT_DESK',   N'Front Desk',              23, N'Staff/receptionist focused sidebar, renewal queue, quick check-in. §12c APPLICATION_FLOWS.'),
 ('A1000001-0001-4000-8000-000000000009', N'LEADS',        N'Lead CRM',                24, N'Lead capture and trainer CRM. Permission LEADS_CRM / LEADS_TRAINER.'),
 ('A1000001-0001-4000-8000-00000000000A', N'SECURITY',     N'Device & Session Security',25, N'Max 3 devices, session revoke, login history. UserDevices, UserSessions.');

INSERT INTO BusinessModules (Id, TenantId, Code, Name, Description, Status, CreatedDate, CreatedBy, IsDeleted, ProjectId, SortOrder)
SELECT m.Id, @TenantId, m.Code, m.Name, m.Description, 1, @Now, @CreatedBy, 0, @ProjectId, m.SortOrder
FROM @mods m
WHERE NOT EXISTS (SELECT 1 FROM BusinessModules x WHERE x.Code = m.Code AND x.ProjectId = @ProjectId);

-- ── Functionalities helper ───────────────────────────────────────
DECLARE @funcs TABLE (ModuleCode nvarchar(50), Name nvarchar(200), Description nvarchar(max), Priority int);
INSERT INTO @funcs (ModuleCode, Name, Description, Priority) VALUES
-- AUTH (enrich)
(N'AUTH', N'OTP Login (Firebase)', N'Password | OTP tabs when Firebase enabled. POST /api/Auth/firebase-login.', 1),
(N'AUTH', N'Change Password', N'Self-service POST /api/Auth/change-password. Web /dashboard/profile, mobile Security.', 2),
(N'AUTH', N'JWT Refresh', N'Access token 480 min, refresh 90 days dev. Web warns 2 min before expiry.', 2),
-- USER (enrich)
(N'USER', N'Coach Assignment', N'PUT /api/Users/{id} trainerId → UserInstructors (not Trainer role).', 1),
(N'USER', N'Aadhaar Capture', N'Optional 12-digit unique ID; masked for non-admin; audit log.', 3),
(N'USER', N'Phone Validation', N'Indian mobile ^[6-9][0-9]{9}$; unique index IX_Users_MobileNumber.', 1),
(N'USER', N'Profile Photo Upload', N'ProfilePhotoEditor + POST /api/FileUpload/profile/user/{userId}.', 2),
(N'USER', N'User Provisioning', N'UserProvisioningService syncs Roles, Members, Trainer, Staff profiles.', 1),
-- MEMBERSHIP (enrich)
(N'MEMBERSHIP', N'One Occupying Membership Rule', N'Only one Active/ActivePendingPayment/PartialPayment/Frozen/Pending/VoidPending per member. 409 ACTIVE_MEMBERSHIP_EXISTS.', 1),
(N'MEMBERSHIP', N'Membership Void Approval', N'Staff request void → VoidPending → admin approve → Voided. No physical delete.', 1),
(N'MEMBERSHIP', N'Renewal Queue', N'GET /api/UserMemberships/expiring-queue?withinDays=14 on staff dashboard.', 1),
(N'MEMBERSHIP', N'Expiry In-App Notifications', N'14/7/3/1/0 day milestones → Notifications table membership_expiring.', 1),
(N'MEMBERSHIP', N'Expiry Webhook Reminders', N'Email/WhatsApp webhooks via MembershipExpiryWebhookReminderService.', 2),
(N'MEMBERSHIP', N'Membership Audit Log', N'membership_audit_logs; VIEW_MEMBERSHIP_AUDIT permission.', 2),
-- ATTENDANCE (enrich)
(N'ATTENDANCE', N'QR Membership Gate', N'Block check-in when expired; exempt ADMIN/TRAINER/STAFF/RECEPTIONIST/ACCOUNTANT.', 1),
(N'ATTENDANCE', N'Geo-Fenced Scan', N'Location validation before attendance log insert.', 2),
(N'ATTENDANCE', N'Duplicate Scan Prevention', N'Reject repeat scan within cooldown window.', 2),
(N'ATTENDANCE', N'Attendance Reports', N'Logs + staff scan page /dashboard/access/scan.', 2),
-- WORKOUT MANAGEMENT
(N'WORKOUT MANAGEMENT', N'Workout Plan Library', N'Program templates on WorkoutPlans; staff training module.', 1),
(N'WORKOUT MANAGEMENT', N'Live Workout Tracking', N'Start/log-set/complete session. POST /api/workout/*.', 1),
(N'WORKOUT MANAGEMENT', N'Personal Workout Plans', N'Member-owned PlanType=Personal; one per member; audit logs.', 1),
(N'WORKOUT MANAGEMENT', N'Workout Plan Audit', N'Admin viewer GET /api/workout-plan-audit; VIEW_WORKOUT_PLAN_AUDIT.', 2),
(N'WORKOUT MANAGEMENT', N'Trainer Member Timeline', N'GET /api/workout/trainer/members/{memberId}/timeline.', 2),
(N'WORKOUT MANAGEMENT', N'Admin Workout Monitoring', N'GET /api/workout/admin/monitoring.', 3),
(N'WORKOUT MANAGEMENT', N'Offline Mobile Sync', N'Hive queue, 60s sync, SessionRecoveryService in Flutter.', 2),
-- BILLING (enrich)
(N'BILLING', N'Collect Installment', N'/dashboard/payments/collect?membershipId=; membership_payments.', 1),
(N'BILLING', N'Waive-Off Requests', N'Net Payable = Fee − Coupon − Waive-Off; admin approval.', 1),
(N'BILLING', N'Void/Refund Payment', N'VOID_PAYMENT, REFUND_PAYMENT permissions; financial_audit_logs.', 1),
(N'BILLING', N'Financial Reports CSV', N'/dashboard/payments/reports collection, outstanding, coupon.', 2),
(N'BILLING', N'Membership Payment Ledger', N'User detail Payment History tab; membership_payment_transactions.', 2),
-- REPORTS (enrich)
(N'REPORTS', N'Dashboard KPIs', N'Active members, revenue; excludes voided memberships.', 1),
(N'REPORTS', N'Financial Audit Log', N'VIEW_FINANCIAL_AUDIT permission.', 2),
(N'REPORTS', N'Device Security Analytics', N'GET /api/admin/device-security/analytics.', 3),
(N'REPORTS', N'Supplement Analytics', N'GET /api/MemberSupplements/analytics.', 3),
-- SETTINGS (enrich)
(N'SETTINGS', N'Role Permissions UI', N'/dashboard/roles — Role permissions + User roles tabs.', 1),
(N'SETTINGS', N'Gym Settings', N'AllowMemberWorkoutPlanCreation, MaxPersonalWorkoutPlansPerMember.', 2),
(N'SETTINGS', N'Branch Management', N'Branches, owner QR, door device under Access.', 2),
-- DIET MANAGEMENT
(N'DIET MANAGEMENT', N'Diet Plan Catalog', N'Create diet plans; assign to users from user detail.', 1),
(N'DIET MANAGEMENT', N'Assign Diet to Member', N'Staff assigns diet plan; member views on mobile/web.', 2),
-- BODY MEASUREMENTS
(N'BODY MEASUREMENTS', N'Record Body Metrics', N'Weight, measurements; GET /api/me/body-metrics mobile.', 1),
(N'BODY MEASUREMENTS', N'Progress Charts', N'Member progress screen attendance + body metrics.', 2),
-- INVOICES
(N'INVOICES', N'Generate Membership Invoice', N'Invoice on payment/billing events.', 2),
(N'INVOICES', N'Invoice History', N'Staff view member invoice history.', 3),
-- COUPONS
(N'COUPONS', N'Coupon Master', N'Create discount coupons for memberships.', 2),
(N'COUPONS', N'Apply Coupon on Billing', N'POST /api/membership-payments/{id}/apply-coupon.', 1),
-- LOCKERS
(N'LOCKERS', N'Locker Assignment', N'Assign locker to member; gym ops.', 3),
(N'LOCKERS', N'Locker Availability', N'View locker inventory and status.', 3),
-- EQUIPMENT
(N'EQUIPMENT', N'Equipment Registry', N'Gym equipment catalog and maintenance.', 3),
(N'EQUIPMENT', N'Equipment Usage Log', N'Track equipment usage or issues.', 3),
-- NOTIFICATIONS
(N'NOTIFICATIONS', N'In-App Notifications', N'Notifications table; mark read POST /api/me/notifications/{id}/read.', 1),
(N'NOTIFICATIONS', N'Outbound Webhooks', N'Email/WhatsApp dispatcher; NOTIFICATION_WEBHOOKS.md.', 2),
(N'NOTIFICATIONS', N'Outbound Reminders Ops Panel', N'Admin dashboard strip GET /api/Dashboard/notifications hooks.', 2),
-- TRAINER
(N'TRAINER', N'Trainer List & Detail', N'/dashboard/trainers, /dashboard/trainers/:id edit modal tabs.', 1),
(N'TRAINER', N'Add Trainer Wizard', N'AddTrainerModal link existing or create user with Trainer type.', 1),
(N'TRAINER', N'Trainer Clients Tab', N'GET /api/Trainers/{id}/clients from UserInstructors.', 1),
(N'TRAINER', N'Trainer Employee Code', N'Auto TRN-{year}-{######} TrainerEmployeeCodeGenerator.', 2),
-- STAFF
(N'STAFF', N'Staff List', N'GET /api/Staff; staff profiles 1:1 UserId.', 2),
(N'STAFF', N'Staff Employee Code', N'StaffEmployeeCodeGenerator.', 3),
-- ACCESS
(N'ACCESS', N'Branch QR Generation', N'Owner QR tools; branch-specific scan tokens.', 1),
(N'ACCESS', N'Member QR Check-In', N'Mobile + web scan; POST /api/Attendance/scan.', 1),
(N'ACCESS', N'Door Device Integration', N'Access module door device config.', 3),
-- HEALTH
(N'HEALTH', N'Health Profile Edit', N'PUT /api/HealthProfile/user/{userId}; risk engine on save.', 1),
(N'HEALTH', N'Member Self-Service Health', N'PUT /api/HealthProfile/me; /dashboard/member/health-profile.', 2),
(N'HEALTH', N'Trainer Read Summary', N'GET summary for assigned clients only.', 2),
-- SUPPLEMENTS
(N'SUPPLEMENTS', N'Supplement Catalog', N'GET/POST /api/SupplementMaster.', 2),
(N'SUPPLEMENTS', N'Assign Supplement to Member', N'POST /api/MemberSupplements.', 2),
(N'SUPPLEMENTS', N'Member Supplement View', N'GET /api/MemberSupplements/me.', 3),
-- PT
(N'PT', N'PT Package Catalog', N'Personal training packages.', 2),
(N'PT', N'PT Session Booking', N'Schedule and track PT sessions.', 2),
-- MOBILE
(N'MOBILE', N'Member Dashboard', N'GET /api/me/dashboard home summary.', 1),
(N'MOBILE', N'Mobile QR Check-In', N'Flutter scan flow; membership_expired handling.', 1),
(N'MOBILE', N'Mobile Workout Session', N'Live session, offline sync, complete workout.', 1),
(N'MOBILE', N'Mobile Notifications', N'Recent notifications on home; expiry highlight.', 2),
(N'MOBILE', N'Device Limit Enforcement', N'Max 3 devices; 409 DEVICE_LIMIT_REACHED.', 2),
-- FRONT_DESK
(N'FRONT_DESK', N'Front Desk Sidebar', N'getStaffFrontDeskNavLinks — Dashboard, Attendance, Members, Payments, Check-in, Leads.', 1),
(N'FRONT_DESK', N'Front Desk Dashboard', N'FrontDeskDashboardPage with renewal queue and quick actions.', 1),
(N'FRONT_DESK', N'Route Guard for Staff', N'isPathAllowedForRole blocks owner-only routes.', 2),
-- LEADS
(N'LEADS', N'Lead Capture', N'CRM lead entry; LEADS_CRM permission.', 3),
(N'LEADS', N'Trainer Lead Assignment', N'LEADS_TRAINER permission.', 3),
-- SECURITY
(N'SECURITY', N'Device Registration', N'Login device payload; UserDevices table.', 1),
(N'SECURITY', N'Session Revocation', N'DELETE /api/me/devices/{id}; logout-all.', 1),
(N'SECURITY', N'Login History', N'GET /api/me/login-history member audit.', 2);

INSERT INTO BusinessFunctionalities (Id, TenantId, BusinessModuleId, Name, Description, Priority, Status, CreatedDate, CreatedBy, IsDeleted, ProjectId)
SELECT NEWID(), @TenantId, bm.Id, f.Name, f.Description, f.Priority, 1, @Now, @CreatedBy, 0, @ProjectId
FROM @funcs f
JOIN BusinessModules bm ON bm.Code = f.ModuleCode AND bm.ProjectId = @ProjectId
WHERE NOT EXISTS (
  SELECT 1 FROM BusinessFunctionalities x
  WHERE x.BusinessModuleId = bm.Id AND x.Name = f.Name AND x.IsDeleted = 0
);

-- ── Business requirements ─────────────────────────────────────────
DECLARE @reqs TABLE (ModuleCode nvarchar(50), FuncName nvarchar(200), Title nvarchar(300), Description nvarchar(max), AcceptanceCriteria nvarchar(max), Priority int, Status int);
INSERT INTO @reqs VALUES
-- Membership core
(N'MEMBERSHIP', N'Assign Membership', N'Membership start date is mandatory.', N'StartDate required on create.', N'API returns 400 if StartDate null.', 1, 1),
(N'MEMBERSHIP', N'Assign Membership', N'Membership expiry calculated automatically.', N'EndDate derived from plan duration.', N'EndDate = StartDate + plan days.', 2, 1),
(N'MEMBERSHIP', N'Assign Membership', N'Prevent multiple occupying memberships.', N'One occupying status per user.', N'409 ACTIVE_MEMBERSHIP_EXISTS with actions.', 1, 1),
(N'MEMBERSHIP', N'Assign Membership', N'Membership history maintained.', N'All rows retained; no DELETE.', N'DELETE returns 400 void request message.', 1, 1),
(N'MEMBERSHIP', N'One Occupying Membership Rule', N'Occupying statuses enumerated.', N'Active, ActivePendingPayment, PartialPayment, Frozen, Pending, VoidPending block new create.', N'UserMembershipConflictGuard enforces.', 1, 1),
(N'MEMBERSHIP', N'Membership Void Approval', N'Void requires admin approval.', N'Staff → VoidPending → admin → Voided.', N'APPROVE_MEMBERSHIP_REQUEST on approve.', 1, 1),
(N'MEMBERSHIP', N'Renewal Queue', N'Show memberships expiring within 14 days.', N'Staff dashboard panel sorted by EndDate.', N'Collect and Renew actions work.', 1, 1),
(N'MEMBERSHIP', N'Expiry In-App Notifications', N'Notify at 14/7/3/1/0 days before end.', N'MembershipExpiryInAppNotificationService.', N'Notification type membership_expiring.', 1, 1),
-- Attendance
(N'ATTENDANCE', N'QR Membership Gate', N'Deny check-in when membership invalid.', N'errorCode membership_expired HTTP 400.', N'Active/ActivePendingPayment/PartialPayment with EndDate>=today allowed.', 1, 1),
(N'ATTENDANCE', N'QR Membership Gate', N'Staff roles exempt from gate.', N'ADMIN TRAINER STAFF RECEPTIONIST ACCOUNTANT skip gate.', N'GymQrService.EvaluateMembershipForCheckInAsync.', 1, 1),
(N'ATTENDANCE', N'Check In', N'Record attendance log on valid scan.', N'AttendanceLog insert after all checks.', N'POST /api/Attendance/scan success payload.', 1, 1),
-- Auth
(N'AUTH', N'Login', N'Email password issues JWT with roles.', N'POST /api/Auth/login.', N'Token contains permission claims.', 1, 1),
(N'AUTH', N'Role Based Access', N'Controllers use HasPermission.', N'PermissionResolutionMiddleware merges DB perms.', N'Unauthorized returns 403.', 1, 1),
(N'AUTH', N'OTP Login (Firebase)', N'OTP login matches phone on Users.', N'Firebase ID token exchange.', N'Same JWT response as password login.', 2, 1),
-- User
(N'USER', N'Create User', N'Member create provisions profile.', N'UserProvisioningService EnsureMemberProfile.', N'Members row exists after POST.', 1, 1),
(N'USER', N'Coach Assignment', N'Personal coach via UserInstructors.', N'Not the same as Trainer role.', N'Trainer Clients tab shows assigned members.', 1, 1),
(N'USER', N'Phone Validation', N'Indian mobile format enforced.', N'^[6-9][0-9]{9}$ normalized.', N'Duplicate phone rejected.', 1, 1),
-- Billing
(N'BILLING', N'Process Payment', N'Net Payable formula correct.', N'Fee − Coupon − Waive-Off.', N'Outstanding = Net − completed installments.', 1, 1),
(N'BILLING', N'Collect Installment', N'Only Completed installments count.', N'Voided/Refunded excluded from totals.', N'BillingCalculationService unit tests pass.', 1, 1),
(N'BILLING', N'Void/Refund Payment', N'Void requires VOID_PAYMENT permission.', N'Manager+ only.', N'Audit row in financial_audit_logs.', 1, 1),
-- Workout
(N'WORKOUT MANAGEMENT', N'Live Workout Tracking', N'One InProgress session per member.', N'Unique index UX_WorkoutOneActiveSession.', N'Second start returns conflict.', 1, 1),
(N'WORKOUT MANAGEMENT', N'Personal Workout Plans', N'Trainer cannot access personal plans.', N'API returns 403 for trainer role.', N'Member CRUD on /api/personal-workout-plans/mine.', 1, 1),
-- Mobile
(N'MOBILE', N'Mobile QR Check-In', N'Show renew message on membership_expired.', N'AttendanceMembershipExpired in Flutter.', N'User directed to reception.', 1, 1),
(N'MOBILE', N'Device Limit Enforcement', N'Max 3 active devices per user.', N'409 with device list.', N'Retry with removeDeviceId succeeds.', 2, 1),
-- Front desk
(N'FRONT_DESK', N'Front Desk Sidebar', N'Staff without admin perms see short menu.', N'STAFF RECEPTIONIST only.', N'Full admin sidebar hidden.', 1, 1),
(N'FRONT_DESK', N'Route Guard for Staff', N'Block gym-ops roles analytics routes.', N'getStaffFrontDeskAllowedPrefixes.', N'Direct URL navigation redirected.', 2, 1),
-- Health
(N'HEALTH', N'Health Profile Edit', N'Risk level computed on save.', N'Low Moderate High.', N'HealthProfileRiskEngine runs.', 2, 1),
-- Notifications
(N'NOTIFICATIONS', N'Outbound Webhooks', N'Webhooks fire on expiry milestones.', N'When URLs configured.', N'EnableScheduledReminders auto when URLs set.', 2, 1);

INSERT INTO BusinessRequirements (Id, TenantId, BusinessFunctionalityId, Title, Description, AcceptanceCriteria, Priority, Status, CreatedDate, CreatedBy, IsDeleted, ProjectId)
SELECT NEWID(), @TenantId, bf.Id, r.Title, r.Description, r.AcceptanceCriteria, r.Priority, r.Status, @Now, @CreatedBy, 0, @ProjectId
FROM @reqs r
JOIN BusinessModules bm ON bm.Code = r.ModuleCode AND bm.ProjectId = @ProjectId
JOIN BusinessFunctionalities bf ON bf.BusinessModuleId = bm.Id AND bf.Name = r.FuncName AND bf.IsDeleted = 0
WHERE NOT EXISTS (
  SELECT 1 FROM BusinessRequirements x
  WHERE x.ProjectId = @ProjectId AND x.Title = r.Title AND x.IsDeleted = 0
);

-- ── Business rules ────────────────────────────────────────────────
DECLARE @rules TABLE (ModuleCode nvarchar(50), ReqTitle nvarchar(300), RuleName nvarchar(200), Description nvarchar(max), ValidationLogic nvarchar(max));
INSERT INTO @rules VALUES
(N'MEMBERSHIP', N'Prevent multiple occupying memberships.', N'BR-001 One Active Membership', N'At most one occupying membership per user.', N'UserMembershipConflictGuard + IX_user_memberships_one_active_per_user'),
(N'MEMBERSHIP', N'Membership expiry calculated automatically.', N'BR-002 Auto Expiry Date', N'EndDate from plan duration.', N'EndDate = StartDate.AddDays(plan.DurationDays)'),
(N'MEMBERSHIP', N'Membership history maintained.', N'BR-003 No Physical Delete', N'Memberships never deleted.', N'DELETE /api/UserMemberships/{id} → 400'),
(N'ATTENDANCE', N'Deny check-in when membership invalid.', N'BR-004 Check-In Gate', N'UserMembershipRules.AllowsGymCheckIn.', N'Status in Active, ActivePendingPayment, PartialPayment AND EndDate >= today'),
(N'ATTENDANCE', N'Staff roles exempt from gate.', N'BR-005 Staff Scan Exempt', N'Staff can test scan without membership.', N'Role in ADMIN, TRAINER, STAFF, RECEPTIONIST, ACCOUNTANT'),
(N'BILLING', N'Net Payable formula correct.', N'BR-006 Net Payable', N'Financial formula.', N'Net = Fee - CouponDiscount - ApprovedWaiveOff'),
(N'BILLING', N'Only Completed installments count.', N'BR-007 Completed Only', N'Payment totals.', N'SUM(amount) WHERE Status = Completed'),
(N'WORKOUT MANAGEMENT', N'One InProgress session per member.', N'BR-008 Single Active Session', N'Workout tracking.', N'COUNT(InProgress) <= 1 per MemberId'),
(N'AUTH', N'Unauthorized returns 403.', N'BR-009 Permission Denied', N'RBAC enforcement.', N'HasPermission attribute + middleware'),
(N'SECURITY', N'Max 3 active devices per user.', N'BR-010 Device Limit', N'Device security.', N'Active device count <= DeviceSecurity:MaxActiveDevices'),
(N'USER', N'Personal coach via UserInstructors.', N'BR-011 Coach Not Role', N'Coach assignment separate from TRAINER role.', N'UserInstructors.InstructorId → Trainer.Id'),
(N'HEALTH', N'Risk level computed on save.', N'BR-012 Health Risk', N'Health profile.', N'HealthProfileRiskEngine.Evaluate(profile)'),
(N'NOTIFICATIONS', N'Notification type membership_expiring.', N'BR-013 Expiry Notify Days', N'Reminder milestones.', N'DaysBeforeEnd IN (14,7,3,1,0)');

INSERT INTO BusinessRules (Id, TenantId, BusinessRequirementId, RuleName, Description, ValidationLogic, CreatedDate, CreatedBy, IsDeleted, ProjectId, BusinessModuleId)
SELECT NEWID(), @TenantId, brq.Id, ru.RuleName, ru.Description, ru.ValidationLogic, @Now, @CreatedBy, 0, @ProjectId, bm.Id
FROM @rules ru
JOIN BusinessModules bm ON bm.Code = ru.ModuleCode AND bm.ProjectId = @ProjectId
LEFT JOIN BusinessRequirements brq ON brq.ProjectId = @ProjectId AND brq.Title = ru.ReqTitle AND brq.IsDeleted = 0
WHERE NOT EXISTS (
  SELECT 1 FROM BusinessRules x
  WHERE x.ProjectId = @ProjectId AND x.RuleName = ru.RuleName AND x.IsDeleted = 0
);

-- ── Business process workflows ────────────────────────────────────
DECLARE @wf TABLE (Id uniqueidentifier, Name nvarchar(200), Description nvarchar(max));
INSERT INTO @wf VALUES
 ('B2000001-0001-4000-8000-000000000001', N'Member Onboarding', N'New member: create user → assign membership → collect payment → QR check-in.'),
 ('B2000001-0001-4000-8000-000000000002', N'Payment Collection', N'Collect installment → receipt → update outstanding.'),
 ('B2000001-0001-4000-8000-000000000003', N'QR Check-In Gate', N'Scan → geo → membership gate → attendance log.'),
 ('B2000001-0001-4000-8000-000000000004', N'Membership Void', N'Request void → admin approval → Voided status.'),
 ('B2000001-0001-4000-8000-000000000005', N'Workout Session', N'Start → log sets → complete → sync WorkoutLogs.');

INSERT INTO BusinessProcessWorkflows (Id, TenantId, Name, Description, Status, CreatedDate, CreatedBy, IsDeleted, ProjectId)
SELECT w.Id, @TenantId, w.Name, w.Description, 1, @Now, @CreatedBy, 0, @ProjectId
FROM @wf w
WHERE NOT EXISTS (SELECT 1 FROM BusinessProcessWorkflows x WHERE x.Name = w.Name AND x.ProjectId = @ProjectId);

DECLARE @steps TABLE (WorkflowName nvarchar(200), StepName nvarchar(200), SortOrder int);
INSERT INTO @steps VALUES
(N'Member Onboarding', N'Create member user', 1),
(N'Member Onboarding', N'Assign membership plan', 2),
(N'Member Onboarding', N'Collect first payment', 3),
(N'Member Onboarding', N'Issue QR / mobile login', 4),
(N'Member Onboarding', N'First check-in', 5),
(N'Payment Collection', N'Open collect payment', 1),
(N'Payment Collection', N'Enter installment amount', 2),
(N'Payment Collection', N'Confirm duplicate check', 3),
(N'Payment Collection', N'Generate receipt', 4),
(N'Payment Collection', N'Update outstanding', 5),
(N'QR Check-In Gate', N'Scan branch QR', 1),
(N'QR Check-In Gate', N'Validate geo location', 2),
(N'QR Check-In Gate', N'Evaluate membership', 3),
(N'QR Check-In Gate', N'Prevent duplicate scan', 4),
(N'QR Check-In Gate', N'Insert attendance log', 5),
(N'Membership Void', N'Staff request void', 1),
(N'Membership Void', N'Status → VoidPending', 2),
(N'Membership Void', N'Admin review queue', 3),
(N'Membership Void', N'Approve or reject', 4),
(N'Membership Void', N'Status → Voided', 5),
(N'Workout Session', N'Start or resume session', 1),
(N'Workout Session', N'Log exercise sets', 2),
(N'Workout Session', N'Autosave / offline queue', 3),
(N'Workout Session', N'Complete session', 4),
(N'Workout Session', N'Sync to WorkoutLogs', 5);

INSERT INTO BusinessProcessWorkflowSteps (Id, TenantId, BusinessProcessWorkflowId, Name, SortOrder, Status, CreatedDate, CreatedBy, IsDeleted)
SELECT NEWID(), @TenantId, w.Id, s.StepName, s.SortOrder, 1, @Now, @CreatedBy, 0
FROM @steps s
JOIN BusinessProcessWorkflows w ON w.Name = s.WorkflowName AND w.ProjectId = @ProjectId
WHERE NOT EXISTS (
  SELECT 1 FROM BusinessProcessWorkflowSteps x
  WHERE x.BusinessProcessWorkflowId = w.Id AND x.Name = s.StepName AND x.IsDeleted = 0
);

-- ── Technical modules (dev tracking) ─────────────────────────────
DECLARE @tmods TABLE (Id uniqueidentifier, Name nvarchar(200), Description nvarchar(max));
INSERT INTO @tmods VALUES
 ('C3000001-0001-4000-8000-000000000001', N'gym_client (React)', N'Web dashboard Vite + TanStack Query'),
 ('C3000001-0001-4000-8000-000000000002', N'GymManagement.API', N'ASP.NET Core 9 main API'),
 ('C3000001-0001-4000-8000-000000000003', N'GymManagement.Infrastructure', N'EF Core services and repositories'),
 ('C3000001-0001-4000-8000-000000000004', N'mobile app (PulseFit)', N'Flutter member application'),
 ('C3000001-0001-4000-8000-000000000005', N'exercise_management_api', N'Optional workout studio / AI service');

INSERT INTO Modules (Id, TenantId, ProjectId, Name, Description, CreatedDate, CreatedBy, IsDeleted)
SELECT t.Id, @TenantId, @ProjectId, t.Name, t.Description, @Now, @CreatedBy, 0
FROM @tmods t
WHERE NOT EXISTS (SELECT 1 FROM Modules x WHERE x.Name = t.Name AND x.ProjectId = @ProjectId);

-- Link sample features to business functionalities
INSERT INTO Features (Id, TenantId, ModuleId, Name, Description, CreatedDate, CreatedBy, IsDeleted, BusinessModuleId, BusinessFunctionalityId)
SELECT NEWID(), @TenantId, m.Id,
  bf.Name,
  N'Implemented in ' + m.Name + N': ' + ISNULL(bf.Description, N''),
  @Now, @CreatedBy, 0, bf.BusinessModuleId, bf.Id
FROM BusinessFunctionalities bf
JOIN BusinessModules bm ON bm.Id = bf.BusinessModuleId
CROSS JOIN Modules m
WHERE bf.ProjectId = @ProjectId AND bf.IsDeleted = 0
  AND bm.Code IN (N'ACCESS', N'MEMBERSHIP', N'FRONT_DESK', N'MOBILE', N'AUTH')
  AND m.Name = N'GymManagement.API'
  AND NOT EXISTS (
    SELECT 1 FROM Features x
    WHERE x.BusinessFunctionalityId = bf.Id AND x.ModuleId = m.Id AND x.IsDeleted = 0
  );

PRINT 'TrackFlow Gym seed completed.';
SELECT 'BusinessModules' AS Entity, COUNT(*) AS Cnt FROM BusinessModules WHERE ProjectId = @ProjectId AND IsDeleted = 0
UNION ALL SELECT 'BusinessFunctionalities', COUNT(*) FROM BusinessFunctionalities WHERE ProjectId = @ProjectId AND IsDeleted = 0
UNION ALL SELECT 'BusinessRequirements', COUNT(*) FROM BusinessRequirements WHERE ProjectId = @ProjectId AND IsDeleted = 0
UNION ALL SELECT 'BusinessRules', COUNT(*) FROM BusinessRules WHERE ProjectId = @ProjectId AND IsDeleted = 0
UNION ALL SELECT 'BusinessProcessWorkflows', COUNT(*) FROM BusinessProcessWorkflows WHERE ProjectId = @ProjectId AND IsDeleted = 0
UNION ALL SELECT 'BusinessProcessWorkflowSteps', COUNT(*) FROM BusinessProcessWorkflowSteps s JOIN BusinessProcessWorkflows w ON s.BusinessProcessWorkflowId = w.Id WHERE w.ProjectId = @ProjectId AND s.IsDeleted = 0
UNION ALL SELECT 'Modules (technical)', COUNT(*) FROM Modules WHERE ProjectId = @ProjectId AND IsDeleted = 0
UNION ALL SELECT 'Features', COUNT(*) FROM Features WHERE TenantId = @TenantId AND IsDeleted = 0;
