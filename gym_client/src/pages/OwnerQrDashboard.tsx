import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { formatDistanceStrict, intervalToDuration } from 'date-fns'
import { motion } from 'framer-motion'
import toast from 'react-hot-toast'
import { AlertTriangle, Download, Loader2, QrCode, RefreshCw } from 'lucide-react'
import { Link, Navigate } from 'react-router-dom'
import { DashboardLayout } from '../components/layout/DashboardLayout'
import { DashboardSubpageShell } from '../components/layout/DashboardSubpageShell'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { authService } from '../services/auth.service'
import { branchesService } from '../services/branches.service'
import { qrService } from '../services/qr.service'
import type { BranchQrAccessPutDto } from '../types/qr'

function getDashboardUser() {
  try {
    const userJson = localStorage.getItem('user')
    if (!userJson) return { userName: 'User' }
    const user = JSON.parse(userJson) as { fullName?: string; username?: string }
    return {
      userName: user?.fullName?.trim() || user?.username?.trim() || 'User',
    }
  } catch {
    return { userName: 'User' }
  }
}

/** Prefer API `message` from axios failures (avoids generic "Request failed with status code …"). */
function axiosErrorDetail(e: unknown): string | undefined {
  if (typeof e === 'object' && e !== null && 'response' in e) {
    const d = (e as { response?: { data?: { message?: unknown } } }).response?.data?.message
    if (typeof d === 'string' && d.trim()) return d
  }
  if (e instanceof Error && e.message) return e.message
  return undefined
}

function formatCountdownMs(diffMs: number) {
  if (diffMs <= 0) return 'Expired'
  const base = new Date(0)
  const d = intervalToDuration({ start: base, end: new Date(base.getTime() + diffMs) })
  const pad = (n: number) => String(Math.max(0, n)).padStart(2, '0')
  return `${Math.max(0, d.days ?? 0)}d ${pad(d.hours ?? 0)}:${pad(d.minutes ?? 0)}:${pad(d.seconds ?? 0)}`
}

function useCountdownTarget(isoUtc: string | undefined) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(id)
  }, [])

  return useMemo(() => {
    if (!isoUtc) return null
    const diffMs = Math.max(0, new Date(isoUtc).getTime() - now)
    return formatCountdownMs(diffMs)
  }, [isoUtc, now])
}

async function qrPngDataUrl(payload: string) {
  const QR = (await import('qrcode')).default
  return QR.toDataURL(payload, {
    margin: 1,
    width: 288,
    color: { dark: '#0f172a', light: '#f8fafc' },
  })
}

