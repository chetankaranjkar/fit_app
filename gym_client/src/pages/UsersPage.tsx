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
import toast from 'react-hot-toast'
import { DashboardLayout } from '../components/layout/DashboardLayout'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { Modal } from '../components/ui/Modal'
import { MemberMembershipsModal } from '../components/users/MemberMembershipsModal'
import { useWalkthrough } from '../modules/help/hooks/useWalkthrough'
import { useDashboardRoleOrCurrent } from '../features/auth/DashboardRoleContext'
import { shouldScopeUsersToAssignedCoach } from '../features/auth/navPermissions'
import { authService } from '../services/auth.service'
import { usersService } from '../services/users.service'
import { membershipPlansService } from '../services/membershipPlans.service'
import { trainersService } from '../services/trainers.service'
import type { User, CreateUserDto } from '../types/user'
import {
  MEMBERS_CSV_TEMPLATE,
  downloadMembersCsv,
  parseCsvLines,
  rowsToMemberImports,
} from '../lib/membersCsv'
import type { Trainer } from '../types/trainer'
import {
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
import {
  ADMIN_SHIFT_FILTER_OPTIONS,
  MEMBER_SHIFT_FILTER_OPTIONS,
  memberBatchDotClass,
  type MemberShiftFilter,
} from '../lib/memberBatches'
import {
  DEFAULT_TRAINING_SCHEDULE,
  buildTrainingSchedulePayload,
  formatTrainingScheduleLabel,
  isTrainingScheduleValid,
  type MemberTrainingScheduleValue,
} from '../lib/memberTrainingSchedule'
import { MemberTrainingScheduleFields } from '../components/users/MemberTrainingScheduleFields'
import { collectPaymentPath, memberProfilePath } from '../lib/membershipPaymentNavigation'
import { useMemberDirectoryStats, useTrainerMemberStats } from '../hooks/useTrainerMemberStats'
import { MembersPageHeader } from '../components/users/MembersPageHeader'
import { MembersSummaryStrip } from '../components/users/MembersSummaryStrip'
import { TrainerMemberActionsMenu } from '../components/users/TrainerMemberActionsMenu'

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

function roleLabelsFromUser(user: User): string {
  const fromRoles = (user.appRoles ?? []).map((r) => r.name).filter(Boolean)
  if (fromRoles.length > 0) return fromRoles.join(', ')
  return user.userTypes?.map((t) => t.name).join(', ') ?? ''
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

function formatJoinDate(iso?: string | null) {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
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
          onClick={(e) => {
            e.stopPropagation()
            onCollect(user)
          }}
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
      onClick={(e) => {
        e.stopPropagation()
        onClick()
      }}
      aria-label={`View ${name}`}
      className="group/avatar relative z-0 inline-flex shrink-0 rounded-xl transition-transform hover:z-20 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400/50"
    >
      {frame}
    </button>
  )
}

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
  receiveEmailNotifications: false,
  receiveSmsNotifications: false,
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
  const dashboardRole = useDashboardRoleOrCurrent()
  const coachClientsOnly = shouldScopeUsersToAssignedCoach(dashboardRole)
  const isAdmin = dashboardRole === 'admin'
  const canManageMembers = authService.hasPermission('CREATE_MEMBER')
  const trainerStats = useTrainerMemberStats(coachClientsOnly)
  const adminDirectoryStats = useMemberDirectoryStats(!coachClientsOnly, { assignedToCoachOnly: false })
  const directoryStats = coachClientsOnly ? trainerStats : adminDirectoryStats
  const queryClient = useQueryClient()
  const [isAdding, setIsAdding] = useState(false)
  const [form, setForm] = useState<CreateUserDto>(defaultCreateForm)
  const [trainingSchedule, setTrainingSchedule] =
    useState<MemberTrainingScheduleValue>(DEFAULT_TRAINING_SCHEDULE)
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
    queryKey: ['users-directory-total', statusFilter, shiftFilter, coachClientsOnly],
    queryFn: async () => {
      const { data } = await usersService.getPaged({
        page: 1,
        pageSize: 1,
        membersOnly: true,
        isActive: listIsActiveFilter,
        preferredGymTime: listPreferredGymTimeFilter,
        includeBilling: false,
        assignedToCoachOnly: coachClientsOnly,
      })
      return data.totalCount ?? 0
    },
    staleTime: shiftFilter === 'all' && statusFilter === 'all' ? 60_000 : 0,
  })

  const { data: usersPage, isLoading, error, isFetching } = useQuery({
    queryKey: ['users-paged', page, pageSize, effectiveSearch, statusFilter, shiftFilter, coachClientsOnly],
    queryFn: async ({ signal }) => {
      const { data } = await usersService.getPaged(
        {
          page,
          pageSize,
          search: effectiveSearch,
          membersOnly: true,
          isActive: listIsActiveFilter,
          preferredGymTime: listPreferredGymTimeFilter,
          assignedToCoachOnly: coachClientsOnly,
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
      void queryClient.invalidateQueries({ queryKey: ['trainer-member-stats'] })
      setIsAdding(false)
      setForm(defaultCreateForm)
      setTrainingSchedule(DEFAULT_TRAINING_SCHEDULE)
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
        const profilePath = memberProfilePath(p.userId)
        if (location.pathname !== profilePath) {
          navigate(collectPaymentPath(p.membershipId, p.userId, profilePath), { replace: true })
        }
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
      void queryClient.invalidateQueries({ queryKey: ['trainer-member-stats'] })
    },
  })

  const handleStartAdd = () => {
    setIsAdding(true)
    setForm({ ...defaultCreateForm, role: 1 })
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
    setForm({ ...defaultCreateForm, role: 1 })
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

  const handleCancelAdd = () => {
    setIsAdding(false)
    setForm(defaultCreateForm)
    setTrainingSchedule(DEFAULT_TRAINING_SCHEDULE)
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
    if (!isTrainingScheduleValid(trainingSchedule)) {
      setFormError('Select a gym shift or enter a valid custom training time slot.')
      return
    }
    const schedulePayload = buildTrainingSchedulePayload(trainingSchedule)
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
      preferredGymTime: schedulePayload.preferredGymTime ?? undefined,
      trainingScheduleType: schedulePayload.trainingScheduleType,
      trainingStartTime: schedulePayload.trainingStartTime ?? undefined,
      trainingEndTime: schedulePayload.trainingEndTime ?? undefined,
      trainingDaysOfWeek: schedulePayload.trainingDaysOfWeek ?? undefined,
      overrideTrainingScheduleConflict: schedulePayload.overrideTrainingScheduleConflict,
      password,
      role: 1,
      planId: form.planId && form.planId > 0 ? form.planId : undefined,
      membershipStartDate: form.membershipStartDate || undefined,
      trainerId: form.trainerId && form.trainerId > 0 ? form.trainerId : undefined,
      receiveEmailNotifications: form.receiveEmailNotifications ?? false,
      receiveSmsNotifications: form.receiveSmsNotifications ?? false,
      instructorSpecialization: undefined,
      instructorBio: undefined,
      instructorHireDate: undefined,
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
    navigate(collectPaymentPath(user.openMembershipId, user.id, memberProfilePath(user.id)))
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
        minWidth: 200,
        width: 240,
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
                  onClick={(e) => {
                    e.stopPropagation()
                    handleViewUser(row)
                  }}
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
        minWidth: 140,
        width: 150,
        hideBelow: 'xl',
        cell: ({ row }) => <PaymentDueCell user={row} onCollect={handleCollectPayment} />,
      },
      {
        id: 'roles',
        header: 'Roles',
        minWidth: 120,
        width: 140,
        hideBelow: 'xl',
        accessorFn: (u) => roleLabelsFromUser(u),
      },
      {
        id: 'actions',
        header: 'Actions',
        width: 200,
        minWidth: 200,
        align: 'right',
        overflowVisible: true,
        cell: ({ row }) => (
          <TrainerMemberActionsMenu
            user={row}
            onViewMemberships={handleViewMemberships}
            onDeactivate={handleDeactivate}
            onActivate={handleActivate}
          />
        ),
      },
    ],
    [handleActivate, handleDeactivate, handleViewMemberships, handleCollectPayment],
  )

  const trainerMemberColumns = useMemo<DataGridColumnDef<User>[]>(
    () => [
      {
        id: 'member',
        header: 'Member',
        sticky: true,
        minWidth: 260,
        width: 300,
        sortable: true,
        overflowVisible: true,
        accessorFn: (u) => `${u.firstName} ${u.lastName}`.trim(),
        cell: ({ row }) => {
          const name = memberDisplayName(row)
          return (
            <div className="flex items-center gap-3">
              <MemberAvatar user={row} size="sm" onClick={() => handleViewUser(row)} />
              <div className="min-w-0">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    handleViewUser(row)
                  }}
                  className="block max-w-full truncate text-left text-sm font-semibold text-white transition hover:text-violet-200 hover:underline"
                >
                  {name}
                </button>
                <p className="truncate text-[11px] text-slate-500">{row.email || '—'}</p>
              </div>
            </div>
          )
        },
      },
      {
        id: 'phone',
        header: 'Phone',
        minWidth: 125,
        width: 140,
        hideBelow: 'md',
        sortable: true,
        accessorFn: (u) => u.phone ?? '',
        cell: ({ row }) => <span className="text-sm text-slate-300">{row.phone || '—'}</span>,
      },
      {
        id: 'batch',
        header: 'Batch',
        minWidth: 150,
        width: 170,
        sortable: true,
        accessorFn: (u) => formatTrainingScheduleLabel(u),
        cell: ({ row }) => (
          <span className="inline-flex items-center gap-2 text-xs text-slate-300">
            <span className={`size-2 shrink-0 rounded-full ${memberBatchDotClass(row.preferredGymTime)}`} />
            {formatTrainingScheduleLabel(row)}
          </span>
        ),
      },
      {
        id: 'status',
        header: 'Status',
        minWidth: 110,
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
        header: 'Payment Due',
        minWidth: 140,
        width: 150,
        hideBelow: 'lg',
        cell: ({ row }) => <PaymentDueCell user={row} onCollect={handleCollectPayment} />,
      },
      {
        id: 'joined',
        header: 'Join Date',
        minWidth: 120,
        width: 130,
        hideBelow: 'lg',
        sortable: true,
        accessorFn: (u) => u.registrationDate ?? '',
        cell: ({ row }) => (
          <span className="text-xs text-slate-400">{formatJoinDate(row.registrationDate)}</span>
        ),
      },
      {
        id: 'actions',
        header: 'Actions',
        width: 200,
        minWidth: 200,
        align: 'right',
        overflowVisible: true,
        cell: ({ row }) => (
          <TrainerMemberActionsMenu
            user={row}
            onViewMemberships={handleViewMemberships}
            onDeactivate={handleDeactivate}
            onActivate={handleActivate}
          />
        ),
      },
    ],
    [handleActivate, handleDeactivate, handleViewMemberships, handleCollectPayment],
  )

  const gridColumns = coachClientsOnly ? trainerMemberColumns : memberColumns

  const membersToolbar = (
    <DataToolbar
      className="min-w-0"
      searchValue={searchQuery}
      onSearchChange={setSearchQuery}
      searchPlaceholder={
        coachClientsOnly
          ? 'Search by name, mobile, Aadhaar, or email…'
          : `Search name, email, phone, Aadhaar (min. ${MEMBER_SEARCH_MIN_CHARS} chars)…`
      }
      searchAriaLabel="Search members"
      searchLoading={isSearchPending || isFetching}
      filters={
        <>
          <DataFilterSelect
            value={statusFilter}
            onChange={(v) => setStatusFilter(v as 'all' | 'active' | 'inactive')}
            ariaLabel="Filter by status"
            options={[
              { value: 'all', label: coachClientsOnly ? 'All Status' : 'All status' },
              { value: 'active', label: 'Active' },
              { value: 'inactive', label: 'Inactive' },
            ]}
          />
          <DataFilterSelect
            value={shiftFilter}
            onChange={(v) => setShiftFilter(v as MemberShiftFilter)}
            ariaLabel={coachClientsOnly ? 'Filter by batch' : 'Filter by shift'}
            options={coachClientsOnly ? MEMBER_SHIFT_FILTER_OPTIONS : ADMIN_SHIFT_FILTER_OPTIONS}
          />
        </>
      }
    />
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

  const tableSectionRef = useRef<HTMLElement>(null)

  return (
    <DashboardLayout userName={userName}>
      <DataPageShell lockViewport={false} className="gap-3 bg-[#070B14] pb-2">
        <MembersPageHeader
          title="All Members"
          subtitle={
            coachClientsOnly
              ? 'Manage members assigned to you'
              : 'Manage gym member directory'
          }
          onExport={handleExportFiltered}
          onImport={
            canManageMembers && !coachClientsOnly
              ? () => {
                  setImportLog([])
                  setImportOpen(true)
                }
              : undefined
          }
          onAdd={canManageMembers ? handleStartAdd : undefined}
          onTour={coachClientsOnly ? undefined : () => startMembersTour()}
          addWalkthroughId="members-add"
        />

        <DataPageSection>
          <MembersSummaryStrip
            variant={coachClientsOnly ? 'coach' : 'admin'}
            total={directoryStats.total}
            active={directoryStats.active}
            inactive={directoryStats.inactive}
            batches={directoryStats.batches}
            maxBatchCount={directoryStats.maxBatchCount}
            loading={directoryStats.isLoading}
          />
        </DataPageSection>

        <section
          ref={tableSectionRef}
          data-walkthrough="members-table"
          className="flex min-h-[28rem] flex-col overflow-hidden rounded-xl border border-white/[0.1] bg-[#0a101c]/75 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.07),0_8px_40px_-16px_rgba(0,0,0,0.6)] ring-1 ring-white/[0.06] backdrop-blur-xl sm:min-h-[32rem] lg:min-h-[calc(100dvh-15.5rem)]"
        >
          <div className="shrink-0 border-b border-white/[0.06] px-3 py-2.5 sm:px-4">{membersToolbar}</div>

          {error ? (
            <p className="shrink-0 px-4 py-2 text-sm text-rose-300">
              {error instanceof Error ? error.message : 'Failed to load users'}
            </p>
          ) : null}

          <EnterpriseDataGrid
            data={users}
            columns={gridColumns}
            getRowId={(u) => u.id}
            loading={isLoading}
            virtualize
            estimateRowHeight={52}
            className="min-h-[22rem] flex-1 lg:min-h-0"
            chainScrollToParent
            emptyMessage={
              directoryMemberCount === 0 ? 'No members yet.' : 'No members match your filter.'
            }
            pagination={{
              page,
              pageSize,
              totalCount: filteredMemberCount,
              isFetching,
              pageSizeOptions: coachClientsOnly ? [25, 50, 100, 200] : [25, 50, 100],
              onPageChange: setPage,
              onPageSizeChange: (size) => {
                setPageSize(size)
                setPage(1)
              },
            }}
          />
        </section>
      </DataPageShell>

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

              {/* Step 1: Role */}
              <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
                <p className="mb-0.5 text-xs font-medium uppercase tracking-wide text-slate-500">Step 1</p>
                <h3 className="mb-1 text-sm font-semibold text-white">Member account</h3>
                <p className="text-xs text-slate-400">
                  New users are created with the <span className="font-medium text-slate-200">MEMBER</span> application
                  role (gym member list and mobile login).
                </p>
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

              <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
                <h3 className="mb-0.5 text-sm font-semibold text-white">Notification preferences</h3>
                <p className="mb-3 text-xs text-slate-400">
                  Off by default. Enable so this member receives payment receipts, renewal reminders, and other
                  alerts on the matching channel.
                </p>
                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-sm font-medium text-slate-300">
                    <input
                      type="checkbox"
                      checked={form.receiveEmailNotifications ?? false}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, receiveEmailNotifications: e.target.checked }))
                      }
                      className="h-4 w-4 rounded border-white/20 bg-white/5 text-blue-500 focus:ring-blue-400/40"
                    />
                    Receive email
                  </label>
                  <label className="flex items-center gap-2 text-sm font-medium text-slate-300">
                    <input
                      type="checkbox"
                      checked={form.receiveSmsNotifications ?? false}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, receiveSmsNotifications: e.target.checked }))
                      }
                      className="h-4 w-4 rounded border-white/20 bg-white/5 text-blue-500 focus:ring-blue-400/40"
                    />
                    Receive SMS / WhatsApp
                  </label>
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
                    <MemberTrainingScheduleFields
                      value={trainingSchedule}
                      onChange={setTrainingSchedule}
                      trainerId={form.trainerId}
                      showAdminOverride={isAdmin}
                    />
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

      <MemberMembershipsModal
        user={membershipModalUser}
        open={membershipModalUser != null}
        onClose={() => setMembershipModalUser(null)}
      />
    </DashboardLayout>
  )
}
