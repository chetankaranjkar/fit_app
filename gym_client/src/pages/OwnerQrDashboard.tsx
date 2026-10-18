import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { intervalToDuration } from 'date-fns'
import toast from 'react-hot-toast'
import { Activity, AlertTriangle, ArrowUpRight, Building2, Check, ChevronRight, Clock3, DoorOpen, Download, Loader2, MapPin, Minus, Plus, QrCode, RefreshCw, ScanLine, Settings2, ShieldCheck } from 'lucide-react'
import { Link, Navigate } from 'react-router-dom'
import { DashboardLayout } from '../components/layout/DashboardLayout'
import { DashboardPageContent } from '../components/layout/DataPageShell'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { authService } from '../services/auth.service'
import { branchesService } from '../services/branches.service'
import { qrService } from '../services/qr.service'
import type { BranchQrAccessPutDto } from '../types/qr'
import './ownerQrDashboard.css'

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

/** Must match API `GymQrService` offset bounds; effective radius is clamped to 10–10,000 m. */
const CHECK_IN_RADIUS_OFFSET_MIN = -90
const CHECK_IN_RADIUS_OFFSET_MAX = 9900

function effectiveCheckInRadiusMeters(offset: number): number {
  return Math.min(10_000, Math.max(10, 100 + offset))
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
    margin: 4,
    width: 576,
    color: { dark: '#0f172a', light: '#ffffff' },
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
  const [radiusOffsetMeters, setRadiusOffsetMeters] = useState(0)

  useEffect(() => {
    const d = dashQuery.data
    if (!branchSelected || !d) return
    setLatInput(d.branchLatitude != null && !Number.isNaN(d.branchLatitude) ? String(d.branchLatitude) : '')
    setLngInput(
      d.branchLongitude != null && !Number.isNaN(d.branchLongitude) ? String(d.branchLongitude) : '',
    )
    setDoorUrlInput(d.esp32DoorBaseUrl ?? '')
    setRadiusOffsetMeters(
      typeof d.checkInRadiusOffsetMeters === 'number' && !Number.isNaN(d.checkInRadiusOffsetMeters)
        ? d.checkInRadiusOffsetMeters
        : 0,
    )
  }, [dashQuery.data, branchId, branchSelected])

  const saveAccessMut = useMutation({
    mutationFn: async (): Promise<boolean> => {
      if (!branchSelected) return false
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
        return false
      }
      if (lat != null && (lat < -90 || lat > 90)) {
        toast.error('Latitude must be between -90 and 90.')
        return false
      }
      if (lng != null && (lng < -180 || lng > 180)) {
        toast.error('Longitude must be between -180 and 180.')
        return false
      }
      if (
        radiusOffsetMeters < CHECK_IN_RADIUS_OFFSET_MIN ||
        radiusOffsetMeters > CHECK_IN_RADIUS_OFFSET_MAX
      ) {
        toast.error(
          `Radius offset must be between ${CHECK_IN_RADIUS_OFFSET_MIN} and ${CHECK_IN_RADIUS_OFFSET_MAX} meters.`,
        )
        return false
      }
      const payload: BranchQrAccessPutDto = {
        latitude: lat,
        longitude: lng,
        esp32DoorBaseUrl: doorUrlInput.trim() || null,
        checkInRadiusOffsetMeters: radiusOffsetMeters,
      }
      await branchesService.updateQrAccess(branchId, payload)
      return true
    },
    onSuccess: (saved) => {
      if (!saved) return
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

  const dashboard = dashQuery.data
  const activeQr = dashboard?.activeQr
  const branchName = dashboard?.branchName || branchesQuery.data?.find((branch) => branch.id === branchId)?.branchName || 'Select a branch'
  const qrExpired = countdown === 'Expired'
  const qrReady = Boolean(activeQr) && !qrExpired
  const settingsReady = branchSelected && Boolean(dashboard) && !dashQuery.isError && !qrPanelFetching
  const radius = effectiveCheckInRadiusMeters(radiusOffsetMeters)
  const statusLabel = !branchSelected ? 'No branch selected' : !dashboard ? 'Awaiting branch data' : dashboard.branchIsActive === false ? 'Branch inactive' : qrExpired ? 'QR expired' : activeQr ? 'QR active' : 'No active QR'
  const formatWhen = (value: string) => {
    const parsed = new Date(value)
    return Number.isNaN(parsed.getTime()) ? '—' : parsed.toLocaleString(undefined, { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' })
  }
  const resetSettings = () => {
    if (!dashboard) return
    setLatInput(dashboard.branchLatitude != null ? String(dashboard.branchLatitude) : '')
    setLngInput(dashboard.branchLongitude != null ? String(dashboard.branchLongitude) : '')
    setDoorUrlInput(dashboard.esp32DoorBaseUrl ?? '')
    setRadiusOffsetMeters(dashboard.checkInRadiusOffsetMeters ?? 0)
  }

  return (
    <DashboardLayout userName={userName}>
      <DashboardPageContent className="owner-qr-page">
        <header className="owner-qr-page-header">
          <div><span className="owner-qr-eyebrow"><ShieldCheck size={14} aria-hidden="true" />ACCESS CONTROL</span><h1>Venue QR <span>& entry</span></h1><p>One place to manage your branch QR, entry rules, and recent check-ins.</p></div>
          <Link to="/dashboard/access/branches" className="owner-qr-text-link">Manage branches <ArrowUpRight size={15} aria-hidden="true" /></Link>
        </header>

        <section className="owner-qr-branch-bar" aria-label="Branch selection">
          <span className="owner-qr-branch-icon"><Building2 size={21} aria-hidden="true" /></span>
          <div className="owner-qr-branch-copy"><span className="owner-qr-meta-label">CURRENT VENUE</span><h2>{branchName}</h2></div>
          <div className="owner-qr-branch-controls">
            <select aria-label="Branch for QR operations" value={branchId ?? ''} disabled={branchesQuery.isFetching || saveAccessMut.isPending || generateMut.isPending}
              onChange={(event) => { const next = Number(event.target.value); setBranchId(Number.isFinite(next) && next > 0 ? next : null) }}>
              <option value="">{branchesQuery.isPending ? 'Loading branches…' : 'Select branch…'}</option>
              {(branchesQuery.data ?? []).map((branch) => <option key={branch.id} value={branch.id}>{branch.branchName}</option>)}
            </select>
            <button type="button" className="owner-qr-icon-button" aria-label="Reload branches" disabled={branchesQuery.isFetching} onClick={() => void branchesQuery.refetch()}><RefreshCw size={16} className={branchesQuery.isFetching ? 'animate-spin' : ''} aria-hidden="true" /></button>
          </div>
        </section>
        {branchesQuery.isError && <div role="alert" className="owner-qr-alert"><AlertTriangle size={17} aria-hidden="true" /><p>Could not load branches. {axiosErrorDetail(branchesQuery.error)} Use Reload branches to try again.</p></div>}
        {branchesQuery.isSuccess && !branchesQuery.data.length && <div className="owner-qr-alert"><Building2 size={18} aria-hidden="true" /><p>No branches yet. <Link to="/dashboard/access/branches">Add a branch</Link> to set up member entry.</p></div>}

        <div className="owner-qr-summary" aria-label="Branch access summary">
          <div><QrCode size={17} aria-hidden="true" /><span>Venue code<strong className={qrReady && dashboard?.branchIsActive !== false ? 'owner-qr-positive' : ''}>{statusLabel}</strong></span></div>
          <div><MapPin size={17} aria-hidden="true" /><span>Location gate<strong>{!dashboard ? '—' : dashboard.branchGeoConfigured ? 'Coordinates saved' : 'Location needed'}</strong></span></div>
          <div><ScanLine size={17} aria-hidden="true" /><span>Saved entry radius<strong>{dashboard ? `${dashboard.effectiveCheckInRadiusMeters ?? effectiveCheckInRadiusMeters(dashboard.checkInRadiusOffsetMeters ?? 0)} m` : '—'}</strong></span></div>
          <div><DoorOpen size={17} aria-hidden="true" /><span>Door connection<strong>{!dashboard ? '—' : dashboard.branchDoorUrlConfigured ? 'Branch device set' : 'Using global settings'}</strong></span></div>
        </div>

        <div className="owner-qr-main-grid">
          <section className="owner-qr-code-card">
            <div className="owner-qr-card-heading"><div><span className="owner-qr-eyebrow">READY AT THE FRONT DESK</span><h2><QrCode size={20} aria-hidden="true" />Your venue QR</h2></div><span className={`owner-qr-status ${qrReady ? 'active' : ''}`}><i />{qrReady ? 'Active code' : 'Not active'}</span></div>
            <p className="owner-qr-description">Display this code at your entrance for members to scan.</p>
            <div className="owner-qr-code-stage">
              <span className="owner-qr-scan-corner top-left" aria-hidden="true" /><span className="owner-qr-scan-corner bottom-right" aria-hidden="true" />
              {!branchSelected ? <div className="owner-qr-placeholder"><QrCode size={44} aria-hidden="true" /><h3>{branchesQuery.isFetching ? 'Loading your venues' : 'Choose a venue'}</h3><p>Select a branch to view its entry code.</p></div>
                : dashQuery.isError ? <div role="alert" className="owner-qr-placeholder"><AlertTriangle size={30} aria-hidden="true" /><h3>Unable to load QR</h3><p>{axiosErrorDetail(dashQuery.error) ?? 'Please try again.'}</p><button type="button" onClick={() => void dashQuery.refetch()} className="owner-qr-text-link">Try again <RefreshCw size={13} aria-hidden="true" /></button></div>
                : qrPanelFetching || previewPngBusy ? <div role="status" className="owner-qr-placeholder"><Loader2 size={32} className="animate-spin" aria-hidden="true" /><p>Preparing venue QR…</p></div>
                : previewDataUrl ? <img alt={`Venue QR for ${branchName}`} width={288} height={288} src={previewDataUrl} />
                : <div className="owner-qr-placeholder"><QrCode size={44} aria-hidden="true" /><h3>No active QR yet</h3><p>Generate a code below to set up member check-in.</p></div>}
            </div>
            <div className="owner-qr-code-caption"><ScanLine size={14} aria-hidden="true" /><span>{branchName}</span><span className="owner-qr-caption-dot" />Member check-in</div>

            {activeQr && <div className={`owner-qr-expiry ${dashboard?.expiresWithinThreeDays || qrExpired ? 'expiring' : ''}`}>
              <Clock3 size={18} aria-hidden="true" /><div><span className="owner-qr-meta-label">{qrExpired ? 'CODE EXPIRED' : 'TIME UNTIL EXPIRY'}</span><strong>{countdown ?? '—'}</strong><p>Expires {formatWhen(activeQr.expiryDateUtc)} <span>(local time)</span></p></div>
            </div>}
            {dashboard?.expiresWithinThreeDays && activeQr && <p className="owner-qr-expiry-note"><AlertTriangle size={14} aria-hidden="true" />{qrExpired ? 'Generate a new code to restore entry.' : 'Expires soon. Generate and display a fresh code before expiry.'}</p>}
            {dashboard?.branchIsActive === false && <div role="alert" className="owner-qr-alert"><AlertTriangle size={17} aria-hidden="true" /><p>Branch inactive. <Link to="/dashboard/access/branches">Reactivate this branch</Link> before generating a code.</p></div>}
            <div className="owner-qr-code-actions">
              <Button type="button" className="owner-qr-primary" disabled={!settingsReady || generateMut.isPending || dashboard?.branchIsActive === false} isLoading={generateMut.isPending} onClick={() => generateMut.mutate()}><RefreshCw size={15} aria-hidden="true" />Generate new QR</Button>
              <Button type="button" variant="secondary" disabled={!settingsReady || !activeQr || previewPngBusy} onClick={() => void downloadQr()}><Download size={15} aria-hidden="true" />Download PNG</Button>
            </div>
            <p className="owner-qr-fine-print"><ShieldCheck size={13} aria-hidden="true" />Generating a new QR replaces the current code. Update your entrance display afterward.</p>
            <div className="owner-qr-entry-guide"><span>HOW MEMBERS ENTER</span><ol><li><b>01</b>Scan the venue QR</li><li><b>02</b>Confirm location near the gym</li><li><b>03</b>Membership is checked before entry</li></ol></div>
          </section>

          <section className="owner-qr-settings-card">
            <div className="owner-qr-card-heading"><div><span className="owner-qr-eyebrow">MAKE EVERY CHECK-IN COUNT</span><h2><Settings2 size={20} aria-hidden="true" />Branch entry settings</h2></div></div>
            <p className="owner-qr-description">Set where members can check in and which door device to use.</p>
            <form onSubmit={(event) => { event.preventDefault(); saveAccessMut.mutate() }}>
              <fieldset disabled={!settingsReady || saveAccessMut.isPending}>
                <div className="owner-qr-setting-section">
                  <div className="owner-qr-section-title"><span className="owner-qr-setting-icon"><MapPin size={17} aria-hidden="true" /></span><div><h3>Gym location</h3><p>Pin the entrance used for member check-ins.</p></div><span className={`owner-qr-small-badge ${dashboard?.branchGeoConfigured ? 'ready' : ''}`}>{dashboard?.branchGeoConfigured ? 'Configured' : 'Setup needed'}</span></div>
                  <div className="owner-qr-coordinate-fields"><Input label="Latitude (WGS84)" type="text" inputMode="decimal" autoComplete="off" placeholder="e.g. 19.0760" value={latInput} onChange={(event) => setLatInput(event.target.value)} /><Input label="Longitude (WGS84)" type="text" inputMode="decimal" autoComplete="off" placeholder="e.g. 72.8777" value={lngInput} onChange={(event) => setLngInput(event.target.value)} /></div>
                  {dashboard && !dashboard.branchGeoConfigured && <p className="owner-qr-inline-notice"><AlertTriangle size={13} aria-hidden="true" />Save both coordinates to configure the distance check.</p>}
                </div>

                <div className="owner-qr-setting-section">
                  <div className="owner-qr-section-title"><span className="owner-qr-setting-icon"><ScanLine size={17} aria-hidden="true" /></span><div><h3>Check-in radius</h3><p>How close members must be to the gym.</p></div></div>
                  <div className="owner-qr-radius-panel"><div className="owner-qr-radius-display"><span>Effective radius</span><strong>{radius.toLocaleString()}<small>m</small></strong><p>100 m default + {radiusOffsetMeters} m offset</p></div><div className="owner-qr-radius-controls">
                    <div className="owner-qr-stepper"><button type="button" aria-label="Decrease radius by 10 meters" disabled={radiusOffsetMeters <= CHECK_IN_RADIUS_OFFSET_MIN} onClick={() => setRadiusOffsetMeters((value) => Math.max(CHECK_IN_RADIUS_OFFSET_MIN, value - 10))}><Minus size={16} aria-hidden="true" /></button><Input label="Offset (meters)" type="number" step={1} min={CHECK_IN_RADIUS_OFFSET_MIN} max={CHECK_IN_RADIUS_OFFSET_MAX} value={radiusOffsetMeters} onChange={(event) => { const value = Number(event.target.value); if (Number.isFinite(value)) setRadiusOffsetMeters(Math.min(CHECK_IN_RADIUS_OFFSET_MAX, Math.max(CHECK_IN_RADIUS_OFFSET_MIN, Math.round(value)))) }} /><button type="button" aria-label="Increase radius by 10 meters" disabled={radiusOffsetMeters >= CHECK_IN_RADIUS_OFFSET_MAX} onClick={() => setRadiusOffsetMeters((value) => Math.min(CHECK_IN_RADIUS_OFFSET_MAX, value + 10))}><Plus size={16} aria-hidden="true" /></button></div>
                    <div className="owner-qr-presets" aria-label="Radius presets">{[50, 100, 200, 500].map((value) => <button key={value} type="button" aria-pressed={radius === value} onClick={() => setRadiusOffsetMeters(value - 100)}>{value} m</button>)}</div>
                  </div></div>
                  <p className="owner-qr-field-hint">Allowed radius: 10–10,000 m. Changes apply after saving.</p>
                </div>

                <div className="owner-qr-setting-section">
                  <div className="owner-qr-section-title"><span className="owner-qr-setting-icon"><DoorOpen size={17} aria-hidden="true" /></span><div><h3>Door connection</h3><p>Optional device address for this branch.</p></div></div>
                  <Input label="ESP32 base URL (optional)" type="url" placeholder="http://192.168.1.50" value={doorUrlInput} onChange={(event) => setDoorUrlInput(event.target.value)} />
                  <p className="owner-qr-field-hint">Leave empty to use the gym's global door settings. A saved address does not confirm the device is online.</p>
                </div>
                <div className="owner-qr-settings-footer"><button type="button" className="owner-qr-text-link" onClick={resetSettings}><RefreshCw size={13} aria-hidden="true" />Reset changes</button><Button type="submit" className="owner-qr-primary" isLoading={saveAccessMut.isPending}><Check size={15} aria-hidden="true" />Save branch settings</Button></div>
              </fieldset>
            </form>
          </section>
        </div>

        <section className="owner-qr-history-card">
          <div className="owner-qr-history-heading"><div><span className="owner-qr-eyebrow">AT YOUR ENTRANCE</span><h2><Activity size={20} aria-hidden="true" />Recent QR scans</h2><p>Latest check-ins recorded for {branchSelected ? branchName : 'the selected branch'}. Times shown in your local timezone.</p></div><button type="button" className="owner-qr-text-link" disabled={!branchSelected || dashQuery.isFetching} onClick={() => void dashQuery.refetch()}><RefreshCw size={14} className={dashQuery.isFetching ? 'animate-spin' : ''} aria-hidden="true" />Refresh activity</button></div>
          {!branchSelected || !dashboard || !dashboard.recentScans.length ? <div className="owner-qr-history-empty"><span><ScanLine size={27} aria-hidden="true" /></span><h3>{dashQuery.isError ? 'Activity unavailable' : qrPanelFetching ? 'Loading activity…' : 'Your next check-in starts here'}</h3><p>{dashQuery.isError ? 'Refresh activity to try again.' : branchSelected ? 'Member check-ins will appear here after a successful QR scan.' : 'Select a branch to see its recent check-ins.'}</p></div>
            : <div className="owner-qr-scans-table"><table><thead><tr><th>MEMBER</th><th>CHECK-IN TIME</th><th>NOTES</th></tr></thead><tbody>{dashboard.recentScans.map((scan) => <tr key={scan.attendanceLogId}><td><div className="owner-qr-member-cell"><span className="owner-qr-member-avatar" aria-hidden="true">{scan.memberName?.trim().slice(0, 1).toUpperCase() || '?'}</span><div><strong>{scan.memberName || 'Unknown member'}</strong>{scan.userId != null && <small>Member #{scan.userId}</small>}</div></div></td><td><time dateTime={scan.checkInTimeUtc}>{formatWhen(scan.checkInTimeUtc)}</time></td><td>{scan.notes || '—'}</td></tr>)}</tbody></table></div>}
          <Link to="/dashboard/attendance" className="owner-qr-history-footer">View attendance records <ChevronRight size={14} aria-hidden="true" /></Link>
        </section>
      </DashboardPageContent>
    </DashboardLayout>
  )
}
