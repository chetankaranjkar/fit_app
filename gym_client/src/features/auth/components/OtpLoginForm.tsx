import { type FormEvent, useCallback, useEffect, useRef, useState } from 'react'
import {
  RecaptchaVerifier,
  signInWithPhoneNumber,
  type ConfirmationResult,
} from 'firebase/auth'
import { Button } from '../../../components/ui/Button'
import { Input } from '../../../components/ui/Input'
import { initFirebaseAsync } from '../../../lib/firebase'
import {
  firebaseLog,
  logFirebaseStartupAudit,
} from '../../../lib/firebaseDiagnostics'
import type { FirebasePublicConfig } from '../../../types/auth'
import { useFirebaseOtpLogin } from '../hooks/useFirebaseOtpLogin'
import { getLoginErrorMessage } from '../utils/loginErrors'
import { getFirebaseOtpErrorMessage, logFirebaseOtpError } from '../utils/firebaseAuthErrors'
import { OtpLoginDebugPanel } from './OtpLoginDebugPanel'

type OtpLoginFormProps = {
  firebaseConfig: FirebasePublicConfig
}

const RECAPTCHA_CONTAINER_ID = 'recaptcha-container'

function toE164Phone(raw: string): string {
  const digits = raw.replace(/\D/g, '')
  if (raw.trim().startsWith('+')) return `+${digits}`
  if (digits.length === 10) return `+91${digits}`
  if (digits.startsWith('91') && digits.length === 12) return `+${digits}`
  return `+${digits}`
}

function clearRecaptchaContainer(container: HTMLElement | null) {
  if (!container) return
  container.replaceChildren()
  container.removeAttribute('data-recaptcha-id')
}

function disposeRecaptcha(
  verifier: RecaptchaVerifier | null,
  container: HTMLElement | null
) {
  if (verifier) {
    try {
      verifier.clear()
    } catch {
      /* ignore */
    }
  }
  clearRecaptchaContainer(container)
}

