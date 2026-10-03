import { Link } from 'react-router-dom'
import { Button } from '../ui/Button'

export function TrainingEmptyState({
  title,
  body,
  actionLabel,
  onAction,
  to,
}: {
  title: string
  body: string
  actionLabel: string
  onAction?: () => void
  to?: string
}) {
  const actionClass =
    'inline-flex items-center justify-center rounded-xl bg-[linear-gradient(135deg,#3b82f6_0%,#a855f7_100%)] px-4 py-2 text-xs font-semibold text-white shadow-lg shadow-purple-500/20 transition hover:brightness-110'

  return (
    <div
      className="px-6 py-10 text-center"
      data-testid="training-empty-state"
      role="status"
    >
      <p className="text-sm font-medium text-slate-200">{title}</p>
      <p className="mx-auto mt-2 max-w-md text-sm text-slate-400">{body}</p>
      <div className="mt-4">
        {to ? (
          <Link to={to} className={actionClass}>
            {actionLabel}
          </Link>
        ) : (
          <Button type="button" size="sm" onClick={onAction}>
            {actionLabel}
          </Button>
        )}
      </div>
    </div>
  )
}
