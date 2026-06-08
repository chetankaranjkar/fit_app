import { useState, useMemo, useEffect, useRef } from 'react'
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { DataPageSection, DataPageShell } from '../components/layout/DataPageShell'
import {
  DataFilterSelect,
  DataToolbar,
  EnterpriseDataGrid,
  StatusBadge,
  type DataGridColumnDef,
} from '../components/data-grid'
import { formatInr } from '../lib/formatInr'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import toast from 'react-hot-toast'
import { DashboardLayout } from '../components/layout/DashboardLayout'
import { MetricCard } from '../components/dashboard/MetricCard'
import { DashboardMetricsGrid } from '../components/layout/DashboardMetricsGrid'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { Modal } from '../components/ui/Modal'
import { MemberMembershipsModal } from '../components/users/MemberMembershipsModal'
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
import type { Trainer } from '../types/trainer'
import {
  displayAadhaar,
  formatAadhaarForExport,
  isValidAadhaarInput,
  normalizeAadhaarInput,
  stripAadhaarFormatting,
  validateAadhaarNumber,
} from '../lib/aadhaar'
import {
  digitsOnlyPhoneInput,
  getPhoneValidationError,
  PHONE_MESSAGES,
  validateOptionalPhoneNumber,
  validatePhoneNumber,
} from '../lib/phone'
import { useMobileNumberAvailability } from '../hooks/useMobileNumberAvailability'
import { useUsernameAvailability } from '../hooks/useUsernameAvailability'
import { MobileNumberAvailabilityHint } from '../components/users/MobileNumberAvailabilityHint'
import {
  acceptIsoDateInput,
  getBirthDateError,
  MIN_BIRTH_DATE,
  todayIsoDate,
} from '../lib/birthDate'
import {
  effectiveMemberSearchTerm,
  MEMBER_SEARCH_DEBOUNCE_MS,
  MEMBER_SEARCH_MIN_CHARS,
} from '../lib/userSearch'

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

  if (!hasBalance) {
    if (status === 'paid' && paidLabel) {
      return (
        <div className="flex max-w-full flex-col gap-0.5">
          <StatusBadge variant="success">Paid</StatusBadge>
          <span className="truncate text-[10px] text-slate-400">{paidLabel}</span>
        </div>
      )
    }
    if (dueLabel) {
      return (
        <div className="flex max-w-full flex-col gap-0.5">
          <span className="text-[10px] text-slate-500">Next due</span>
          <span className="truncate text-[10px] font-medium text-slate-300">{dueLabel}</span>
        </div>
      )
    }
    if (paidLabel) {
      return <span className="text-[10px] text-slate-400">{paidLabel}</span>
    }
    return <span className="text-slate-600">—</span>
  }

  const badgeVariant = overdue ? 'danger' : status === 'partial' ? 'warning' : 'warning'
  const badgeLabel = overdue ? 'Overdue' : status === 'partial' ? 'Partial due' : 'Payment due'

  return (
    <div className="flex max-w-full flex-col gap-0.5">
      <StatusBadge variant={badgeVariant}>{badgeLabel}</StatusBadge>
      <span className="truncate text-[10px] font-medium tabular-nums text-amber-100/90">
        {formatInr(pending)}
      </span>
      {dueLabel ? (
        <span className={`truncate text-[10px] ${overdue ? 'text-rose-300/80' : 'text-slate-500'}`}>
          Due {dueLabel}
        </span>
      ) : null}
      {onCollect && user.openMembershipId ? (
        <button
          type="button"
          onClick={() => onCollect(user)}
          className="mt-0.5 w-fit rounded-md bg-blue-500/15 px-1.5 py-0.5 text-[10px] font-semibold text-blue-200 hover:bg-blue-500/25"
        >
          Collect
        </button>
      ) : null}
    </div>
  )
}

function memberDisplayName(user: Pick<User, 'firstName' | 'lastName'>) {
  return `${user.firstName} ${user.lastName}`.trim() || '—'
}

function memberInitials(user: Pick<User, 'firstName' | 'lastName'>) {
  const name = memberDisplayName(user)
  return name !== '—' ? name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase() : '—'
}

function MemberAvatar({
  user,
  size = 'md',
  onClick,
}: {
  user: Pick<User, 'firstName' | 'lastName' | 'profilePictureUrl'>
  size?: 'sm' | 'md'
  onClick?: () => void
}) {
  const name = memberDisplayName(user)
  const initials = memberInitials(user)
  const frameClass =
    size === 'sm'
      ? 'h-8 w-8 rounded-lg text-[10px]'
      : 'h-10 w-10 rounded-xl text-sm shadow-md'

  const frame = (
    <span
      className={`relative flex shrink-0 items-center justify-center overflow-hidden bg-gradient-to-br from-blue-500/50 to-purple-600/50 font-bold text-white ring-1 ring-white/10 transition-all duration-300 ease-out group-hover/avatar:z-20 group-hover/avatar:scale-[1.28] group-hover/avatar:shadow-lg group-hover/avatar:shadow-black/40 group-hover/avatar:ring-2 group-hover/avatar:ring-blue-400/50 ${frameClass}`}
    >
      {user.profilePictureUrl ? (
        <img
          src={user.profilePictureUrl}
          alt=""
          className="h-full w-full object-cover transition-transform duration-300 ease-out group-hover/avatar:scale-[1.5]"
        />
      ) : (
        <span className="transition-transform duration-300 ease-out group-hover/avatar:scale-125">
          {initials}
        </span>
      )}
    </span>
  )

  if (!onClick) {
    return <span className="group/avatar relative inline-flex">{frame}</span>
  }

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`View ${name}`}
      className="group/avatar relative z-0 inline-flex shrink-0 rounded-xl transition-transform hover:z-20 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400/50"
    >
      {frame}
    </button>
  )
}

