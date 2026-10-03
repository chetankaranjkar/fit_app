import { useCallback, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { MemberMembershipHistoryTab } from './MemberMembershipHistoryTab'
import { AddUserMembershipModal } from '../memberships/AddUserMembershipModal'
import { userMembershipsByUserQueryKey } from '../../services/userMemberships.service'
import { authService } from '../../services/auth.service'
import { renewStartDateForMembership } from '../../lib/membershipFormUtils'
import { standingFromUserMembership } from '../../lib/membershipStanding'
import { extendMembershipAccessRenewal } from '../../lib/membershipRenewFlow'
import { membershipToConflict } from '../../lib/activeMembershipConflict'
import toast from 'react-hot-toast'
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

  const handleCreated = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: userMembershipsByUserQueryKey(user.id) })
    onMembershipChanged?.()
  }, [onMembershipChanged, queryClient, user.id])

  const openRenewMembership = useCallback(
    async (membership: UserMembership) => {
      const rule = standingFromUserMembership(membership).renew
      if (!rule.allowed) {
        toast.error(rule.reason ?? 'This membership cannot be renewed.')
        return
      }
      if (rule.mode === 'extend') {
        const result = await extendMembershipAccessRenewal(membershipToConflict(membership))
        if (result.ok) {
          toast.success(`Membership extended until ${new Date(`${result.endDate}T12:00:00`).toLocaleDateString()}.`)
          handleCreated()
        } else {
          toast.error(result.message ?? 'Could not extend membership.')
        }
        return
      }
      setAddIntent('renew')
      setRenewPrefill({
        planId: membership.planId,
        startDate: renewStartDateForMembership(membership),
        priorMembershipId: membership.id,
      })
      setAddModalOpen(true)
    },
    [handleCreated],
  )

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
