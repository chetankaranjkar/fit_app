import { useQuery } from '@tanstack/react-query'
import { dashboardService } from '../../services/dashboard.service'

function StatusPill({ ok, label }: { ok: boolean; label: string }) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold ${
        ok
          ? 'border-emerald-400/35 bg-emerald-500/10 text-emerald-100'
          : 'border-white/10 bg-white/5 text-slate-400'
      }`}
    >
      {label}
    </span>
  )
}

/** Staff ops: shows whether email/WhatsApp webhooks and scheduled reminders are wired. */
export function OutboundRemindersOpsPanel({ enabled }: { enabled: boolean }) {
  const { data, isLoading } = useQuery({
    queryKey: ['dashboard-notification-hooks'],
    queryFn: async () => (await dashboardService.getNotifications()).data.hooks,
    enabled,
    staleTime: 120_000,
  })

  if (!enabled) return null

  const hooks = data
  const anyWebhook = hooks?.emailEnabled || hooks?.whatsAppEnabled

  return (
    <section className="rounded-2xl border border-white/10 bg-white/[0.03] px-5 py-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-white">Outbound reminders</h2>
          <p className="mt-1 max-w-2xl text-xs text-slate-400">
            Email/WhatsApp webhooks fire at membership expiry milestones (14, 7, 3, 1, 0 days).
            Configure URLs in server env — see <code className="text-slate-300">docs/NOTIFICATION_WEBHOOKS.md</code>.
          </p>
        </div>
        {!isLoading && hooks ? (
          <div className="flex flex-wrap gap-2">
            <StatusPill ok={hooks.emailEnabled} label={hooks.emailEnabled ? 'Email wired' : 'Email off'} />
            <StatusPill
              ok={hooks.whatsAppEnabled}
              label={hooks.whatsAppEnabled ? 'WhatsApp wired' : 'WhatsApp off'}
            />
            <StatusPill
              ok={hooks.scheduledRemindersEnabled}
              label={hooks.scheduledRemindersEnabled ? 'Scheduled on' : 'Scheduled off'}
            />
            <StatusPill
              ok={hooks.inAppExpiryRemindersEnabled}
              label={hooks.inAppExpiryRemindersEnabled ? 'In-app on' : 'In-app off'}
            />
          </div>
        ) : (
          <span className="text-xs text-slate-500">Checking…</span>
        )}
      </div>
      {!isLoading && hooks && !anyWebhook ? (
        <p className="mt-3 text-xs text-amber-200/90">
          No webhook URLs configured. Members still receive in-app expiry notices when in-app reminders are enabled.
        </p>
      ) : null}
      {!isLoading && hooks && anyWebhook && !hooks.scheduledRemindersEnabled ? (
        <p className="mt-3 text-xs text-amber-200/90">
          Webhook URL present but scheduled reminders are disabled. Set{' '}
          <code className="text-amber-100">NOTIFICATIONS_ENABLE_SCHEDULED_REMINDERS=true</code> on the API host.
        </p>
      ) : null}
    </section>
  )
}
