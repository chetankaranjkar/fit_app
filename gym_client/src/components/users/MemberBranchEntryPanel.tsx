import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Button } from '../ui/Button'
import { Modal } from '../ui/Modal'
import { getApiErrorMessage } from '../../lib/apiErrors'
import { branchesService } from '../../services/branches.service'
import { userMembershipsService } from '../../services/userMemberships.service'
import { useBranchScope } from '../../features/branch/BranchScopeContext'
import { BranchChoiceField } from '../../features/branch/BranchChoiceField'

const ACCESS_OPTIONS = [
  { id: 'HomeOnly', label: 'Home branch only' },
  { id: 'Selected', label: 'Selected branches' },
  { id: 'AllOrganization', label: 'All branches in the organization' },
] as const

export function MemberBranchEntryPanel({
  userId,
  membershipId,
  homeBranchName,
}: {
  userId: number
  membershipId?: number | null
  homeBranchName?: string | null
}) {
  const scope = useBranchScope()
  const queryClient = useQueryClient()
  const [transferOpen, setTransferOpen] = useState(false)
  const [accessOpen, setAccessOpen] = useState(false)
  const [toBranchId, setToBranchId] = useState<number | undefined>()
  const [reason, setReason] = useState('')
  const [effectiveDate, setEffectiveDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [accessDecision, setAccessDecision] = useState('Unchanged')
  const [selectedIds, setSelectedIds] = useState<number[]>([])
  const [error, setError] = useState<string | null>(null)

  const accessQuery = useQuery({
    queryKey: ['visit-access', membershipId],
    enabled: Boolean(membershipId && accessOpen),
    queryFn: async () => (await userMembershipsService.getVisitAccess(membershipId!)).data,
  })

  const transferMutation = useMutation({
    mutationFn: () =>
      branchesService.transferMember({
        userId,
        toBranchId: toBranchId!,
        effectiveDate,
        reason,
        accessDecision,
        financialDecision: 'Unchanged',
        selectedBranchIds: accessDecision === 'Selected' ? selectedIds : undefined,
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['user', userId] })
      setTransferOpen(false)
      setReason('')
      setError(null)
    },
    onError: (err: unknown) => setError(getApiErrorMessage(err)),
  })

  const accessMutation = useMutation({
    mutationFn: (accessScope: string) =>
      userMembershipsService.setVisitAccess(membershipId!, {
        accessScope,
        branchIds: selectedIds,
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['visit-access', membershipId] })
      setAccessOpen(false)
      setError(null)
    },
    onError: (err: unknown) => setError(getApiErrorMessage(err)),
  })

  const [draftScope, setDraftScope] = useState('HomeOnly')

  return (
    <span className="inline-flex flex-wrap items-center gap-2">
      <button type="button" className="text-amber-300 underline" onClick={() => { setError(null); setTransferOpen(true) }}>
        Transfer branch
      </button>
      {membershipId ? (
        <button type="button" className="text-amber-300 underline" onClick={() => { setError(null); setDraftScope('HomeOnly'); setAccessOpen(true) }}>
          Visit access
        </button>
      ) : null}
      <Modal open={transferOpen} title="Transfer home branch" onClose={() => setTransferOpen(false)}>
        <div className="space-y-3 text-sm">
          <p className="text-slate-400">Current home branch: {homeBranchName || 'Not assigned'}. Bills, balances, and past visits stay on the branch already recorded.</p>
          <BranchChoiceField
            branches={scope ? scope.branches : null}
            value={toBranchId}
            onChange={setToBranchId}
            label="Destination branch"
            reason="The member's new home branch."
            defaultBranchId={scope?.defaultBranchId}
          />
          <label className="block text-xs uppercase tracking-wide text-slate-400">
            Effective date
            <input type="date" className="mt-1 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-slate-100" value={effectiveDate} onChange={(event) => setEffectiveDate(event.target.value)} />
          </label>
          <label className="block text-xs uppercase tracking-wide text-slate-400">
            Reason
            <textarea className="mt-1 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-slate-100" rows={3} value={reason} onChange={(event) => setReason(event.target.value)} />
          </label>
          <label className="block text-xs uppercase tracking-wide text-slate-400">
            Current visit access
            <select className="mt-1 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-slate-100" value={accessDecision} onChange={(event) => setAccessDecision(event.target.value)}>
              <option value="Unchanged">Leave visit access unchanged</option>
              {ACCESS_OPTIONS.map((option) => (
                <option key={option.id} value={option.id}>{option.label}</option>
              ))}
            </select>
          </label>
          <p className="text-slate-400">Financial decision: Unchanged. This transfer does not reprice bills or move balances.</p>
          {error ? <p className="text-rose-300">{error}</p> : null}
          <Button disabled={!toBranchId || !reason.trim() || transferMutation.isPending} onClick={() => transferMutation.mutate()}>
            Record transfer
          </Button>
        </div>
      </Modal>
      <Modal open={accessOpen} title="Membership visit access" onClose={() => setAccessOpen(false)}>
        <div className="space-y-3 text-sm">
          <p className="text-slate-400">Current: {accessQuery.data?.accessScope ?? 'Loading…'}. Saving here is the audited access change. It does not move the home branch or rewrite bills.</p>
          <select className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-slate-100" value={draftScope} onChange={(event) => setDraftScope(event.target.value)}>
            {ACCESS_OPTIONS.map((option) => (
              <option key={option.id} value={option.id}>{option.label}</option>
            ))}
          </select>
          {draftScope === 'Selected' ? (
            <div className="space-y-1">
              {(scope?.branches ?? []).map((branch) => (
                <label key={branch.id} className="flex items-center gap-2 text-slate-200">
                  <input
                    type="checkbox"
                    checked={selectedIds.includes(branch.id)}
                    onChange={(event) => {
                      setSelectedIds((current) => event.target.checked ? [...current, branch.id] : current.filter((id) => id !== branch.id))
                    }}
                  />
                  {branch.name}
                </label>
              ))}
            </div>
          ) : null}
          {error ? <p className="text-rose-300">{error}</p> : null}
          <Button
            disabled={accessMutation.isPending}
            onClick={() => accessMutation.mutate(draftScope)}
          >
            Save visit access
          </Button>
        </div>
      </Modal>
    </span>
  )
}