function UserCard({
  user,
  onView,
  onViewMemberships,
  onEdit,
  onDeactivate,
  onActivate,
  onCollectPayment,
}: {
  user: User
  onView: (u: User) => void
  onViewMemberships: (u: User) => void
  onEdit: (u: User) => void
  onDeactivate: (u: User) => void
  onActivate: (u: User) => void
  onCollectPayment?: (u: User) => void
}) {
  const name = memberDisplayName(user)
  const age = getAge(user.dateOfBirth)
  return (
    <div className="group relative overflow-visible rounded-2xl border border-white/[0.07] bg-white/[0.03] p-4 transition-all duration-200 hover:border-white/[0.12] hover:bg-white/[0.06] hover:shadow-lg hover:shadow-black/20">
      {/* Top: avatar + name + status */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <MemberAvatar user={user} onClick={() => onView(user)} />
          <div className="min-w-0">
            <button
              type="button"
              onClick={() => onView(user)}
              className="block max-w-full truncate text-left text-sm font-semibold leading-tight text-white transition hover:text-blue-200 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400/50 rounded-sm"
            >
              {name}
            </button>
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
      <div className="grid grid-cols-3 gap-1.5">
        <button
          type="button"
          onClick={() => onViewMemberships(user)}
          className="rounded-lg bg-violet-500/10 py-2 text-[11px] font-semibold text-violet-200 transition hover:bg-violet-500/20"
        >
          Memberships
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
      </div>
    </div>
  )
}

type MemberShiftFilter = 'all' | 'Morning' | 'Afternoon' | 'Evening' | 'Night'

const MEMBER_SHIFT_FILTER_OPTIONS: { value: MemberShiftFilter; label: string }[] = [
  { value: 'all', label: 'All shifts' },
  { value: 'Morning', label: 'Morning' },
  { value: 'Afternoon', label: 'Afternoon' },
  { value: 'Evening', label: 'Evening' },
  { value: 'Night', label: 'Night' },
]

const defaultCreateForm: CreateUserDto = {
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  aadhaarNumber: '',
  dateOfBirth: '',
  gender: '',
  address: '',
  emergencyContact: '',
  emergencyPhone: '',
  preferredGymTime: '',
  isActive: true,
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
  const [searchParams] = useSearchParams()
  const { userName } = getDashboardUser()
  const queryClient = useQueryClient()
  const [isAdding, setIsAdding] = useState(false)
  const [form, setForm] = useState<CreateUserDto>(defaultCreateForm)
  const mobileAvailability = useMobileNumberAvailability(form.phone ?? '', { enabled: isAdding })
  const loginEmailAvailability = useUsernameAvailability(form.email ?? '', {
    enabled: isAdding && Boolean(form.email?.trim()),
  })
  const [formError, setFormError] = useState<string | null>(null)
  const [emailError, setEmailError] = useState<string | null>(null)
  const [phoneError, setPhoneError] = useState<string | null>(null)
  const [emergencyPhoneError, setEmergencyPhoneError] = useState<string | null>(null)
  const [aadhaarError, setAadhaarError] = useState<string | null>(null)
  const [loginEmailError, setLoginEmailError] = useState<string | null>(null)
  const [passwordError, setPasswordError] = useState<string | null>(null)
  const [dateOfBirthError, setDateOfBirthError] = useState<string | null>(null)
  const [membershipStartDateError, setMembershipStartDateError] = useState<string | null>(null)
  const maxBirthDate = todayIsoDate()

  const MIN_LOGIN_PASSWORD_LENGTH = 6
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all')
  const [shiftFilter, setShiftFilter] = useState<MemberShiftFilter>('all')
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(50)
  const [importOpen, setImportOpen] = useState(false)
  const [importLog, setImportLog] = useState<string[]>([])
  const [importing, setImporting] = useState(false)
  const [importProgress, setImportProgress] = useState<{ done: number; total: number } | null>(null)

  const BULK_IMPORT_BATCH_SIZE = 250
  const [membershipModalUser, setMembershipModalUser] = useState<User | null>(null)
  const [isDesktopLayout, setIsDesktopLayout] = useState(() =>
    typeof window !== 'undefined' ? window.matchMedia('(min-width: 768px)').matches : true
  )

  useEffect(() => {
    if (typeof window === 'undefined') return
    const media = window.matchMedia('(min-width: 768px)')
    const update = (event: MediaQueryListEvent | MediaQueryList) => {
      setIsDesktopLayout(event.matches)
    }
    update(media)
    if (typeof media.addEventListener === 'function') {
      media.addEventListener('change', update)
      return () => media.removeEventListener('change', update)
    }
    media.addListener(update)
    return () => media.removeListener(update)
  }, [])

  useEffect(() => {
    setSearchQuery(searchParams.get('q') ?? '')
  }, [searchParams])

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearchQuery(searchQuery.trim()), MEMBER_SEARCH_DEBOUNCE_MS)
    return () => window.clearTimeout(timer)
  }, [searchQuery])

  const effectiveSearch = effectiveMemberSearchTerm(debouncedSearchQuery)
  const isSearchPending =
    searchQuery.trim().length >= MEMBER_SEARCH_MIN_CHARS && searchQuery.trim() !== debouncedSearchQuery

  useEffect(() => {
    setPage(1)
  }, [effectiveSearch, statusFilter, shiftFilter])

  const listIsActiveFilter =
    statusFilter === 'all' ? undefined : statusFilter === 'active'
  const listPreferredGymTimeFilter = shiftFilter === 'all' ? undefined : shiftFilter

  const { data: directoryTotalCount } = useQuery({
    queryKey: ['users-directory-total', statusFilter, shiftFilter],
    queryFn: async () => {
      const { data } = await usersService.getPaged({
        page: 1,
        pageSize: 1,
        membersOnly: true,
        isActive: listIsActiveFilter,
        preferredGymTime: listPreferredGymTimeFilter,
        includeBilling: false,
      })
      return data.totalCount ?? 0
    },
    staleTime: shiftFilter === 'all' && statusFilter === 'all' ? 60_000 : 0,
  })

  const { data: usersPage, isLoading, error, isFetching } = useQuery({
    queryKey: ['users-paged', page, pageSize, effectiveSearch, statusFilter, shiftFilter],
    queryFn: async ({ signal }) => {
      const { data } = await usersService.getPaged(
        {
          page,
          pageSize,
          search: effectiveSearch,
          membersOnly: true,
          isActive: listIsActiveFilter,
          preferredGymTime: listPreferredGymTimeFilter,
        },
        { signal },
      )
      return data
    },
    placeholderData: (previousData, previousQuery) => {
      const prevKey = previousQuery?.queryKey
      if (!prevKey || !previousData) return undefined
      const [, prevPage, prevPageSize, prevSearch, prevStatus, prevShift] = prevKey as [
        string,
        number,
        number,
        string | undefined,
        string,
        MemberShiftFilter,
      ]
      if (
        prevSearch !== effectiveSearch
        || prevStatus !== statusFilter
        || prevShift !== shiftFilter
      ) {
        return undefined
      }
      if (prevPage !== page || prevPageSize !== pageSize) {
        return previousData
      }
      return previousData
    },
  })

  const users = usersPage?.items ?? []
  /** Matches current search + status filter (drives pagination). */
  const filteredMemberCount = usersPage?.totalCount ?? 0
  /** Full directory size for the current status filter — unchanged by search. */
  const directoryMemberCount = directoryTotalCount ?? filteredMemberCount
  const isSearchActive = Boolean(effectiveSearch)

  const userStats = useMemo(() => {
    const total = directoryMemberCount
    const active = users.filter((u) => u.isActive).length
    const inactive = users.filter((u) => !u.isActive).length
    const morning = users.filter((u) => u.preferredGymTime === 'Morning').length
    const afternoon = users.filter((u) => u.preferredGymTime === 'Afternoon').length
    const evening = users.filter((u) => u.preferredGymTime === 'Evening').length
    const night = users.filter((u) => u.preferredGymTime === 'Night').length
    return { total, active, inactive, morning, afternoon, evening, night }
  }, [directoryMemberCount, users])

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
      setPage(1)
      void queryClient.invalidateQueries({ queryKey: ['users-paged'] })
      void queryClient.invalidateQueries({ queryKey: ['users-directory-total'] })
      setIsAdding(false)
      setForm(defaultCreateForm)
      setFormError(null)
      setEmailError(null)
      setPhoneError(null)
      setEmergencyPhoneError(null)
      setAadhaarError(null)
      setLoginEmailError(null)
      setPasswordError(null)
      setDateOfBirthError(null)
      setMembershipStartDateError(null)
      const p = created?.pendingPaymentCollection
      if (p?.membershipId && p.membershipPaymentId) {
        navigate(`/dashboard/payments/collect?membershipId=${p.membershipId}&userId=${p.userId}`)
      }
    },
    onError: (err: unknown) => setFormError(getCreateUserErrorMessage(err)),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: { isActive: boolean } }) =>
      usersService.update(id, payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['users-paged'] })
      void queryClient.invalidateQueries({ queryKey: ['users-directory-total'] })
    },
  })

  const handleStartAdd = () => {
    setIsAdding(true)
    setForm({ ...defaultCreateForm, role: 1, userTypeIds: [] })
    setFormError(null)
    setEmailError(null)
    setPhoneError(null)
    setLoginEmailError(null)
    setPasswordError(null)
    setDateOfBirthError(null)
    setMembershipStartDateError(null)
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
    setLoginEmailError(null)
    setPasswordError(null)
    setDateOfBirthError(null)
    setMembershipStartDateError(null)
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
    setLoginEmailError(null)
    setPasswordError(null)
    setDateOfBirthError(null)
    setMembershipStartDateError(null)
  }

  const handleDateOfBirthChange = (raw: string) => {
    const next = acceptIsoDateInput(raw)
    if (next === null) return
    setForm((f) => ({ ...f, dateOfBirth: next }))
    if (dateOfBirthError) setDateOfBirthError(null)
  }

  const handleDateOfBirthBlur = (raw: string) => {
    const err = getBirthDateError(raw, { maxDate: maxBirthDate })
    if (err) {
      setDateOfBirthError(err)
      setForm((f) => ({ ...f, dateOfBirth: '' }))
      return
    }
    setDateOfBirthError(null)
  }

  const handleMembershipStartDateChange = (raw: string) => {
    const next = acceptIsoDateInput(raw)
    if (next === null) return
    setForm((f) => ({ ...f, membershipStartDate: next }))
    if (membershipStartDateError) setMembershipStartDateError(null)
  }

  const handleMembershipStartDateBlur = (raw: string) => {
    const err = getBirthDateError(raw, { label: 'Membership start date', maxDate: maxBirthDate })
    if (err) {
      setMembershipStartDateError(err)
      setForm((f) => ({ ...f, membershipStartDate: '' }))
      return
    }
    setMembershipStartDateError(null)
  }

  const handleEmailBlur = () => {
    const email = form.email?.trim().toLowerCase()
    if (!email) {
      setEmailError('Email is required.')
      setLoginEmailError(null)
      return
    }
    if (!email.includes('@')) {
      setEmailError('Enter a valid email address.')
      setLoginEmailError(null)
      return
    }
    if (loginEmailAvailability.status === 'taken') {
      const msg = loginEmailAvailability.error ?? 'This email is already in use for login.'
      setEmailError(msg)
      setLoginEmailError(msg)
      return
    }
    if (loginEmailAvailability.status === 'available') {
      setEmailError(null)
      setLoginEmailError(null)
      return
    }
    setEmailError(null)
    setLoginEmailError(null)
  }

  const handleAadhaarBlur = () => {
    const raw = form.aadhaarNumber?.trim() ?? ''
    if (!raw) {
      setAadhaarError(null)
      return
    }
    if (!isValidAadhaarInput(raw)) {
      setAadhaarError('Aadhaar number must be exactly 12 digits.')
      return
    }
    const digits = stripAadhaarFormatting(raw)
    const exists = users.some((u) => stripAadhaarFormatting(u.aadhaarNumber ?? '') === digits)
    setAadhaarError(exists ? 'This Aadhaar number is already registered.' : null)
  }

  const handlePhoneBlur = () => {
    if (mobileAvailability.status === 'taken' || mobileAvailability.status === 'invalid_format') {
      setPhoneError(mobileAvailability.error)
    } else {
      setPhoneError(null)
    }
  }

  const handleEmergencyPhoneBlur = () => {
    const raw = form.emergencyPhone?.trim() ?? ''
    if (!raw) {
      setEmergencyPhoneError(null)
      return
    }
    setEmergencyPhoneError(getPhoneValidationError(raw, true))
  }

  const handlePasswordBlur = () => {
    const password = form.password ?? ''
    if (!password.trim()) {
      setPasswordError('Password is required.')
      return
    }
    if (password.length < MIN_LOGIN_PASSWORD_LENGTH) {
      setPasswordError(`Password must be at least ${MIN_LOGIN_PASSWORD_LENGTH} characters.`)
      return
    }
    setPasswordError(null)
  }

  const canSetPasswordFromPhone = getPhoneValidationError(form.phone, true) === null

  const handleUsePhoneAsPassword = () => {
    try {
      const phoneDigits = validatePhoneNumber(form.phone, true)
      setForm((f) => ({ ...f, password: phoneDigits }))
      setPasswordError(null)
    } catch (err) {
      const msg = err instanceof Error ? err.message : PHONE_MESSAGES.length
      setPhoneError(msg)
      setPasswordError(msg)
    }
  }

  const handleSubmitAdd = (e: React.FormEvent) => {
    e.preventDefault()
    setFormError(null)
    if (!form.firstName?.trim() || !form.lastName?.trim() || !form.email?.trim()) {
      setFormError('First name, last name and email are required.')
      return
    }
    if (
      emailError ||
      loginEmailError ||
      passwordError ||
      phoneError ||
      emergencyPhoneError ||
      aadhaarError ||
      dateOfBirthError ||
      membershipStartDateError
    ) {
      setFormError('Please fix the errors above before saving.')
      return
    }
    const dobValidationError = getBirthDateError(form.dateOfBirth, { maxDate: maxBirthDate })
    if (dobValidationError) {
      setDateOfBirthError(dobValidationError)
      setFormError(dobValidationError)
      return
    }
    if (form.planId != null && form.planId > 0) {
      const startValidationError = getBirthDateError(form.membershipStartDate, {
        label: 'Membership start date',
        maxDate: maxBirthDate,
      })
      if (startValidationError) {
        setMembershipStartDateError(startValidationError)
        setFormError(startValidationError)
        return
      }
    }
    const email = form.email?.trim().toLowerCase()
    const password = form.password ?? ''
    if (!email || !email.includes('@')) {
      setEmailError('Enter a valid email address.')
      setFormError('Email is required for portal and mobile login.')
      return
    }
    if (!password.trim()) {
      setPasswordError('Password is required.')
      setFormError('Password is required for portal and mobile login.')
      return
    }
    if (password.length < MIN_LOGIN_PASSWORD_LENGTH) {
      const pwdMsg = `Password must be at least ${MIN_LOGIN_PASSWORD_LENGTH} characters.`
      setPasswordError(pwdMsg)
      setFormError(pwdMsg)
      return
    }
    let phoneDigits: string
    let emergencyPhoneDigits: string | undefined
    try {
      phoneDigits = validatePhoneNumber(form.phone, true)
      emergencyPhoneDigits = validateOptionalPhoneNumber(form.emergencyPhone)
    } catch (err) {
      const msg = err instanceof Error ? err.message : PHONE_MESSAGES.length
      if (form.emergencyPhone?.trim()) setEmergencyPhoneError(msg)
      else setPhoneError(msg)
      setFormError(msg)
      return
    }
    const phoneFormatErr = getPhoneValidationError(form.phone, true)
    if (phoneFormatErr) {
      setPhoneError(phoneFormatErr)
      setFormError(phoneFormatErr)
      return
    }
    if (mobileAvailability.status === 'checking' || mobileAvailability.status === 'idle') {
      const msg = 'Please wait — checking mobile number…'
      setPhoneError(msg)
      setFormError(msg)
      return
    }
    if (mobileAvailability.status === 'taken') {
      const msg = mobileAvailability.error ?? PHONE_MESSAGES.duplicate
      setPhoneError(msg)
      setFormError(msg)
      return
    }
    if (mobileAvailability.status !== 'available') {
      const msg = mobileAvailability.error ?? PHONE_MESSAGES.duplicate
      setPhoneError(msg)
      setFormError(msg)
      return
    }
    if (loginEmailAvailability.status === 'checking' || loginEmailAvailability.status === 'idle') {
      const msg = 'Please wait — checking email…'
      setLoginEmailError(msg)
      setEmailError(msg)
      setFormError(msg)
      return
    }
    if (loginEmailAvailability.status === 'taken') {
      const msg = loginEmailAvailability.error ?? 'This email is already in use for login.'
      setLoginEmailError(msg)
      setEmailError(msg)
      setFormError(msg)
      return
    }
    if (loginEmailAvailability.status !== 'available') {
      const msg = loginEmailAvailability.error ?? 'This email is already in use for login.'
      setLoginEmailError(msg)
      setEmailError(msg)
      setFormError(msg)
      return
    }
    let aadhaarDigits: string | undefined
    try {
      aadhaarDigits = validateAadhaarNumber(form.aadhaarNumber)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Invalid Aadhaar number.'
      setAadhaarError(msg)
      setFormError(msg)
      return
    }
    if (aadhaarDigits && users.some((u) => stripAadhaarFormatting(u.aadhaarNumber ?? '') === aadhaarDigits)) {
      setAadhaarError('This Aadhaar number is already registered.')
      setFormError('This Aadhaar number is already registered.')
      return
    }
    // This page only adds members: force role = Member (1) and userTypeIds = Member only
    const memberTypeId = memberUserType?.id
    const payload: CreateUserDto = {
      ...form,
      firstName: form.firstName.trim(),
      lastName: form.lastName.trim(),
      email: form.email.trim(),
      phone: phoneDigits,
      aadhaarNumber: aadhaarDigits,
      dateOfBirth: form.dateOfBirth?.trim() || maxBirthDate,
      gender: form.gender?.trim() || '',
      address: form.address?.trim() || undefined,
      emergencyContact: form.emergencyContact?.trim() || undefined,
      emergencyPhone: emergencyPhoneDigits,
      preferredGymTime: form.preferredGymTime?.trim() || undefined,
      password,
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

  const handleViewMemberships = (user: User) => {
    setMembershipModalUser(user)
  }

  const handleCollectPayment = (user: User) => {
    if (!user.openMembershipId) return
    navigate(`/dashboard/payments/collect?membershipId=${user.openMembershipId}&userId=${user.id}`)
  }

  const handleEdit = (user: User) => {
    navigate(`/dashboard/users/${user.id}`)
  }

  const handleDeactivate = (user: User) => {
    const name = `${user.firstName} ${user.lastName}`.trim() || 'User'
    if (!window.confirm(`Deactivate "${name}"? They will be marked inactive.`)) return
    updateMutation.mutate({ id: user.id, payload: { isActive: false } })
  }

  const handleActivate = (user: User) => {
    updateMutation.mutate({ id: user.id, payload: { isActive: true } })
  }

  const memberColumns = useMemo<DataGridColumnDef<User>[]>(
    () => [
      {
        id: 'member',
        header: 'Member',
        sticky: true,
        minWidth: 250,
        width: 280,
        sortable: true,
        overflowVisible: true,
        accessorFn: (u) => `${u.firstName} ${u.lastName}`.trim(),
        cell: ({ row }) => {
          const name = memberDisplayName(row)
          const age = getAge(row.dateOfBirth)
          return (
            <div className="flex items-center gap-2">
              <MemberAvatar user={row} size="sm" onClick={() => handleViewUser(row)} />
              <div className="min-w-0">
                <button
                  type="button"
                  onClick={() => handleViewUser(row)}
                  className="block max-w-full truncate text-left text-sm font-semibold text-white transition hover:text-blue-200 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400/50 rounded-sm"
                >
                  {name}
                </button>
                <p className="truncate text-[10px] text-slate-500">
                  {row.email || '—'}
                  {age != null ? ` · ${age}y` : ''}
                </p>
              </div>
            </div>
          )
        },
      },
      {
        id: 'phone',
        header: 'Phone',
        minWidth: 140,
        width: 140,
        hideBelow: 'lg',
        accessorFn: (u) => u.phone ?? '',
      },
      {
        id: 'aadhaar',
        header: 'Aadhaar',
        minWidth: 150,
        width: 160,
        hideBelow: 'md',
        accessorFn: (u) => u.aadhaarNumber ?? u.aadhaarNumberMasked ?? '',
        cell: ({ row }) => (
          <span className="font-mono text-xs text-slate-300">{displayAadhaar(row)}</span>
        ),
      },
      {
        id: 'status',
        header: 'Status',
        minWidth: 120,
        width: 120,
        sortable: true,
        accessorFn: (u) => (u.isActive ? 'Active' : 'Inactive'),
        cell: ({ row }) => (
          <StatusBadge variant={row.isActive ? 'success' : 'neutral'} dot>
            {row.isActive ? 'Active' : 'Inactive'}
          </StatusBadge>
        ),
      },
      {
        id: 'payment',
        header: 'Payment due',
        minWidth: 150,
        width: 160,
        cell: ({ row }) => <PaymentDueCell user={row} onCollect={handleCollectPayment} />,
      },
      {
        id: 'prefTime',
        header: 'Pref. time',
        minWidth: 110,
        width: 120,
        hideBelow: 'lg',
        accessorFn: (u) => u.preferredGymTime ?? '',
      },
      {
        id: 'type',
        header: 'Type',
        minWidth: 120,
        width: 140,
        hideBelow: 'xl',
        accessorFn: (u) => u.userTypes?.map((t) => t.name).join(', ') ?? '',
      },
      {
        id: 'actions',
        header: 'Actions',
        width: 300,
        minWidth: 300,
        align: 'left',
        overflowVisible: true,
        cell: ({ row }) => (
          <div className="flex flex-nowrap items-center justify-start gap-1 whitespace-nowrap">
            <button
              type="button"
              onClick={() => handleViewMemberships(row)}
              className="shrink-0 rounded-lg bg-violet-500/10 px-2 py-1 text-[11px] font-semibold text-violet-200 transition hover:bg-violet-500/20"
            >
              Memberships
            </button>
            <button
              type="button"
              onClick={() => handleEdit(row)}
              className="shrink-0 rounded-lg bg-blue-500/10 px-2 py-1 text-[11px] font-semibold text-blue-300 transition hover:bg-blue-500/20"
            >
              Edit
            </button>
            {row.isActive ? (
              <button
                type="button"
                onClick={() => handleDeactivate(row)}
                className="shrink-0 rounded-lg bg-amber-500/10 px-2 py-1 text-[11px] font-semibold text-amber-300 transition hover:bg-amber-500/20"
              >
                Deactivate
              </button>
            ) : (
              <button
                type="button"
                onClick={() => handleActivate(row)}
                className="shrink-0 rounded-lg bg-emerald-500/10 px-2 py-1 text-[11px] font-semibold text-emerald-300 transition hover:bg-emerald-500/20"
              >
                Activate
              </button>
            )}
          </div>
        ),
      },
    ],
    [handleActivate, handleDeactivate, handleEdit, handleViewMemberships],
  )

  const handleExportFiltered = () => {
    const headers = [
      'id',
      'firstName',
      'lastName',
      'email',
      'phone',
      'aadhaar',
      'isActive',
      'preferredGymTime',
      'registrationDate',
    ]
    const lines = users.map((u) => [
      String(u.id),
      u.firstName,
      u.lastName,
      u.email,
      u.phone ?? '',
      formatAadhaarForExport(u),
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
    setImportProgress(null)
    try {
      const text = await file.text()
      const grid = parseCsvLines(text)
      const { rows: parsed, errors } = rowsToMemberImports(grid)
      const log = [...errors]
      const seenPhones = new Set<string>()
      const payloads: CreateUserDto[] = []

      for (const r of parsed) {
        if (!r.phone) {
          log.push(`${r.email}: phone is required.`)
          continue
        }
        if (seenPhones.has(r.phone)) {
          log.push(`Row duplicate phone: ${r.phone} (${r.email})`)
          continue
        }
        seenPhones.add(r.phone)
        const loginPassword = r.password?.trim() || r.phone
        if (loginPassword.length < MIN_LOGIN_PASSWORD_LENGTH) {
          log.push(`${r.email}: password must be at least ${MIN_LOGIN_PASSWORD_LENGTH} characters.`)
          continue
        }
        payloads.push({
          firstName: r.firstName,
          lastName: r.lastName,
          email: r.email,
          phone: r.phone,
          aadhaarNumber: r.aadhaarNumber,
          dateOfBirth: r.dateOfBirth,
          gender: r.gender,
          address: undefined,
          emergencyContact: undefined,
          emergencyPhone: undefined,
          profilePictureUrl: undefined,
          preferredGymTime: undefined,
          isActive: r.isActive,
          password: loginPassword,
          role: 1,
          planId: undefined,
          membershipStartDate: undefined,
          trainerId: undefined,
          instructorSpecialization: undefined,
          instructorBio: undefined,
          instructorHireDate: undefined,
          userTypeIds: [memberTypeId],
        })
      }

      const total = payloads.length
      setImportProgress({ done: 0, total })
      let ok = 0

      for (let offset = 0; offset < payloads.length; offset += BULK_IMPORT_BATCH_SIZE) {
        const batch = payloads.slice(offset, offset + BULK_IMPORT_BATCH_SIZE)
        try {
          const { data } = await usersService.bulkImportMembers(batch, { timeoutMs: 300_000 })
          ok += data.imported ?? 0
          if (data.log?.length) log.push(...data.log)
        } catch (err: unknown) {
          const msg = getCreateUserErrorMessage(err)
          log.push(`Batch ${Math.floor(offset / BULK_IMPORT_BATCH_SIZE) + 1} failed (${batch.length} rows): ${msg}`)
        }
        setImportProgress({ done: Math.min(offset + batch.length, total), total })
      }

      setImportLog(log)
      await queryClient.invalidateQueries({ queryKey: ['users-paged'] })
      await queryClient.invalidateQueries({ queryKey: ['users-directory-total'] })
      toast.success(`Imported ${ok} member(s). Review log for skips or errors.`)
    } catch {
      toast.error('Could not read CSV file.')
    } finally {
      setImporting(false)
      setImportProgress(null)
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
      <DataPageShell>
      <div ref={contentRef} className="flex min-h-0 min-w-0 flex-1 flex-col gap-6 overflow-hidden">
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

        <DataPageSection>
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
        </DataPageSection>

        {/* Members table — glass card like dashboard widgets */}
        <section
          ref={tableSectionRef}
          data-walkthrough="members-table"
          className="glass-card dashboard-card flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-2xl"
        >
          <div className="shrink-0 border-b border-white/[0.06] px-4 py-4 sm:px-6 sm:py-5">
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold text-white sm:text-base">Member List</h2>
                <span className="rounded-full bg-white/5 px-2.5 py-0.5 text-xs font-medium text-slate-400">
                  {isSearchActive
                    ? `${filteredMemberCount.toLocaleString()} of ${directoryMemberCount.toLocaleString()} members`
                    : `${directoryMemberCount.toLocaleString()} ${directoryMemberCount === 1 ? 'member' : 'members'}`}
                </span>
              </div>
              <DataToolbar
                searchValue={searchQuery}
                onSearchChange={setSearchQuery}
                searchPlaceholder={`Search name, email, phone, Aadhaar (min. ${MEMBER_SEARCH_MIN_CHARS} characters)…`}
                searchAriaLabel="Search members"
                searchLoading={isSearchPending || isFetching}
                filters={
                  <>
                    <DataFilterSelect
                      value={statusFilter}
                      onChange={(v) => setStatusFilter(v as 'all' | 'active' | 'inactive')}
                      ariaLabel="Filter by status"
                      options={[
                        { value: 'all', label: 'All status' },
                        { value: 'active', label: 'Active' },
                        { value: 'inactive', label: 'Inactive' },
                      ]}
                    />
                    <DataFilterSelect
                      value={shiftFilter}
                      onChange={(v) => setShiftFilter(v as MemberShiftFilter)}
                      ariaLabel="Filter by shift"
                      options={MEMBER_SHIFT_FILTER_OPTIONS}
                    />
                  </>
                }
              />
            </div>
          </div>

          {/* Add User Modal */}
          <Modal
            open={isAdding}
            onClose={handleCancelAdd}
            title="Add user"
            size="wide"
            scrollable
            closeOnBackdropClick={false}
            closeOnEscape={false}
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
                  <div>
                    <Input
                      label="Email (login)"
                      type="email"
                      value={form.email}
                      onChange={(e) => {
                        setForm((f) => ({ ...f, email: e.target.value }))
                        if (emailError) setEmailError(null)
                        setLoginEmailError(null)
                      }}
                      onBlur={handleEmailBlur}
                      placeholder="john@example.com"
                      required
                      error={emailError ?? loginEmailError ?? loginEmailAvailability.error ?? undefined}
                      className="!rounded-lg !px-3 !py-2 text-sm"
                    />
                    <MobileNumberAvailabilityHint
                      status={loginEmailAvailability.status}
                      message={loginEmailAvailability.message}
                    />
                    <p className="mt-1 text-[11px] text-slate-500">
                      Used to sign in on the web portal and mobile app. Must be unique.
                    </p>
                  </div>
                  <div>
                    <Input
                      label="Phone"
                      type="tel"
                      value={form.phone ?? ''}
                      onChange={(e) => {
                        setForm((f) => ({ ...f, phone: digitsOnlyPhoneInput(e.target.value) }))
                        if (phoneError) setPhoneError(null)
                      }}
                      onBlur={handlePhoneBlur}
                      placeholder="9876543210"
                      required
                      maxLength={10}
                      error={phoneError ?? mobileAvailability.error ?? undefined}
                      className="!rounded-lg !px-3 !py-2 text-sm"
                    />
                    <MobileNumberAvailabilityHint
                      status={mobileAvailability.status}
                      message={mobileAvailability.message}
                    />
                  </div>
                  <div>
                    <Input
                      label="Aadhaar Number"
                      value={form.aadhaarNumber ?? ''}
                      onChange={(e) => {
                        const value = e.target.value.replace(/\D/g, '').slice(0, 12)
                        setForm((f) => ({ ...f, aadhaarNumber: value }))
                        if (aadhaarError) setAadhaarError(null)
                      }}
                      onBlur={handleAadhaarBlur}
                      placeholder="Optional"
                      error={aadhaarError ?? undefined}
                      className="!rounded-lg !px-3 !py-2 text-sm"
                    />
                    <p className="mt-1 text-[11px] text-slate-500">12 digit Aadhaar Number</p>
                  </div>
                  <Input
                    label="Date of birth"
                    type="date"
                    min={MIN_BIRTH_DATE}
                    max={maxBirthDate}
                    value={form.dateOfBirth ?? ''}
                    onChange={(e) => handleDateOfBirthChange(e.target.value)}
                    onBlur={(e) => handleDateOfBirthBlur(e.target.value)}
                    error={dateOfBirthError ?? undefined}
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

              {/* Login password (email above is the login id) */}
              <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
                <h3 className="mb-0.5 text-sm font-semibold text-white">
                  Login password <span className="text-rose-400">*</span>
                </h3>
                <p className="mb-2 text-xs text-slate-400">
                  The member signs in with their email and this password. Use the button to copy the mobile number, or
                  set a custom password. An admin can change both later on the member profile.
                </p>
                <div className="flex max-w-xl flex-col gap-2 sm:flex-row sm:items-end">
                  <div className="min-w-0 flex-1">
                    <Input
                      label="Password"
                      type="password"
                      name="new_user_pass"
                      autoComplete="new-password"
                      value={form.password ?? ''}
                      onChange={(e) => {
                        setForm((f) => ({ ...f, password: e.target.value }))
                        setPasswordError(null)
                      }}
                      onBlur={handlePasswordBlur}
                      placeholder={`Min. ${MIN_LOGIN_PASSWORD_LENGTH} characters`}
                      required
                      error={passwordError ?? undefined}
                      className="!rounded-lg !px-3 !py-2 text-sm"
                    />
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleUsePhoneAsPassword}
                    disabled={!canSetPasswordFromPhone}
                    title={
                      canSetPasswordFromPhone
                        ? 'Set password to the mobile number above'
                        : 'Enter a valid 10-digit mobile number first'
                    }
                    className="shrink-0 whitespace-nowrap"
                  >
                    Use mobile as password
                  </Button>
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
                    type="tel"
                    value={form.emergencyPhone ?? ''}
                    onChange={(e) => {
                      setForm((f) => ({ ...f, emergencyPhone: digitsOnlyPhoneInput(e.target.value) }))
                      if (emergencyPhoneError) setEmergencyPhoneError(null)
                    }}
                    onBlur={handleEmergencyPhoneBlur}
                    maxLength={10}
                    error={emergencyPhoneError ?? undefined}
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
                        min={MIN_BIRTH_DATE}
                        max={maxBirthDate}
                        value={form.membershipStartDate ?? maxBirthDate}
                        onChange={(e) => handleMembershipStartDateChange(e.target.value)}
                        onBlur={(e) => handleMembershipStartDateBlur(e.target.value)}
                        error={membershipStartDateError ?? undefined}
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
                <strong className="text-slate-200">phone</strong>,{' '}
                <strong className="text-slate-200">dateOfBirth</strong> (YYYY-MM-DD),{' '}
                <strong className="text-slate-200">gender</strong>. Optional: aadhaarNumber, isActive, password (defaults
                to phone if omitted). Login uses the email column; password defaults to phone for bulk import. Admins can
                change email and password later on the member profile.
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
                <p className="text-slate-400">
                  {importProgress && importProgress.total > 0
                    ? `Importing… ${importProgress.done} / ${importProgress.total} rows`
                    : 'Importing…'}
                </p>
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
              {/* Render only one layout branch to avoid double-rendering thousands of members. */}
              {!isDesktopLayout ? (
              <div className="min-h-0 flex-1 overflow-auto p-4">
                {users.length === 0 ? (
                  <div className="flex flex-col items-center gap-3 px-6 py-16 text-center">
                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/5">
                      <svg className="h-7 w-7 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0" />
                      </svg>
                    </div>
                    <p className="text-sm text-slate-400">
                      {directoryMemberCount === 0 ? 'No members yet.' : 'No members match your filter.'}
                    </p>
                    {directoryMemberCount === 0 && (
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
                    {users.map((u) => (
                      <UserCard
                        key={u.id}
                        user={u}
                        onView={handleViewUser}
                        onViewMemberships={handleViewMemberships}
                        onEdit={handleEdit}
                        onDeactivate={handleDeactivate}
                        onActivate={handleActivate}
                        onCollectPayment={handleCollectPayment}
                      />
                    ))}
                  </div>
                )}
              </div>
              ) : null}

              {isDesktopLayout ? (
                <EnterpriseDataGrid
                  data={users}
                  columns={memberColumns}
                  getRowId={(u) => u.id}
                  loading={isLoading}
                  virtualize={users.length > 40}
                  emptyMessage={
                    directoryMemberCount === 0 ? 'No members yet.' : 'No members match your filter.'
                  }
                  pagination={{
                    page,
                    pageSize,
                    totalCount: filteredMemberCount,
                    isFetching,
                    pageSizeOptions: [25, 50, 100],
                    onPageChange: setPage,
                    onPageSizeChange: (size) => {
                      setPageSize(size)
                      setPage(1)
                    },
                  }}
                />
              ) : null}
            </>
          )}
        </section>
      </div>
      </DataPageShell>

      <MemberMembershipsModal
        user={membershipModalUser}
        open={membershipModalUser != null}
        onClose={() => setMembershipModalUser(null)}
      />
    </DashboardLayout>
  )
}
