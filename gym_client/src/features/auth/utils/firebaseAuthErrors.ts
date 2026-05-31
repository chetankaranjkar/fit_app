import { getHostnameAuthorizationStatus } from '../../../lib/firebaseDiagnostics'

type FirebaseErrorLike = {
  code?: string
  message?: string
}

function formatFirebaseError(error: FirebaseErrorLike): string {
  const code = error.code?.trim() || 'unknown'
  const message = error.message?.trim() || 'No message'
  return `${code} — ${message}`
}

function hintForCode(code: string, message: string): string | null {
  const { hostname, warning } = getHostnameAuthorizationStatus()
  const lower = message.toLowerCase()

  if (
    code === 'auth/operation-not-allowed' &&
    (lower.includes('region enabled') || lower.includes('region is enabled'))
  ) {
    return [
      'This is an SMS REGION policy block — Phone auth is enabled, but India (+91) is not allowlisted.',
      '',
      'Fix in Firebase Console:',
      '1. Authentication → Settings (tab)',
      '2. Scroll to SMS region policy',
      '3. Choose Allowlist (recommended)',
      '4. Add India (IN) — and any other countries you need',
      '5. Save and wait 1–2 minutes, then retry Send OTP',
      '',
      'Docs: https://cloud.google.com/identity-platform/docs/admin/sms-regions',
      '',
      'For dev without SMS: Authentication → Sign-in method → Phone →',
      'Phone numbers for testing (e.g. +91 8087441424 → OTP 123456)',
    ].join('\n')
  }

  switch (code) {
    case 'auth/operation-not-allowed':
      return [
        'Firebase returned auth/operation-not-allowed. Common causes:',
        '• SMS region not allowlisted (Authentication → Settings → SMS region policy → add IN for India)',
        '• Phone provider disabled (Authentication → Sign-in method → Phone)',
        '• Web app not registered (Project settings → Your apps → </> Web)',
        '• Client config points at wrong project (check debug panel projectId / appId)',
      ].join('\n')
    case 'auth/unauthorized-domain':
      return [
        `Current hostname: ${hostname}`,
        warning ?? 'Add this hostname in Firebase → Authentication → Settings → Authorized domains.',
      ].join('\n')
    case 'auth/invalid-app-credential':
      return [
        'Invalid app credential. Check API key restrictions in Google Cloud Console.',
        'Allow HTTP referrers for your origin and enable Identity Toolkit API.',
      ].join('\n')
    case 'auth/network-request-failed':
      return [
        'Network blocked reaching Firebase. Try localhost, disable ad blockers,',
        'and allow identitytoolkit.googleapis.com in firewall/API key settings.',
      ].join('\n')
    case 'auth/billing-not-enabled':
      return 'Real SMS requires Firebase Blaze plan. Use a test phone number in Firebase Console for dev.'
    default:
      return null
  }
}

/** Show actual Firebase code + message, with optional troubleshooting hints. */
export function getFirebaseOtpErrorMessage(error: unknown): string {
  if (!error || typeof error !== 'object') {
    return 'unknown — Could not send OTP. Please try again.'
  }

  const e = error as FirebaseErrorLike
  const primary = formatFirebaseError(e)

  if (typeof e.message === 'string' && e.message.includes('already been rendered')) {
    return `${primary}\n\nRefresh the page and click Send OTP again.`
  }

  const hint = e.code ? hintForCode(e.code, e.message ?? '') : null
  return hint ? `${primary}\n\n${hint}` : primary
}

export function logFirebaseOtpError(phase: string, error: unknown) {
  console.error(`[Firebase OTP] ${phase}`, error)
  if (error && typeof error === 'object') {
    const e = error as FirebaseErrorLike
    console.error(`[Firebase OTP] ${phase} code=${e.code ?? 'unknown'} message=${e.message ?? ''}`)
  }
}
