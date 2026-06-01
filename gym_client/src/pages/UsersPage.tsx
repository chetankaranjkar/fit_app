import { useState, useMemo, useEffect, useRef } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import toast from 'react-hot-toast'
import { DashboardLayout } from '../components/layout/DashboardLayout'
import { MetricCard } from '../components/dashboard/MetricCard'
import { DashboardMetricsGrid } from '../components/layout/DashboardMetricsGrid'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { Modal } from '../components/ui/Modal'
import { useWalkthrough } from '../modules/help/hooks/useWalkthrough'
import { usersService } from '../services/users.service'
import { membershipPlansService } from '../services/membershipPlans.service'
import { trainersService } from '../services/trainers.service'
import { userTypesService } from '../services/userTypes.service'
import type { User, CreateUserDto } from '../types/user'
import {
  MEMBERS_CSV_TEMPLATE,
  downloadMembersCsv,
  parseCsvLines,
  rowsToMemberImports,
} from '../lib/membersCsv'
import { formatInr } from '../lib/formatInr'
import type { Trainer } from '../types/trainer'

function getDashboardUser() {
  try {
    const userJson = localStorage.getItem('user')
    if (!userJson) return { userName: 'User' }
    const user = JSON.parse(userJson) as { fullName?: string; username?: string }
    return { userName: user?.fullName?.trim() || user?.username?.trim() || 'User' }
  } catch {
    return { userName: 'User' }
  }
}

const metricIcons = {
  users: (
    <svg className="size-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
    </svg>
  ),
  active: (
    <svg className="size-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  sun: (
    <svg className="size-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
    </svg>
  ),
  moon: (
    <svg className="size-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
    </svg>
  ),
}

function getAge(dateOfBirth: string): number | null {
  if (!dateOfBirth) return null
  const d = new Date(dateOfBirth)
  if (Number.isNaN(d.getTime())) return null
  const today = new Date()
  let age = today.getFullYear() - d.getFullYear()
  const m = today.getMonth() - d.getMonth()
  if (m < 0 || (m === 0 && today.getDate() < d.getDate())) age--
  return age
}

function formatDueDate(iso?: string | null) {
  if (!iso) return null
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return null
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
}

function PaymentDueCell({
  user,
  onCollect,
}: {
  user: User
  onCollect?: (u: User) => void
}) {
  const pending = user.pendingPaymentAmount ?? 0
  const dueLabel = formatDueDate(user.paymentNextDueDate)
  const paidLabel = formatDueDate(user.paymentLastPaidDate)
  const status = (user.membershipPaymentStatus ?? '').toLowerCase()
  const hasBalance = pending > 0.02
  const overdue = hasBalance && user.isPaymentOverdue

  // Paid / no balance: show last payment or next due date instead of "—"
  if (!hasBalance) {
    if (status === 'paid' && paidLabel) {
      return (
        <div className="flex flex-col items-start gap-0.5">
          <span className="inline-flex rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-200 ring-1 ring-emerald-500/20">
            Paid
          </span>
          <span className="text-xs text-slate-300">{paidLabel}</span>
        </div>
      )
    }
    if (dueLabel) {
      return (
        <div className="flex flex-col items-start gap-0.5">
          <span className="text-[11px] text-slate-500">Next due</span>
          <span className="text-xs font-medium text-slate-300">{dueLabel}</span>
        </div>
      )
    }
    if (paidLabel) {
      return <span className="text-xs text-slate-400">{paidLabel}</span>
    }
    return <span className="text-slate-600">—</span>
  }

  return (
    <div className="flex flex-col items-start gap-1.5">
      <span
        className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
          overdue
            ? 'bg-rose-500/15 text-rose-200 ring-1 ring-rose-500/30'
            : status === 'pending'
              ? 'bg-amber-500/15 text-amber-200 ring-1 ring-amber-500/25'
              : 'bg-orange-500/15 text-orange-200 ring-1 ring-orange-500/25'
        }`}
      >
        {overdue ? 'Payment expired' : status === 'partial' ? 'Partial due' : 'Payment due'}
      </span>
      <span className={`text-xs font-medium ${dueLabel && pending <= 0.02 ? 'text-slate-200' : 'tabular-nums text-amber-100/90'}`}>
        {pending > 0.02 ? formatInr(pending) : dueLabel ?? formatInr(pending)}
      </span>
      {dueLabel && pending > 0.02 && (
        <span className={`text-[10px] ${overdue ? 'text-rose-300/80' : 'text-slate-500'}`}>
          Due {dueLabel}
        </span>
      )}
      {onCollect && user.openMembershipId && (
        <button
          type="button"
          onClick={() => onCollect(user)}
          className="rounded-lg bg-blue-500/15 px-2 py-0.5 text-[10px] font-semibold text-blue-200 transition hover:bg-blue-500/25"
        >
          Collect
        </button>
      )}
    </div>
  )
}

function UserRow({
  user,
  onView,
  onEdit,
  onDelete,
  onDeactivate,
  onActivate,
  onCollectPayment,
}: {
  user: User
  onView: (u: User) => void
  onEdit: (u: User) => void
  onDelete: (id: number, name: string) => void
  onDeactivate: (u: User) => void
  onActivate: (u: User) => void
  onCollectPayment?: (u: User) => void
}) {
  const name = `${user.firstName} ${user.lastName}`.trim() || '—'
  const age = getAge(user.dateOfBirth)
  const initials = name !== '—' ? name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase() : '—'
  return (
    <tr className="group transition-colors duration-150 hover:bg-white/[0.03]">
      {/* Member (avatar + name + email) */}
      <td className="px-5 py-3.5">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-gradient-to-br from-blue-500/40 to-purple-600/40 text-xs font-bold text-white ring-1 ring-white/10">
            {user.profilePictureUrl
              ? <img src={user.profilePictureUrl} alt="" className="h-full w-full object-cover" />
              : initials}
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-white">{name}</p>
            <p className="truncate text-[11px] text-slate-500">
              {user.email
                ? <a href={`mailto:${user.email}`} className="text-blue-400/70 hover:text-blue-300 transition-colors">{user.email}</a>
                : '—'}
              {age != null && <span className="ml-1 text-slate-600">· {age}y</span>}
            </p>
          </div>
        </div>
      </td>
      {/* Phone (hidden < lg) */}
      <td className="hidden px-5 py-3.5 text-sm text-slate-400 lg:table-cell">
        {user.phone ?? <span className="text-slate-600">—</span>}
      </td>
      {/* Status */}
      <td className="px-5 py-3.5">
        <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ${
          user.isActive
            ? 'bg-emerald-500/10 text-emerald-300 ring-1 ring-emerald-500/20'
            : 'bg-slate-500/10 text-slate-400 ring-1 ring-white/8'
        }`}>
          <span className={`h-1.5 w-1.5 rounded-full ${user.isActive ? 'bg-emerald-400' : 'bg-slate-500'}`} />
          {user.isActive ? 'Active' : 'Inactive'}
        </span>
      </td>
      {/* Payment due / expired */}
      <td className="px-5 py-3.5">
        <PaymentDueCell user={user} onCollect={onCollectPayment} />
      </td>
      {/* Pref Time (hidden < lg) */}
      <td className="hidden px-5 py-3.5 text-sm text-slate-400 lg:table-cell">
        {user.preferredGymTime ?? <span className="text-slate-600">—</span>}
      </td>
      {/* Type (hidden < xl) */}
      <td className="hidden px-5 py-3.5 text-sm text-slate-400 xl:table-cell">
        {user.userTypes && user.userTypes.length > 0
          ? user.userTypes.map((t) => t.name).join(', ')
          : <span className="text-slate-600">—</span>}
      </td>
      {/* Actions */}
      <td className="px-5 py-3.5 text-right">
        <div className="inline-flex items-center justify-end gap-1">
          <button
            type="button"
            onClick={() => onView(user)}
            className="rounded-lg px-2.5 py-1.5 text-[11px] font-semibold text-slate-300 transition hover:bg-white/8 hover:text-white"
          >
            View
          </button>
          <button
            type="button"
            onClick={() => onEdit(user)}
            className="rounded-lg px-2.5 py-1.5 text-[11px] font-semibold text-blue-300 transition hover:bg-blue-500/10"
          >
            Edit
          </button>
          {user.isActive ? (
            <button
              type="button"
              onClick={() => onDeactivate(user)}
              className="rounded-lg px-2.5 py-1.5 text-[11px] font-semibold text-amber-300 transition hover:bg-amber-500/10"
            >
              Deactivate
            </button>
          ) : (
            <button
              type="button"
              onClick={() => onActivate(user)}
              className="rounded-lg px-2.5 py-1.5 text-[11px] font-semibold text-emerald-300 transition hover:bg-emerald-500/10"
            >
              Activate
            </button>
          )}
          <button
            type="button"
            onClick={() => onDelete(user.id, name)}
            className="rounded-lg px-2.5 py-1.5 text-[11px] font-semibold text-rose-400 transition hover:bg-rose-500/10"
          >
            Del
          </button>
        </div>
      </td>
    </tr>
  )
}