export function OtpLoginForm({ firebaseConfig }: OtpLoginFormProps) {
  const [phone, setPhone] = useState('')
  const [otp, setOtp] = useState('')
  const [step, setStep] = useState<'phone' | 'otp'>('phone')
  const [sendingOtp, setSendingOtp] = useState(false)
  const [localError, setLocalError] = useState<string | null>(null)
  const [recaptchaReady, setRecaptchaReady] = useState(false)

  const confirmationRef = useRef<ConfirmationResult | null>(null)
  const recaptchaRef = useRef<RecaptchaVerifier | null>(null)
  const recaptchaContainerRef = useRef<HTMLDivElement>(null)

  const firebaseLogin = useFirebaseOtpLogin()
  const err = firebaseLogin.error as
    | { response?: { data?: unknown; status?: number }; message?: string; code?: string }
    | null
  const apiError = firebaseLogin.isError
    ? getLoginErrorMessage(
        err,
        'No gym account is linked to this phone number. Contact your gym admin.'
      )
    : null

  useEffect(() => {
    logFirebaseStartupAudit(firebaseConfig)
  }, [firebaseConfig])

  useEffect(() => {
    return () => {
      disposeRecaptcha(recaptchaRef.current, recaptchaContainerRef.current)
      recaptchaRef.current = null
      setRecaptchaReady(false)
    }
  }, [])

  const prepareRecaptchaContainer = useCallback(() => {
    disposeRecaptcha(recaptchaRef.current, recaptchaContainerRef.current)
    recaptchaRef.current = null
    setRecaptchaReady(false)
  }, [])

  const resetRecaptcha = useCallback(() => {
    prepareRecaptchaContainer()
  }, [prepareRecaptchaContainer])

  const createRecaptchaVerifier = async () => {
    prepareRecaptchaContainer()
    await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()))

    const container = recaptchaContainerRef.current
    if (!container) {
      throw new Error('recaptcha-container element is not ready.')
    }

    clearRecaptchaContainer(container)
    const auth = await initFirebaseAsync(firebaseConfig)
    firebaseLog('Recaptcha Created — initializing invisible verifier')

    const verifier = new RecaptchaVerifier(auth, RECAPTCHA_CONTAINER_ID, {
      size: 'invisible',
      callback: () => {
        firebaseLog('reCAPTCHA callback — verified')
      },
      'expired-callback': () => {
        firebaseLog('reCAPTCHA expired')
        setLocalError('auth/recaptcha-expired — reCAPTCHA expired. Please try again.')
        resetRecaptcha()
      },
    })
    recaptchaRef.current = verifier
    await verifier.render()
    setRecaptchaReady(true)
    firebaseLog('Recaptcha Created — render complete')
    return verifier
  }

  const handleSendOtp = async (e: FormEvent) => {
    e.preventDefault()
    setLocalError(null)

    const digits = phone.replace(/\D/g, '')
    if (digits.length < 10) {
      setLocalError('validation — Enter a valid 10-digit mobile number.')
      return
    }

    const e164 = toE164Phone(phone)
    firebaseLog('OTP Request Started', { phoneNumber: e164 })

    setSendingOtp(true)
    try {
      const auth = await initFirebaseAsync(firebaseConfig)
      const verifier = await createRecaptchaVerifier()
      firebaseLog('Sending OTP to:', e164)
      confirmationRef.current = await signInWithPhoneNumber(auth, e164, verifier)
      firebaseLog('OTP Request Success')
      setStep('otp')
    } catch (error) {
      logFirebaseOtpError('OTP Request Failed', error)
      prepareRecaptchaContainer()
      setLocalError(getFirebaseOtpErrorMessage(error))
    } finally {
      setSendingOtp(false)
    }
  }

  const handleVerifyOtp = async (e: FormEvent) => {
    e.preventDefault()
    setLocalError(null)

    const code = otp.replace(/\D/g, '')
    if (code.length < 6) {
      setLocalError('validation — Enter the 6-digit code from SMS.')
      return
    }

    const confirmation = confirmationRef.current
    if (!confirmation) {
      setLocalError('session — OTP session expired. Request a new code.')
      setStep('phone')
      return
    }

    try {
      firebaseLog('OTP verify started')
      const credential = await confirmation.confirm(code)
      const idToken = await credential.user.getIdToken()
      firebaseLog('OTP verify success — exchanging token with gym API')
      firebaseLogin.mutate(idToken)
    } catch (error) {
      logFirebaseOtpError('OTP verify failed', error)
      const errCode = (error as { code?: string }).code
      if (errCode === 'auth/code-expired') {
        setStep('phone')
        confirmationRef.current = null
        resetRecaptcha()
      }
      setLocalError(getFirebaseOtpErrorMessage(error))
    }
  }

  const handleChangeNumber = () => {
    setStep('phone')
    setOtp('')
    setLocalError(null)
    confirmationRef.current = null
    resetRecaptcha()
  }

  const errorMessage = localError ?? apiError
  const isBusy = sendingOtp || firebaseLogin.isPending

  return (
    <div className="flex flex-col gap-4">
      {/* Firebase invisible reCAPTCHA mount — must not use sr-only (breaks iframe) */}
      <div
        ref={recaptchaContainerRef}
        id={RECAPTCHA_CONTAINER_ID}
        aria-hidden
        className="pointer-events-none fixed bottom-0 right-0 z-0 h-px w-px overflow-hidden opacity-0"
      />

      {step === 'phone' ? (
        <form onSubmit={handleSendOtp} className="flex flex-col gap-4">
          <Input
            label="Mobile number"
            type="tel"
            name="phone"
            autoComplete="tel"
            inputMode="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="10-digit number registered with gym"
            required
          />
          <p className="text-xs text-slate-500">
            OTP is sent to the mobile number on your gym profile (+91 prefix added if omitted).
          </p>

          {errorMessage && (
            <div
              className="rounded-xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-xs text-rose-300 whitespace-pre-line"
              role="alert"
            >
              {errorMessage}
            </div>
          )}

          <Button type="submit" fullWidth size="md" isLoading={isBusy}>
            Send OTP
          </Button>
        </form>
      ) : (
        <form onSubmit={handleVerifyOtp} className="flex flex-col gap-4">
          <Input
            label="Verification code"
            type="text"
            name="otp"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            value={otp}
            onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
            placeholder="6-digit OTP"
            required
          />

          {errorMessage && (
            <div
              className="rounded-xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-xs text-rose-300 whitespace-pre-line"
              role="alert"
            >
              {errorMessage}
            </div>
          )}

          <Button type="submit" fullWidth size="md" isLoading={isBusy}>
            Verify &amp; sign in
          </Button>

          <button
            type="button"
            onClick={handleChangeNumber}
            className="text-center text-xs text-slate-400 transition hover:text-white"
            disabled={isBusy}
          >
            Use a different number
          </button>
        </form>
      )}

      <OtpLoginDebugPanel
        apiConfig={firebaseConfig}
        recaptchaReady={recaptchaReady}
        lastFirebaseError={localError}
      />
    </div>
  )
}