export function OwnerQrDashboard() {
  const { userName } = getDashboardUser()
  const queryClient = useQueryClient()

  const canManageQr = authService.hasQrOwnerAccess()

  const branchesQuery = useQuery({
    queryKey: ['branches', 'qr-console'],
    queryFn: async () => (await branchesService.list({ activeOnly: true })).data,
    enabled: canManageQr,
  })

  const [branchId, setBranchId] = useState<number | null>(null)
  const branchSelected = branchId != null && branchId > 0

  useEffect(() => {
    if (branchId == null && branchesQuery.data?.length) {
      const first = branchesQuery.data[0].id
      if (Number.isFinite(first) && first > 0) setBranchId(first)
    }
  }, [branchesQuery.data, branchId])

  const dashQuery = useQuery({
    queryKey: ['qr', 'owner-dashboard', branchId],
    queryFn: async () => (await qrService.getOwnerDashboard(branchId!)).data,
    enabled: canManageQr && branchSelected,
  })

  const [latInput, setLatInput] = useState('')
  const [lngInput, setLngInput] = useState('')
  const [doorUrlInput, setDoorUrlInput] = useState('')

  useEffect(() => {
    const d = dashQuery.data
    if (!branchSelected || !d) return
    setLatInput(d.branchLatitude != null && !Number.isNaN(d.branchLatitude) ? String(d.branchLatitude) : '')
    setLngInput(
      d.branchLongitude != null && !Number.isNaN(d.branchLongitude) ? String(d.branchLongitude) : '',
    )
    setDoorUrlInput(d.esp32DoorBaseUrl ?? '')
  }, [dashQuery.data, branchId, branchSelected])

  const saveAccessMut = useMutation({
    mutationFn: async (): Promise<void> => {
      if (!branchSelected) return
      const parseCoord = (raw: string): number | null | undefined => {
        const t = raw.trim()
        if (!t) return null
        const n = Number(t)
        return Number.isFinite(n) ? n : undefined
      }
      const lat = parseCoord(latInput)
      const lng = parseCoord(lngInput)
      if (lat === undefined || lng === undefined) {
        toast.error('Latitude and longitude must be valid numbers (or empty to clear).')
        return
      }
      if (lat != null && (lat < -90 || lat > 90)) {
        toast.error('Latitude must be between -90 and 90.')
        return
      }
      if (lng != null && (lng < -180 || lng > 180)) {
        toast.error('Longitude must be between -180 and 180.')
        return
      }
      const payload: BranchQrAccessPutDto = {
        latitude: lat,
        longitude: lng,
        esp32DoorBaseUrl: doorUrlInput.trim() || null,
      }
      await branchesService.updateQrAccess(branchId, payload)
    },
    onSuccess: () => {
      toast.success('Branch access settings saved.')
      void queryClient.invalidateQueries({ queryKey: ['qr'] })
      void queryClient.invalidateQueries({ queryKey: ['branches'] })
    },
    onError: (e: unknown) => {
      const msg =
        typeof e === 'object' &&
        e &&
        'response' in e &&
        typeof (e as { response?: { data?: { message?: string } } }).response?.data?.message ===
          'string'
          ? String((e as { response: { data: { message?: string } } }).response.data?.message)
          : 'Could not save settings.'
      toast.error(msg)
    },
  })

  const generateMut = useMutation({
    mutationFn: async () => qrService.generate(branchId!),
    onSuccess: () => {
      toast.success('New venue QR activated.')
      void queryClient.invalidateQueries({ queryKey: ['qr'] })
    },
    onError: (e: unknown) => {
      toast.error(axiosErrorDetail(e) ?? 'Could not generate QR.')
    },
  })

  const countdown = useCountdownTarget(dashQuery.data?.activeQr?.expiryDateUtc)

  const [previewDataUrl, setPreviewDataUrl] = useState('')
  const [previewPngBusy, setPreviewPngBusy] = useState(false)

  useEffect(() => {
    if (!branchSelected) {
      setPreviewDataUrl('')
      setPreviewPngBusy(false)
      return
    }
    const token = dashQuery.data?.activeQr?.qrToken
    if (!token) {
      setPreviewDataUrl('')
      setPreviewPngBusy(false)
      return
    }
    let cancelled = false
    setPreviewPngBusy(true)
    void (async () => {
      try {
        const url = await qrPngDataUrl(token)
        if (!cancelled) setPreviewDataUrl(url)
      } catch {
        if (!cancelled) setPreviewDataUrl('')
      } finally {
        if (!cancelled) setPreviewPngBusy(false)
      }
    })()
    return () => {
      cancelled = true
      setPreviewPngBusy(false)
    }
  }, [branchSelected, dashQuery.data?.activeQr?.qrToken])

  /** Disabled queries stay `pending` in RQ v5 — only treat as loading while a fetch is active. */
  const qrPanelFetching = branchSelected && dashQuery.fetchStatus === 'fetching'

  const downloadQr = async () => {
    const token = dashQuery.data?.activeQr?.qrToken
    if (!token) {
      toast.error('No active token to export.')
      return
    }
    try {
      const url = await qrPngDataUrl(token)
      const a = document.createElement('a')
      a.href = url
      a.download = `gym-branch-${branchId}-qr.png`
      a.click()
    } catch {
      toast.error('Could not render QR PNG.')
    }
  }

  if (!canManageQr) {
    return <Navigate to="/dashboard" replace />
  }

  const glassCard =
    'rounded-3xl border border-white/10 bg-white/[0.04] shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur-2xl'

  return (
    <DashboardLayout userName={userName}>
      <DashboardSubpageShell
        eyebrow="Access control"
        titleGradient="Venue QR & entry"
        subtitle="Monthly rotating QR · premium glass console · ESP32-ready unlock pipeline."
        showExport={false}
      >
        <div className="min-h-[60vh] space-y-6 bg-gradient-to-b from-slate-950 via-indigo-950/40 to-slate-950 p-6 text-slate-100">
          <div className="mx-auto flex max-w-6xl flex-col gap-6">
            <motion.div
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
              className={`${glassCard} p-6`}
            >
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <h2 className="text-xl font-semibold tracking-tight">Branch</h2>
                  <p className="mt-1 text-sm text-slate-400">
                    Generate rotating codes per venue. Set GPS + optional per-branch ESP32 URL below.
                  </p>
                </div>
                <div className="flex flex-wrap gap-3">
                  <select
                    aria-label="Branch for QR operations"
                    className="rounded-2xl border border-white/10 bg-black/40 px-4 py-2.5 text-sm text-white outline-none focus:ring-2 focus:ring-cyan-400/40"
                    value={branchId ?? ''}
                    onChange={(e) => {
                      const raw = e.target.value
                      if (raw === '') {
                        setBranchId(null)
                        return
                      }
                      const n = Number(raw)
                      setBranchId(Number.isFinite(n) && n > 0 ? n : null)
                    }}
                  >
                    {branchesQuery.isPending && <option value="">Loading…</option>}
                    {!branchesQuery.isPending && (
                      <option value="" className="bg-slate-900">
                        Select branch…
                      </option>
                    )}
                    {(branchesQuery.data ?? []).map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.branchName}
                      </option>
                    ))}
                  </select>
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => void branchesQuery.refetch()}
                    disabled={branchesQuery.isFetching}
                  >
                    {branchesQuery.isFetching ? (
                      <Loader2 className="size-4 animate-spin" aria-hidden />
                    ) : (
                      <RefreshCw className="size-4" aria-hidden />
                    )}
                    <span className="sr-only md:not-sr-only md:ml-2">Reload</span>
                  </Button>
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className={`${glassCard} p-6`}
            >
              <h3 className="text-lg font-semibold tracking-tight text-white">Branch GPS &amp; door relay</h3>
              <p className="mt-1 text-sm text-slate-400">
                Geo-fence radius is 100 m. Each branch can pin its own ESP32 (e.g. <code className="rounded bg-black/40 px-1">http://192.168.1.50</code>); otherwise the
                global <code className="rounded bg-black/40 px-1">DoorDevice:Esp32BaseUrl</code> is used.
              </p>
              <div className="mt-6 grid gap-4 md:grid-cols-3">
                <Input
                  label="Latitude (WGS84)"
                  type="text"
                  inputMode="decimal"
                  autoComplete="off"
                  placeholder="-33.8688"
                  value={latInput}
                  onChange={(e) => setLatInput(e.target.value)}
                />
                <Input
                  label="Longitude (WGS84)"
                  type="text"
                  inputMode="decimal"
                  autoComplete="off"
                  placeholder="151.2093"
                  value={lngInput}
                  onChange={(e) => setLngInput(e.target.value)}
                />
                <Input
                  label="ESP32 base URL (optional)"
                  type="url"
                  placeholder="http://device-ip"
                  value={doorUrlInput}
                  onChange={(e) => setDoorUrlInput(e.target.value)}
                />
              </div>
              <div className="mt-6 flex flex-wrap gap-3">
                <Button
                  type="button"
                  variant="secondary"
                  disabled={saveAccessMut.isPending}
                  onClick={() => {
                    const d = dashQuery.data
                    if (!d) return
                    setLatInput(d.branchLatitude != null ? String(d.branchLatitude) : '')
                    setLngInput(d.branchLongitude != null ? String(d.branchLongitude) : '')
                    setDoorUrlInput(d.esp32DoorBaseUrl ?? '')
                  }}
                >
                  Reset
                </Button>
                <Button
                  type="button"
                  disabled={!branchSelected}
                  isLoading={saveAccessMut.isPending}
                  onClick={() => saveAccessMut.mutate()}
                >
                  Save branch settings
                </Button>
              </div>
            </motion.div>

            {branchSelected && dashQuery.data && dashQuery.data.branchIsActive === false && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className={`${glassCard} flex items-start gap-3 border-rose-500/40 bg-rose-500/[0.1] p-4 text-rose-50`}
              >
                <AlertTriangle className="mt-0.5 size-5 shrink-0 text-rose-300" aria-hidden />
                <div className="text-sm">
                  <p className="font-medium">Branch is inactive</p>
                  <p className="mt-1 text-rose-100/90">
                    Reactivate this branch on{' '}
                    <Link
                      to="/dashboard/access/branches"
                      className="font-semibold text-white underline underline-offset-2 hover:text-rose-50"
                    >
                      Branches
                    </Link>{' '}
                    before generating a venue QR code.
                  </p>
                </div>
              </motion.div>
            )}

            {branchSelected && dashQuery.data && !dashQuery.data.branchGeoConfigured && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className={`${glassCard} flex items-start gap-3 border-amber-500/35 bg-amber-500/[0.08] p-4 text-amber-100`}
              >
                <AlertTriangle className="mt-0.5 size-5 shrink-0 text-amber-400" aria-hidden />
                <div className="text-sm">
                  <p className="font-medium">Branch coordinates missing</p>
                  <p className="mt-1 text-amber-200/85">
                    Enter latitude and longitude in the form above (WGS84) so the 100 m check-in gate can be
                    enforced.
                  </p>
                </div>
              </motion.div>
            )}

            {branchSelected && dashQuery.data && !dashQuery.data.branchDoorUrlConfigured && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className={`${glassCard} flex items-start gap-3 border-sky-500/35 bg-sky-500/[0.07] p-4 text-sky-50`}
              >
                <AlertTriangle className="mt-0.5 size-5 shrink-0 text-sky-300" aria-hidden />
                <div className="text-sm">
                  <p className="font-medium">No branch-specific door URL</p>
                  <p className="mt-1 text-sky-100/90">
                    Scans will fall back to the global API <code className="rounded bg-black/40 px-1">DoorDevice:Esp32BaseUrl</code>.
                    Set one per branch above if each site has its own ESP32.
                  </p>
                </div>
              </motion.div>
            )}

            {branchSelected && dashQuery.data?.expiresWithinThreeDays && dashQuery.data?.activeQr && (
              <motion.div
                layout
                className={`${glassCard} flex items-start gap-3 border-rose-500/40 bg-rose-500/[0.12] p-4 text-rose-50`}
              >
                <AlertTriangle className="mt-0.5 size-5 shrink-0" aria-hidden />
                <div>
                  <p className="font-semibold tracking-tight">Expiry window · last 3 days</p>
                  <p className="mt-1 text-sm text-rose-100/90">
                    This token expires{' '}
                    {formatDistanceStrict(new Date(dashQuery.data.activeQr.expiryDateUtc), new Date(), {
                      addSuffix: true,
                    })}
                    . In-app reminders are queued for ADMIN users in the organisation.
                  </p>
                </div>
              </motion.div>
            )}

            <div className="grid gap-6 lg:grid-cols-12">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.05, duration: 0.5 }}
                className={`${glassCard} p-6 lg:col-span-5`}
              >
                <div className="flex items-center gap-3">
                  <div className="flex size-11 items-center justify-center rounded-2xl bg-cyan-500/15 ring-1 ring-cyan-400/35">
                    <QrCode className="size-6 text-cyan-200" aria-hidden />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold tracking-tight">Live venue QR</h3>
                    <p className="text-sm text-slate-400">Rotates monthly · GUID payload</p>
                  </div>
                </div>

                <div className="mt-8 flex justify-center rounded-3xl bg-gradient-to-br from-white/15 to-transparent p-6 ring-1 ring-white/15">
                  {!branchSelected ? (
                    <p className="text-center text-sm text-slate-400">
                      {branchesQuery.isFetching
                        ? 'Loading branches…'
                        : branchesQuery.data?.length
                          ? 'Select a branch above.'
                          : 'No branches in the database · add branches first.'}
                    </p>
                  ) : dashQuery.isError ? (
                    <div className="max-w-xs text-center text-sm text-rose-300">
                      Could not load venue QR: {axiosErrorDetail(dashQuery.error) ?? 'Request failed'}
                    </div>
                  ) : qrPanelFetching || previewPngBusy ? (
                    <Loader2 className="size-10 animate-spin text-cyan-200" aria-label="Loading" />
                  ) : previewDataUrl ? (
                    <img
                      alt="Venue QR"
                      width={288}
                      height={288}
                      className="rounded-3xl shadow-2xl shadow-black/70"
                      src={previewDataUrl}
                    />
                  ) : (
                    <p className="text-center text-sm text-slate-400">
                      No active QR · generate one below.
                    </p>
                  )}
                </div>

                {dashQuery.data?.activeQr && (
                  <div className="mt-6 grid gap-2 text-center text-sm">
                    <p className="text-slate-400">Expires UTC</p>
                    <p className="font-mono text-xs text-emerald-200/90 md:text-sm">
                      {new Date(dashQuery.data.activeQr.expiryDateUtc).toISOString()}
                    </p>
                    <p className="text-lg font-semibold tracking-tight text-white">
                      {countdown ?? '—'}
                      <span className="ml-2 text-xs font-normal text-slate-500">until expiry</span>
                    </p>
                  </div>
                )}

                <div className="mt-8 flex flex-wrap gap-3">
                  <Button
                    type="button"
                    onClick={() => branchSelected && generateMut.mutate()}
                    disabled={
                      !branchSelected ||
                      generateMut.isPending ||
                      dashQuery.data?.branchIsActive === false
                    }
                  >
                    {generateMut.isPending ? (
                      <Loader2 className="size-4 animate-spin" aria-hidden />
                    ) : (
                      <RefreshCw className="size-4" aria-hidden />
                    )}
                    <span className="ml-2">Generate new QR</span>
                  </Button>
                  <Button type="button" variant="secondary" onClick={() => void downloadQr()}>
                    <Download className="size-4" aria-hidden />
                    <span className="ml-2">Download PNG</span>
                  </Button>
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.12, duration: 0.5 }}
                className={`${glassCard} p-0 lg:col-span-7`}
              >
                <div className="border-b border-white/10 px-6 py-4">
                  <h3 className="text-lg font-semibold tracking-tight">Recent QR scans</h3>
                  <p className="text-sm text-slate-400">Latest check-ins for tokens issued to this branch</p>
                </div>
                <div className="max-h-[480px] overflow-auto">
                  <table className="w-full min-w-[520px] text-left text-sm">
                    <thead className="sticky top-0 bg-slate-950/90 text-xs uppercase tracking-wide text-slate-500 backdrop-blur">
                      <tr>
                        <th className="px-6 py-3 font-medium">When (UTC)</th>
                        <th className="px-6 py-3 font-medium">Member</th>
                        <th className="px-6 py-3 font-medium">Notes</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {(dashQuery.data?.recentScans ?? []).length === 0 ? (
                        <tr>
                          <td colSpan={3} className="px-6 py-10 text-center text-slate-500">
                            No scans yet.
                          </td>
                        </tr>
                      ) : (
                        (dashQuery.data?.recentScans ?? []).map((row) => (
                          <tr key={row.attendanceLogId} className="hover:bg-white/[0.03]">
                            <td className="px-6 py-3 font-mono text-xs text-slate-300">
                              {new Date(row.checkInTimeUtc).toISOString()}
                            </td>
                            <td className="px-6 py-3 text-slate-200">
                              {row.memberName ?? '—'}
                              {row.userId != null && (
                                <span className="ml-2 text-xs text-slate-500">#{row.userId}</span>
                              )}
                            </td>
                            <td className="max-w-xs truncate px-6 py-3 text-xs text-slate-500">
                              {row.notes ?? '—'}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </motion.div>
            </div>
          </div>
        </div>
      </DashboardSubpageShell>
    </DashboardLayout>
  )
}
