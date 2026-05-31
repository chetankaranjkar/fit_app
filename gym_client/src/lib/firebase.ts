import { deleteApp, getApp, getApps, initializeApp, type FirebaseApp, type FirebaseOptions } from 'firebase/app'
import { getAuth, type Auth } from 'firebase/auth'
import type { FirebasePublicConfig } from '../types/auth'
import {
  configSignature,
  firebaseLog,
  mergeFirebaseConfig,
  validateFirebaseWebConfig,
} from './firebaseDiagnostics'

let firebaseApp: FirebaseApp | null = null
let firebaseAuth: Auth | null = null
let activeSignature: string | null = null

function toFirebaseOptions(config: FirebasePublicConfig): FirebaseOptions {
  return {
    apiKey: config.apiKey!,
    authDomain: config.authDomain!,
    projectId: config.projectId!,
    appId: config.appId!,
    messagingSenderId: config.messagingSenderId,
  }
}

/** Reset Firebase app (dev/debug when config changes). */
export async function resetFirebaseApp(): Promise<void> {
  for (const app of getApps()) {
    await deleteApp(app)
  }
  firebaseApp = null
  firebaseAuth = null
  activeSignature = null
  firebaseLog('Firebase app reset')
}

async function ensureFirebaseApp(config: FirebasePublicConfig): Promise<FirebaseApp> {
  const merged = mergeFirebaseConfig(config)
  const issues = validateFirebaseWebConfig(merged)
  if (issues.length) {
    throw new Error(`Firebase web config invalid: ${issues.join('; ')}`)
  }

  const signature = configSignature(merged)
  if (firebaseApp && activeSignature === signature) {
    return firebaseApp
  }

  if (firebaseApp && activeSignature !== signature) {
    firebaseLog('Config changed — re-initializing Firebase app', {
      previous: activeSignature,
      next: signature,
    })
    await resetFirebaseApp()
  }

  if (getApps().length > 0) {
    const existing = getApp()
    const existingProject = existing.options.projectId
    if (existingProject && existingProject !== merged.projectId) {
      firebaseLog('Existing Firebase app project mismatch — replacing', {
        existingProject,
        expectedProject: merged.projectId,
      })
      await resetFirebaseApp()
    } else if (!firebaseApp) {
      firebaseApp = existing
      activeSignature = signature
      firebaseLog('Reusing existing Firebase app', { projectId: existing.options.projectId })
      return firebaseApp
    }
  }

  firebaseLog('Firebase Initialized', {
    projectId: merged.projectId,
    authDomain: merged.authDomain,
    appId: merged.appId,
  })

  firebaseApp = initializeApp(toFirebaseOptions(merged))
  activeSignature = signature
  firebaseLog('Project Connected', { projectId: firebaseApp.options.projectId })
  return firebaseApp
}

/** Initialize Firebase Auth using API config (optional VITE_ fallbacks). */
export function initFirebase(config: FirebasePublicConfig): Auth {
  const merged = mergeFirebaseConfig(config)
  const issues = validateFirebaseWebConfig(merged)
  if (issues.length) {
    throw new Error(`Firebase web config invalid: ${issues.join('; ')}`)
  }

  const signature = configSignature(merged)
  if (firebaseAuth && firebaseApp && activeSignature === signature) {
    return firebaseAuth
  }

  // Sync init path: ensure app exists (first call in OTP flow)
  if (!firebaseApp || activeSignature !== signature) {
    if (getApps().length === 0) {
      firebaseLog('Firebase Initialized (sync)', {
        projectId: merged.projectId,
        authDomain: merged.authDomain,
        appId: merged.appId,
      })
      firebaseApp = initializeApp(toFirebaseOptions(merged))
      activeSignature = signature
      firebaseLog('Project Connected', { projectId: firebaseApp.options.projectId })
    } else {
      firebaseApp = getApps()[0]!
      activeSignature = signature
    }
  }

  firebaseAuth = getAuth(firebaseApp)
  return firebaseAuth
}

/** Async init — preferred before OTP; handles config changes safely. */
export async function initFirebaseAsync(config: FirebasePublicConfig): Promise<Auth> {
  const app = await ensureFirebaseApp(config)
  firebaseAuth = getAuth(app)
  return firebaseAuth
}

export function getFirebaseAuth(): Auth | null {
  return firebaseAuth
}

export function getResolvedFirebaseConfig(config: FirebasePublicConfig): FirebasePublicConfig {
  return mergeFirebaseConfig(config)
}
