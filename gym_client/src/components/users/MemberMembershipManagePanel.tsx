import { useCallback, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { MemberMembershipHistoryTab } from './MemberMembershipHistoryTab'
import { AddUserMembershipModal } from '../memberships/AddUserMembershipModal'
import { userMembershipsByUserQueryKey } from '../../services/userMemberships.service'
import { authService } from '../../services/auth.service'
import { renewStartDateForMembership } from '../../lib/membershipFormUtils'
import type { User } from '../../types/user'
import type { UserMembership } from '../../types/userMembership'

export function MemberMembershipManagePanel({
  user,
  onMembershipChanged,
}: {
  user: User
  onMembershipChanged?: () => void
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

  const openAddMembership = useCallback(() => {
    setAddIntent('create')
    setRenewPrefill(undefined)
    setAddModalOpen(true)
  }, [])

  const openRenewMembership = useCallback((membership: UserMembership) => {
    setAddIntent('renew')
    setRenewPrefill({
      planId: membership.planId,
      startDate: renewStartDateForMembership(membership),
      priorMembershipId: membership.id,
    })
    setAddModalOpen(true)
  }, [])

  const handleCreated = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: userMembershipsByUserQueryKey(user.id) })
    onMembershipChanged?.()
  }, [onMembershipChanged, queryClient, user.id])

  return (
    <>
      <MemberMembershipHistoryTab
        userId={user.id}
        canManageMemberships={canManageMemberships}
        onAddMembership={canManageMemberships ? openAddMembership : undefined}
        onRenewMembership={canManageMemberships ? openRenewMembership : undefined}
      />

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
