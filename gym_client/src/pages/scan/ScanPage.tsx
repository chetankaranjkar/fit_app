import { useCallback, useMemo, useState } from 'react'
import axios from 'axios'
import { motion } from 'framer-motion'
import toast from 'react-hot-toast'
import { Loader2, MapPin, Smartphone } from 'lucide-react'
import { DashboardLayout } from '../../components/layout/DashboardLayout'
import { DashboardSubpageShell } from '../../components/layout/DashboardSubpageShell'
import { Button } from '../../components/ui/Button'
import { attendanceService } from '../../services/attendance.service'
import type { AttendanceScanResponseDto } from '../../types/qr'
import { ScanResult } from './ScanResult'
import { ScannerView } from './ScannerView'

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

type Step = 'loc' | 'scan' | 'result'

const LOCATION_BLOCKED =
  'Location is blocked for this site. In the address bar, open site settings, allow Location, then tap Share precise location again.'

function geolocationErrorMessage(err: GeolocationPositionError): string {
  switch (err.code) {
    case 1:
      return LOCATION_BLOCKED
    case 2:
      return 'This device could not determine a position. Turn on system Location (GPS) and retry.'
    case 3:
      return 'Location timed out. Keep Location on, move near a window, and retry.'
    default:
      return 'Could not read your location. Grant permission and retry (required for geo-fenced check-in).'
  }
}

function requestPosition(options: PositionOptions): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(resolve, reject, options)
  })
}

async function readCheckInPosition(): Promise<GeolocationPosition> {
  if (!window.isSecureContext) {
    throw new Error('Location only works over HTTPS. Reload this page using the https:// address.')
  }
  if (!navigator.geolocation) {
    throw new Error(
      'This browser cannot share location. Use Chrome or Safari and allow Location for this site.',
    )
  }

  try {
    const perm = await navigator.permissions?.query({ name: 'geolocation' })
    if (perm?.state === 'denied') {
      throw new Error(LOCATION_BLOCKED)
    }
  } catch (e) {
    if (e instanceof Error && e.message === LOCATION_BLOCKED) throw e
  }

  try {
    return await requestPosition({ enableHighAccuracy: true, timeout: 12_000, maximumAge: 0 })
  } catch (err) {
    const geo = err as GeolocationPositionError
    if (geo?.code === 1) throw new Error(geolocationErrorMessage(geo))
    try {
      return await requestPosition({
        enableHighAccuracy: false,
        timeout: 20_000,
        maximumAge: 120_000,
      })
    } catch (fallbackErr) {
      const fallback = fallbackErr as GeolocationPositionError
      if (typeof fallback?.code === 'number') throw new Error(geolocationErrorMessage(fallback))
      throw new Error(
        'Could not read your location. Grant permission and retry (required for geo-fenced check-in).',
      )
    }
  }
}

function coerceScanError(e: unknown): AttendanceScanResponseDto | null {
  if (!axios.isAxiosError(e)) return null
  const status = e.response?.status
  const payload = e.response?.data as Partial<AttendanceScanResponseDto> | undefined

  let message =
    payload?.message != null && String(payload.message).trim() !== ''
      ? String(payload.message)
      : undefined
  let errorCode = payload?.errorCode != null ? String(payload.errorCode) : undefined

  if (!message) {
    if (status === 429) {
      message = 'Too many QR scans. Try again in a minute.'
      errorCode = errorCode ?? 'rate_limited'
    } else if (status === 409) {
      message =
        'This scan was already processed. Close this screen and scan the QR again (a new id is used each time).'
      errorCode = errorCode ?? 'replay'
    } else {
      return null
    }
  }

  if (!errorCode && status === 429) errorCode = 'rate_limited'
  if (!errorCode && status === 409) errorCode = 'replay'

  return {
    success: typeof payload?.success === 'boolean' ? payload.success : false,
    doorUnlockAttempted:
      typeof payload.doorUnlockAttempted === 'boolean' ? payload.doorUnlockAttempted : false,
    doorUnlockOk: typeof payload.doorUnlockOk === 'boolean' ? payload.doorUnlockOk : false,
    attendanceLogId: payload.attendanceLogId,
    message,
    sessionId: payload.sessionId ?? null,
    sessionStartTimeUtc: payload.sessionStartTimeUtc ?? null,
    errorCode: errorCode ?? null,
  }
}

function toastIfScanSecurityBlock(dto: AttendanceScanResponseDto | null): void {
  if (dto?.errorCode === 'rate_limited') {
    toast.error(dto.message ?? 'Too many scans — wait about a minute.')
    return
  }
  if (dto?.errorCode === 'replay') {
    toast.error(dto.message ?? 'This scan was already used.')
    return
  }
  if (dto?.errorCode === 'membership_expired') {
    toast.error(dto.message ?? 'Membership required to check in.')
  }
}

