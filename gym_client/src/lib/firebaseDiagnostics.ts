import type { FirebasePublicConfig } from '../types/auth'

export const FIREBASE_AUTHORIZED_HOSTS = [
  'localhost',
  '127.0.0.1',
  'tigerfitness.tech',
  'www.tigerfitness.tech',
  'uat.tigerfitness.tech',
] as const

const LOG_PREFIX = '[Firebase OTP]'

/** OTP diagnostics + verbose console logs — off by default; set VITE_FIREBASE_DEBUG=true to enable. */
export function isFirebaseDebugEnabled(): boolean {
  return import.meta.env.VITE_FIREBASE_DEBUG === 'true'
}

export function firebaseLog(message: string, data?: unknown) {
  if (!isFirebaseDebugEnabled()) return
  if (data !== undefined) console.info(`${LOG_PREFIX} ${message}`, data)
  else console.info(`${LOG_PREFIX} ${message}`)
}

export function firebaseErrorLog(message: string, error: unknown) {
  console.error(`${LOG_PREFIX} ${message}`, error)
  if (error && typeof error === 'object') {
    const e = error as { code?: string; message?: string; customData?: unknown }
    console.error(`${LOG_PREFIX} code=${e.code ?? 'unknown'} message=${e.message ?? ''}`, e.customData)
  }
}

export function readViteFirebaseEnv(): Partial<FirebasePublicConfig> & { hasAny: boolean } {
  const apiKey = import.meta.env.VITE_FIREBASE_API_KEY?.trim() || undefined
  const authDomain = import.meta.env.VITE_FIREBASE_AUTH_DOMAIN?.trim() || undefined
  const projectId = import.meta.env.VITE_FIREBASE_PROJECT_ID?.trim() || undefined
  const appId = import.meta.env.VITE_FIREBASE_APP_ID?.trim() || undefined
  const messagingSenderId = import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID?.trim() || undefined
  return {
    apiKey,
    authDomain,
    projectId,
    appId,
    messagingSenderId,
    hasAny: Boolean(apiKey || authDomain || projectId || appId || messagingSenderId),
  }
}

export function mergeFirebaseConfig(apiConfig: FirebasePublicConfig): FirebasePublicConfig {
  const env = readViteFirebaseEnv()
  return {
    enabled: apiConfig.enabled,
    apiKey: apiConfig.apiKey ?? env.apiKey,
    authDomain: apiConfig.authDomain ?? env.authDomain,
    projectId: apiConfig.projectId ?? env.projectId,
    appId: apiConfig.appId ?? env.appId,
    messagingSenderId: apiConfig.messagingSenderId ?? env.messagingSenderId,
  }
}

export function configSignature(config: FirebasePublicConfig): string {
  return [
    config.projectId ?? '',
    config.appId ?? '',
    config.authDomain ?? '',
    config.apiKey?.slice(-8) ?? '',
  ].join('|')
}

export function validateFirebaseWebConfig(config: FirebasePublicConfig): string[] {
  const issues: string[] = []
  if (!config.apiKey?.trim()) issues.push('Missing apiKey')
  if (!config.authDomain?.trim()) issues.push('Missing authDomain')
  if (!config.projectId?.trim()) issues.push('Missing projectId')
  if (!config.appId?.trim()) issues.push('Missing appId')
  if (config.appId && !config.appId.includes(':web:')) {
    issues.push('appId is not a Web app (expected ":web:" — register </> Web app in Firebase Console)')
  }
  if (config.authDomain && config.projectId && !config.authDomain.includes(config.projectId)) {
    issues.push(`authDomain "${config.authDomain}" may not match projectId "${config.projectId}"`)
  }
  return issues
}

export function getHostnameAuthorizationStatus(): {
  hostname: string
  origin: string
  isAuthorized: boolean
  warning: string | null
} {
  const hostname = typeof window !== 'undefined' ? window.location.hostname : ''
  const origin = typeof window !== 'undefined' ? window.location.origin : ''
  const isAuthorized = FIREBASE_AUTHORIZED_HOSTS.some(
    (allowed) => hostname === allowed || hostname.endsWith(`.${allowed}`)
  )
  return {
    hostname,
    origin,
    isAuthorized,
    warning: isAuthorized
      ? null
      : `Hostname "${hostname}" is not in the expected authorized list. Add it in Firebase Console → Authentication → Settings → Authorized domains.`,
  }
}

export function logFirebaseStartupAudit(apiConfig: FirebasePublicConfig) {
  const merged = mergeFirebaseConfig(apiConfig)
  const env = readViteFirebaseEnv()
  const domain = getHostnameAuthorizationStatus()
  const issues = validateFirebaseWebConfig(merged)

  firebaseLog('Config audit — API /Auth/firebase-config', apiConfig)
  firebaseLog('Config audit — merged client config', {
    projectId: merged.projectId,
    authDomain: merged.authDomain,
    appId: merged.appId,
    messagingSenderId: merged.messagingSenderId,
    apiKeySuffix: merged.apiKey?.slice(-8),
    enabled: merged.enabled,
  })
  if (env.hasAny) {
    firebaseLog('VITE_ env overrides present', {
      projectId: env.projectId,
      authDomain: env.authDomain,
      appId: env.appId,
      apiKeySuffix: env.apiKey?.slice(-8),
    })
  } else {
    firebaseLog('No VITE_FIREBASE_* env overrides (using API config only)')
  }
  firebaseLog('Environment', {
    mode: import.meta.env.MODE,
    origin: domain.origin,
    hostname: domain.hostname,
    hostnameAuthorized: domain.isAuthorized,
  })
  if (domain.warning) firebaseLog('DOMAIN WARNING', domain.warning)
  if (issues.length) firebaseLog('Config validation issues', issues)
  else firebaseLog('Config validation passed')
}
