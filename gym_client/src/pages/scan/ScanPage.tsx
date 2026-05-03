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
  }
}

export function ScanPage() {
  const { userName } = getDashboardUser()
  const [step, setStep] = useState<Step>('loc')
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null)
  const [locBusy, setLocBusy] = useState(false)
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
    navigator.geolocation.getCurrentPosition(
      (p) => {
        setCoords({ lat: p.coords.latitude, lng: p.coords.longitude })
        toast.success('Location locked for proximity check.')
        setLocBusy(false)
      },
      () => {
        toast.error(
          'Could not read your location. Grant permission and retry (required for geo-fenced check-in).',
        )
        setLocBusy(false)
      },
      { enableHighAccuracy: true, timeout: 15_000, maximumAge: 0 },
    )
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
