import { getApiErrorMessage, isForbiddenError } from '../../lib/apiErrors'

const panelClass = 'rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-8 text-center'

export function MemberLoadingState({ label }: { label: string }) {
  return (
    <div className={panelClass} data-testid="member-loading-state" aria-busy="true">
      <div className="mx-auto h-24 max-w-md animate-pulse rounded-2xl bg-white/[0.04]" />
      <p className="mt-4 text-sm text-slate-400">{label}</p>
    </div>
  )
}

export function MemberEmptyState({ title, body }: { title: string; body: string }) {
  return (
    <div className={`${panelClass} border-dashed border-white/15`} data-testid="member-empty-state">
      <p className="text-base font-semibold text-white">{title}</p>
      <p className="mx-auto mt-2 max-w-md text-sm text-slate-400">{body}</p>
    </div>
  )
}

export function MemberLoadError({
  error,
  onRetry,
  fallback = 'Could not load this page.',
}: {
  error: unknown
  onRetry?: () => void
  fallback?: string
}) {
  const denied = isForbiddenError(error)
  return (
    <div
      className={panelClass}
      role="alert"
      data-testid={denied ? 'member-denied-state' : 'member-error-state'}
    >
      <p className="text-base font-semibold text-white">{denied ? 'Access denied' : 'Could not load'}</p>
      <p className="mx-auto mt-2 max-w-md text-sm text-rose-200/90">
        {denied
          ? 'You can only view your own records. Nothing from another member is shown here.'
          : getApiErrorMessage(error, fallback)}
      </p>
      {onRetry && !denied ? (
        <button
          type="button"
          data-testid="member-retry"
          onClick={onRetry}
          className="mt-4 rounded-xl border border-orange-400/30 bg-orange-500/15 px-4 py-2 text-sm font-semibold text-orange-100 hover:bg-orange-500/25"
        >
          Try again
        </button>
      ) : null}
    </div>
  )
}
