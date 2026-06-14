import type { User } from '../../types/user'

type TrainerMemberActionsMenuProps = {
  user: User
  onViewMemberships: (user: User) => void
  onDeactivate: (user: User) => void
  onActivate: (user: User) => void
}

const actionBtnClass =
  'inline-flex items-center justify-center rounded-lg border px-2 py-1 text-[11px] font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-400/40'

export function TrainerMemberActionsMenu({
  user,
  onViewMemberships,
  onDeactivate,
  onActivate,
}: TrainerMemberActionsMenuProps) {
  return (
    <div
      className="flex flex-wrap items-center justify-end gap-1.5"
      onClick={(e) => e.stopPropagation()}
      onKeyDown={(e) => e.stopPropagation()}
    >
      <button
        type="button"
        className={`${actionBtnClass} border-white/10 bg-white/[0.04] text-slate-200 hover:border-white/20 hover:bg-white/[0.08]`}
        onClick={() => onViewMemberships(user)}
      >
        Memberships
      </button>
      {user.isActive ? (
        <button
          type="button"
          className={`${actionBtnClass} border-amber-400/25 bg-amber-500/10 text-amber-100 hover:bg-amber-500/20`}
          onClick={() => onDeactivate(user)}
        >
          Deactivate
        </button>
      ) : (
        <button
          type="button"
          className={`${actionBtnClass} border-emerald-400/25 bg-emerald-500/10 text-emerald-100 hover:bg-emerald-500/20`}
          onClick={() => onActivate(user)}
        >
          Activate
        </button>
      )}
    </div>
  )
}
