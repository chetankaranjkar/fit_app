import { Button } from '../ui/Button'
import { getApiErrorMessage } from '../../lib/apiErrors'

export function ExerciseLibraryUnavailableBanner({
  error,
  onRetry,
  isRetrying,
}: {
  error: unknown
  onRetry: () => void
  isRetrying?: boolean
}) {
  return (
    <div
      role="alert"
      data-testid="exercise-library-unavailable"
      className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-400/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-100"
    >
      <p>
        {getApiErrorMessage(
          error,
          'The exercise library is unavailable. Exercises already on this plan are kept — retry when the service is back.',
        )}{' '}
        Plan data you entered is still here.
      </p>
      <Button type="button" variant="soft" size="sm" isLoading={isRetrying} onClick={onRetry}>
        Retry
      </Button>
    </div>
  )
}
