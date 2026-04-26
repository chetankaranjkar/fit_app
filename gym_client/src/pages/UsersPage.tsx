import { useState, useMemo, useEffect, useRef } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { DashboardLayout } from '../components/layout/DashboardLayout'
import { MetricCard } from '../components/dashboard/MetricCard'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { Modal } from '../components/ui/Modal'
import { usersService } from '../services/users.service'
import { membershipPlansService } from '../services/membershipPlans.service'
import { trainersService } from '../services/trainers.service'
import { userTypesService } from '../services/userTypes.service'
import type { User, CreateUserDto } from '../types/user'
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

function UserRow({
  user,
  onView,
  onEdit,
  onDelete,
  onDeactivate,
  onActivate,
}: {
  user: User
  onView: (u: User) => void
  onEdit: (u: User) => void
  onDelete: (id: number, name: string) => void
  onDeactivate: (u: User) => void
  onActivate: (u: User) => void
}) {
  const name = `${user.firstName} ${user.lastName}`.trim() || '—'
  const age = getAge(user.dateOfBirth)
  const initials = name !== '—' ? name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase() : '—'
  return (
    <tr className="border-b border-white/5 transition hover:bg-white/5">
      <td className="px-6 py-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-blue-500/40 to-purple-500/40 text-sm font-semibold text-white ring-1 ring-white/10">
          {user.profilePictureUrl ? (
            <img src={user.profilePictureUrl} alt="" className="h-full w-full object-cover" />
          ) : (
            initials
          )}
        </div>
      </td>
      <td className="px-6 py-3">
        <p className="font-medium text-white">{name}</p>
        <p className="text-xs text-slate-400">
          {user.email ? (
            <a href={`mailto:${user.email}`} className="text-blue-300 transition hover:text-blue-200">
              {user.email}
            </a>
          ) : (
            '—'
          )}
          {age != null && ` · Age ${age}`}
        </p>
      </td>
      <td className="px-6 py-3 font-mono text-sm text-slate-300">{user.id}</td>
      <td className="px-6 py-3 text-slate-300">{user.phone ?? '—'}</td>
      <td className="px-6 py-3">
        <span
          className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${
            user.isActive
              ? 'bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-500/30'
              : 'bg-white/5 text-slate-400 ring-1 ring-white/10'
          }`}
        >
          {user.isActive ? 'Active' : 'Inactive'}
        </span>
      </td>
      <td className="px-6 py-3 text-slate-300">{user.preferredGymTime ?? '—'}</td>
      <td className="px-6 py-3 text-slate-300">
        {user.userTypes && user.userTypes.length > 0
          ? user.userTypes.map((t) => t.name).join(', ')
          : '—'}
      </td>
      <td className="px-6 py-3 text-right">
        <div className="flex flex-wrap justify-end gap-1">
          <Button variant="soft" size="sm" onClick={() => onView(user)}>
            View
          </Button>
          <Button variant="soft" size="sm" onClick={() => onEdit(user)}>
            Edit
          </Button>
          {user.isActive ? (
            <Button
              variant="soft"
              size="sm"
              onClick={() => onDeactivate(user)}
              className="!bg-amber-500/10 !text-amber-300 hover:!bg-amber-500/20"
            >
              Deactivate
            </Button>
          ) : (
            <Button
              variant="soft"
              size="sm"
              onClick={() => onActivate(user)}
              className="!bg-emerald-500/10 !text-emerald-300 hover:!bg-emerald-500/20"
            >
              Activate
            </Button>
          )}
          <Button
            variant="soft"
            size="sm"
            onClick={() => onDelete(user.id, name)}
            className="!bg-rose-500/10 !text-rose-300 hover:!bg-rose-500/20"
          >
            Delete
          </Button>
        </div>
      </td>
    </tr>
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
    mutationFn: (dto: CreateUserDto) => usersService.create(dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
      setIsAdding(false)
      setForm(defaultCreateForm)
      setFormError(null)
      setEmailError(null)
      setPhoneError(null)
      setUsernameError(null)
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
        <div className="users-dashboard-header flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">Members</p>
            <h1 className="mt-1 text-3xl font-bold tracking-tight text-white">
              All{' '}
              <span className="bg-[linear-gradient(135deg,#60a5fa,#c084fc)] bg-clip-text text-transparent">
                Users
              </span>
            </h1>
            <p className="mt-1 text-sm text-slate-400">
              Search, filter, and manage member profiles — same workspace as your dashboard.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-slate-200 transition hover:bg-white/10"
            >
              Export
            </button>
            <button
              type="button"
              onClick={handleStartAdd}
              className="rounded-xl bg-[linear-gradient(135deg,#3b82f6_0%,#a855f7_100%)] px-4 py-2 text-xs font-semibold text-white shadow-lg shadow-purple-500/20 transition hover:brightness-110"
            >
              + Add Member
            </button>
          </div>
        </div>

        {/* KPI metrics — same MetricCard pattern as dashboard */}
        <div ref={cardsRowRef} className="grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
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
        </div>

        {/* Members table — glass card like dashboard widgets */}
        <section ref={tableSectionRef} className="glass-card dashboard-card min-w-0 rounded-2xl">
          <div className="border-b border-white/5 px-6 py-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-base font-semibold text-white">Member list</h2>
                <p className="text-xs text-slate-400">
                  View, edit, activate, or remove members. Use search and status filters.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <input
                  type="search"
                  placeholder="Search by name, email, phone…"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="min-w-[200px] rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 transition-colors focus:border-blue-400/60 focus:bg-white/[0.07] focus:outline-none focus:ring-2 focus:ring-blue-400/20"
                  aria-label="Search users"
                />
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as 'all' | 'active' | 'inactive')}
                  className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-200 transition-colors focus:border-blue-400/60 focus:bg-white/[0.07] focus:outline-none focus:ring-2 focus:ring-blue-400/20"
                  aria-label="Filter by status"
                >
                  <option value="all" className="bg-slate-900">All</option>
                  <option value="active" className="bg-slate-900">Active only</option>
                  <option value="inactive" className="bg-slate-900">Inactive only</option>
                </select>
                <Button onClick={handleStartAdd} size="sm" className="shrink-0">
                  Add member
                </Button>
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
                            {p.planName} ({p.durationDays} days – ${p.price})
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

          {error && (
            <p className="px-6 py-4 text-rose-300">{error instanceof Error ? error.message : 'Failed to load users'}</p>
          )}
          {isLoading ? (
            <div className="flex h-64 items-center justify-center text-slate-400">
              Loading…
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px]">
                <thead>
                  <tr className="border-b border-white/5 bg-white/[0.02] text-left text-xs font-medium uppercase tracking-wider text-slate-400">
                    <th className="px-6 py-4">Profile</th>
                    <th className="px-6 py-4">Full Name</th>
                    <th className="px-6 py-4">ID</th>
                    <th className="px-6 py-4">Phone</th>
                    <th className="px-6 py-4">Active</th>
                    <th className="px-6 py-4">Preferred Time</th>
                    <th className="px-6 py-4">User Types</th>
                    <th className="px-6 py-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-6 py-12 text-center text-slate-400">
                        {users.length === 0
                          ? 'No members yet. Use Add member to create one.'
                          : 'No members match your search or filter.'}
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
                        />
                      ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </DashboardLayout>
  )
}
