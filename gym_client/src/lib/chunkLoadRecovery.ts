const RELOAD_FLAG = 'gym-chunk-reload-attempted'

/** True when a dynamic import failed because the hashed chunk file is missing (usually after deploy). */
export function isChunkLoadError(error: unknown): boolean {
  const msg =
    error instanceof Error
      ? error.message
      : typeof error === 'string'
        ? error
        : String((error as { message?: string })?.message ?? error ?? '')
  return (
    msg.includes('Failed to fetch dynamically imported module') ||
    msg.includes('Importing a module script failed') ||
    msg.includes('Loading chunk') ||
    msg.includes('ChunkLoadError')
  )
}

/** One automatic reload per tab session when a stale chunk is detected. */
export function tryRecoverFromChunkError(error: unknown): boolean {
  if (!isChunkLoadError(error)) return false
  if (sessionStorage.getItem(RELOAD_FLAG)) return false
  sessionStorage.setItem(RELOAD_FLAG, '1')
  window.location.reload()
  return true
}

export function clearChunkReloadFlag() {
  sessionStorage.removeItem(RELOAD_FLAG)
}

/** Wire Vite preload + unhandled import failures to a single reload attempt. */
export function setupChunkLoadRecovery() {
  clearChunkReloadFlag()

  window.addEventListener('vite:preloadError', (event) => {
    event.preventDefault()
    if (!sessionStorage.getItem(RELOAD_FLAG)) {
      sessionStorage.setItem(RELOAD_FLAG, '1')
      window.location.reload()
    }
  })

  window.addEventListener('unhandledrejection', (event) => {
    if (tryRecoverFromChunkError(event.reason)) {
      event.preventDefault()
    }
  })
}
