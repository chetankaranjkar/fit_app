import { useCallback, useMemo } from 'react'
import { useHelpUi } from '../HelpUiContext'

const storageKey = (moduleKey: string) => `walkthrough_${moduleKey}_completed`

export function useWalkthrough(moduleKey: string) {
  const { walkthroughModuleKey, launchWalkthrough, dismissWalkthrough } = useHelpUi()

  const completed = useMemo(() => {
    try {
      return localStorage.getItem(storageKey(moduleKey)) === 'true'
    } catch {
      return false
    }
  }, [moduleKey])

  const isActive = walkthroughModuleKey === moduleKey

  const start = useCallback(() => {
    launchWalkthrough(moduleKey)
  }, [launchWalkthrough, moduleKey])

  const stop = useCallback(() => {
    dismissWalkthrough()
  }, [dismissWalkthrough])

  const markCompleted = useCallback(() => {
    try {
      localStorage.setItem(storageKey(moduleKey), 'true')
    } catch {
      /* ignore */
    }
  }, [moduleKey])

  return { start, stop, isActive, completed, markCompleted }
}
