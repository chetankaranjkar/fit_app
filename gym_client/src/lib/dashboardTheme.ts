import { useEffect, useSyncExternalStore } from 'react'
import toast from 'react-hot-toast'
import { authService } from '../services/auth.service'

export type DashboardTheme = 'light' | 'dark'
const STORAGE_KEY = 'gym-dashboard-theme'
type ThemeState = { theme: DashboardTheme; busy: boolean }
const DEFAULT_STATE: ThemeState = { theme: 'dark', busy: false }
let state = DEFAULT_STATE
let activeAccount: string | null = null
let loadedAccount: string | null = null
let revision = 0
const listeners = new Set<() => void>()

function getAccountKey(): string | null {
  try {
    const account = authService.getCurrentUser()
    return (account?.email || account?.username)?.toLowerCase() ?? null
  } catch {
    return null
  }
}

function cacheKey(account: string | null) {
  return account ? `${STORAGE_KEY}:${account}` : STORAGE_KEY
}

function readCachedTheme(account: string | null): DashboardTheme {
  try {
    return localStorage.getItem(cacheKey(account)) === 'light' ? 'light' : 'dark'
  } catch {
    return 'dark'
  }
}

function publish(theme: DashboardTheme, busy = false) {
  state = { theme, busy }
  document.documentElement.dataset.theme = theme
  listeners.forEach((listener) => listener())
}

function cacheTheme(theme: DashboardTheme, account: string | null) {
  try {
    localStorage.setItem(cacheKey(account), theme)
  } catch {
    // Browser storage is optional; the account remains the source of truth.
  }
}

/** Restore the current account's cache before rendering, then hydrate from the API. */
export function initializeDashboardTheme() {
  publish(readCachedTheme(getAccountKey()))
}

async function loadAccountTheme() {
  const account = getAccountKey()
  if (!account) {
    activeAccount = loadedAccount = null
    revision++
    publish(readCachedTheme(null))
    return
  }
  if (activeAccount === account && (loadedAccount === account || state.busy)) return
  activeAccount = account
  const loadRevision = ++revision
  publish(readCachedTheme(account), true)
  try {
    const preferences = await authService.getPreferences()
    if (getAccountKey() !== account || revision !== loadRevision) return
    const theme = preferences.theme === 'light' ? 'light' : 'dark'
    cacheTheme(theme, account)
    publish(theme)
  } catch {
    // Keep the account's cached preference when offline or during API rollout.
  } finally {
    if (getAccountKey() === account && revision === loadRevision) {
      loadedAccount = account
      publish(state.theme)
    }
  }
}

export async function setDashboardTheme(theme: DashboardTheme) {
  if (state.busy) return
  const account = getAccountKey()
  const saveRevision = ++revision
  publish(theme, Boolean(account))
  cacheTheme(theme, account)
  if (!account) return
  try {
    await authService.updatePreferences(theme)
  } catch {
    if (getAccountKey() === account && revision === saveRevision) {
      toast.error('Theme changed on this device, but could not be saved to your account. Try again.')
    }
  } finally {
    if (getAccountKey() === account && revision === saveRevision) publish(state.theme)
  }
}

function subscribe(onChange: () => void) {
  listeners.add(onChange)
  const onStorage = (event: StorageEvent) => {
    if (event.key === 'user' || event.key === null) {
      void loadAccountTheme()
    } else if (event.key === cacheKey(getAccountKey()) && !state.busy) {
      publish(event.newValue === 'light' ? 'light' : 'dark')
    }
  }
  const onSession = () => { void loadAccountTheme() }
  window.addEventListener('storage', onStorage)
  window.addEventListener('gym-session-updated', onSession)
  return () => {
    listeners.delete(onChange)
    window.removeEventListener('storage', onStorage)
    window.removeEventListener('gym-session-updated', onSession)
  }
}

export function useDashboardTheme() {
  const snapshot = useSyncExternalStore(subscribe, () => state, () => DEFAULT_STATE)
  useEffect(() => { void loadAccountTheme() }, [])
  return {
    ...snapshot,
    toggleTheme: () => { void setDashboardTheme(snapshot.theme === 'dark' ? 'light' : 'dark') },
  }
}
