import { useEffect, useMemo, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { Modal } from '../ui/Modal'
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'
import { userMembershipsService } from '../../services/userMemberships.service'
import { usersService } from '../../services/users.service'
import { membershipPlansService } from '../../services/membershipPlans.service'
import { getApiErrorMessage } from '../../lib/apiErrors'
import {
  findOccupyingMembershipConflict,
} from '../../lib/membershipRules'
import {
  membershipToConflict,
  parseActiveMembershipConflict,
} from '../../lib/activeMembershipConflict'
import {
  addDaysToIsoDate,
  membershipFormLabelClass,
  membershipFormSelectClass,
  membershipStatusLabel,
  membershipStatusOptions,
  todayIsoDate,
} from '../../lib/membershipFormUtils'
import {
  conflictCollectPaymentPath,
  conflictNeedsCollectPayment,
  extendMembershipAccessRenewal,
} from '../../lib/membershipRenewFlow'
import {
  collectPaymentPath,
  memberMembershipHistoryPath,
  membershipStatusOpensCollectPayment,
} from '../../lib/membershipPaymentNavigation'
import { ActiveMembershipConflictModal } from './ActiveMembershipConflictModal'
import type { ActiveMembershipConflict } from '../../types/activeMembershipConflict'
import { invalidateDashboardQueries } from '../../lib/dashboardQueryKeys'
import type { CreateUserMembershipDto, UserMembership } from '../../types/userMembership'
import type { User } from '../../types/user'

export type MembershipMemberRef = Pick<
  User,
  'id' | 'firstName' | 'lastName' | 'email' | 'phone' | 'username'
>

export type AddUserMembershipIntent = 'create' | 'renew'

export type AddUserMembershipModalProps = {
  open: boolean
  onClose: () => void
  /** When set, member is fixed and the picker is hidden. */
  lockedMember?: MembershipMemberRef | null
  intent?: AddUserMembershipIntent
  prefill?: {
    planId?: number
    startDate?: string
    endDate?: string
    priorMembershipId?: number
  }
  creationSource?: 'members_list_modal' | 'user_memberships_page'
  onCreated?: (membership: UserMembership) => void
  /** Extra query keys to invalidate after create (e.g. paged list). */
  extraInvalidateQueryKeys?: readonly (readonly unknown[])[]
}

const defaultCreate = (): CreateUserMembershipDto => ({
  userId: 0,
  planId: 0,
  startDate: todayIsoDate(),
  endDate: todayIsoDate(),
  status: 'Active',
})

function memberDisplayName(member: MembershipMemberRef) {
  const name = `${member.firstName} ${member.lastName}`.trim()
  return name || member.email || member.username || `Member #${member.id}`
}

function formatConflictDate(iso: string) {
  if (!iso) return '—'
  const d = new Date(iso.slice(0, 10) + 'T12:00:00')
  return Number.isNaN(d.getTime()) ? iso.slice(0, 10) : d.toLocaleDateString()
}

export function AddUserMembershipModal({
  open,
  onClose,
  lockedMember,
  intent = 'create',
  prefill,
  creationSource = 'user_memberships_page',
  onCreated,
  extraInvalidateQueryKeys = [],
}: AddUserMembershipModalProps) {
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const [form, setForm] = useState<CreateUserMembershipDto>(defaultCreate)
  const [formError, setFormError] = useState<string | null>(null)
  const [memberSearch, setMemberSearch] = useState('')
  const [debouncedMemberSearch, setDebouncedMemberSearch] = useState('')
  const [memberDropdownOpen, setMemberDropdownOpen] = useState(false)
  const [activeConflict, setActiveConflict] = useState<ActiveMembershipConflict | null>(null)
  const memberDropdownRef = useRef<HTMLDivElement>(null)

  const showMemberPicker = !lockedMember

  useEffect(() => {
    if (!open) return
    const start = prefill?.startDate ?? todayIsoDate()
    const end = prefill?.endDate ?? start
    setForm({
      ...defaultCreate(),
      userId: lockedMember?.id ?? 0,
      planId: prefill?.planId ?? 0,
      startDate: start,
      endDate: end,
      status: 'Active',
      intent,
      creationSource,
      priorMembershipId: prefill?.priorMembershipId,
    })
    setFormError(null)
    setMemberSearch('')
    setDebouncedMemberSearch('')
    setMemberDropdownOpen(false)
    setActiveConflict(null)
  }, [open, lockedMember?.id, intent, prefill?.planId, prefill?.startDate, prefill?.endDate, prefill?.priorMembershipId, creationSource])

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedMemberSearch(memberSearch.trim()), 250)
    return () => window.clearTimeout(timer)
  }, [memberSearch])

  useEffect(() => {
    if (!memberDropdownOpen) return
    const onDocClick = (event: MouseEvent) => {
      if (!memberDropdownRef.current?.contains(event.target as Node)) {
        setMemberDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', onDocClick)
    return () => document.removeEventListener('mousedown', onDocClick)
  }, [memberDropdownOpen])

  const { data: users = [], isFetching: usersFetching } = useQuery({
    queryKey: ['users-paged-membership-modal', debouncedMemberSearch],
    enabled: open && showMemberPicker,
    queryFn: async () => {
      const { data } = await usersService.getPaged({
        page: 1,
        pageSize: 100,
        membersOnly: true,
        isActive: true,
        search: debouncedMemberSearch || undefined,
      })
      return Array.isArray(data?.items) ? data.items : []
    },
  })

  const { data: plans = [] } = useQuery({
    queryKey: ['membership-plans'],
    enabled: open,
    staleTime: 60_000,
    queryFn: async () => {
      const { data } = await membershipPlansService.getAll()
      const list = Array.isArray(data) ? data : []
      return list.map((p: { id?: number; Id?: number; planName?: string; PlanName?: string; durationDays?: number; DurationDays?: number; price?: number; Price?: number }) => ({
        id: p.id ?? p.Id ?? 0,
        planName: p.planName ?? p.PlanName ?? '',
        durationDays: p.durationDays ?? p.DurationDays ?? 0,
        price: p.price ?? p.Price ?? 0,
      }))
    },
  })

  const {
    data: existingActiveConflict,
    isLoading: activeConflictLoading,
    isFetching: activeConflictFetching,
  } = useQuery({
    queryKey: ['active-membership-conflict', form.userId],
    queryFn: async () => {
      const res = await userMembershipsService.getActiveConflict(form.userId)
      if (res.status === 200 && res.data) return res.data
      const { data: rows } = await userMembershipsService.getByUserId(form.userId)
      const occupying = Array.isArray(rows)
        ? findOccupyingMembershipConflict(rows, form.userId)
        : undefined
      return occupying ? membershipToConflict(occupying) : null
    },
    enabled: open && form.userId > 0,
  })

  const selectedMember = useMemo(() => {
    if (lockedMember) return lockedMember
    return users.find((u) => u.id === form.userId)
  }, [lockedMember, users, form.userId])

  const renewTargetMembershipId =
    prefill?.priorMembershipId ?? existingActiveConflict?.membershipId ?? 0

  const isExtendRenew =
    intent === 'renew' && existingActiveConflict != null && !activeConflictLoading

  const renewContextLoading =
    intent === 'renew' && form.userId > 0 && (activeConflictLoading || activeConflictFetching)

  const selectedPlan = useMemo(
    () => plans.find((p) => p.id === form.planId),
    [plans, form.planId],
  )

  const extendEndDate = useMemo(() => {
    if (!isExtendRenew || !selectedPlan || selectedPlan.durationDays <= 0) return null
    return addDaysToIsoDate(existingActiveConflict!.endDate.slice(0, 10), selectedPlan.durationDays)
  }, [isExtendRenew, selectedPlan, existingActiveConflict])

  const renewNeedsCollect = useMemo(
    () =>
      isExtendRenew &&
      existingActiveConflict?.existingStatus != null &&
      membershipStatusOpensCollectPayment(existingActiveConflict.existingStatus),
    [isExtendRenew, existingActiveConflict?.existingStatus],
  )

  useEffect(() => {
    if (!open || form.planId <= 0 || plans.length === 0) return
    const plan = plans.find((p) => p.id === form.planId)
    if (!plan || plan.durationDays <= 0) return
    if (isExtendRenew && existingActiveConflict) {
      const end = addDaysToIsoDate(existingActiveConflict.endDate.slice(0, 10), plan.durationDays)
      setForm((f) => (f.endDate.slice(0, 10) === end ? f : { ...f, endDate: end }))
      return
    }
    const start = form.startDate.slice(0, 10)
    const end = addDaysToIsoDate(start, plan.durationDays)
    setForm((f) => (f.endDate.slice(0, 10) === end ? f : { ...f, endDate: end }))
  }, [open, plans, form.planId, form.startDate, isExtendRenew, existingActiveConflict])

  const invalidateAfterCreate = async (userId: number) => {
    await queryClient.invalidateQueries({ queryKey: ['user-memberships'] })
    await queryClient.invalidateQueries({ queryKey: ['user-memberships', 'by-user', userId] })
    await queryClient.invalidateQueries({ queryKey: ['users-paged'] })
    await queryClient.invalidateQueries({ queryKey: ['users-directory-total'] })
    await queryClient.invalidateQueries({ queryKey: ['user', userId] })
    invalidateDashboardQueries(queryClient)
    for (const key of extraInvalidateQueryKeys) {
      await queryClient.invalidateQueries({ queryKey: key })
    }
  }

  const createMutation = useMutation({
    mutationFn: (dto: CreateUserMembershipDto) => userMembershipsService.create(dto),
    onSuccess: (res) => {
      const created = res.data
      toast.success(intent === 'renew' ? 'Membership renewed.' : 'Membership created.')
      onClose()
      onCreated?.(created)
      void invalidateAfterCreate(form.userId)
    },
    onError: (err: unknown) => {
      const conflict = parseActiveMembershipConflict(err)
      if (conflict?.membershipId) {
        setActiveConflict(conflict)
        return
      }
      setFormError(getApiErrorMessage(err, 'Failed to create membership'))
    },
  })

  const extendRenewMutation = useMutation({
    mutationFn: async () => {
      if (!existingActiveConflict) {
        throw new Error('Could not load the current membership.')
      }
      const result = await extendMembershipAccessRenewal(
        existingActiveConflict,
        form.planId > 0 ? form.planId : undefined,
      )
      if (!result.ok) {
        if (result.reason === 'needs_collect') {
          throw new Error(result.message ?? 'Collect outstanding payment before extending access.')
        }
        throw new Error(result.message ?? 'Could not extend membership.')
      }
      return result.endDate
    },
    onSuccess: (extendedEndDate) => {
      toast.success('Membership renewed.')
      onClose()
      onCreated?.({
        id: renewTargetMembershipId,
        userId: form.userId,
        planId: form.planId,
        startDate: form.startDate,
        endDate: extendedEndDate,
        status: form.status ?? 'Active',
      })
      void invalidateAfterCreate(form.userId)
      void queryClient.invalidateQueries({
        queryKey: ['membership-financial-summary', renewTargetMembershipId],
      })
      void queryClient.invalidateQueries({
        queryKey: ['active-membership-conflict', form.userId],
      })
    },
    onError: (err: unknown) => {
      const msg = getApiErrorMessage(err, 'Failed to renew membership')
      if (/collect|outstanding payment/i.test(msg)) {
        setActiveConflict(existingActiveConflict)
        setFormError(msg)
        return
      }
      setFormError(msg)
    },
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError(null)
    if (form.userId === 0 || form.planId === 0) {
      setFormError('Please select a member and a plan.')
      return
    }

    if (isExtendRenew && existingActiveConflict) {
      if (renewNeedsCollect) {
        setActiveConflict(existingActiveConflict)
        return
      }
      if (!extendEndDate) {
        setFormError('Select a plan to calculate the new end date.')
        return
      }
      extendRenewMutation.mutate()
      return
    }

    if (intent === 'renew' && renewContextLoading) {
      setFormError('Loading current membership… please wait a moment and try again.')
      return
    }

    if (intent === 'renew' && form.userId > 0 && !existingActiveConflict) {
      setFormError('No active membership found to renew. Add a new membership instead.')
      return
    }

    try {
      const { status, data } = await userMembershipsService.getActiveConflict(form.userId)
      if (status === 200 && data) {
        setActiveConflict(data)
        return
      }
    } catch {
      /* server enforces on POST */
    }
    createMutation.mutate({
      userId: form.userId,
      planId: form.planId,
      startDate: form.startDate,
      endDate: form.endDate,
      status: form.status ?? 'Active',
      intent,
      creationSource,
      priorMembershipId: prefill?.priorMembershipId,
    })
  }

  const title =
    intent === 'renew' ? 'Renew membership' : 'Add membership'

  return (
    <>
      <Modal open={open} onClose={onClose} title={title}>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {formError ? (
            <p
              className="rounded-lg border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-sm text-rose-200"
              role="alert"
            >
              {formError}
            </p>
          ) : null}

          {lockedMember ? (
            <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm">
              <p className="font-medium text-white">{memberDisplayName(lockedMember)}</p>
              <p className="mt-1 text-slate-400">
                {[lockedMember.phone, lockedMember.email || lockedMember.username]
                  .filter(Boolean)
                  .join(' · ') || `Member ID ${lockedMember.id}`}
              </p>
            </div>
          ) : null}

          {existingActiveConflict ? (
            <div
              role="alert"
              className="rounded-xl border border-amber-400/35 bg-amber-500/10 px-4 py-3 text-sm text-amber-100"
            >
              {isExtendRenew ? (
                <>
                  <p className="font-medium">Extending the current membership period.</p>
                  <p className="mt-1 text-amber-200/90">
                    {existingActiveConflict.planName ?? 'Plan'} · currently ends{' '}
                    {formatConflictDate(existingActiveConflict.endDate)} ·{' '}
                    {existingActiveConflict.remainingDays} days left
                  </p>
                  {renewNeedsCollect ? (
                    <p className="mt-2 text-xs text-amber-100/90">
                      Collect outstanding payment first, then renew access.
                    </p>
                  ) : selectedPlan && extendEndDate ? (
                    <p className="mt-2 text-xs text-amber-100/90">
                      Renewal adds {selectedPlan.durationDays} days — new end date{' '}
                      {formatConflictDate(extendEndDate)}.
                    </p>
                  ) : null}
                </>
              ) : (
                <>
                  <p className="font-medium">Member already has an active membership.</p>
                  <p className="mt-1 text-amber-200/90">
                    {existingActiveConflict.planName ?? 'Plan'} · ends{' '}
                    {formatConflictDate(existingActiveConflict.endDate)} ·{' '}
                    {existingActiveConflict.remainingDays} days left
                  </p>
                </>
              )}
              <div className="mt-3 flex flex-wrap gap-2">
                {!isExtendRenew || renewNeedsCollect ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setFormError(null)
                      setActiveConflict(existingActiveConflict)
                    }}
                  >
                    View options
                  </Button>
                ) : null}
                {renewNeedsCollect ? (
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => {
                      const returnTo = lockedMember
                        ? memberMembershipHistoryPath(existingActiveConflict.userId)
                        : `/dashboard/user-memberships?membershipId=${existingActiveConflict.membershipId}`
                      navigate(
                        collectPaymentPath(
                          existingActiveConflict.membershipId,
                          existingActiveConflict.userId,
                          returnTo,
                        ),
                      )
                      onClose()
                    }}
                  >
                    Collect payment
                  </Button>
                ) : null}
              </div>
            </div>
          ) : null}

          {showMemberPicker ? (
            <div ref={memberDropdownRef} className="relative">
              <label className={membershipFormLabelClass}>Member</label>
              <button
                type="button"
                onClick={() => setMemberDropdownOpen((v) => !v)}
                className={`${membershipFormSelectClass} flex items-center justify-between`}
                aria-haspopup="listbox"
                aria-label="Select member"
              >
                <span className="truncate text-left">
                  {selectedMember
                    ? `${selectedMember.firstName} ${selectedMember.lastName} (${selectedMember.email})`
                    : form.userId > 0
                      ? `User #${form.userId}`
                      : 'Select member'}
                </span>
                <span className="ml-2 text-slate-400">▾</span>
              </button>
              {memberDropdownOpen ? (
                <div
                  className="absolute z-50 mt-1 w-full rounded-xl border border-white/12 bg-slate-950/95 p-2 shadow-2xl shadow-blue-950/40 backdrop-blur-xl"
                  role="listbox"
                  aria-label="Member options"
                >
                  <Input
                    label="Search member"
                    value={memberSearch}
                    onChange={(e) => setMemberSearch(e.target.value)}
                    placeholder="Search member name, email, phone..."
                  />
                  {usersFetching ? (
                    <p className="mt-2 px-2 text-xs text-slate-500">Searching members…</p>
                  ) : users.length === 0 ? (
                    <p className="mt-2 px-2 text-xs text-slate-500">No members found.</p>
                  ) : (
                    <div className="mt-2 max-h-56 overflow-auto">
                      {users.map((u) => (
                        <button
                          key={u.id}
                          type="button"
                          role="option"
                          className={`w-full rounded-lg px-3 py-2 text-left text-sm transition ${
                            form.userId === u.id
                              ? 'bg-blue-500/20 text-blue-100'
                              : 'text-slate-200 hover:bg-white/10'
                          }`}
                          onClick={() => {
                            setForm((f) => ({ ...f, userId: u.id }))
                            setMemberDropdownOpen(false)
                          }}
                        >
                          {u.firstName} {u.lastName} ({u.email})
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ) : null}
            </div>
          ) : null}

          <div>
            <label className={membershipFormLabelClass}>Plan</label>
            <select
              value={form.planId}
              onChange={(e) => {
                const planId = Number(e.target.value)
                const plan = plans.find((p) => p.id === planId)
                if (isExtendRenew && existingActiveConflict && plan && plan.durationDays > 0) {
                  const end = addDaysToIsoDate(
                    existingActiveConflict.endDate.slice(0, 10),
                    plan.durationDays,
                  )
                  setForm((f) => ({ ...f, planId, endDate: end }))
                  return
                }
                const start = form.startDate.slice(0, 10)
                const end =
                  plan && plan.durationDays > 0
                    ? addDaysToIsoDate(start, plan.durationDays)
                    : form.endDate.slice(0, 10)
                setForm((f) => ({ ...f, planId, endDate: end }))
              }}
              className={membershipFormSelectClass}
              aria-label="Select plan"
              required
            >
              <option value={0} className="bg-slate-900">
                Select plan
              </option>
              {plans.map((p) => (
                <option key={p.id} value={p.id} className="bg-slate-900">
                  {p.planName} — {p.durationDays} days, ₹{p.price}
                </option>
              ))}
            </select>
          </div>

          {isExtendRenew ? (
            <div>
              <label className={membershipFormLabelClass}>Current period ends</label>
              <p className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-100">
                {formatConflictDate(existingActiveConflict!.endDate)}
              </p>
            </div>
          ) : (
            <Input
              label="Start date"
              type="date"
              value={form.startDate.slice(0, 10)}
              onChange={(e) => {
                const start = e.target.value
                if (form.planId > 0) {
                  const plan = plans.find((p) => p.id === form.planId)
                  const end =
                    plan && plan.durationDays > 0
                      ? addDaysToIsoDate(start, plan.durationDays)
                      : form.endDate.slice(0, 10)
                  setForm((f) => ({ ...f, startDate: start, endDate: end }))
                } else {
                  setForm((f) => ({ ...f, startDate: start }))
                }
              }}
              required
            />
          )}

          {form.planId > 0 ? (
            <div>
              <label className={membershipFormLabelClass}>
                {isExtendRenew ? 'New end date' : 'End date'}
              </label>
              <p className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-100">
                {form.endDate.slice(0, 10)}{' '}
                <span className="text-xs text-slate-500">
                  {isExtendRenew ? '(adds plan duration to current end date)' : '(from plan duration)'}
                </span>
              </p>
            </div>
          ) : (
            <Input
              label="End date"
              type="date"
              value={form.endDate.slice(0, 10)}
              onChange={(e) => setForm((f) => ({ ...f, endDate: e.target.value }))}
              required
            />
          )}

          {!isExtendRenew ? (
            <div>
              <label className={membershipFormLabelClass}>Status</label>
              <select
                value={form.status}
                onChange={(e) =>
                  setForm((f) => ({ ...f, status: e.target.value as CreateUserMembershipDto['status'] }))
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
          ) : null}

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={
                createMutation.isPending ||
                extendRenewMutation.isPending ||
                renewContextLoading ||
                (intent !== 'renew' && !!existingActiveConflict) ||
                form.planId <= 0 ||
                form.userId <= 0
              }
              isLoading={
                createMutation.isPending || extendRenewMutation.isPending || renewContextLoading
              }
            >
              {renewContextLoading ? 'Loading…' : intent === 'renew' ? 'Renew' : 'Create'}
            </Button>
          </div>
        </form>
      </Modal>

      <ActiveMembershipConflictModal
        open={activeConflict != null}
        conflict={activeConflict}
        onClose={() => setActiveConflict(null)}
        onRenew={async (conflict) => {
          setActiveConflict(null)
          const returnTo = lockedMember
            ? memberMembershipHistoryPath(conflict.userId)
            : `/dashboard/user-memberships?membershipId=${conflict.membershipId}`

          if (conflictNeedsCollectPayment(conflict)) {
            onClose()
            navigate(conflictCollectPaymentPath(conflict, returnTo))
            return
          }

          try {
            const result = await extendMembershipAccessRenewal(
              conflict,
              form.planId > 0 ? form.planId : undefined,
            )
            if (result.ok) {
              toast.success('Membership access extended.')
              onClose()
              onCreated?.({
                id: conflict.membershipId,
                userId: conflict.userId,
                planId: form.planId,
                startDate: conflict.startDate,
                endDate: result.endDate,
                status: conflict.existingStatus ?? 'Active',
              })
              void invalidateAfterCreate(form.userId)
              return
            }

            if (result.reason === 'needs_collect') {
              onClose()
              navigate(conflictCollectPaymentPath(conflict, returnTo))
              return
            }

            toast.error(result.message ?? 'Could not extend membership.')
          } catch (err) {
            toast.error(getApiErrorMessage(err, 'Could not extend membership.'))
          }
        }}
        onUpgrade={(conflict) => {
          setActiveConflict(null)
          onClose()
          navigate(`/dashboard/user-memberships?membershipId=${conflict.membershipId}`)
        }}
      />
    </>
  )
}
