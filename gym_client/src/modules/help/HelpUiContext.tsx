import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { useLocation } from 'react-router-dom'
import { pathnameToModuleKey } from './routeModuleMap'

export type HelpUiContextValue = {
  /** Module key inferred from the current route (for ? and floating button). */
  resolvedModuleKey: string
  drawerOpen: boolean
  drawerModuleKey: string
  openDrawer: (moduleKeyOverride?: string) => void
  closeDrawer: () => void
  walkthroughModuleKey: string | null
  launchWalkthrough: (moduleKey: string) => void
  dismissWalkthrough: () => void
}

/** Exported so global help widgets can degrade gracefully outside the provider (e.g. error boundaries, HMR). */
export const HelpUiContext = createContext<HelpUiContextValue | null>(null)

export function HelpUiProvider({ children }: { children: ReactNode }) {
  const { pathname } = useLocation()
  const resolvedModuleKey = pathnameToModuleKey(pathname)

  const [drawerOpen, setDrawerOpen] = useState(false)
  const [drawerModuleKey, setDrawerModuleKey] = useState(resolvedModuleKey)
  const [walkthroughModuleKey, setWalkthroughModuleKey] = useState<string | null>(null)

  useEffect(() => {
    if (!drawerOpen) setDrawerModuleKey(resolvedModuleKey)
  }, [resolvedModuleKey, drawerOpen])

  const openDrawer = useCallback((moduleKeyOverride?: string) => {
    setDrawerModuleKey(moduleKeyOverride?.trim() || resolvedModuleKey)
    setDrawerOpen(true)
  }, [resolvedModuleKey])

  const closeDrawer = useCallback(() => {
    setDrawerOpen(false)
  }, [])

  const launchWalkthrough = useCallback((moduleKey: string) => {
    setWalkthroughModuleKey(moduleKey.trim())
  }, [])

  const dismissWalkthrough = useCallback(() => {
    setWalkthroughModuleKey(null)
  }, [])

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== '?' || e.ctrlKey || e.metaKey || e.altKey) return
      const t = e.target as HTMLElement | null
      if (!t || t.closest('[data-help-ignore-shortcut]')) return
      const tag = t.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || t.isContentEditable) return
      e.preventDefault()
      openDrawer()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [openDrawer])

  const value = useMemo<HelpUiContextValue>(
    () => ({
      resolvedModuleKey,
      drawerOpen,
      drawerModuleKey,
      openDrawer,
      closeDrawer,
      walkthroughModuleKey,
      launchWalkthrough,
      dismissWalkthrough,
    }),
    [
      resolvedModuleKey,
      drawerOpen,
      drawerModuleKey,
      openDrawer,
      closeDrawer,
      walkthroughModuleKey,
      launchWalkthrough,
      dismissWalkthrough,
    ],
  )

  return <HelpUiContext.Provider value={value}>{children}</HelpUiContext.Provider>
}

export function useHelpUi(): HelpUiContextValue {
  const ctx = useContext(HelpUiContext)
  if (!ctx) throw new Error('useHelpUi must be used within HelpUiProvider')
  return ctx
}
