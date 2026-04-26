import { useQuery } from '@tanstack/react-query'
import { dashboardService } from '../../services/dashboard.service'

const severityClasses: Record<string, string> = {
  info: 'border-blue-500/30 bg-blue-500/10 text-blue-100',
  warning: 'border-amber-500/30 bg-amber-500/10 text-amber-100',
  danger: 'border-rose-500/30 bg-rose-500/10 text-rose-100',
}

export function NotificationCenterCard({ className }: { className?: string }) {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['dashboard-notifications'],
    queryFn: async () => {
      const response = await dashboardService.getNotifications()
      return response.data
    },
  })

  return (
    <div className={`glass-card min-w-0 rounded-2xl p-6 ${className || ''}`}>
      <div className="mb-5 flex items-start justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold text-white">Notification center</h3>
          <p className="text-xs text-slate-400">Membership, payment, and attendance alerts</p>
        </div>
      </div>

      {isLoading ? (
        <div className="py-8 text-center text-sm text-slate-400">Loading alerts…</div>
      ) : isError || !data ? (
        <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-100">
          Unable to load notifications.
        </div>
      ) : (
        <div className="space-y-4">
          <div className="space-y-2">
            {data.alerts.map((alert) => (
              <div
                key={alert.type}
                className={`rounded-xl border p-3 ${
                  severityClasses[alert.severity] || severityClasses.info
                }`}
              >
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold">{alert.title}</p>
                  <span className="rounded-md bg-black/20 px-2 py-0.5 text-xs font-semibold">
                    {alert.count}
                  </span>
                </div>
                <p className="mt-1 text-xs opacity-90">{alert.message}</p>
              </div>
            ))}
          </div>

          <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Optional delivery hooks
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              <span
                className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                  data.hooks.emailEnabled
                    ? 'bg-emerald-500/20 text-emerald-200'
                    : 'bg-slate-700/70 text-slate-300'
                }`}
              >
                Email: {data.hooks.emailEnabled ? 'Enabled' : 'Disabled'}
              </span>
              <span
                className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                  data.hooks.whatsAppEnabled
                    ? 'bg-emerald-500/20 text-emerald-200'
                    : 'bg-slate-700/70 text-slate-300'
                }`}
              >
                WhatsApp: {data.hooks.whatsAppEnabled ? 'Enabled' : 'Disabled'}
              </span>
            </div>
            <p className="mt-2 text-xs text-slate-400">
              Set <span className="font-mono text-slate-300">Notifications:EmailWebhookUrl</span> and{' '}
              <span className="font-mono text-slate-300">Notifications:WhatsAppWebhookUrl</span> in API
              appsettings (or env <span className="font-mono text-slate-300">NOTIFICATIONS__*</span>) to
              enable outbound POSTs (receipts + optional reminders).
            </p>
          </div>
        </div>
      )}
    </div>
  )
}

