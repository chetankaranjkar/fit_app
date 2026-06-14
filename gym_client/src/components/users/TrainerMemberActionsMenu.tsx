import { useEffect, useRef, useState } from 'react'
import { MoreVertical } from 'lucide-react'
import type { User } from '../../types/user'

type TrainerMemberActionsMenuProps = {
  user: User
  onView: (user: User) => void
  onViewMemberships: (user: User) => void
  onEdit: (user: User) => void
  onDeactivate: (user: User) => void
  onActivate: (user: User) => void
}

export function TrainerMemberActionsMenu({
  user,
  onView,
  onViewMemberships,
  onEdit,
  onDeactivate,
  onActivate,
}: TrainerMemberActionsMenuProps) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onDoc = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [open])

  const itemClass =
    'block w-full rounded-lg px-3 py-2 text-left text-xs font-medium text-slate-200 transition hover:bg-white/10'

  return (
    <div ref={rootRef} className="relative inline-flex">
      <button
        type="button"
        aria-label="Member actions"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="inline-flex size-8 items-center justify-center rounded-lg border border-white/10 bg-white/[0.04] text-slate-300 transition hover:border-white/20 hover:bg-white/[0.08] hover:text-white"
      >
        <MoreVertical className="size-4" />
      </button>
      {open ? (
        <div className="absolute right-0 top-full z-30 mt-1 min-w-[10rem] rounded-xl border border-white/10 bg-[#12101f]/95 p-1 shadow-xl backdrop-blur-md">
          <button type="button" className={itemClass} onClick={() => { setOpen(false); onView(user) }}>
            View profile
          </button>
          <button type="button" className={itemClass} onClick={() => { setOpen(false); onViewMemberships(user) }}>
            Memberships
          </button>
          <button type="button" className={itemClass} onClick={() => { setOpen(false); onEdit(user) }}>
            Edit
          </button>
          {user.isActive ? (
            <button type="button" className={`${itemClass} text-amber-200`} onClick={() => { setOpen(false); onDeactivate(user) }}>
              Deactivate
            </button>
          ) : (
            <button type="button" className={`${itemClass} text-emerald-200`} onClick={() => { setOpen(false); onActivate(user) }}>
              Activate
            </button>
          )}
        </div>
      ) : null}
    </div>
  )
}
