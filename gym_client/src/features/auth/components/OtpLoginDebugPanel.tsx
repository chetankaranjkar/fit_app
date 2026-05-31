import { useEffect, useState } from 'react'
import type { FirebasePublicConfig } from '../../../types/auth'
import {
  getHostnameAuthorizationStatus,
  isFirebaseDebugEnabled,
  readViteFirebaseEnv,
  validateFirebaseWebConfig,
} from '../../../lib/firebaseDiagnostics'
import { getResolvedFirebaseConfig } from '../../../lib/firebase'

type OtpLoginDebugPanelProps = {
  apiConfig: FirebasePublicConfig
  recaptchaReady: boolean
  lastFirebaseError: string | null
}

export function OtpLoginDebugPanel({
  apiConfig,
  recaptchaReady,
  lastFirebaseError,
}: OtpLoginDebugPanelProps) {
  const [open, setOpen] = useState(isFirebaseDebugEnabled())

  useEffect(() => {
    if (isFirebaseDebugEnabled()) setOpen(true)
  }, [])

  if (!isFirebaseDebugEnabled()) return null

  const merged = getResolvedFirebaseConfig(apiConfig)
  const env = readViteFirebaseEnv()
  const domain = getHostnameAuthorizationStatus()
  const issues = validateFirebaseWebConfig(merged)

  return (
    <div className="mt-4 rounded-xl border border-amber-500/30 bg-amber-950/30 text-left">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-amber-200"
      >
        Firebase OTP diagnostics (dev)
        <span>{open ? '−' : '+'}</span>
      </button>
      {open && (
        <div className="space-y-2 border-t border-amber-500/20 px-3 py-3 font-mono text-[10px] leading-relaxed text-amber-100/90">
          <Row label="API enabled" value={String(apiConfig.enabled)} />
          <Row label="Project ID" value={merged.projectId ?? '—'} />
          <Row label="Auth domain" value={merged.authDomain ?? '—'} />
          <Row label="App ID" value={merged.appId ?? '—'} />
          <Row label="Web app" value={merged.appId?.includes(':web:') ? 'yes' : 'NO — register Web app'} />
          <Row label="API key (suffix)" value={merged.apiKey ? `…${merged.apiKey.slice(-8)}` : '—'} />
          <Row label="Environment" value={import.meta.env.MODE} />
          <Row label="Hostname" value={domain.hostname || '—'} />
          <Row label="Origin" value={domain.origin || '—'} />
          <Row
            label="Domain authorized"
            value={domain.isAuthorized ? 'expected list' : 'CHECK FIREBASE CONSOLE'}
          />
          <Row label="VITE overrides" value={env.hasAny ? 'yes — check .env' : 'none'} />
          <Row label="reCAPTCHA ready" value={recaptchaReady ? 'yes' : 'no'} />
          <Row label="Config issues" value={issues.length ? issues.join('; ') : 'none'} />
          {lastFirebaseError && (
            <div className="whitespace-pre-wrap rounded-lg bg-black/30 p-2 text-rose-200">
              Last error: {lastFirebaseError}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-[9rem_1fr] gap-2">
      <span className="text-amber-300/70">{label}</span>
      <span className="break-all">{value}</span>
    </div>
  )
}
