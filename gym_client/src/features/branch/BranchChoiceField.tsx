import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { authService } from '../../services/auth.service'

export type BranchChoiceOption = {
  id: number
  name: string
}

export const MEMBER_BRANCH_REASON =
  "A home branch is required so the member's visits, billing, and staff access stay at the correct gym."

export const LEAD_BRANCH_REASON =
  'An interested branch is required so follow-up and conversion stay at the correct gym.'

export const SIGNUP_BRANCH_REASON =
  'Choose the branch you will train at. Check-in and membership use that branch.'

export function canCreateBranch() {
  return (
    authService.hasQrOwnerAccess() ||
    authService.canConfigAccess() ||
    authService.canCreateUsers() ||
    authService.canUsersAccess()
  )
}

export function BranchChoiceField({
  branches,
  loading = false,
  value,
  onChange,
  reason,
  returnTo,
  onBeforeCreateBranch,
  defaultBranchId,
  label = 'Branch',
}: {
  branches: BranchChoiceOption[] | null
  loading?: boolean
  value?: number | null
  onChange: (branchId: number | undefined) => void
  reason: string
  returnTo?: string
  onBeforeCreateBranch?: () => void
  defaultBranchId?: number | null
  label?: string
}) {
  useEffect(() => {
    if (!branches || value) return
    if (branches.length === 1) {
      onChange(branches[0].id)
      return
    }
    if (defaultBranchId && branches.some((branch) => branch.id === defaultBranchId))
      onChange(defaultBranchId)
  }, [branches, value, defaultBranchId, onChange])

  if (loading || branches == null) {
    return <p className="text-sm text-slate-400">Loading branches…</p>
  }

  if (branches.length === 0) {
    const createHref = returnTo
      ? `/dashboard/access/branches?returnTo=${encodeURIComponent(returnTo)}`
      : '/dashboard/access/branches'
    return (
      <div className="rounded-xl border border-amber-400/30 bg-amber-500/10 p-3 text-sm text-amber-100">
        <p className="font-medium">Create a branch to continue.</p>
        <p className="mt-1 text-amber-100/90">{reason}</p>
        {canCreateBranch() && returnTo ? (
          <Link
            className="mt-2 inline-block underline"
            to={createHref}
            onClick={() => onBeforeCreateBranch?.()}
          >
            Create branch
          </Link>
        ) : (
          <p className="mt-2">Ask an administrator to create a branch.</p>
        )}
      </div>
    )
  }

  if (branches.length === 1) {
    return (
      <p className="text-sm text-slate-300">
        {label}: {branches[0].name}
      </p>
    )
  }

  return (
    <label className="block text-sm text-slate-300">
      {label}
      <select
        className="mt-1 w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-white"
        value={value ?? ''}
        onChange={(event) => onChange(Number(event.target.value) || undefined)}
        required
      >
        <option value="">Select a branch</option>
        {branches.map((branch) => (
          <option key={branch.id} value={branch.id}>
            {branch.name}
          </option>
        ))}
      </select>
    </label>
  )
}
