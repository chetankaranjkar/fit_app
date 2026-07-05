import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'
import { Modal } from '../ui/Modal'
import { membershipPaymentsService } from '../../services/membershipPayments.service'
import { membershipPlansService } from '../../services/membershipPlans.service'
import {
  membershipFormLabelClass,
  membershipFormSelectClass,
  membershipStatusLabel,
  membershipStatusOptions,
} from '../../lib/membershipFormUtils'
import { membershipEditRequiresApproval } from './RequestMembershipChangeModal'
import type { CreateUserMembershipDto, MembershipStatus, UserMembership } from '../../types/userMembership'

type EditUserMembershipModalProps = {
  open: boolean
  editing: UserMembership | null
  form: CreateUserMembershipDto
  formError: string | null
  isPending: boolean
  onClose: () => void
  onSubmit: (event: React.FormEvent) => void
  onRequestApproval: () => void
  onFormChange: (updater: (prev: CreateUserMembershipDto) => CreateUserMembershipDto) => void
}

export function EditUserMembershipModal({
  open,
  editing,
  form,
  formError,
  isPending,
  onClose,
  onSubmit,
  onRequestApproval,
  onFormChange,
}: EditUserMembershipModalProps) {
  const { data: plans = [] } = useQuery({
    queryKey: ['membership-plans'],
    queryFn: async () => {
      const { data } = await membershipPlansService.getAll()
      return data ?? []
    },
    enabled: open,
    staleTime: 60_000,
  })

  const { data: financial } = useQuery({
    queryKey: ['membership-financial-summary', editing?.id],
    queryFn: async () => {
      const { data } = await membershipPaymentsService.financialSummary(editing!.id)
      return data
    },
    enabled: open && editing != null,
  })

  const hasPayments = useMemo(
    () =>
      financial != null &&
      ((financial.totalPaid ?? 0) > 0 || (financial.outstandingBalance ?? 0) > 0),
    [financial],
  )

  const requiresApproval = editing
    ? membershipEditRequiresApproval(editing, form, hasPayments)
    : false

  return (
    <Modal open={open && editing != null} onClose={onClose} title="Edit membership" size="wide">
      <form onSubmit={onSubmit} className="flex flex-col gap-5">
        {formError ? (
          <p
            className="rounded-lg border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-sm text-rose-200"
            role="alert"
          >
            {formError}
          </p>
        ) : null}

        {editing ? (
          <p className="text-sm text-slate-400">
            {editing.userName ?? `User #${editing.userId}`} · #{editing.id}
          </p>
        ) : null}

        {hasPayments ? (
          <div
            role="note"
            className="rounded-xl border border-amber-400/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-100"
          >
            Payment records exist on this membership. Direct edits are disabled — submit an admin approval
            request for plan, date, or status changes.
          </div>
        ) : null}

        <section className="space-y-3 rounded-xl border border-white/10 bg-white/[0.03] p-4">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">Plan</h3>
          <div>
            <label className={membershipFormLabelClass}>Membership plan</label>
            <select
              value={form.planId || ''}
              onChange={(e) => onFormChange((f) => ({ ...f, planId: Number(e.target.value) }))}
              className={membershipFormSelectClass}
              aria-label="Select membership plan"
            >
              <option value="" className="bg-slate-900">
                Select plan
              </option>
              {plans.map((plan) => (
                <option key={plan.id} value={plan.id} className="bg-slate-900">
                  {plan.planName}
                </option>
              ))}
            </select>
          </div>
        </section>

        <section className="space-y-3 rounded-xl border border-white/10 bg-white/[0.03] p-4">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">Dates</h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="Start date"
              type="date"
              value={form.startDate.slice(0, 10)}
              onChange={(e) => onFormChange((f) => ({ ...f, startDate: e.target.value }))}
              required
            />
            <Input
              label="End date"
              type="date"
              value={form.endDate.slice(0, 10)}
              onChange={(e) => onFormChange((f) => ({ ...f, endDate: e.target.value }))}
              required
            />
          </div>
        </section>

        <section className="space-y-3 rounded-xl border border-white/10 bg-white/[0.03] p-4">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">Status</h3>
          <div>
            <label className={membershipFormLabelClass}>Status</label>
            <select
              value={form.status}
              onChange={(e) =>
                onFormChange((f) => ({ ...f, status: e.target.value as MembershipStatus }))
              }
              className={membershipFormSelectClass}
              aria-label="Select membership status"
            >
              {membershipStatusOptions.map((s) => (
                <option key={s} value={s} className="bg-slate-900">
                  {membershipStatusLabel[s] ?? s}
                </option>
              ))}
            </select>
          </div>
        </section>

        <div className="flex flex-wrap justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          {requiresApproval ? (
            <Button type="button" onClick={onRequestApproval}>
              Submit for approval
            </Button>
          ) : (
            <Button type="submit" disabled={isPending || hasPayments} isLoading={isPending}>
              Update
            </Button>
          )}
        </div>
      </form>
    </Modal>
  )
}