import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { DashboardLayout } from '../components/layout/DashboardLayout'
import {
  DashboardSubpageShell,
  DashboardTablePanel,
} from '../components/layout/DashboardSubpageShell'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { PermissionGate } from '../components/auth/PermissionGate'
import { usePermission } from '../features/auth/hooks/usePermission'
import { authService } from '../services/auth.service'
import type { CompromisedSession } from '../types/auth'
import { getDeviceSecurityAnalytics, type DeviceSecurityAnalytics } from '../services/device-security.service'

function getDashboardUser() {
  try {
    const userJson = localStorage.getItem('user')
    if (!userJson) return { userName: 'User' }
    const user = JSON.parse(userJson) as { fullName?: string; username?: string }
    const userName = user?.fullName?.trim() || user?.username?.trim() || 'User'
    return { userName }
  } catch {
    return { userName: 'User' }
  }
}

function toLocalDateInput(value?: string | null) {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 10)
}

function formatDateTime(value?: string | null) {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  return date.toLocaleString()
}

function csvEscape(value: string) {
  if (value.includes('"') || value.includes(',') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`
  }
  return value
}

export function SecurityPage() {
  const { userName } = getDashboardUser()
  const canReportsAccess = usePermission(authService.permissionCodes.reports)
  const canConfigAccess = usePermission(authService.permissionCodes.config)
  const canPaymentsAccess = usePermission(authService.permissionCodes.payments)
  const canTrainerAccess = usePermission(authService.permissionCodes.trainerAccess)
  const grantedPermissions = authService.getPermissions().map((p) => p.code).filter(Boolean)
  const [copyState, setCopyState] = useState<'idle' | 'copied' | 'error'>('idle')
  const [search, setSearch] = useState('')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')

  const [deviceFilter, setDeviceFilter] = useState('')

  const { data: sessions = [], isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ['auth', 'compromised-sessions', 'security-page'],
    queryFn: async () => {
      const { data } = await authService.getCompromisedSessions()
      return Array.isArray(data) ? data : []
    },
    retry: false,
    enabled: canReportsAccess,
  })

  const {
    data: deviceAnalytics,
    isLoading: devicesLoading,
    refetch: refetchDevices,
  } = useQuery({
    queryKey: ['admin', 'device-security', deviceFilter, search],
    queryFn: () =>
      getDeviceSecurityAnalytics({
        filter: deviceFilter || undefined,
        search: search.trim() || undefined,
      }),
    enabled: canReportsAccess,
  })

  const filteredSessions = useMemo(() => {
    const q = search.trim().toLowerCase()
    return (sessions as CompromisedSession[]).filter((s) => {
      const inSearch =
        !q ||
        s.email.toLowerCase().includes(q) ||
        s.fullName.toLowerCase().includes(q) ||
        String(s.authUserId).includes(q) ||
        (s.lastLoginIpAddress ?? '').toLowerCase().includes(q)
      if (!inSearch) return false

      const compromisedDate = toLocalDateInput(s.compromisedAt)
      if (fromDate && compromisedDate < fromDate) return false
      if (toDate && compromisedDate > toDate) return false
      return true
    })
  }, [sessions, search, fromDate, toDate])

  const exportCsv = () => {
    const headers = [
      'AuthUserId',
      'UserId',
      'Email',
      'FullName',
      'CompromisedAt',
      'LastLoginTime',
      'LastLoginIpAddress',
    ]
    const rows = filteredSessions.map((s) =>
      [
        String(s.authUserId),
        s.userId == null ? '' : String(s.userId),
        s.email,
        s.fullName,
        s.compromisedAt,
        s.lastLoginTime ?? '',
        s.lastLoginIpAddress ?? '',
      ]
        .map((v) => csvEscape(v))
        .join(',')
    )
    const csv = [headers.join(','), ...rows].join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `compromised-sessions-${new Date().toISOString().slice(0, 10)}.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const copyPermissionCodes = async () => {
    const value = grantedPermissions.length ? grantedPermissions.join(', ') : 'none'
    try {
      await navigator.clipboard.writeText(value)
      setCopyState('copied')
      window.setTimeout(() => setCopyState('idle'), 1400)
    } catch {
      setCopyState('error')
      window.setTimeout(() => setCopyState('idle'), 1800)
    }
  }

  return (
    <DashboardLayout userName={userName}>
      <DashboardSubpageShell
        eyebrow="Security operations"
        titleBefore=""
        titleGradient="Compromised sessions"
        subtitle="Monitor device sessions, login activity, and refresh-token reuse."
        showExport={false}
      >
        <DeviceAnalyticsPanel
          analytics={deviceAnalytics}
          loading={devicesLoading}
          filter={deviceFilter}
          onFilterChange={setDeviceFilter}
          onRefresh={() => void refetchDevices()}
        />
        <div className="glass-card dashboard-card mb-6 rounded-2xl p-5">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-white">Permission legend</h3>
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400">{grantedPermissions.length} permissions</span>
              <Button type="button" variant="soft" size="sm" onClick={() => void copyPermissionCodes()}>
                {copyState === 'copied'
                  ? 'Copied'
                  : copyState === 'error'
                    ? 'Copy failed'
                    : 'Copy codes'}
              </Button>
            </div>
          </div>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            <PermissionPill label="Reports" granted={canReportsAccess} />
            <PermissionPill label="Config" granted={canConfigAccess} />
            <PermissionPill label="Payments" granted={canPaymentsAccess} />
            <PermissionPill label="TrainerAccess" granted={canTrainerAccess} />
          </div>
          <p className="mt-3 text-xs text-slate-500">
            Current user codes: {grantedPermissions.length ? grantedPermissions.join(', ') : 'none'}
          </p>
        </div>
        <DashboardTablePanel
          title="Session compromise events"
          description="Events appear when a previously rotated refresh token is reused."
          toolbar={
            <>
              <Input
                label=""
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search email, name, auth user id, IP…"
                className="min-w-[16rem]"
              />
              <Input
                label=""
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
              />
              <Input label="" type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />
              <Button variant="secondary" onClick={() => void refetch()} isLoading={isFetching}>
                Refresh
              </Button>
              <Button onClick={exportCsv} disabled={filteredSessions.length === 0}>
                Export CSV
              </Button>
            </>
          }
        >
          <PermissionGate
            permission={authService.permissionCodes.reports}
            fallback={
              <div className="px-6 py-8 text-sm text-amber-200">
                You do not have permission to view this page. Ask an admin to grant the Reports
                permission.
              </div>
            }
          >
            {isLoading ? (
              <div className="px-6 py-8 text-sm text-slate-400">Loading security events…</div>
            ) : isError ? (
              <div className="px-6 py-8 text-sm text-amber-200">
                Could not load compromised sessions. Ensure your role has Reports permission.
              </div>
            ) : (
              <div className="overflow-x-auto px-2 pb-2">
                <table className="w-full min-w-[900px] text-left text-sm">
                  <thead>
                    <tr className="border-b border-white/10 text-xs font-semibold uppercase tracking-wider text-slate-400">
                      <th className="px-4 py-3 font-medium">Auth User</th>
                      <th className="px-4 py-3 font-medium">User</th>
                      <th className="px-4 py-3 font-medium">Compromised at</th>
                      <th className="px-4 py-3 font-medium">Last login</th>
                      <th className="px-4 py-3 font-medium">Last IP</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredSessions.map((s) => (
                      <tr
                        key={`${s.authUserId}-${s.compromisedAt}`}
                        className="border-b border-white/5 transition-colors hover:bg-white/[0.03]"
                      >
                        <td className="px-4 py-3 text-slate-200">#{s.authUserId}</td>
                        <td className="px-4 py-3">
                          <p className="font-medium text-white">{s.fullName || 'Unknown user'}</p>
                          <p className="text-xs text-slate-400">{s.email}</p>
                        </td>
                        <td className="px-4 py-3 text-slate-300">
                          {formatDateTime(s.compromisedAt)}
                        </td>
                        <td className="px-4 py-3 text-slate-300">
                          {formatDateTime(s.lastLoginTime)}
                        </td>
                        <td className="px-4 py-3 text-slate-300">{s.lastLoginIpAddress || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {filteredSessions.length === 0 && (
                  <p className="py-6 text-center text-slate-400">No events match your filters.</p>
                )}
              </div>
            )}
          </PermissionGate>
        </DashboardTablePanel>
      </DashboardSubpageShell>
    </DashboardLayout>
  )
}

function PermissionPill({ label, granted }: { label: string; granted: boolean }) {
  return (
    <div
      className={`rounded-xl border px-3 py-2 text-xs font-medium ${
        granted
          ? 'border-emerald-500/35 bg-emerald-500/10 text-emerald-200'
          : 'border-rose-500/35 bg-rose-500/10 text-rose-200'
      }`}
    >
      <span className="mr-1">{granted ? '✓' : '✕'}</span>
      {label}
    </div>
  )
}

function DeviceAnalyticsPanel({
  analytics,
  loading,
  filter,
  onFilterChange,
  onRefresh,
}: {
  analytics?: DeviceSecurityAnalytics
  loading: boolean
  filter: string
  onFilterChange: (value: string) => void
  onRefresh: () => void
}) {
  const stats = [
    { label: 'Active devices', value: analytics?.totalActiveDevices ?? 0 },
    { label: 'Multi-device users', value: analytics?.usersWithMultipleDevices ?? 0 },
    { label: 'Suspicious accounts', value: analytics?.suspiciousAccounts ?? 0 },
    { label: 'Logins today', value: analytics?.dailyLogins ?? 0 },
    { label: 'Failed today', value: analytics?.failedLoginsToday ?? 0 },
  ]

  return (
    <DashboardTablePanel
      title="Device & session analytics"
      description="Mobile device registrations, login volume, and suspicious activity."
      toolbar={
        <>
          <select
            value={filter}
            onChange={(e) => onFilterChange(e.target.value)}
            className="rounded-xl border border-white/10 bg-slate-900/60 px-3 py-2 text-sm text-slate-200"
          >
            <option value="">All active devices</option>
            <option value="multiple">Multiple device users</option>
            <option value="suspicious">Suspicious accounts</option>
          </select>
          <Button variant="secondary" onClick={onRefresh} isLoading={loading}>
            Refresh
          </Button>
        </>
      }
    >
      <div className="grid gap-3 px-6 pb-4 sm:grid-cols-2 lg:grid-cols-5">
        {stats.map((s) => (
          <div key={s.label} className="rounded-xl border border-white/10 bg-slate-900/40 p-4">
            <p className="text-xs uppercase tracking-wide text-slate-400">{s.label}</p>
            <p className="mt-1 text-2xl font-semibold text-white">{loading ? '…' : s.value}</p>
          </div>
        ))}
      </div>
      {analytics?.platformBreakdown?.length ? (
        <div className="px-6 pb-4">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">Platforms</p>
          <div className="flex flex-wrap gap-2">
            {analytics.platformBreakdown.map((p) => (
              <span
                key={p.platform}
                className="rounded-full border border-cyan-500/30 bg-cyan-500/10 px-3 py-1 text-xs text-cyan-100"
              >
                {p.platform}: {p.count}
              </span>
            ))}
          </div>
        </div>
      ) : null}
      <div className="overflow-x-auto px-2 pb-4">
        <table className="min-w-full text-left text-sm">
          <thead>
            <tr className="border-b border-white/10 text-xs uppercase tracking-wide text-slate-400">
              <th className="px-4 py-3">Member</th>
              <th className="px-4 py-3">Device</th>
              <th className="px-4 py-3">Platform</th>
              <th className="px-4 py-3">Last login</th>
              <th className="px-4 py-3">Sessions</th>
              <th className="px-4 py-3">Failed</th>
            </tr>
          </thead>
          <tbody>
            {(analytics?.recentDevices ?? []).map((d) => (
              <tr key={d.deviceId} className="border-b border-white/5 text-slate-200">
                <td className="px-4 py-3">
                  <div className="font-medium">{d.memberName || '—'}</div>
                  <div className="text-xs text-slate-400">{d.email || '—'}</div>
                </td>
                <td className="px-4 py-3">
                  {d.deviceLabel}
                  {d.isSuspicious ? (
                    <span className="ml-2 rounded bg-amber-500/20 px-2 py-0.5 text-xs text-amber-200">
                      Suspicious
                    </span>
                  ) : null}
                </td>
                <td className="px-4 py-3">{d.platform || '—'}</td>
                <td className="px-4 py-3">{formatDateTime(d.lastLoginDate)}</td>
                <td className="px-4 py-3">{d.activeSessionCount}</td>
                <td className="px-4 py-3">{d.failedAttempts}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {!loading && (analytics?.recentDevices?.length ?? 0) === 0 && (
          <p className="py-6 text-center text-slate-400">No device records yet.</p>
        )}
      </div>
    </DashboardTablePanel>
  )
}
