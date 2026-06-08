import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { GlassPanel } from './premium/GlassPanel'
import { meService, type MeNotification } from '../../services/me.service'

function stripNotificationMarker(message: string) {
  return message.replace(/\s*\[mid:\d+\]\[d:\d+\]\s*$/i, '').trim()
}

function formatWhen(iso: string) {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}

function notificationStyle(type?: string | null) {
  if (type === 'membership_expiring') {
    return 'border-amber-500/30 bg-amber-500/10'
  }
  if (type === 'payment_due') {
    return 'border-violet-500/30 bg-violet-500/10'
  }
  return 'border-white/10 bg-white/5'
}

function NotificationRow({
  item,
  onMarkRead,
  busy,
}: {
  item: MeNotification
  onMarkRead: (id: number) => void
  busy: boolean
}) {
  const urgent = item.type === 'membership_expiring' && !item.isRead
  return (
    <li
      className={`rounded-xl border px-4 py-3 text-sm ${notificationStyle(item.type)} ${urgent ? 'ring-1 ring-amber-400/25' : ''}`}
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <p className="font-medium text-white">{item.title}</p>
        {!item.isRead ? (
          <button
            type="button"
            disabled={busy}
            onClick={() => onMarkRead(item.id)}
            className="shrink-0 text-[11px] font-semibold uppercase tracking-wide text-orange-300 hover:text-orange-200 disabled:opacity-50"
          >
            Mark read
          </button>
        ) : (
          <span className="text-[10px] uppercase tracking-wide text-slate-500">Read</span>
        )}
      </div>
      <p className="mt-1 text-xs leading-relaxed text-slate-300">{stripNotificationMarker(item.message)}</p>
      <p className="mt-2 text-[10px] text-slate-500">{formatWhen(item.createdAt)}</p>
    </li>
  )
}

export function MemberNotificationsPanel({ fallback }: { fallback?: MeNotification[] }) {
  const queryClient = useQueryClient()
  const { data, isLoading } = useQuery({
    queryKey: ['member-notifications'],
    queryFn: async () => {
      const { data: rows } = await meService.getNotifications(20)
      return rows
    },
    staleTime: 60_000,
    refetchOnWindowFocus: true,
  })

  const markRead = useMutation({
    mutationFn: (id: number) => meService.markNotificationRead(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['member-notifications'] })
      void queryClient.invalidateQueries({ queryKey: ['member-dashboard'] })
    },
  })

  const items = data ?? fallback ?? []

  return (
    <GlassPanel role="member" title="Notifications" subtitle="Membership reminders and updates">
      {isLoading && items.length === 0 ? (
        <p className="py-4 text-sm text-slate-500">Loading…</p>
      ) : items.length === 0 ? (
        <p className="py-4 text-sm text-slate-500">
          No notifications yet. We will remind you before your plan expires.
        </p>
      ) : (
        <ul className="space-y-3">
          {items.slice(0, 8).map((n) => (
            <NotificationRow
              key={n.id}
              item={n}
              busy={markRead.isPending}
              onMarkRead={(id) => markRead.mutate(id)}
            />
          ))}
        </ul>
      )}
    </GlassPanel>
  )
}
