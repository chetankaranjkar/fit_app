import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { Modal } from '../ui/Modal'
import { Button } from '../ui/Button'
import { MemberMembershipHistoryTab } from './MemberMembershipHistoryTab'
import { userMembershipsByUserQueryKey } from '../../services/userMemberships.service'
import type { User } from '../../types/user'

function memberName(user: User) {
  return `${user.firstName} ${user.lastName}`.trim() || `User #${user.id}`
}

export function MemberMembershipsModal({
  user,
  open,
  onClose,
}: {
  user: User | null
  open: boolean
  onClose: () => void
}) {
  const queryClient = useQueryClient()

  useEffect(() => {
    if (!open || !user?.id) return
    void queryClient.invalidateQueries({ queryKey: userMembershipsByUserQueryKey(user.id) })
  }, [open, user?.id, queryClient])

  if (!user) return null

  const profileHref = `/dashboard/users/${user.id}?mode=view&tab=membership`

  return (
    <Modal open={open} onClose={onClose} title={`Memberships — ${memberName(user)}`} size="wide">
      <p className="mb-4 text-sm text-slate-400">
        All membership plans linked to this member. Use the profile for full history and audit details.
      </p>
      <MemberMembershipHistoryTab userId={user.id} />
      <div className="mt-6 flex flex-wrap justify-end gap-2 border-t border-white/10 pt-4">
        <Button type="button" variant="ghost" onClick={onClose}>
          Close
        </Button>
        <Link
          to={profileHref}
          className="inline-flex items-center rounded-xl border border-white/15 bg-white/5 px-4 py-2.5 text-sm font-semibold text-slate-200 hover:bg-white/10"
          onClick={onClose}
        >
          Open member profile
        </Link>
      </div>
    </Modal>
  )
}
