import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { Modal } from '../ui/Modal'
import { Button } from '../ui/Button'
import { MemberMembershipHistoryTab } from './MemberMembershipHistoryTab'
import { AddUserMembershipModal } from '../memberships/AddUserMembershipModal'
import { userMembershipsByUserQueryKey } from '../../services/userMemberships.service'
import { authService } from '../../services/auth.service'
import { todayIsoDate } from '../../lib/membershipFormUtils'
import type { User } from '../../types/user'
import type { UserMembership } from '../../types/userMembership'

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
  const canManageMemberships = authService.canPaymentsAccess()
  const [addModalOpen, setAddModalOpen] = useState(false)
  const [addIntent, setAddIntent] = useState<'create' | 'renew'>('create')
  const [renewPrefill, setRenewPrefill] = useState<{
    planId?: number
    startDate?: string
    priorMembershipId?: number
  }>()

  useEffect(() => {
    if (!open || !user?.id) return
    void queryClient.invalidateQueries({ queryKey: userMembershipsByUserQueryKey(user.id) })
  }, [open, user?.id, queryClient])

  useEffect(() => {
    if (!open) {
      setAddModalOpen(false)
    }
  }, [open])

  const openAddMembership = useCallback(() => {
    setAddIntent('create')
    setRenewPrefill(undefined)
    setAddModalOpen(true)
  }, [])

  const openRenewMembership = useCallback((latestExpired: UserMembership) => {
    setAddIntent('renew')
    setRenewPrefill({
      planId: latestExpired.planId,
      startDate: todayIsoDate(),
      priorMembershipId: latestExpired.id,
    })
    setAddModalOpen(true)
  }, [])

  const handleCreated = useCallback(() => {
    if (!user?.id) return
    void queryClient.invalidateQueries({ queryKey: userMembershipsByUserQueryKey(user.id) })
  }, [queryClient, user?.id])

  if (!user) return null

  const profileHref = `/dashboard/users/${user.id}?mode=view&tab=membership`

  return (
    <>
      <Modal open={open} onClose={onClose} title={`Memberships — ${memberName(user)}`} size="wide">
        <p className="mb-4 text-sm text-slate-400">
          All membership plans linked to this member. Add or renew here without opening the full
          manage-memberships page.
        </p>
        <MemberMembershipHistoryTab
          userId={user.id}
          canManageMemberships={canManageMemberships}
          onAddMembership={canManageMemberships ? openAddMembership : undefined}
          onRenewMembership={canManageMemberships ? openRenewMembership : undefined}
        />
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

      <AddUserMembershipModal
        open={addModalOpen}
        onClose={() => setAddModalOpen(false)}
        lockedMember={user}
        intent={addIntent}
        prefill={renewPrefill}
        creationSource="members_list_modal"
        onCreated={handleCreated}
      />
    </>
  )
}
