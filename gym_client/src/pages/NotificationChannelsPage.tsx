import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { DashboardLayout } from '../components/layout/DashboardLayout'
import { DashboardSubpageShell } from '../components/layout/DashboardSubpageShell'
import { PermissionGate } from '../components/auth/PermissionGate'
import { ChannelReadinessBadge } from '../components/notifications/ChannelReadinessBadge'
import { authService } from '../services/auth.service'
import { notificationChannelsService } from '../services/notificationChannels.service'
import { getApiErrorMessage } from '../lib/apiErrors'

function getDashboardUser() {
  try {
    const userJson = localStorage.getItem('user')
    if (!userJson) return { userName: 'User' }
    const user = JSON.parse(userJson) as { fullName?: string; username?: string }
    return { userName: user?.fullName?.trim() || user?.username?.trim() || 'User' }
  } catch {
    return { userName: 'User' }
  }
}

export function NotificationChannelsPage() {
  const { userName } = getDashboardUser()
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['notification-channels'],
    queryFn: () => notificationChannelsService.getOverview(),
  })

  return (
    <DashboardLayout userName={userName}>
      <PermissionGate
        permission={authService.permissionCodes.config}
        fallback={
          <div className="glass-card dashboard-card rounded-2xl p-6 text-sm text-amber-200">
            You do not have permission to view notification channels. Ask an admin to grant Config access.
          </div>
        }
      >
        <DashboardSubpageShell
          eyebrow="Notifications"
          titleBefore="Channel "
          titleGradient="status"
          subtitle="Email, SMS, WhatsApp, in-app, and push in one place. Secrets are never shown — only whether they are configured."
          showExport={false}
        >
          <div className="space-y-6">
            {isLoading ? (
              <p className="text-sm text-slate-400">Loading channel status…</p>
            ) : isError ? (
              <p className="text-sm text-rose-300">
                {getApiErrorMessage(error, 'Could not load notification channels.')}
              </p>
            ) : (
              <>
                <p className="max-w-3xl text-sm text-slate-400">{data?.memberOptInNote}</p>
                <div className="grid gap-4 lg:grid-cols-2">
                  {(data?.channels ?? []).map((channel) => (
                    <article
                      key={channel.channel}
                      className="glass-card dashboard-card rounded-2xl border border-white/10 p-5"
                      data-testid={`channel-card-${channel.channel}`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <h2 className="text-base font-semibold text-white">{channel.label}</h2>
                          <p className="mt-1 text-xs uppercase tracking-wide text-slate-500">{channel.channel}</p>
                        </div>
                        <ChannelReadinessBadge readiness={channel.readiness} />
                      </div>
                      <p className="mt-3 text-sm leading-relaxed text-slate-300">{channel.summary}</p>
                      {channel.blockingReasons.length > 0 ? (
                        <ul className="mt-3 list-disc space-y-1 pl-5 text-xs text-amber-200/90">
                          {channel.blockingReasons.map((reason) => (
                            <li key={reason}>{reason}</li>
                          ))}
                        </ul>
                      ) : null}
                      <p className="mt-3 text-xs text-slate-500">
                        {channel.secretConfigured
                          ? 'Secret on file (masked).'
                          : channel.channel === 'inapp'
                            ? 'No secret required.'
                            : 'No secret stored.'}
                      </p>
                      {channel.settingsPath ? (
                        <Link
                          to={channel.settingsPath}
                          className="mt-3 inline-block text-sm text-violet-300 hover:underline"
                        >
                          Open settings
                        </Link>
                      ) : (
                        <p className="mt-3 text-xs text-slate-500">
                          Configured on the API host (Notifications / Firebase), not in this dashboard form.
                        </p>
                      )}
                    </article>
                  ))}
                </div>
                <p className="text-xs text-slate-500">
                  Templates, queue, and retries:{' '}
                  <Link to="/dashboard/settings/notification-templates" className="text-violet-300 hover:underline">
                    Notification templates
                  </Link>
                </p>
              </>
            )}
          </div>
        </DashboardSubpageShell>
      </PermissionGate>
    </DashboardLayout>
  )
}