export function ScanPage() {
  const { userName } = getDashboardUser()
  const [step, setStep] = useState<Step>('loc')
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null)
  const [locBusy, setLocBusy] = useState(false)
  const [locError, setLocError] = useState<string | null>(null)
  const [submitBusy, setSubmitBusy] = useState(false)
  const [outcome, setOutcome] = useState<AttendanceScanResponseDto | null>(null)

  const glass =
    'rounded-[2rem] border border-white/10 bg-white/[0.04] backdrop-blur-2xl shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]'

  const coordsLabel = useMemo(() => {
    if (!coords) return ''
    return `${coords.lat.toFixed(6)}, ${coords.lng.toFixed(6)}`
  }, [coords])

  const acquireLocation = useCallback(() => {
    setLocBusy(true)
    setLocError(null)
    void readCheckInPosition()
      .then((p) => {
        setCoords({ lat: p.coords.latitude, lng: p.coords.longitude })
        toast.success('Location locked for proximity check.')
      })
      .catch((e: unknown) => {
        const message =
          e instanceof Error
            ? e.message
            : 'Could not read your location. Grant permission and retry (required for geo-fenced check-in).'
        setLocError(message)
        toast.error(message)
      })
      .finally(() => setLocBusy(false))
  }, [])

  const onDecoded = useCallback(
    async (token: string) => {
      if (!coords) {
        toast.error('Location missing.')
        return
      }
      setSubmitBusy(true)
      try {
        const clientScanId =
          typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
            ? crypto.randomUUID()
            : `${Date.now()}-${Math.random().toString(36).slice(2)}`
        const { data } = await attendanceService.scan({
          qrToken: token,
          latitude: coords.lat,
          longitude: coords.lng,
          clientScanId,
        })
        setOutcome(data)
        setStep('result')
      } catch (e: unknown) {
        const dto = coerceScanError(e)
        toastIfScanSecurityBlock(dto)
        if (dto) {
          setOutcome(dto)
          setStep('result')
        } else {
          toast.error('Network error while validating QR.')
        }
      } finally {
        setSubmitBusy(false)
      }
    },
    [coords],
  )

  const resetFlow = () => {
    setOutcome(null)
    setStep(coords ? 'scan' : 'loc')
  }

  return (
    <DashboardLayout userName={userName}>
      <DashboardSubpageShell
        eyebrow="Member access"
        titleGradient="Scan to enter"
        subtitle="Location + camera · server validates QR, distance within 100m, and pulses the ESP32 relay."
        showExport={false}
      >
        <div className="min-h-[60vh] space-y-6 bg-gradient-to-b from-slate-950 via-emerald-950/30 to-slate-950 p-6 text-slate-100">
          <div className="mx-auto flex max-w-xl flex-col gap-6 pb-24">
            {step === 'loc' && (
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                className={`${glass} p-8`}
              >
                <div className="mx-auto mb-6 flex size-14 items-center justify-center rounded-full bg-teal-500/15 ring-2 ring-teal-400/30">
                  <MapPin className="size-7 text-teal-200" aria-hidden />
                </div>
                <h2 className="text-center text-xl font-semibold text-white">
                  Proximity handshake
                </h2>
                <p className="mt-2 text-center text-sm text-slate-400">
                  We need an accurate GPS fix once per session — it never leaves check-in payloads as
                  anything except audit metadata.
                </p>
                <div className="mt-6 flex flex-col items-center gap-4">
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={acquireLocation}
                    disabled={locBusy}
                  >
                    {locBusy ? (
                      <>
                        <Loader2 className="size-4 animate-spin" aria-hidden />
                        Fixing location…
                      </>
                    ) : (
                      <>
                        <MapPin className="size-4" aria-hidden />
                        Share precise location
                      </>
                    )}
                  </Button>
                  {coords && (
                    <p className="text-center font-mono text-[11px] text-slate-500">{coordsLabel}</p>
                  )}
                  {locError && (
                    <p className="max-w-sm text-center text-sm text-rose-300" role="alert">
                      {locError}
                    </p>
                  )}
                  <Button
                    type="button"
                    onClick={() => setStep('scan')}
                    disabled={!coords}
                  >
                    <Smartphone className="size-4" aria-hidden />
                    Continue to QR camera
                  </Button>
                </div>
              </motion.div>
            )}

            {step === 'scan' && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
                <div className={`${glass} p-6`}>
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="text-sm text-slate-300">
                      <span className="font-semibold text-white">GPS</span>{' '}
                      <span className="font-mono text-[11px] text-slate-500">{coordsLabel}</span>
                    </div>
                    <Button type="button" variant="ghost" size="sm" onClick={() => setStep('loc')}>
                      Relocate
                    </Button>
                  </div>
                </div>

                <ScannerView onDecoded={(t) => onDecoded(t)} />

                {submitBusy && (
                  <p className="flex items-center justify-center gap-2 text-sm text-teal-200">
                    <Loader2 className="size-4 animate-spin" aria-hidden />
                    Signing you in · pulsing gate…
                  </p>
                )}
              </motion.div>
            )}

            {step === 'result' && outcome && <ScanResult outcome={outcome} onReset={resetFlow} />}
          </div>
        </div>
      </DashboardSubpageShell>
    </DashboardLayout>
  )
}
