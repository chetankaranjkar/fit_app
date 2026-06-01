import { useEffect } from 'react'
import { isRouteErrorResponse, useRouteError } from 'react-router-dom'
import { isChunkLoadError, tryRecoverFromChunkError } from '../../lib/chunkLoadRecovery'

export function RouteErrorPage() {
  const error = useRouteError()

  useEffect(() => {
    tryRecoverFromChunkError(error)
  }, [error])

  const chunkStale = isChunkLoadError(error)
  const message = isRouteErrorResponse(error)
    ? error.statusText || `Error ${error.status}`
    : error instanceof Error
      ? error.message
      : 'Something went wrong'

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-slate-950 px-6 text-center text-slate-100">
      <h1 className="text-2xl font-bold">
        {chunkStale ? 'App update available' : 'Unexpected error'}
      </h1>
      <p className="mt-3 max-w-md text-sm text-slate-400">
        {chunkStale
          ? 'A new version was deployed. Reload the page to load the latest files (Ctrl+Shift+R if it happens again).'
          : message}
      </p>
      <button
        type="button"
        className="mt-6 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-500"
        onClick={() => window.location.reload()}
      >
        Reload page
      </button>
    </div>
  )
}
