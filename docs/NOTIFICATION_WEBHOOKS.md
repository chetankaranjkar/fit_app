# Notification webhooks (email / WhatsApp ops)

Outbound reminders POST JSON to your automation endpoint (n8n, Zapier, Make, custom script). The API does **not** send email/SMS directly — your webhook sends the message.

## Events

| `eventType` | When |
|-------------|------|
| `membership_expiring` | Scheduled job at **14, 7, 3, 1, 0** days before plan end |
| `payment_receipt` | After a completed membership payment (receipt flow) |
| `diet_assignment_assigned` | When staff assigns/replaces a member diet plan |

## Envelope (all events)

```json
{
  "eventType": "membership_expiring",
  "channel": "email",
  "occurredAtUtc": "2026-06-03T10:00:00Z",
  "data": { }
}
```

`channel` is `email` or `whatsapp` (one POST per channel per event).

### `membership_expiring` data

```json
{
  "userId": 1204,
  "membershipId": 8891,
  "memberName": "Rajesh Yadav",
  "memberEmail": "rajesh@example.com",
  "memberPhone": "+919876543210",
  "planName": "Gold Annual",
  "endDateUtc": "2026-06-10T00:00:00Z",
  "daysRemaining": 7
}
```

Use `memberPhone` for WhatsApp automations and `memberEmail` for email.

## Configuration

### Admin SMTP (recommended for Gmail)

Dashboard → **Email settings** (`/dashboard/settings/email`, requires **Config** permission).

1. Choose **Gmail** (or Outlook / custom SMTP).
2. Enter Gmail address, **App password** (Google Account → Security → App passwords), and **From** address.
3. Enable outbound email and choose event types (payment receipts, renewal reminders, diet assignments).
4. **Save**, then **Send test**.

Settings are stored in `GymSettings` (password encrypted with ASP.NET Data Protection). No webhook or n8n required for direct email.

### ASP.NET webhooks (optional)

| Setting | Env (Docker / VPS) | Default |
|---------|-------------------|---------|
| `Notifications:EmailWebhookUrl` | `NOTIFICATIONS_EMAIL_WEBHOOK` | empty |
| `Notifications:WhatsAppWebhookUrl` | `NOTIFICATIONS_WHATSAPP_WEBHOOK` | empty |
| `Notifications:EnableScheduledReminders` | `NOTIFICATIONS_ENABLE_SCHEDULED_REMINDERS` | auto **true** when a URL is set |
| `Notifications:EnableInAppMembershipExpiryReminders` | `NOTIFICATIONS_ENABLE_IN_APP_REMINDERS` | **true** |
| `Notifications:MembershipExpiryReminderDays` | `NOTIFICATIONS_EXPIRY_REMINDER_DAYS` | **14** |
| `Notifications:InAppMembershipExpiryReminderDays` | `NOTIFICATIONS_IN_APP_EXPIRY_DAYS` | **14** |
| `Notifications:ReminderIntervalHours` | `NOTIFICATIONS_REMINDER_INTERVAL_HOURS` | **24** |

Aliases also supported: `NOTIFICATIONS_EMAIL_WEBHOOK_URL`, `NOTIFICATIONS_WHATSAPP_WEBHOOK_URL`.

### Production (Docker)

1. Copy `deploy/.env.production.example` → `deploy/.env`.
2. Set webhook URLs (HTTPS endpoints that accept `POST` + `application/json`):

```env
NOTIFICATIONS_EMAIL_WEBHOOK=https://n8n.example.com/webhook/gym-email
NOTIFICATIONS_WHATSAPP_WEBHOOK=https://n8n.example.com/webhook/gym-whatsapp
NOTIFICATIONS_ENABLE_SCHEDULED_REMINDERS=true
```

3. Redeploy API: `docker compose -f deploy/docker-compose.yml up -d api`
4. Confirm in admin dashboard → **Outbound reminders** strip (email/WhatsApp wired, scheduled on).

### Local development

In `appsettings.Development.json` (do not commit secrets):

```json
"Notifications": {
  "EmailWebhookUrl": "https://webhook.site/your-uuid",
  "WhatsAppWebhookUrl": "",
  "EnableScheduledReminders": true,
  "EnableInAppMembershipExpiryReminders": true,
  "MembershipExpiryReminderDays": 14,
  "ReminderIntervalHours": 24
}
```

Or use [webhook.site](https://webhook.site) to inspect payloads.

## n8n quick start

1. **Webhook** node → POST, path `gym-email`.
2. **IF** node → `{{ $json.eventType }}` equals `membership_expiring`.
3. **Send Email** (or Gmail) → To: `{{ $json.data.memberEmail }}`, subject/body from `daysRemaining` + `planName`.

Repeat with a second workflow for WhatsApp (Twilio / Meta Cloud API) using `memberPhone`.

## Logs

Successful delivery:

```
Notification webhook (email) delivered: 200 (attempt 1/3).
Membership expiry webhook milestones: 12 dispatch(es) from 45 membership(s) in 14-day window.
```

If `EnableScheduledReminders` is true but URLs are empty:

```
EnableScheduledReminders is true but no Email/WhatsApp webhook URL is configured; outbound reminders skipped.
```

## Related

- In-app member notifications: `APPLICATION_FLOWS.md` §12b (no webhook required).
- Staff renewal queue: dashboard **Renewal queue** panel.
