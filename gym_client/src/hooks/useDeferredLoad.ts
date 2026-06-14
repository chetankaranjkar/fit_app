import { useEffect, useState } from 'react'

/**
 * Defers secondary work (extra API calls, heavy widgets) until after the browser
 * has painted the primary shell — keeps first paint fast on profile pages.
 */
export function useDeferredLoad(ready: boolean): boolean {
  const [deferred, setDeferred] = useState(false)

  useEffect(() => {
    if (!ready) {
      setDeferred(false)
      return
    }

    const id = requestAnimationFrame(() => setDeferred(true))
    return () => cancelAnimationFrame(id)
  }, [ready])

  return deferred
}