function UserCard({
  user,
  onView,
  onEdit,
  onDelete,
  onDeactivate,
  onActivate,
  onCollectPayment,
}: {
  user: User
  onView: (u: User) => void
  onEdit: (u: User) => void
  onDelete: (id: number, name: string) => void
  onDeactivate: (u: User) => void
  onActivate: (u: User) => void
  onCollectPayment?: (u: User) => void
}) {
  const name = `${user.firstName} ${user.lastName}`.trim() || '—'
  const age = getAge(user.dateOfBirth)
  const initials = name !== '—' ? name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase() : '—'
  return (
    <div className="group relative overflow-hidden rounded-2xl border border-white/[0.07] bg-white/[0.03] p-4 transition-all duration-200 hover:border-white/[0.12] hover:bg-white/[0.06] hover:shadow-lg hover:shadow-black/20">
      {/* Top: avatar + name + status */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-gradient-to-br from-blue-500/50 to-purple-600/50 text-sm font-bold text-white shadow-md ring-1 ring-white/10">
            {user.profilePictureUrl
              ? <img src={user.profilePictureUrl} alt="" className="h-full w-full object-cover" />
              : initials}
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-white leading-tight">{name}</p>
            {age != null && <p className="text-[11px] text-slate-500">Age {age}</p>}
          </div>
        </div>
        <span className={`mt-0.5 shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
          user.isActive
            ? 'bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-500/25'
            : 'bg-slate-500/15 text-slate-400 ring-1 ring-white/10'
        }`}>
          {user.isActive ? 'Active' : 'Inactive'}
        </span>
      </div>

      {/* Meta row */}
      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1">
        {user.email && (
          <a href={`mailto:${user.email}`} className="truncate text-[11px] text-blue-400/80 hover:text-blue-300 transition-colors">
            {user.email}
          </a>
        )}
        {user.phone && (
          <span className="text-[11px] text-slate-400">{user.phone}</span>
        )}
        {user.preferredGymTime && (
          <span className="text-[11px] text-slate-400">⏰ {user.preferredGymTime}</span>
        )}
        {user.assignedTrainerName && (
          <span className="text-[11px] text-violet-300/90">Coach: {user.assignedTrainerName}</span>
        )}
      </div>

      <div className="mt-3">
        <PaymentDueCell user={user} onCollect={onCollectPayment} />
      </div>

      {/* Divider */}
      <div className="my-3 h-px bg-white/5" />

      {/* Actions */}
      <div className="grid grid-cols-4 gap-1.5">
        <button
          type="button"
          onClick={() => onView(user)}
          className="rounded-lg bg-white/5 py-2 text-[11px] font-semibold text-slate-300 transition hover:bg-white/10 hover:text-white"
        >
          View
        </button>
        <button
          type="button"
          onClick={() => onEdit(user)}
          className="rounded-lg bg-blue-500/10 py-2 text-[11px] font-semibold text-blue-300 transition hover:bg-blue-500/20"
        >
          Edit
        </button>
        {user.isActive ? (
          <button
            type="button"
            onClick={() => onDeactivate(user)}
            className="rounded-lg bg-amber-500/10 py-2 text-[11px] font-semibold text-amber-300 transition hover:bg-amber-500/20"
          >
            Off
          </button>
        ) : (
          <button
            type="button"
            onClick={() => onActivate(user)}
            className="rounded-lg bg-emerald-500/10 py-2 text-[11px] font-semibold text-emerald-300 transition hover:bg-emerald-500/20"
          >
            On
          </button>
        )}
        <button
          type="button"
          onClick={() => onDelete(user.id, name)}
          className="rounded-lg bg-rose-500/10 py-2 text-[11px] font-semibold text-rose-300 transition hover:bg-rose-500/20"
        >
          Del
        </button>
      </div>
    </div>
  )
}

const defaultCreateForm: CreateUserDto = {
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  dateOfBirth: '',
  gender: '',
  address: '',
  emergencyContact: '',
  emergencyPhone: '',
  preferredGymTime: '',
  isActive: true,
  username: '',
  password: '',
  role: undefined,
  planId: undefined,
  membershipStartDate: undefined,
  trainerId: undefined,
  instructorSpecialization: '',
  instructorBio: '',
  instructorHireDate: undefined,
  userTypeIds: [],
}

export function UsersPage() {
  const { start: startMembersTour } = useWalkthrough('members')
  const navigate = useNavigate()
  const location = useLocation()
  const { userName } = getDashboardUser()
  const queryClient = useQueryClient()
  const [isAdding, setIsAdding] = useState(false)
  const [form, setForm] = useState<CreateUserDto>(defaultCreateForm)
  const [formError, setFormError] = useState<string | null>(null)
  const [emailError, setEmailError] = useState<string | null>(null)
  const [phoneError, setPhoneError] = useState<string | null>(null)
  const [usernameError, setUsernameError] = useState<string | null>(null)
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all')
  const [importOpen, setImportOpen] = useState(false)
  const [importLog, setImportLog] = useState<string[]>([])
  const [importing, setImporting] = useState(false)

  const { data: users = [], isLoading, error } = useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      const { data } = await usersService.getAll()
      return Array.isArray(data) ? data : []
    },
  })

  const membersOnly = useMemo(() => users.filter((u) => u.userTypes?.some((t) => t.name === 'Member')), [users])
  const userStats = useMemo(() => {
    const total = membersOnly.length
    const active = membersOnly.filter((u) => u.isActive).length
    const inactive = membersOnly.filter((u) => !u.isActive).length
    const morning = membersOnly.filter((u) => u.preferredGymTime === 'Morning').length
    const afternoon = membersOnly.filter((u) => u.preferredGymTime === 'Afternoon').length
    const evening = membersOnly.filter((u) => u.preferredGymTime === 'Evening').length
    const night = membersOnly.filter((u) => u.preferredGymTime === 'Night').length
    return { total, active, inactive, morning, afternoon, evening, night }
  }, [membersOnly])

  const filteredUsers = useMemo(() => {
    let list = membersOnly
    const q = searchQuery.trim().toLowerCase()
    if (q) {
      list = list.filter(
        (u) =>
          `${(u.firstName ?? '').toLowerCase()} ${(u.lastName ?? '').toLowerCase()}`.includes(q) ||
          (u.email ?? '').toLowerCase().includes(q) ||
          (u.phone ?? '').toLowerCase().includes(q) ||
          (u.username ?? '').toLowerCase().includes(q)
      )
    }
    if (statusFilter === 'active') list = list.filter((u) => u.isActive)
    if (statusFilter === 'inactive') list = list.filter((u) => !u.isActive)
    return list
  }, [membersOnly, searchQuery, statusFilter])

  const { data: membershipPlans = [] } = useQuery({
    queryKey: ['membershipPlans'],
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

  const { data: trainers = [] } = useQuery({
    queryKey: ['trainers'],
    queryFn: async () => {
      const { data } = await trainersService.getAll()
      const list = Array.isArray(data) ? data : []
      return list.map((i: Trainer) => ({
        id: i.id ?? 0,
        firstName: i.firstName ?? '',
        lastName: i.lastName ?? '',
        specialization: i.specialization ?? undefined,
        isActive: i.isActive ?? true,
      }))
    },
  })

  const {
    data: userTypes = [],
    isLoading: userTypesLoading,
    isError: userTypesError,
    refetch: refetchUserTypes,
  } = useQuery({
    queryKey: ['userTypes'],
    queryFn: async () => {
      const res = await userTypesService.getAll()
      const raw = res?.data
      if (Array.isArray(raw)) return raw
      if (raw && typeof raw === 'object' && Array.isArray((raw as { data?: unknown }).data))
        return (raw as { data: { id: number; name: string }[] }).data
      return []
    },
  })

  function getCreateUserErrorMessage(err: unknown): string {
    if (err && typeof err === 'object' && 'response' in err) {
      const res = (err as { response?: { data?: unknown } }).response
      const data = res?.data
      if (data != null) {
        if (typeof data === 'string') return data
        if (typeof data === 'object' && data !== null) {
          const obj = data as Record<string, unknown>
          if (typeof obj.message === 'string') return obj.message
          if (typeof obj.detail === 'string') return obj.detail
          if (typeof obj.title === 'string') return obj.title
        }
      }
    }
    return err instanceof Error ? err.message : 'Failed to create user'
  }

  const createMutation = useMutation({
    mutationFn: (dto: CreateUserDto) => usersService.create(dto).then((r) => r.data),
    onSuccess: (created) => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
      setIsAdding(false)
      setForm(defaultCreateForm)
      setFormError(null)
      setEmailError(null)
      setPhoneError(null)
      setUsernameError(null)
      const p = created?.pendingPaymentCollection
      if (p?.membershipId && p.membershipPaymentId) {
        navigate(`/dashboard/payments/collect?membershipId=${p.membershipId}&userId=${p.userId}`)
      }
    },
    onError: (err: unknown) => setFormError(getCreateUserErrorMessage(err)),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => usersService.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['users'] }),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: { isActive: boolean } }) =>
      usersService.update(id, payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['users'] }),
  })

  const handleStartAdd = () => {
    setIsAdding(true)
    setForm({ ...defaultCreateForm, role: 1, userTypeIds: [] })
    setFormError(null)
    setEmailError(null)
    setPhoneError(null)
    setUsernameError(null)
    setUsernameAvailable(null)
  }

  /** Open add-member modal when coming from dashboard (+ sessionStorage survives Strict Mode remounts) */
  useEffect(() => {
    const st = location.state as { openAddMember?: boolean } | null
    let shouldOpen = st?.openAddMember === true
    try {
      if (sessionStorage.getItem('gym_openAddMember') === '1') {
        shouldOpen = true
        sessionStorage.removeItem('gym_openAddMember')
      }
    } catch {
      /* ignore */
    }
    if (!shouldOpen) return
    setIsAdding(true)
    setForm({ ...defaultCreateForm, role: 1, userTypeIds: [] })
    setFormError(null)
    setEmailError(null)
    setPhoneError(null)
    setUsernameError(null)
    setUsernameAvailable(null)
    if (st?.openAddMember) {
      navigate(location.pathname, { replace: true, state: {} })
    }
  }, [location.state, location.pathname, navigate])

  // When Add User modal is open, set user type to Member only (this page only adds members)
  const memberUserType = useMemo(() => userTypes.find((ut: { name: string }) => ut.name === 'Member'), [userTypes])
  useEffect(() => {
    if (isAdding && memberUserType) {
      setForm((f) => (f.userTypeIds?.length === 1 && f.userTypeIds[0] === memberUserType.id ? f : { ...f, userTypeIds: [memberUserType.id] }))
    }
  }, [isAdding, memberUserType])

  const handleCancelAdd = () => {
    setIsAdding(false)
    setForm(defaultCreateForm)
    setFormError(null)
    setEmailError(null)
    setPhoneError(null)
    setUsernameError(null)
    setUsernameAvailable(null)
  }

  const handleEmailBlur = () => {
    const email = form.email?.trim().toLowerCase()
    if (!email) {
      setEmailError(null)
      return
    }
    const exists = users.some((u) => (u.email ?? '').toLowerCase() === email)
    setEmailError(exists ? 'This email is already registered.' : null)
  }

  const normalizePhone = (value: string) => value.replace(/\D/g, '')
  const handlePhoneBlur = () => {
    const phone = form.phone?.trim()
    if (!phone) {
      setPhoneError(null)
      return
    }
    const phoneDigits = normalizePhone(phone)
    const exists = users.some((u) => normalizePhone((u.phone ?? '').trim()) === phoneDigits && phoneDigits.length > 0)
    setPhoneError(exists ? 'This phone number is already registered.' : null)
  }

  const handleUsernameBlur = () => {
    const username = form.username?.trim()
    if (!username) {
      setUsernameError(null)
      setUsernameAvailable(null)
      return
    }
    const exists = users.some((u) => (u.username ?? '').toLowerCase() === username.toLowerCase())
    setUsernameError(exists ? 'This username is already in use.' : null)
    setUsernameAvailable(exists ? false : true)
  }

  const handleSubmitAdd = (e: React.FormEvent) => {
    e.preventDefault()
    setFormError(null)
    if (!form.firstName?.trim() || !form.lastName?.trim() || !form.email?.trim()) {
      setFormError('First name, last name and email are required.')
      return
    }
    if (emailError || usernameError || phoneError) {
      setFormError('Please fix the errors above before saving.')
      return
    }
    const email = form.email?.trim().toLowerCase()
    const username = form.username?.trim()
    const phone = form.phone?.trim()
    if (users.some((u) => (u.email ?? '').toLowerCase() === email)) {
      setEmailError('This email is already registered.')
      setFormError('This email is already registered.')
      return
    }
    if (phone && normalizePhone(phone).length > 0 && users.some((u) => normalizePhone((u.phone ?? '').trim()) === normalizePhone(phone))) {
      setPhoneError('This phone number is already registered.')
      setFormError('This phone number is already registered.')
      return
    }
    if (username && users.some((u) => (u.username ?? '').toLowerCase() === username.toLowerCase())) {
      setUsernameError('This username is already in use.')
      setFormError('This username is already in use.')
      return
    }
    // This page only adds members: force role = Member (1) and userTypeIds = Member only
    const memberTypeId = memberUserType?.id
    const payload: CreateUserDto = {
      ...form,
      firstName: form.firstName.trim(),
      lastName: form.lastName.trim(),
      email: form.email.trim(),
      phone: form.phone?.trim() || undefined,
      dateOfBirth: form.dateOfBirth || new Date().toISOString().slice(0, 10),
      gender: form.gender?.trim() || '',
      address: form.address?.trim() || undefined,
      emergencyContact: form.emergencyContact?.trim() || undefined,
      emergencyPhone: form.emergencyPhone?.trim() || undefined,
      preferredGymTime: form.preferredGymTime?.trim() || undefined,
      username: form.username?.trim() || undefined,
      password: form.password || undefined,
      role: 1,
      planId: form.planId && form.planId > 0 ? form.planId : undefined,
      membershipStartDate: form.membershipStartDate || undefined,
      trainerId: form.trainerId && form.trainerId > 0 ? form.trainerId : undefined,
      instructorSpecialization: undefined,
      instructorBio: undefined,
      instructorHireDate: undefined,
      userTypeIds: memberTypeId ? [memberTypeId] : undefined,
    }
    createMutation.mutate(payload)
  }

  const handleViewUser = (user: User) => {
    navigate(`/dashboard/users/${user.id}?mode=view`)
  }

  const handleCollectPayment = (user: User) => {
    if (!user.openMembershipId) return
    navigate(`/dashboard/payments/collect?membershipId=${user.openMembershipId}&userId=${user.id}`)
  }

  const handleEdit = (user: User) => {
    navigate(`/dashboard/users/${user.id}`)
  }

  const handleDelete = (id: number, name: string) => {
    if (!window.confirm(`Delete user "${name}"? This cannot be undone.`)) return
    deleteMutation.mutate(id)
  }

  const handleDeactivate = (user: User) => {
    const name = `${user.firstName} ${user.lastName}`.trim() || 'User'
    if (!window.confirm(`Deactivate "${name}"? They will be marked inactive.`)) return
    updateMutation.mutate({ id: user.id, payload: { isActive: false } })
  }

  const handleActivate = (user: User) => {
    updateMutation.mutate({ id: user.id, payload: { isActive: true } })
  }

  const handleExportFiltered = () => {
    const headers = [
      'id',
      'firstName',
      'lastName',
      'email',
      'phone',
      'isActive',
      'preferredGymTime',
      'registrationDate',
    ]
    const lines = filteredUsers.map((u) => [
      String(u.id),
      u.firstName,
      u.lastName,
      u.email,
      u.phone ?? '',
      u.isActive ? 'true' : 'false',
      u.preferredGymTime ?? '',
      u.registrationDate?.slice(0, 10) ?? '',
    ])
    downloadMembersCsv(
      `members-export-${new Date().toISOString().slice(0, 10)}.csv`,
      headers,
      lines,
    )
    toast.success('Downloaded member list CSV.')
  }

  const downloadImportTemplate = () => {
    const blob = new Blob([MEMBERS_CSV_TEMPLATE], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'members-import-template.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleCsvImportFile = async (file: File | null) => {
    if (!file) return
    const memberTypeId = memberUserType?.id
    if (!memberTypeId) {
      toast.error('Member user type not loaded. Cannot import.')
      return
    }
    setImporting(true)
    setImportLog([])
    try {
      const text = await file.text()
      const grid = parseCsvLines(text)
      const { rows: parsed, errors } = rowsToMemberImports(grid)
      const log = [...errors]
      let ok = 0
      for (const r of parsed) {
        if (users.some((u) => (u.email ?? '').toLowerCase() === r.email)) {
          log.push(`Skipped (exists): ${r.email}`)
          continue
        }
        const payload: CreateUserDto = {
          firstName: r.firstName,
          lastName: r.lastName,
          email: r.email,
          phone: r.phone,
          dateOfBirth: r.dateOfBirth,
          gender: r.gender,
          address: undefined,
          emergencyContact: undefined,
          emergencyPhone: undefined,
          profilePictureUrl: undefined,
          preferredGymTime: undefined,
          isActive: r.isActive,
          username: r.username,
          password: r.password,
          role: 1,
          planId: undefined,
          membershipStartDate: undefined,
          trainerId: undefined,
          instructorSpecialization: undefined,
          instructorBio: undefined,
          instructorHireDate: undefined,
          userTypeIds: [memberTypeId],
        }
        try {
          await usersService.create(payload)
          ok++
        } catch (err: unknown) {
          log.push(`${r.email}: ${getCreateUserErrorMessage(err)}`)
        }
      }
      setImportLog(log)
      await queryClient.invalidateQueries({ queryKey: ['users'] })
      toast.success(`Imported ${ok} member(s). Review log for skips or errors.`)
    } catch {
      toast.error('Could not read CSV file.')
    } finally {
      setImporting(false)
    }
  }

  const contentRef = useRef<HTMLDivElement>(null)
  const cardsRowRef = useRef<HTMLDivElement>(null)
  const tableSectionRef = useRef<HTMLElement>(null)

  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger)
    const ctx = gsap.context(() => {
      gsap.fromTo(
        '.users-dashboard-header',
        { opacity: 0, y: -20 },
        { opacity: 1, y: 0, duration: 0.8, ease: 'power3.out' }
      )
      const cards = cardsRowRef.current?.querySelectorAll('.metric-card')
      if (cards && cards.length) {
        gsap.fromTo(
          cards,
          { opacity: 0, y: 40, scale: 0.96 },
          {
            opacity: 1,
            y: 0,
            scale: 1,
            duration: 0.6,
            stagger: 0.08,
            ease: 'back.out(1.2)',
            scrollTrigger: { trigger: cardsRowRef.current, start: 'top 85%' },
          }
        )
      }
      if (tableSectionRef.current) {
        gsap.fromTo(
          tableSectionRef.current,
          { opacity: 0, y: 32 },
          {
            opacity: 1,
            y: 0,
            duration: 0.75,
            ease: 'power2.out',
            scrollTrigger: { trigger: tableSectionRef.current, start: 'top 88%' },
          }
        )
      }
    }, contentRef)
    return () => ctx.revert()
  }, [])

  return (
    <DashboardLayout userName={userName}>
      <div ref={contentRef} className="min-w-0 max-w-[100%] space-y-6">
        {/* Match DashboardPage header: eyebrow, gradient title, actions */}
        <div
          className="users-dashboard-header"
          data-walkthrough="members-header"
        >
          {/* Title row */}
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-500">Members</p>
              <h1 className="mt-0.5 text-2xl font-bold tracking-tight text-white sm:text-3xl">
                All{' '}
                <span className="bg-[linear-gradient(135deg,#60a5fa,#c084fc)] bg-clip-text text-transparent">
                  Users
                </span>
              </h1>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => startMembersTour()}
                className="rounded-xl border border-violet-400/30 bg-violet-500/10 px-3 py-2 text-xs font-semibold text-violet-100 transition hover:bg-violet-500/20"
              >
                Tour
              </button>
              <button
                type="button"
                onClick={handleExportFiltered}
                className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-slate-200 transition hover:bg-white/10"
              >
                Export CSV
              </button>
              <button
                type="button"
                onClick={() => {
                  setImportLog([])
                  setImportOpen(true)
                }}
                className="rounded-xl border border-emerald-400/25 bg-emerald-500/10 px-3 py-2 text-xs font-semibold text-emerald-100 transition hover:bg-emerald-500/20"
              >
                Import CSV
              </button>
              <button
                type="button"
                onClick={handleStartAdd}
                data-walkthrough="members-add"
                className="rounded-xl bg-[linear-gradient(135deg,#3b82f6_0%,#a855f7_100%)] px-4 py-2 text-xs font-semibold text-white shadow-lg shadow-purple-500/20 transition hover:brightness-110"
              >
                + Add Member
              </button>
            </div>
          </div>
        </div>

        {/* KPI metrics — same MetricCard pattern as dashboard */}
        <DashboardMetricsGrid cols={6} innerRef={cardsRowRef}>
          <MetricCard
            className="metric-card"
            title="Total members"
            value={userStats.total}
            gradient="from-blue-500 to-indigo-500"
            icon={metricIcons.users}
            caption="In directory"
          />
          <MetricCard
            className="metric-card"
            title="Active"
            value={userStats.active}
            gradient="from-emerald-400 to-teal-500"
            icon={metricIcons.active}
            caption={userStats.inactive > 0 ? `${userStats.inactive} inactive` : 'All accounts enabled'}
          />
          <MetricCard
            className="metric-card"
            title="Morning"
            value={userStats.morning}
            gradient="from-amber-400 to-orange-500"
            icon={metricIcons.sun}
            caption="Preferred time"
          />
          <MetricCard
            className="metric-card"
            title="Afternoon"
            value={userStats.afternoon}
            gradient="from-sky-400 to-blue-500"
            icon={metricIcons.sun}
            caption="Preferred time"
          />
          <MetricCard
            className="metric-card"
            title="Evening"
            value={userStats.evening}
            gradient="from-violet-500 to-fuchsia-500"
            icon={metricIcons.moon}
            caption="Preferred time"
          />
          <MetricCard
            className="metric-card"
            title="Night"
            value={userStats.night}
            gradient="from-slate-500 to-slate-700"
            icon={metricIcons.moon}
            caption="Preferred time"
          />
        </DashboardMetricsGrid>

        {/* Members table — glass card like dashboard widgets */}
        <section
          ref={tableSectionRef}
          data-walkthrough="members-table"
          className="glass-card dashboard-card min-w-0 rounded-2xl"
        >
          <div className="border-b border-white/[0.06] px-4 py-4 sm:px-6 sm:py-5">
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold text-white sm:text-base">Member List</h2>
                <span className="rounded-full bg-white/5 px-2.5 py-0.5 text-xs font-medium text-slate-400">
                  {filteredUsers.length} {filteredUsers.length === 1 ? 'member' : 'members'}
                </span>
              </div>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                {/* Search */}
                <div className="relative flex-1">
                  <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-slate-500">
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M11 19a8 8 0 100-16 8 8 0 000 16z" />
                    </svg>
                  </span>
                  <input
                    type="search"
                    placeholder="Search name, email, phone…"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full rounded-xl border border-white/10 bg-white/5 py-2 pl-9 pr-3 text-sm text-slate-100 placeholder:text-slate-500 transition-colors focus:border-blue-400/50 focus:bg-white/[0.07] focus:outline-none focus:ring-1 focus:ring-blue-400/20"
                    aria-label="Search users"
                  />
                </div>
                {/* Status filter */}
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as 'all' | 'active' | 'inactive')}
                  className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-200 transition-colors focus:border-blue-400/50 focus:bg-white/[0.07] focus:outline-none sm:w-36"
                  aria-label="Filter by status"
                >
                  <option value="all" className="bg-slate-900">All Status</option>
                  <option value="active" className="bg-slate-900">Active</option>
                  <option value="inactive" className="bg-slate-900">Inactive</option>
                </select>
              </div>
            </div>
          </div>

          {/* Add User Modal */}
          <Modal
            open={isAdding}
            onClose={handleCancelAdd}
            title="Add user"
            size="wide"
            scrollable
          >
            <form onSubmit={handleSubmitAdd} className="space-y-4">
              {/* Hidden inputs so Chrome autofill targets these instead of the visible Username/Password */}
              <input
                type="text"
                name="username"
                autoComplete="username"
                tabIndex={-1}
                aria-hidden="true"
                readOnly
                style={{ position: 'absolute', left: '-9999px', width: 1, height: 1, opacity: 0, pointerEvents: 'none' }}
              />
              <input
                type="password"
                name="password"
                autoComplete="current-password"
                tabIndex={-1}
                aria-hidden="true"
                readOnly
                style={{ position: 'absolute', left: '-9999px', width: 1, height: 1, opacity: 0, pointerEvents: 'none' }}
              />

              {/* Step 1: User type (Members only on this page) */}
              <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
                <p className="mb-0.5 text-xs font-medium uppercase tracking-wide text-slate-500">Step 1</p>
                <h3 className="mb-1 text-sm font-semibold text-white">User type</h3>
                <p className="mb-2 text-xs text-slate-400">
                  New users are added as members only.
                </p>
                <div className="flex flex-wrap gap-2">
                  {userTypesLoading && (
                    <p className="text-xs text-slate-400">Loading…</p>
                  )}
                  {userTypesError && (
                    <p className="text-xs text-amber-300">
                      Could not load user types.{' '}
                      <button
                        type="button"
                        onClick={() => refetchUserTypes()}
                        className="underline focus:outline-none"
                      >
                        Retry
                      </button>
                    </p>
                  )}
                  {!userTypesLoading && !userTypesError && memberUserType && (
                    <label className="flex cursor-pointer items-center gap-1.5">
                      <input
                        type="checkbox"
                        checked={form.userTypeIds?.includes(memberUserType.id) ?? false}
                        readOnly
                        tabIndex={-1}
                        className="h-3.5 w-3.5 rounded border-white/20 bg-white/5 text-blue-500 focus:ring-blue-500"
                      />
                      <span className="text-xs text-slate-300">Member</span>
                    </label>
                  )}
                  {!userTypesLoading && !userTypesError && !memberUserType && userTypes.length > 0 && (
                    <p className="text-xs text-amber-300">Member user type not found. Restart the API to run the seeder.</p>
                  )}
                  {!userTypesLoading && !userTypesError && userTypes.length === 0 && (
                    <p className="text-xs text-slate-400">No user types from API. Restart the API to run the seeder.</p>
                  )}
                </div>
              </div>

              {/* Step 2: Personal info and rest of form */}
              {/* Personal info */}
              <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
                <p className="mb-0.5 text-xs font-medium uppercase tracking-wide text-slate-500">Step 2</p>
                <h3 className="mb-2 text-sm font-semibold text-white">Personal information</h3>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <Input
                    label="First name"
                    value={form.firstName}
                    onChange={(e) => setForm((f) => ({ ...f, firstName: e.target.value }))}
                    placeholder="John"
                    required
                    className="!rounded-lg !px-3 !py-2 text-sm"
                  />
                  <Input
                    label="Last name"
                    value={form.lastName}
                    onChange={(e) => setForm((f) => ({ ...f, lastName: e.target.value }))}
                    placeholder="Doe"
                    required
                    className="!rounded-lg !px-3 !py-2 text-sm"
                  />
                  <Input
                    label="Email"
                    type="email"
                    value={form.email}
                    onChange={(e) => {
                      setForm((f) => ({ ...f, email: e.target.value }))
                      if (emailError) setEmailError(null)
                    }}
                    onBlur={handleEmailBlur}
                    placeholder="john@example.com"
                    required
                    error={emailError ?? undefined}
                    className="!rounded-lg !px-3 !py-2 text-sm"
                  />
                  <Input
                    label="Phone"
                    value={form.phone ?? ''}
                    onChange={(e) => {
                      setForm((f) => ({ ...f, phone: e.target.value }))
                      if (phoneError) setPhoneError(null)
                    }}
                    onBlur={handlePhoneBlur}
                    placeholder="Optional"
                    error={phoneError ?? undefined}
                    className="!rounded-lg !px-3 !py-2 text-sm"
                  />
                  <Input
                    label="Date of birth"
                    type="date"
                    value={form.dateOfBirth ?? ''}
                    onChange={(e) => setForm((f) => ({ ...f, dateOfBirth: e.target.value }))}
                    className="!rounded-lg !px-3 !py-2 text-sm"
                  />
                  <div>
                    <label className="mb-1 block text-xs font-medium text-slate-400">Gender</label>
                    <select
                      aria-label="Gender"
                      value={form.gender ?? ''}
                      onChange={(e) => setForm((f) => ({ ...f, gender: e.target.value }))}
                      className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-100 transition-colors focus:border-blue-400/60 focus:bg-white/[0.07] focus:outline-none focus:ring-2 focus:ring-blue-400/20"
                    >
                      <option value="" className="bg-slate-900">Select</option>
                      <option value="Male" className="bg-slate-900">Male</option>
                      <option value="Female" className="bg-slate-900">Female</option>
                      <option value="Other" className="bg-slate-900">Other</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Login (optional) */}
              <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
                <h3 className="mb-0.5 text-sm font-semibold text-white">Login (optional)</h3>
                <p className="mb-2 text-xs text-slate-400">
                  Leave blank if this user will not log in. Role above applies when you set a username and password.
                </p>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <Input
                    label="Username"
                    name="new_user_login"
                    autoComplete="off"
                    value={form.username ?? ''}
                    onChange={(e) => {
                      setForm((f) => ({ ...f, username: e.target.value }))
                      setUsernameError(null)
                      setUsernameAvailable(null)
                    }}
                    onBlur={handleUsernameBlur}
                    placeholder="Leave blank if no login"
                    error={usernameError ?? undefined}
                    success={usernameAvailable === true}
                    successMessage="Username is available."
                    className="!rounded-lg !px-3 !py-2 text-sm"
                  />
                  <Input
                    label="Password"
                    type="password"
                    name="new_user_pass"
                    autoComplete="new-password"
                    value={form.password ?? ''}
                    onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                    placeholder="If username set"
                    className="!rounded-lg !px-3 !py-2 text-sm"
                  />
                </div>
              </div>

              {/* Instructor details (only when role is Instructor) */}
              {(form.role === 2 || form.role === 'Instructor') && (
                <div className="rounded-xl border border-indigo-500/30 bg-indigo-500/10 p-4">
                  <h3 className="mb-0.5 text-sm font-semibold text-white">Instructor details</h3>
                  <p className="mb-2 text-xs text-slate-400">
                    Optional details for this instructor profile.
                  </p>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <Input
                      label="Specialization"
                      value={form.instructorSpecialization ?? ''}
                      onChange={(e) => setForm((f) => ({ ...f, instructorSpecialization: e.target.value }))}
                      placeholder="e.g. Yoga, Strength, Cardio"
                      className="!rounded-lg !px-3 !py-2 text-sm"
                    />
                    <Input
                      label="Hire date"
                      type="date"
                      value={form.instructorHireDate ?? new Date().toISOString().slice(0, 10)}
                      onChange={(e) => setForm((f) => ({ ...f, instructorHireDate: e.target.value }))}
                      className="!rounded-lg !px-3 !py-2 text-sm"
                    />
                    <div className="sm:col-span-2">
                      <label className="mb-1 block text-xs font-medium text-slate-400">Bio</label>
                      <textarea
                        value={form.instructorBio ?? ''}
                        onChange={(e) => setForm((f) => ({ ...f, instructorBio: e.target.value }))}
                        placeholder="Short bio or description (optional)"
                        rows={2}
                        className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-100 transition-colors focus:border-indigo-400/60 focus:bg-white/[0.07] focus:outline-none focus:ring-2 focus:ring-indigo-400/20"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Optional details */}
              <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
                <h3 className="mb-2 text-sm font-semibold text-white">Additional details (optional)</h3>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <Input
                    label="Address"
                    value={form.address ?? ''}
                    onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
                    placeholder="Optional"
                    className="sm:col-span-2 !rounded-lg !px-3 !py-2 text-sm"
                  />
                  <Input
                    label="Emergency contact"
                    value={form.emergencyContact ?? ''}
                    onChange={(e) => setForm((f) => ({ ...f, emergencyContact: e.target.value }))}
                    placeholder="Optional"
                    className="!rounded-lg !px-3 !py-2 text-sm"
                  />
                  <Input
                    label="Emergency phone"
                    value={form.emergencyPhone ?? ''}
                    onChange={(e) => setForm((f) => ({ ...f, emergencyPhone: e.target.value }))}
                    placeholder="Optional"
                    className="!rounded-lg !px-3 !py-2 text-sm"
                  />
                  <div className="sm:col-span-2">
                    <label className="mb-1 block text-xs font-medium text-slate-400">Preferred gym time</label>
                    <select
                      aria-label="Preferred gym time"
                      value={form.preferredGymTime ?? ''}
                      onChange={(e) => setForm((f) => ({ ...f, preferredGymTime: e.target.value }))}
                      className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-100 transition-colors focus:border-blue-400/60 focus:bg-white/[0.07] focus:outline-none focus:ring-2 focus:ring-blue-400/20"
                    >
                      <option value="" className="bg-slate-900">Select</option>
                      <option value="Morning" className="bg-slate-900">Morning</option>
                      <option value="Afternoon" className="bg-slate-900">Afternoon</option>
                      <option value="Evening" className="bg-slate-900">Evening</option>
                      <option value="Night" className="bg-slate-900">Night</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Membership & trainer (only for Member role) */}
              {(form.role === 1 || form.role === 'User') && (
                <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
                  <h3 className="mb-2 text-sm font-semibold text-white">Membership & trainer (optional)</h3>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div>
                      <label className="mb-1 block text-xs font-medium text-slate-400">Membership plan</label>
                      <select
                        aria-label="Membership plan"
                        value={form.planId ?? ''}
                        onChange={(e) =>
                          setForm((f) => ({ ...f, planId: e.target.value ? parseInt(e.target.value, 10) : undefined }))
                        }
                        className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-100 transition-colors focus:border-blue-400/60 focus:bg-white/[0.07] focus:outline-none focus:ring-2 focus:ring-blue-400/20"
                      >
                        <option value="" className="bg-slate-900">None</option>
                        {membershipPlans.map((p) => (
                          <option key={p.id} value={p.id} className="bg-slate-900">
                            {p.planName} ({p.durationDays} days – {formatInr(p.price)})
                          </option>
                        ))}
                      </select>
                    </div>
                    {form.planId != null && form.planId > 0 && (
                      <Input
                        label="Membership start date"
                        type="date"
                        value={form.membershipStartDate ?? new Date().toISOString().slice(0, 10)}
                        onChange={(e) => setForm((f) => ({ ...f, membershipStartDate: e.target.value }))}
                        className="!rounded-lg !px-3 !py-2 text-sm"
                      />
                    )}
                    <div className="sm:col-span-2">
                      <label className="mb-1 block text-xs font-medium text-slate-400">Trainer</label>
                      <select
                        aria-label="Trainer"
                        value={form.trainerId ?? ''}
                        onChange={(e) =>
                          setForm((f) => ({
                            ...f,
                            trainerId: e.target.value ? parseInt(e.target.value, 10) : undefined,
                          }))
                        }
                        className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-100 transition-colors focus:border-blue-400/60 focus:bg-white/[0.07] focus:outline-none focus:ring-2 focus:ring-blue-400/20"
                      >
                        <option value="" className="bg-slate-900">None</option>
                        {trainers.filter((i) => i.isActive).map((i) => (
                          <option key={i.id} value={i.id} className="bg-slate-900">
                            {i.firstName} {i.lastName}
                            {i.specialization ? ` – ${i.specialization}` : ''}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {/* Active & actions */}
              <div className="flex flex-col gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-4 sm:flex-row sm:items-center sm:justify-between">
                <label className="flex cursor-pointer items-center gap-2">
                  <input
                    type="checkbox"
                    checked={form.isActive}
                    onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.checked }))}
                    className="h-3.5 w-3.5 rounded border-white/20 bg-white/5 text-blue-500 focus:ring-blue-500"
                  />
                  <span className="text-xs font-medium text-slate-300">Active</span>
                </label>
                <div className="flex gap-2">
                  <Button type="button" variant="secondary" size="sm" onClick={handleCancelAdd}>
                    Cancel
                  </Button>
                  <Button type="submit" size="sm" isLoading={createMutation.isPending}>
                    Save user
                  </Button>
                </div>
              </div>
              {formError && (
                <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 px-3 py-2.5 text-sm text-rose-300" role="alert">
                  {formError}
                </div>
              )}
            </form>
          </Modal>

          <Modal open={importOpen} onClose={() => !importing && setImportOpen(false)} title="Import members from CSV">
            <div className="space-y-4 text-sm">
              <p className="text-slate-400">
                Required columns: <strong className="text-slate-200">firstName</strong>,{' '}
                <strong className="text-slate-200">lastName</strong>,{' '}
                <strong className="text-slate-200">email</strong>,{' '}
                <strong className="text-slate-200">dateOfBirth</strong> (YYYY-MM-DD),{' '}
                <strong className="text-slate-200">gender</strong>. Optional: phone, isActive,
                username, password.
              </p>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={downloadImportTemplate}
                  className="rounded-lg border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-semibold text-slate-200 hover:bg-white/10"
                >
                  Download template
                </button>
              </div>
              <label className="block">
                <span className="mb-1 block text-xs font-medium text-slate-500">CSV file</span>
                <input
                  type="file"
                  accept=".csv,text/csv"
                  disabled={importing}
                  className="block w-full text-xs text-slate-300 file:mr-2 file:rounded-lg file:border-0 file:bg-blue-500/20 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-blue-100"
                  onChange={(e) => {
                    const f = e.target.files?.[0]
                    void handleCsvImportFile(f ?? null)
                    e.target.value = ''
                  }}
                />
              </label>
              {importing ? (
                <p className="text-slate-400">Importing…</p>
              ) : null}
              {importLog.length > 0 ? (
                <div className="max-h-48 overflow-y-auto rounded-xl border border-white/10 bg-black/30 p-3 font-mono text-[11px] text-slate-300">
                  {importLog.map((line, i) => (
                    <div key={`${i}-${line.slice(0, 24)}`}>{line}</div>
                  ))}
                </div>
              ) : null}
            </div>
          </Modal>

          {error && (
            <p className="px-6 py-4 text-rose-300">{error instanceof Error ? error.message : 'Failed to load users'}</p>
          )}
          {isLoading ? (
            <div className="flex h-64 items-center justify-center">
              <div className="flex flex-col items-center gap-3">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/10 border-t-blue-400" />
                <p className="text-sm text-slate-500">Loading members…</p>
              </div>
            </div>
          ) : (
            <>
              {/* ── Mobile card grid (hidden ≥ md) ── */}
              <div className="md:hidden">
                {filteredUsers.length === 0 ? (
                  <div className="flex flex-col items-center gap-3 px-6 py-16 text-center">
                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/5">
                      <svg className="h-7 w-7 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0" />
                      </svg>
                    </div>
                    <p className="text-sm text-slate-400">
                      {users.length === 0 ? 'No members yet.' : 'No members match your filter.'}
                    </p>
                    {users.length === 0 && (
                      <button
                        type="button"
                        onClick={handleStartAdd}
                        className="mt-1 rounded-xl bg-[linear-gradient(135deg,#3b82f6,#a855f7)] px-4 py-2 text-xs font-semibold text-white"
                      >
                        + Add First Member
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-3 p-4 sm:grid-cols-2">
                    {filteredUsers.map((u) => (
                      <UserCard
                        key={u.id}
                        user={u}
                        onView={handleViewUser}
                        onEdit={handleEdit}
                        onDelete={handleDelete}
                        onDeactivate={handleDeactivate}
                        onActivate={handleActivate}
                        onCollectPayment={handleCollectPayment}
                      />
                    ))}
                  </div>
                )}
              </div>

              {/* ── Desktop table (visible ≥ md) ── */}
              <div className="hidden overflow-x-auto md:block">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-white/5 bg-white/[0.025] text-left text-[11px] font-semibold uppercase tracking-widest text-slate-500">
                      <th className="px-5 py-3.5">Member</th>
                      <th className="hidden px-5 py-3.5 lg:table-cell">Phone</th>
                      <th className="px-5 py-3.5">Status</th>
                      <th className="px-5 py-3.5">Payment due</th>
                      <th className="hidden px-5 py-3.5 lg:table-cell">Pref. Time</th>
                      <th className="hidden px-5 py-3.5 xl:table-cell">Type</th>
                      <th className="px-5 py-3.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.04]">
                    {filteredUsers.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-6 py-14 text-center">
                          <div className="flex flex-col items-center gap-3">
                            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/5">
                              <svg className="h-6 w-6 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0" />
                              </svg>
                            </div>
                            <p className="text-sm text-slate-400">
                              {users.length === 0 ? 'No members yet.' : 'No members match your filter.'}
                            </p>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      filteredUsers.map((u) => (
                        <UserRow
                          key={u.id}
                          user={u}
                          onView={handleViewUser}
                          onEdit={handleEdit}
                          onDelete={handleDelete}
                          onDeactivate={handleDeactivate}
                          onActivate={handleActivate}
                          onCollectPayment={handleCollectPayment}
                        />
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </section>
      </div>
    </DashboardLayout>
  )
}
