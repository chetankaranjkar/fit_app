import { useMemo, useState, type ReactNode } from 'react'
import { useParams, useNavigate, useSearchParams, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { DashboardLayout } from '../components/layout/DashboardLayout'
import { DashboardMetricsGrid } from '../components/layout/DashboardMetricsGrid'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { Modal } from '../components/ui/Modal'
import { getApiErrorMessage } from '../lib/apiErrors'
import { usersService } from '../services/users.service'
import { fileUploadService } from '../services/fileUpload.service'
import { bodyMetricsService } from '../services/bodyMetrics.service'
import { attendanceService } from '../services/attendance.service'
import { membershipPlansService } from '../services/membershipPlans.service'
import { trainersService } from '../services/trainers.service'
import { userTypesService } from '../services/userTypes.service'
import { workoutPlansService } from '../services/workoutPlans.service'
import { userSchedulesService } from '../services/userSchedules.service'
import { userMembershipsService } from '../services/userMemberships.service'
import { userDietPlansService } from '../services/userDietPlans.service'
import { memberHasDietAssignment, primaryDietAssignment } from '../lib/userDietPlanUtils'
import {
  UserOnboardingChecklist,
  type OnboardingStep,
} from '../components/users/UserOnboardingChecklist'
import { DietAssignmentsSection } from '../components/users/DietAssignmentsSection'
import { MemberReportExports } from '../components/users/MemberReportExports'
import { TrainerHealthAlertPanel } from '../modules/health-profile/components/TrainerHealthAlertPanel'
import { healthProfileService } from '../modules/health-profile/services/healthProfile.service'
import { MemberSupplementsPanel } from '../modules/supplement-tracking/components/MemberSupplementsPanel'
import { MemberPaymentHistoryTab } from '../components/users/MemberPaymentHistoryTab'
import { ProfilePhotoEditor } from '../components/users/ProfilePhotoEditor'
import { formatInr } from '../lib/formatInr'
import type { User, UpdateUserDto } from '../types/user'
import type { UserDetailDto, CreateUserDetailDto } from '../types/userDetail'
import type {
  BodyMetricsDto,
  BodyMetricsLogDto,
  CreateBodyMetricsDto,
  UpdateBodyMetricsDto,
} from '../types/bodyMetrics'
import type { AttendanceLogDto } from '../types/attendance'
import type { WorkoutPlan } from '../types/workoutPlan'
import type { CreateUserScheduleDto, ScheduleType, UserScheduleDto } from '../types/userSchedule'
import type { Trainer } from '../types/trainer'
import type { UserDietPlanDto } from '../types/dietPlan'
import type { UserMembership } from '../types/userMembership'
import toast from 'react-hot-toast'

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

function formatDate(iso: string) {
  if (!iso) return '—'
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleDateString()
}

function formatDateTime(iso: string) {
  if (!iso) return '—'
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleString()
}

function getAge(dob?: string | null) {
  if (!dob) return null
  const d = new Date(dob)
  if (Number.isNaN(d.getTime())) return null
  const diff = Date.now() - d.getTime()
  const age = new Date(diff).getUTCFullYear() - 1970
  return age >= 0 && age < 130 ? age : null
}

function calculateBmi(weightKg?: number | null, heightCm?: number | null) {
  if (weightKg == null || heightCm == null || weightKg <= 0 || heightCm <= 0) return null
  const heightInMeters = heightCm / 100
  if (heightInMeters <= 0) return null
  return weightKg / (heightInMeters * heightInMeters)
}

function getBmiCategory(bmi: number) {
  if (bmi < 18.5) return { label: 'Underweight', color: 'sky', gradient: 'from-sky-400 to-cyan-500' }
  if (bmi < 25) return { label: 'Healthy', color: 'emerald', gradient: 'from-emerald-400 to-teal-500' }
  if (bmi < 30) return { label: 'Overweight', color: 'amber', gradient: 'from-amber-400 to-orange-500' }
  return { label: 'Obese', color: 'rose', gradient: 'from-rose-400 to-red-500' }
}

function normalizeEditProfileDate(s: string | null | undefined) {
  const t = (s ?? '').trim()
  return t.length >= 10 ? t.slice(0, 10) : t
}

/** Prefer latest active membership; otherwise latest row (e.g. all expired). */
function pickMembershipRowForPrefill(memberships: UserMembership[]) {
  const byStartDesc = (a: UserMembership, b: UserMembership) =>
    new Date(b.startDate).getTime() - new Date(a.startDate).getTime()
  const active = memberships.filter((m) => m.status === 'Active').sort(byStartDesc)
  if (active[0]) return active[0]
  return [...memberships].sort(byStartDesc)[0]
}

function userTypeIdsFromUser(user: User) {
  const mixed = user as User & { UserTypes?: { id?: number; Id?: number }[] }
  const rows = user.userTypes ?? mixed.UserTypes ?? []
  return rows
    .map((t) => (typeof t.id === 'number' ? t.id : t.Id))
    .filter((id): id is number => typeof id === 'number' && Number.isFinite(id) && id > 0)
}

/** Keeps Member type when editing profile so members do not vanish from the Users list. */
function mergeUserTypeIdsForSave(
  selected: number[] | undefined,
  user: User,
  allTypes: { id: number; name: string }[],
): number[] | undefined {
  if (!selected || selected.length === 0) return undefined
  const memberType = allTypes.find((t) => t.name === 'Member')
  if (!memberType) return selected
  const hadMember = user.userTypes?.some((t) => t.name === 'Member')
  if (hadMember && !selected.includes(memberType.id)) {
    return [...selected, memberType.id]
  }
  return selected
}

interface TabDef {
  id: TabId
  icon: ReactNode
}

const TABS_META: TabDef[] = [
  {
    id: 'Details',
    icon: (
      <svg className="size-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
      </svg>
    ),
  },
  {
    id: 'Body Metrics',
    icon: (
      <svg className="size-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 17v-6a2 2 0 012-2h2a2 2 0 012 2v6m-6 0h6m-6 0v2a2 2 0 002 2h2a2 2 0 002-2v-2M5 7h14M5 7a2 2 0 00-2 2v10a2 2 0 002 2M5 7V5a2 2 0 012-2h10a2 2 0 012 2v2m0 0a2 2 0 012 2v10a2 2 0 01-2 2" />
      </svg>
    ),
  },
  {
    id: 'Graph',
    icon: (
      <svg className="size-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 17l5-5 4 4 7-8m0 0v5m0-5h-5" />
      </svg>
    ),
  },
  {
    id: 'Payment History',
    icon: (
      <svg className="size-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"
        />
      </svg>
    ),
  },
  {
    id: 'In Action',
    icon: (
      <svg className="size-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
      </svg>
    ),
  },
]

const TAB_IDS = ['Details', 'Body Metrics', 'Graph', 'Payment History', 'In Action'] as const
type TabId = (typeof TAB_IDS)[number]

const selectClass =
  'w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-100 transition-colors focus:border-blue-400/60 focus:bg-white/[0.07] focus:outline-none focus:ring-2 focus:ring-blue-400/20'

const labelClass = 'mb-1.5 block text-xs font-medium uppercase tracking-wider text-slate-400'

export function UserDetailPage() {
  const { userId } = useParams<{ userId: string }>()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const viewMode = searchParams.get('mode') === 'view'
  const id = userId ? parseInt(userId, 10) : NaN
  const dietPlansAssignQuery = useMemo(() => {
    if (!Number.isFinite(id) || id <= 0) return ''
    const returnTo = encodeURIComponent(`/dashboard/users/${userId}`)
    return `userId=${id}&returnTo=${returnTo}`
  }, [id, userId])
  const workoutAssignmentsQuery = useMemo(() => {
    if (!Number.isFinite(id) || id <= 0) return ''
    const returnTo = encodeURIComponent(`/dashboard/users/${userId}`)
    return `userId=${id}&returnTo=${returnTo}`
  }, [id, userId])
  const { userName } = getDashboardUser()
  const queryClient = useQueryClient()
  const [activeTab, setActiveTab] = useState<TabId>('Details')
  const [addDetailOpen, setAddDetailOpen] = useState(false)
  const [addMetricsOpen, setAddMetricsOpen] = useState(false)
  const [editProfileOpen, setEditProfileOpen] = useState(false)
  const [profileForm, setProfileForm] = useState<UpdateUserDto>({})
  const [editProfileBaseline, setEditProfileBaseline] = useState<{
    planId?: number
    membershipStartDate: string
    trainerId?: number
  } | null>(null)
  const [profileError, setProfileError] = useState<string | null>(null)
  const [loginPassword, setLoginPassword] = useState('')
  const [loginPasswordConfirm, setLoginPasswordConfirm] = useState('')
  const [loginEmail, setLoginEmail] = useState('')
  const [detailForm, setDetailForm] = useState<CreateUserDetailDto>({
    userId: 0,
    height: 0,
    weight: 0,
    bodyFatPercentage: undefined,
    muscleMass: undefined,
    targetWeight: undefined,
    goalType: '',
    activityLevel: '',
    notes: '',
  })
  const [metricsForm, setMetricsForm] = useState<CreateBodyMetricsDto>({
    userId: 0,
    weightKg: 0,
    measurementDate: new Date().toISOString().slice(0, 10),
    bodyFatPct: undefined,
    muscleMassKg: undefined,
    chestCm: undefined,
    waistCm: undefined,
    hipsCm: undefined,
    bicepsCm: undefined,
    thighsCm: undefined,
    neckCm: undefined,
    shouldersCm: undefined,
    forearmsCm: undefined,
    calvesCm: undefined,
    heightCm: undefined,
    notes: '',
  })
  const [metricsError, setMetricsError] = useState<string | null>(null)
  const [editingMetricsId, setEditingMetricsId] = useState<number | null>(null)
  const [assignWorkoutOpen, setAssignWorkoutOpen] = useState(false)
  const [assignWorkoutError, setAssignWorkoutError] = useState<string | null>(null)
  const [scheduleForm, setScheduleForm] = useState<CreateUserScheduleDto>({
    userId: id,
    trainerId: undefined,
    workoutPlanId: 0,
    scheduleType: 'Custom',
    dayOfWeek: 1,
    startTime: '06:00:00',
    endTime: '07:00:00',
  })
  const metricsFormBmi = useMemo(
    () => calculateBmi(metricsForm.weightKg, metricsForm.heightCm),
    [metricsForm.weightKg, metricsForm.heightCm],
  )

  const { data: user, isLoading: userLoading, error: userError } = useQuery({
    queryKey: ['user', id],
    queryFn: () => usersService.getById(id).then((r) => r.data),
    enabled: Number.isInteger(id) && id > 0,
  })

  const { data: details = [], isLoading: detailsLoading } = useQuery({
    queryKey: ['userDetails', id],
    queryFn: async () => {
      const { data } = await usersService.getDetails(id!)
      return Array.isArray(data) ? data : []
    },
    enabled: Number.isInteger(id) && id > 0 && (activeTab === 'Details' || viewMode),
  })

  const { data: currentMetrics } = useQuery({
    queryKey: ['bodyMetricsCurrent', id],
    queryFn: async () => {
      const { data } = await bodyMetricsService.getCurrentByUser(id!)
      return (data as BodyMetricsDto) ?? null
    },
    enabled: Number.isInteger(id) && id > 0,
  })

  const { data: metricsList = [] } = useQuery({
    queryKey: ['bodyMetricsList', id],
    queryFn: async () => {
      const { data } = await bodyMetricsService.getByUserId(id!)
      return Array.isArray(data) ? data : []
    },
    enabled: Number.isInteger(id) && id > 0 && (activeTab === 'Body Metrics' || viewMode),
  })

  const { data: logs = [] } = useQuery({
    queryKey: ['bodyMetricsLogs', id],
    queryFn: async () => {
      const { data } = await bodyMetricsService.getLogsByUser(id!)
      return Array.isArray(data) ? data : []
    },
    enabled: Number.isInteger(id) && id > 0 && (activeTab === 'Graph' || viewMode),
  })

  const { data: attendanceLogs = [] } = useQuery({
    queryKey: ['attendanceLogs', id],
    queryFn: async () => {
      const { data } = await attendanceService.getByUserId(id!)
      return Array.isArray(data) ? data : []
    },
    enabled: Number.isInteger(id) && id > 0,
  })

  const { data: membershipPlans = [] } = useQuery({
    queryKey: ['membershipPlans'],
    queryFn: async () => {
      const { data } = await membershipPlansService.getAll()
      return Array.isArray(data) ? data : []
    },
    enabled: editProfileOpen,
  })

  const { data: trainers = [] } = useQuery({
    queryKey: ['trainers'],
    queryFn: async () => {
      const { data } = await trainersService.getAll()
      return Array.isArray(data) ? data : []
    },
    enabled: editProfileOpen,
  })

  const { data: workoutPlans = [] } = useQuery({
    queryKey: ['workoutPlans'],
    queryFn: async () => {
      const { data } = await workoutPlansService.getAll()
      return Array.isArray(data) ? (data as WorkoutPlan[]) : []
    },
    enabled: assignWorkoutOpen,
  })

  const { data: userMemberships = [], isLoading: membershipsLoading } = useQuery({
    queryKey: ['userMemberships', id],
    queryFn: async () => {
      const { data } = await userMembershipsService.getByUserId(id)
      return Array.isArray(data) ? data : []
    },
    enabled: Number.isInteger(id) && id > 0,
  })

  const { data: userDietAssignments = [], isLoading: dietAssignmentsLoading } = useQuery({
    queryKey: ['userDietPlans', id],
    queryFn: async () => {
      const { data } = await userDietPlansService.getAssignments({ userId: id })
      return data
    },
    enabled: Number.isInteger(id) && id > 0,
    staleTime: 0,
    refetchOnMount: 'always',
  })

  const { data: userSchedules = [] } = useQuery({
    queryKey: ['userSchedules', id],
    queryFn: async () => {
      const { data } = await userSchedulesService.getByUserId(id)
      return Array.isArray(data) ? (data as UserScheduleDto[]) : []
    },
    enabled: Number.isInteger(id) && id > 0 && (activeTab === 'Details' || viewMode),
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
    enabled: editProfileOpen,
  })

  const addDetailMutation = useMutation({
    mutationFn: (dto: CreateUserDetailDto) => usersService.addDetail(dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['userDetails', id] })
      setAddDetailOpen(false)
      setDetailForm((f) => ({
        ...f,
        height: 0,
        weight: 0,
        bodyFatPercentage: undefined,
        muscleMass: undefined,
        targetWeight: undefined,
        goalType: '',
        activityLevel: '',
        notes: '',
      }))
    },
  })

  const addMetricsMutation = useMutation({
    mutationFn: (dto: CreateBodyMetricsDto) => bodyMetricsService.create(dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bodyMetricsCurrent', id] })
      queryClient.invalidateQueries({ queryKey: ['bodyMetricsList', id] })
      queryClient.invalidateQueries({ queryKey: ['bodyMetricsLogs', id] })
      setAddMetricsOpen(false)
      setMetricsForm((f) => ({
        ...f,
        weightKg: 0,
        measurementDate: new Date().toISOString().slice(0, 10),
        bodyFatPct: undefined,
        muscleMassKg: undefined,
        chestCm: undefined,
        waistCm: undefined,
        hipsCm: undefined,
        bicepsCm: undefined,
        thighsCm: undefined,
        neckCm: undefined,
        shouldersCm: undefined,
        forearmsCm: undefined,
        calvesCm: undefined,
        heightCm: undefined,
        notes: '',
      }))
      setMetricsError(null)
      setEditingMetricsId(null)
    },
    onError: (err: Error) => {
      setMetricsError(err.message || 'Failed to save body metrics')
    },
  })

  const updateMetricsMutation = useMutation({
    mutationFn: ({ metricId, dto }: { metricId: number; dto: UpdateBodyMetricsDto }) =>
      bodyMetricsService.update(metricId, dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bodyMetricsCurrent', id] })
      queryClient.invalidateQueries({ queryKey: ['bodyMetricsList', id] })
      queryClient.invalidateQueries({ queryKey: ['bodyMetricsLogs', id] })
      setAddMetricsOpen(false)
      setMetricsError(null)
      setEditingMetricsId(null)
    },
    onError: (err: Error) => {
      setMetricsError(err.message || 'Failed to update body metrics')
    },
  })

  const deleteMetricsMutation = useMutation({
    mutationFn: (metricId: number) => bodyMetricsService.delete(metricId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bodyMetricsCurrent', id] })
      queryClient.invalidateQueries({ queryKey: ['bodyMetricsList', id] })
      queryClient.invalidateQueries({ queryKey: ['bodyMetricsLogs', id] })
      setMetricsError(null)
    },
    onError: (err: Error) => {
      setMetricsError(err.message || 'Failed to delete body metrics')
    },
  })

  const updateProfileMutation = useMutation({
    mutationFn: (dto: UpdateUserDto) => usersService.update(id, dto).then((r) => r.data),
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: ['user', id] })
      queryClient.invalidateQueries({ queryKey: ['users'] })
      if (updated?.assignedTrainerId) {
        queryClient.invalidateQueries({ queryKey: ['trainer-clients', updated.assignedTrainerId] })
      }
      queryClient.invalidateQueries({ queryKey: ['trainer-clients'] })
      setEditProfileOpen(false)
      setProfileForm({})
      setLoginPassword('')
      setLoginPasswordConfirm('')
      setLoginEmail('')
      setProfileError(null)
      const p = updated?.pendingPaymentCollection
      if (p?.membershipId && p.membershipPaymentId) {
        navigate(`/dashboard/payments/collect?membershipId=${p.membershipId}&userId=${p.userId}`)
      }
    },
    onError: (err: unknown) => setProfileError(getApiErrorMessage(err, 'Failed to update profile')),
  })

  const createScheduleMutation = useMutation({
    mutationFn: (dto: CreateUserScheduleDto) => userSchedulesService.create(dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['userSchedules', id] })
      setAssignWorkoutOpen(false)
      setAssignWorkoutError(null)
      setScheduleForm({
        userId: id,
        trainerId: undefined,
        workoutPlanId: 0,
        scheduleType: 'Custom',
        dayOfWeek: 1,
        startTime: '06:00:00',
        endTime: '07:00:00',
      })
    },
    onError: (err: Error) => setAssignWorkoutError(err.message || 'Failed to assign workout plan'),
  })

  const deleteScheduleMutation = useMutation({
    mutationFn: (scheduleId: number) => userSchedulesService.delete(scheduleId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['userSchedules', id] })
      void queryClient.invalidateQueries({ queryKey: ['user-schedules'] })
      toast.success('Workout assignment removed.')
    },
    onError: () => toast.error('Could not remove workout assignment.'),
  })

  const unassignDietMutation = useMutation({
    mutationFn: (assignmentId: number) => userDietPlansService.unassign(assignmentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['userDietPlans', id] })
      queryClient.invalidateQueries({ queryKey: ['user-diet-plans'] })
      toast.success('Diet plan removed.')
    },
    onError: () => toast.error('Could not remove diet plan.'),
  })

  const replaceDietMutation = useMutation({
    mutationFn: async (assignmentId: number) => {
      await userDietPlansService.unassign(assignmentId)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['userDietPlans', id] })
      queryClient.invalidateQueries({ queryKey: ['user-diet-plans'] })
      if (dietPlansAssignQuery) {
        navigate(`/dashboard/diet-plans/assign?${dietPlansAssignQuery}`)
      } else {
        navigate('/dashboard/diet-plans/assign')
      }
    },
    onError: () => toast.error('Could not remove the current diet plan.'),
  })

  // Computed stats for hero strip — depends on user/details/attendanceLogs
  const heroStats = useMemo(() => {
    const latestDetail = details.length > 0 ? details[0] : null
    const latestWeight = latestDetail?.weight ?? currentMetrics?.weightKg ?? null
    const latestHeight = latestDetail?.height ?? currentMetrics?.heightCm ?? null
    const bmi = latestDetail?.bmi ?? calculateBmi(latestWeight, latestHeight)
    const age = user ? getAge(user.dateOfBirth) : null

    // attendance streak and totals
    const uniqueDays = new Set<string>()
    attendanceLogs.forEach((l) => {
      const d = new Date(l.attendanceDate)
      if (!Number.isNaN(d.getTime())) uniqueDays.add(d.toISOString().slice(0, 10))
    })
    const sortedDays = Array.from(uniqueDays).sort((a, b) => (a < b ? 1 : -1))
    let streak = 0
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const iter = new Date(today)
    // allow today or yesterday as the start to count streak
    if (sortedDays.length > 0) {
      const topDay = new Date(sortedDays[0])
      topDay.setHours(0, 0, 0, 0)
      const dayDiff = Math.floor((today.getTime() - topDay.getTime()) / 86400000)
      if (dayDiff > 1) {
        streak = 0
      } else {
        // count consecutive days back
        for (let i = 0; i < sortedDays.length; i++) {
          const cur = new Date(sortedDays[i])
          cur.setHours(0, 0, 0, 0)
          const gap = Math.floor((iter.getTime() - cur.getTime()) / 86400000)
          if (gap === 0) {
            streak++
            iter.setDate(iter.getDate() - 1)
          } else if (gap === 1 && i === 0) {
            // started with yesterday
            streak++
            iter.setDate(iter.getDate() - 2)
          } else {
            break
          }
        }
      }
    }
    const now = new Date()
    const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
    const visitsThisMonth = Array.from(uniqueDays).filter((d) => d.startsWith(monthKey)).length

    return {
      age,
      bmi,
      latestWeight,
      latestHeight,
      streak,
      visitsThisMonth,
      totalVisits: uniqueDays.size,
    }
  }, [details, attendanceLogs, user, currentMetrics])

  if (!Number.isInteger(id) || id <= 0) {
    return (
      <DashboardLayout userName={userName}>
        <div className="min-w-0 max-w-full">
          <p className="text-rose-300">Invalid user ID.</p>
          <Button variant="secondary" size="sm" onClick={() => navigate('/dashboard/users')}>
            Back to Users
          </Button>
        </div>
      </DashboardLayout>
    )
  }

  if (userLoading || userError || !user) {
    return (
      <DashboardLayout userName={userName}>
        <div className="min-w-0 max-w-full space-y-4">
          {userLoading && (
            <div className="h-56 animate-pulse rounded-3xl border border-white/10 bg-white/[0.03]" />
          )}
          {userError && (
            <p className="text-rose-300">
              {userError instanceof Error ? userError.message : 'Failed to load user'}
            </p>
          )}
          {!user && !userLoading && <p className="text-slate-400">User not found.</p>}
          <Button variant="secondary" size="sm" onClick={() => navigate('/dashboard/users')}>
            Back to Users
          </Button>
        </div>
      </DashboardLayout>
    )
  }

  const userDisplayName = `${user.firstName} ${user.lastName}`.trim() || user.email || 'User'
  const initials = userDisplayName
    .split(' ')
    .map((s) => s[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase()

  const handleOpenAddDetail = () => {
    setDetailForm({
      userId: id,
      height: 0,
      weight: 0,
      bodyFatPercentage: undefined,
      muscleMass: undefined,
      targetWeight: undefined,
      goalType: '',
      activityLevel: '',
      notes: '',
    })
    setAddDetailOpen(true)
  }

  const handleSubmitDetail = (e: React.FormEvent) => {
    e.preventDefault()
    addDetailMutation.mutate({ ...detailForm, userId: id })
  }

  const handleOpenAddMetrics = () => {
    setEditingMetricsId(null)
    setMetricsForm({
      userId: id,
      weightKg: 0,
      measurementDate: new Date().toISOString().slice(0, 10),
      bodyFatPct: undefined,
      muscleMassKg: undefined,
      chestCm: undefined,
      waistCm: undefined,
      hipsCm: undefined,
      bicepsCm: undefined,
      thighsCm: undefined,
      neckCm: undefined,
      shouldersCm: undefined,
      forearmsCm: undefined,
      calvesCm: undefined,
      heightCm: undefined,
      notes: '',
    })
    setAddMetricsOpen(true)
    setMetricsError(null)
  }

  const handleOpenAssignWorkout = () => {
    setAssignWorkoutError(null)
    setScheduleForm({
      userId: id,
      trainerId: undefined,
      workoutPlanId: 0,
      scheduleType: 'Custom',
      dayOfWeek: 1,
      startTime: '06:00:00',
      endTime: '07:00:00',
    })
    setAssignWorkoutOpen(true)
  }

  const handleSubmitAssignWorkout = (e: React.FormEvent) => {
    e.preventDefault()
    if (scheduleForm.workoutPlanId <= 0) {
      setAssignWorkoutError('Select a workout plan.')
      return
    }
    const replacingOtherPlan = activeWorkoutSchedules.some(
      (s) => s.workoutPlanId !== scheduleForm.workoutPlanId,
    )
    if (replacingOtherPlan) {
      const currentName = activeWorkoutSchedules[0]?.workoutPlanName ?? 'current plan'
      if (
        !window.confirm(
          `This will replace "${currentName}" with the selected plan. Other active slots for the old plan will be turned off.`,
        )
      ) {
        return
      }
    }
    setAssignWorkoutError(null)
    createScheduleMutation.mutate({ ...scheduleForm, userId: id })
  }

  const handleDeleteSchedule = (schedule: UserScheduleDto) => {
    if (!window.confirm(`Remove workout assignment "${schedule.workoutPlanName}"?`)) return
    deleteScheduleMutation.mutate(schedule.id)
  }

  const handleRemoveDiet = (assignment: UserDietPlanDto) => {
    const name = assignment.dietPlanName ?? 'this diet plan'
    if (!window.confirm(`Remove "${name}" from this member?`)) return
    unassignDietMutation.mutate(assignment.id)
  }

  const handleChangeDiet = () => {
    const current = primaryDietAssignment(userDietAssignments)
    if (current) {
      if (
        !window.confirm(
          `Replace "${current.dietPlanName ?? 'current plan'}"? The current assignment will be removed, then you can pick a new plan.`,
        )
      ) {
        return
      }
      replaceDietMutation.mutate(current.id)
      return
    }
    if (dietPlansAssignQuery) {
      navigate(`/dashboard/diet-plans/assign?${dietPlansAssignQuery}`)
    } else {
      navigate('/dashboard/diet-plans/assign')
    }
  }

  const handleAssignDiet = () => {
    if (dietPlansAssignQuery) {
      navigate(`/dashboard/diet-plans/assign?${dietPlansAssignQuery}`)
    } else {
      navigate('/dashboard/diet-plans/assign')
    }
  }

  const handleOpenWorkoutAssignmentsHub = () => {
    if (workoutAssignmentsQuery) {
      navigate(`/dashboard/training/workout-assignments?${workoutAssignmentsQuery}`)
    }
  }

  const handleSubmitMetrics = (e: React.FormEvent) => {
    e.preventDefault()
    const payload = {
      ...metricsForm,
      userId: id,
      measurementDate: metricsForm.measurementDate || new Date().toISOString().slice(0, 10),
    }
    if (editingMetricsId != null) {
      updateMetricsMutation.mutate({
        metricId: editingMetricsId,
        dto: payload as UpdateBodyMetricsDto,
      })
      return
    }
    addMetricsMutation.mutate(payload as CreateBodyMetricsDto)
  }

  const handleOpenEditMetrics = (metric: BodyMetricsDto) => {
    setEditingMetricsId(metric.id)
    setMetricsError(null)
    setMetricsForm({
      userId: metric.userId,
      measurementDate: metric.measurementDate?.slice(0, 10) || new Date().toISOString().slice(0, 10),
      weightKg: metric.weightKg,
      bodyFatPct: metric.bodyFatPct ?? undefined,
      muscleMassKg: metric.muscleMassKg ?? undefined,
      chestCm: metric.chestCm ?? undefined,
      waistCm: metric.waistCm ?? undefined,
      hipsCm: metric.hipsCm ?? undefined,
      bicepsCm: metric.bicepsCm ?? undefined,
      thighsCm: metric.thighsCm ?? undefined,
      neckCm: metric.neckCm ?? undefined,
      shouldersCm: metric.shouldersCm ?? undefined,
      forearmsCm: metric.forearmsCm ?? undefined,
      calvesCm: metric.calvesCm ?? undefined,
      heightCm: metric.heightCm ?? undefined,
      notes: metric.notes ?? '',
      progressPictureUrl: metric.progressPictureUrl ?? undefined,
    })
    setAddMetricsOpen(true)
  }

  const handleDeleteMetrics = (metric: BodyMetricsDto) => {
    const confirmDelete = window.confirm(
      `Delete body metrics reading from ${formatDate(metric.measurementDate)}? This action will be audited.`,
    )
    if (!confirmDelete) return
    deleteMetricsMutation.mutate(metric.id)
  }

  const handleOpenEditProfile = () => {
    queryClient.invalidateQueries({ queryKey: ['trainers'] })
    const fromList = pickMembershipRowForPrefill(userMemberships)
    const apiPlanId =
      user.currentMembershipPlanId != null && user.currentMembershipPlanId > 0
        ? user.currentMembershipPlanId
        : undefined
    const planId = apiPlanId ?? (fromList != null && fromList.planId > 0 ? fromList.planId : undefined)
    const startFromApi = user.currentMembershipStartDate
      ? normalizeEditProfileDate(user.currentMembershipStartDate)
      : ''
    const startFromList = fromList?.startDate ? normalizeEditProfileDate(fromList.startDate) : ''
    const membershipStartDate = startFromApi || startFromList || undefined

    const trainerRaw = user.assignedTrainerId ?? user.trainerId
    const trainerId =
      trainerRaw != null && Number(trainerRaw) > 0 ? Number(trainerRaw) : undefined

    setEditProfileBaseline({
      planId,
      membershipStartDate: membershipStartDate ?? '',
      trainerId,
    })
    setProfileForm({
      firstName: user.firstName,
      lastName: user.lastName,
      phone: user.phone ?? '',
      dateOfBirth: user.dateOfBirth?.slice(0, 10) ?? '',
      gender: user.gender ?? '',
      address: user.address ?? '',
      emergencyContact: user.emergencyContact ?? '',
      emergencyPhone: user.emergencyPhone ?? '',
      preferredGymTime: user.preferredGymTime ?? '',
      profilePictureUrl: user.profilePictureUrl ?? '',
      isActive: user.isActive,
      planId,
      membershipStartDate,
      trainerId,
      userTypeIds: userTypeIdsFromUser(user),
    })
    setProfileError(null)
    setLoginPassword('')
    setLoginPasswordConfirm('')
    setLoginEmail(user.email?.trim() ?? user.username?.trim() ?? '')
    setEditProfileOpen(true)
  }

  const handleCloseEditProfile = () => {
    setLoginPassword('')
    setLoginPasswordConfirm('')
    setLoginEmail('')
    setEditProfileOpen(false)
    setProfileForm({})
    setEditProfileBaseline(null)
    setProfileError(null)
  }

  const handleSubmitProfile = (e: React.FormEvent) => {
    e.preventDefault()
    setProfileError(null)

    const pwd = loginPassword.trim()
    const hasLogin = Boolean(user.username?.trim() || user.email?.trim())
    if (pwd) {
      if (pwd.length < 6) {
        setProfileError('Password must be at least 6 characters.')
        return
      }
      if (pwd !== loginPasswordConfirm.trim()) {
        setProfileError('Password and confirmation do not match.')
        return
      }
      if (!hasLogin && !loginEmail.trim()) {
        setProfileError('Login email is required when creating a new login for this member.')
        return
      }
    }

    const baseline = editProfileBaseline
    const formPlanId = profileForm.planId && profileForm.planId > 0 ? profileForm.planId : undefined
    const formStart = normalizeEditProfileDate(profileForm.membershipStartDate)
    const basePlanId = baseline?.planId && baseline.planId > 0 ? baseline.planId : undefined
    const baseStart = normalizeEditProfileDate(baseline?.membershipStartDate)
    const membershipUnchanged =
      baseline != null && formPlanId === basePlanId && formStart === baseStart

    const formTrainerId =
      profileForm.trainerId && profileForm.trainerId > 0 ? profileForm.trainerId : undefined
    const baseTrainerId =
      baseline?.trainerId && baseline.trainerId > 0 ? baseline.trainerId : undefined
    const trainerUnchanged = baseline != null && formTrainerId === baseTrainerId

    const payload: UpdateUserDto = {
      firstName: profileForm.firstName?.trim(),
      lastName: profileForm.lastName?.trim(),
      phone: profileForm.phone?.trim() || null,
      dateOfBirth: profileForm.dateOfBirth || null,
      gender: profileForm.gender?.trim() || null,
      address: profileForm.address?.trim() || null,
      emergencyContact: profileForm.emergencyContact?.trim() || null,
      emergencyPhone: profileForm.emergencyPhone?.trim() || null,
      preferredGymTime: profileForm.preferredGymTime?.trim() || null,
      profilePictureUrl:
        profileForm.profilePictureUrl != null && profileForm.profilePictureUrl.trim() !== ''
          ? profileForm.profilePictureUrl.trim()
          : null,
      isActive: profileForm.isActive,
      planId: !membershipUnchanged && formPlanId ? formPlanId : undefined,
      membershipStartDate:
        !membershipUnchanged && formPlanId ? profileForm.membershipStartDate || undefined : undefined,
      trainerId: !trainerUnchanged ? (formTrainerId ?? 0) : undefined,
      userTypeIds: mergeUserTypeIdsForSave(profileForm.userTypeIds, user, userTypes),
      password: pwd || undefined,
      email: pwd && !hasLogin ? loginEmail.trim() : undefined,
    }
    updateProfileMutation.mutate(payload)
  }

  const profileComplete = Boolean(
    user?.firstName?.trim() &&
      user?.lastName?.trim() &&
      user?.email?.trim() &&
      user?.phone?.trim(),
  )
  const hasActiveMembership = userMemberships.some((m) => m.status === 'Active')
  const activeWorkoutSchedules = userSchedules.filter((s) => s.isActive)
  const hasWorkoutAssignment = activeWorkoutSchedules.length > 0
  const dietAssignment = primaryDietAssignment(userDietAssignments)
  const hasDietAssignment = memberHasDietAssignment(userDietAssignments)

  const onboardingSteps: OnboardingStep[] = [
    {
      id: 'profile',
      label: 'Profile',
      done: profileComplete,
      hint: 'Name, email, and phone on file.',
      action: !profileComplete && !viewMode ? { label: 'Edit profile', onClick: handleOpenEditProfile } : undefined,
    },
    {
      id: 'membership',
      label: 'Membership',
      done: hasActiveMembership,
      hint: 'Active gym membership plan.',
      action: !hasActiveMembership
        ? { label: 'Manage memberships', to: '/dashboard/user-memberships' }
        : undefined,
    },
    {
      id: 'workout',
      label: 'Workout',
      done: hasWorkoutAssignment,
      hint: 'Assigned workout plan from a trainer.',
      action:
        !hasWorkoutAssignment && !viewMode
          ? { label: 'Assign workout', onClick: handleOpenAssignWorkout }
          : undefined,
    },
    {
      id: 'diet',
      label: 'Diet',
      done: hasDietAssignment,
      hint: hasDietAssignment
        ? dietAssignment?.dietPlanName
          ? `Assigned: ${dietAssignment.dietPlanName}`
          : 'Nutrition plan assigned to this member.'
        : userDietAssignments.length > 0
          ? 'Diet assignment exists but is inactive or outside its date range.'
          : 'Nutrition plan assigned to this member.',
      action: !hasDietAssignment
        ? {
            label: 'Assign diet plan',
            to: dietPlansAssignQuery
              ? `/dashboard/diet-plans/assign?${dietPlansAssignQuery}`
              : `/dashboard/diet-plans/assign?userId=${id}`,
          }
        : undefined,
    },
  ]

  const chartData = logs
    .slice()
    .sort(
      (a, b) => new Date(a.measurementDate).getTime() - new Date(b.measurementDate).getTime()
    )
    .map((log) => ({
      date: formatDate(log.measurementDate),
      weight: log.weightKg,
      bodyFat: log.bodyFatPct ?? undefined,
      muscle: log.muscleMassKg ?? undefined,
    }))

  return (
    <DashboardLayout userName={userName}>
      <div className="min-w-0 max-w-full space-y-6">
        {/* Back link */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => navigate('/dashboard/users')}
            className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold text-slate-300 transition hover:border-white/20 hover:bg-white/10 hover:text-white"
          >
            <svg className="size-3.5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            Back to Members
          </button>
          {user ? (
            <MemberReportExports
              user={user}
              attendanceLogs={attendanceLogs}
              metricsList={metricsList}
            />
          ) : null}
        </div>

        {/* HERO */}
        <ProfileHero
          user={user}
          displayName={userDisplayName}
          initials={initials}
          viewMode={viewMode}
          heroStats={heroStats}
          onEditProfile={handleOpenEditProfile}
          onSwitchToEdit={() => navigate(`/dashboard/users/${id}`)}
        />

        {user && (
          <UserOnboardingChecklist
            steps={onboardingSteps}
            loading={membershipsLoading || dietAssignmentsLoading}
          />
        )}

        {/* TAB BAR */}
        <div className="flex flex-wrap gap-2 overflow-x-auto">
          {TABS_META.map((tab) => {
            const active = activeTab === tab.id
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`group inline-flex shrink-0 items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-semibold transition ${
                  active
                    ? 'border-transparent bg-[linear-gradient(135deg,#3b82f6_0%,#8b5cf6_50%,#a855f7_100%)] text-white shadow-lg shadow-blue-500/20'
                    : 'border-white/10 bg-white/5 text-slate-300 hover:border-white/25 hover:bg-white/10 hover:text-white'
                }`}
              >
                <span className={`${active ? 'text-white' : 'text-slate-400 group-hover:text-white'}`}>
                  {tab.icon}
                </span>
                {tab.id}
              </button>
            )
          })}
        </div>

        {/* TAB CONTENT */}
        {activeTab === 'Details' && (
          <DetailsTab
            user={user}
            details={details}
            metricsList={metricsList}
            userSchedules={userSchedules}
            userDietAssignments={userDietAssignments}
            workoutPlans={workoutPlans}
            trainers={trainers as Trainer[]}
            detailsLoading={detailsLoading}
            dietLoading={dietAssignmentsLoading}
            viewMode={viewMode}
            onEditProfile={handleOpenEditProfile}
            onAddDetail={handleOpenAddDetail}
            onAssignWorkout={handleOpenAssignWorkout}
            onOpenWorkoutAssignmentsHub={
              workoutAssignmentsQuery ? handleOpenWorkoutAssignmentsHub : undefined
            }
            onDeleteSchedule={handleDeleteSchedule}
            onAssignDiet={handleAssignDiet}
            onChangeDiet={handleChangeDiet}
            onRemoveDiet={handleRemoveDiet}
            dietActionPending={unassignDietMutation.isPending || replaceDietMutation.isPending}
          />
        )}
        {activeTab === 'Body Metrics' && (
          <BodyMetricsTab
            currentMetrics={currentMetrics}
            metricsList={metricsList}
            onAddMetrics={handleOpenAddMetrics}
            onEditMetrics={handleOpenEditMetrics}
            onDeleteMetrics={handleDeleteMetrics}
          />
        )}
        {activeTab === 'Graph' && <GraphTab chartData={chartData} logs={logs} />}
        {activeTab === 'Payment History' && Number.isFinite(id) && id > 0 && user && (
          <MemberPaymentHistoryTab
            userId={id}
            memberName={userDisplayName}
            memberPhotoUrl={user.profilePictureUrl}
          />
        )}
        {activeTab === 'In Action' && (
          <InActionTab
            attendanceLogs={attendanceLogs}
            streak={heroStats.streak}
            visitsThisMonth={heroStats.visitsThisMonth}
            totalVisits={heroStats.totalVisits}
            currentMetrics={currentMetrics}
            previousMetrics={metricsList.length > 1 ? metricsList[1] : null}
          />
        )}
      </div>

      {/* Edit-only modals */}
      {!viewMode && (
        <>
          <Modal
            open={addDetailOpen}
            onClose={() => setAddDetailOpen(false)}
            title="Add measurement detail"
            size="wide"
            scrollable
          >
            <form onSubmit={handleSubmitDetail} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Input
                label="Height (cm)"
                type="number"
                step="0.1"
                min="0"
                value={detailForm.height || ''}
                onChange={(e) =>
                  setDetailForm((f) => ({ ...f, height: parseFloat(e.target.value) || 0 }))
                }
                required
              />
              <Input
                label="Weight (kg)"
                type="number"
                step="0.1"
                min="0"
                value={detailForm.weight || ''}
                onChange={(e) =>
                  setDetailForm((f) => ({ ...f, weight: parseFloat(e.target.value) || 0 }))
                }
                required
              />
              <Input
                label="Body fat %"
                type="number"
                step="0.1"
                min="0"
                value={detailForm.bodyFatPercentage ?? ''}
                onChange={(e) =>
                  setDetailForm((f) => ({
                    ...f,
                    bodyFatPercentage: e.target.value ? parseFloat(e.target.value) : undefined,
                  }))
                }
              />
              <Input
                label="Muscle mass (kg)"
                type="number"
                step="0.1"
                min="0"
                value={detailForm.muscleMass ?? ''}
                onChange={(e) =>
                  setDetailForm((f) => ({
                    ...f,
                    muscleMass: e.target.value ? parseFloat(e.target.value) : undefined,
                  }))
                }
              />
              <Input
                label="Target weight (kg)"
                type="number"
                step="0.1"
                min="0"
                value={detailForm.targetWeight ?? ''}
                onChange={(e) =>
                  setDetailForm((f) => ({
                    ...f,
                    targetWeight: e.target.value ? parseFloat(e.target.value) : undefined,
                  }))
                }
              />
              <Input
                label="Goal type"
                value={detailForm.goalType ?? ''}
                onChange={(e) => setDetailForm((f) => ({ ...f, goalType: e.target.value || undefined }))}
              />
              <Input
                label="Activity level"
                value={detailForm.activityLevel ?? ''}
                onChange={(e) =>
                  setDetailForm((f) => ({ ...f, activityLevel: e.target.value || undefined }))
                }
              />
              <div className="sm:col-span-2">
                <Input
                  label="Notes"
                  value={detailForm.notes ?? ''}
                  onChange={(e) => setDetailForm((f) => ({ ...f, notes: e.target.value || undefined }))}
                />
              </div>
              <div className="flex justify-end gap-2 sm:col-span-2">
                <Button type="button" variant="secondary" onClick={() => setAddDetailOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" isLoading={addDetailMutation.isPending}>
                  Save
                </Button>
              </div>
            </form>
          </Modal>

          <Modal
            open={editProfileOpen}
            onClose={handleCloseEditProfile}
            title="Edit profile"
            size="wide"
            scrollable
          >
            <form onSubmit={handleSubmitProfile} className="space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Input
                  label="First name"
                  value={profileForm.firstName ?? ''}
                  onChange={(e) => setProfileForm((f) => ({ ...f, firstName: e.target.value }))}
                  required
                />
                <Input
                  label="Last name"
                  value={profileForm.lastName ?? ''}
                  onChange={(e) => setProfileForm((f) => ({ ...f, lastName: e.target.value }))}
                  required
                />
                <div className="sm:col-span-2 space-y-3 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                  <div>
                    <p className={labelClass}>Login account</p>
                    {user.username?.trim() || user.email?.trim() ? (
                      <p className="mt-1 text-sm text-slate-300">
                        {user.username?.trim() || user.email?.trim()}
                        <span className="text-slate-500"> · used to sign in (email cannot be changed here)</span>
                      </p>
                    ) : (
                      <p className="mt-1 text-sm text-amber-200/90">No login yet — set email and password below.</p>
                    )}
                    <p className="mt-2 text-xs text-slate-500">
                      Enter a new password to reset login or enable sign-in. Leave password blank to keep unchanged.
                    </p>
                  </div>
                  {!user.username?.trim() && !user.email?.trim() && (
                    <Input
                      label="Login email"
                      type="email"
                      autoComplete="off"
                      value={loginEmail}
                      onChange={(e) => setLoginEmail(e.target.value)}
                      placeholder="member@example.com"
                      required={loginPassword.length > 0}
                    />
                  )}
                  <Input
                    label="New password"
                    type="password"
                    autoComplete="new-password"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    placeholder="Min 6 characters"
                  />
                  <Input
                    label="Confirm password"
                    type="password"
                    autoComplete="new-password"
                    value={loginPasswordConfirm}
                    onChange={(e) => setLoginPasswordConfirm(e.target.value)}
                  />
                </div>
                {Number.isFinite(id) && id > 0 && (
                  <ProfilePhotoEditor
                    className="sm:col-span-2"
                    imageUrl={profileForm.profilePictureUrl ?? ''}
                    onImageUrlChange={(url) =>
                      setProfileForm((f) => ({ ...f, profilePictureUrl: url || undefined }))
                    }
                    subjectLabel="member"
                    onError={setProfileError}
                    uploadFile={async (file) => {
                      const { data } = await fileUploadService.uploadUserProfileImage(id, file)
                      const url = data.imageUrl?.trim()
                      if (!url) throw new Error('Server did not return imageUrl')
                      return url
                    }}
                    persistUrl={async (url) => {
                      await usersService.update(id, { profilePictureUrl: url })
                      await queryClient.invalidateQueries({ queryKey: ['user', id] })
                      await queryClient.invalidateQueries({ queryKey: ['users'] })
                    }}
                  />
                )}
                <Input
                  label="Phone"
                  value={profileForm.phone ?? ''}
                  onChange={(e) => setProfileForm((f) => ({ ...f, phone: e.target.value }))}
                />
                <Input
                  label="Date of birth"
                  type="date"
                  value={profileForm.dateOfBirth ?? ''}
                  onChange={(e) => setProfileForm((f) => ({ ...f, dateOfBirth: e.target.value }))}
                />
                <div>
                  <label className={labelClass}>Gender</label>
                  <select
                    aria-label="Gender"
                    value={profileForm.gender ?? ''}
                    onChange={(e) => setProfileForm((f) => ({ ...f, gender: e.target.value }))}
                    className={selectClass}
                  >
                    <option value="" className="bg-slate-900">Select</option>
                    <option value="Male" className="bg-slate-900">Male</option>
                    <option value="Female" className="bg-slate-900">Female</option>
                    <option value="Other" className="bg-slate-900">Other</option>
                  </select>
                </div>
                <div>
                  <label className={labelClass}>Preferred gym time</label>
                  <select
                    aria-label="Preferred gym time"
                    value={profileForm.preferredGymTime ?? ''}
                    onChange={(e) =>
                      setProfileForm((f) => ({ ...f, preferredGymTime: e.target.value }))
                    }
                    className={selectClass}
                  >
                    <option value="" className="bg-slate-900">Select</option>
                    <option value="Morning" className="bg-slate-900">Morning</option>
                    <option value="Afternoon" className="bg-slate-900">Afternoon</option>
                    <option value="Evening" className="bg-slate-900">Evening</option>
                    <option value="Night" className="bg-slate-900">Night</option>
                  </select>
                </div>
                <Input
                  label="Address"
                  value={profileForm.address ?? ''}
                  onChange={(e) => setProfileForm((f) => ({ ...f, address: e.target.value }))}
                  className="sm:col-span-2"
                />
                <Input
                  label="Emergency contact"
                  value={profileForm.emergencyContact ?? ''}
                  onChange={(e) =>
                    setProfileForm((f) => ({ ...f, emergencyContact: e.target.value }))
                  }
                />
                <Input
                  label="Emergency phone"
                  value={profileForm.emergencyPhone ?? ''}
                  onChange={(e) =>
                    setProfileForm((f) => ({ ...f, emergencyPhone: e.target.value }))
                  }
                />
                <div className="flex items-center gap-2 sm:col-span-2">
                  <input
                    type="checkbox"
                    id="profile-is-active"
                    checked={profileForm.isActive ?? true}
                    onChange={(e) =>
                      setProfileForm((f) => ({ ...f, isActive: e.target.checked }))
                    }
                    className="h-4 w-4 rounded border-white/20 bg-white/5 text-blue-500 focus:ring-blue-400/40"
                  />
                  <label htmlFor="profile-is-active" className="text-sm font-medium text-slate-300">
                    Active
                  </label>
                </div>
                <div className="sm:col-span-2">
                  <label className={labelClass}>Add membership plan (optional)</label>
                  <select
                    aria-label="Membership plan"
                    value={profileForm.planId ?? ''}
                    onChange={(e) =>
                      setProfileForm((f) => ({
                        ...f,
                        planId: e.target.value ? parseInt(e.target.value, 10) : undefined,
                      }))
                    }
                    className={selectClass}
                  >
                    <option value="" className="bg-slate-900">None</option>
                    {membershipPlans.map((p) => (
                      <option key={p.id} value={p.id} className="bg-slate-900">
                        {p.planName} ({p.durationDays} days – {formatInr(p.price)})
                      </option>
                    ))}
                  </select>
                </div>
                {profileForm.planId != null && profileForm.planId > 0 && (
                  <div className="sm:col-span-2">
                    <Input
                      label="Membership start date (optional)"
                      type="date"
                      value={profileForm.membershipStartDate ?? new Date().toISOString().slice(0, 10)}
                      onChange={(e) =>
                        setProfileForm((f) => ({ ...f, membershipStartDate: e.target.value }))
                      }
                    />
                  </div>
                )}
                <div className="sm:col-span-2">
                  <label className={labelClass}>Personal coach (optional)</label>
                  <p className="mb-2 text-xs text-slate-500">
                    Assigns this member to a coach. Appears on the trainer&apos;s Clients tab. This is not the same as
                    user type &quot;Trainer&quot; (staff role).
                  </p>
                  <select
                    aria-label="Personal coach"
                    value={profileForm.trainerId ?? ''}
                    onChange={(e) =>
                      setProfileForm((f) => ({
                        ...f,
                        trainerId: e.target.value ? parseInt(e.target.value, 10) : undefined,
                      }))
                    }
                    className={selectClass}
                  >
                    <option value="" className="bg-slate-900">None</option>
                    {trainers.map((i) => (
                        <option key={i.id} value={i.id} className="bg-slate-900" disabled={!i.isActive}>
                          {i.firstName} {i.lastName}
                          {i.specialization ? ` – ${i.specialization}` : ''}
                          {!i.isActive ? ' (inactive)' : ''}
                        </option>
                      ))}
                  </select>
                </div>
                <div className="sm:col-span-2">
                  <label className={labelClass}>User types</label>
                  <p className="mb-2 text-xs text-slate-500">
                    Member = gym member list. Trainer = staff coach profile (Trainers page). Members should keep the
                    Member type.
                  </p>
                  <div className="flex flex-wrap gap-3">
                    {userTypesLoading && <p className="text-sm text-slate-400">Loading user types…</p>}
                    {userTypesError && (
                      <p className="text-sm text-amber-300">
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
                    {!userTypesLoading &&
                      !userTypesError &&
                      userTypes.map((ut: { id: number; name: string }) => (
                        <label
                          key={ut.id}
                          className="flex cursor-pointer items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2"
                        >
                          <input
                            type="checkbox"
                            checked={profileForm.userTypeIds?.includes(ut.id) ?? false}
                            onChange={(e) => {
                              setProfileForm((f) => ({
                                ...f,
                                userTypeIds: e.target.checked
                                  ? [...(f.userTypeIds ?? []), ut.id]
                                  : (f.userTypeIds ?? []).filter((tid) => tid !== ut.id),
                              }))
                            }}
                            className="h-4 w-4 rounded border-white/20 bg-white/5 text-blue-500 focus:ring-blue-400/40"
                          />
                          <span className="text-sm text-slate-200">{ut.name}</span>
                        </label>
                      ))}
                    {!userTypesLoading && !userTypesError && userTypes.length === 0 && (
                      <p className="text-sm text-slate-500">
                        No user types from API. Restart the API to run the seeder.
                      </p>
                    )}
                  </div>
                </div>
              </div>
              {profileError && (
                <p
                  className="rounded-lg border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-sm text-rose-200"
                  role="alert"
                >
                  {profileError}
                </p>
              )}
              <div className="flex justify-end gap-2 border-t border-white/10 pt-4">
                <Button type="button" variant="secondary" onClick={handleCloseEditProfile}>
                  Cancel
                </Button>
                <Button type="submit" isLoading={updateProfileMutation.isPending}>
                  Update profile
                </Button>
              </div>
            </form>
          </Modal>
        </>
      )}

      {/* Body metrics log modal available in both view/edit modes */}
      <Modal
        open={addMetricsOpen}
        onClose={() => {
          setAddMetricsOpen(false)
          setEditingMetricsId(null)
        }}
        title={editingMetricsId != null ? 'Update body metrics' : 'Add body metrics'}
        size="wide"
        scrollable
      >
        <form onSubmit={handleSubmitMetrics} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Input
            label="Measurement date"
            type="date"
            value={metricsForm.measurementDate ?? ''}
            onChange={(e) =>
              setMetricsForm((f) => ({ ...f, measurementDate: e.target.value }))
            }
          />
          <Input
            label="Weight (kg)"
            type="number"
            step="0.1"
            min="0"
            value={metricsForm.weightKg || ''}
            onChange={(e) =>
              setMetricsForm((f) => ({ ...f, weightKg: parseFloat(e.target.value) || 0 }))
            }
            required
          />
          <Input
            label="Body fat %"
            type="number"
            step="0.1"
            min="0"
            value={metricsForm.bodyFatPct ?? ''}
            onChange={(e) =>
              setMetricsForm((f) => ({
                ...f,
                bodyFatPct: e.target.value ? parseFloat(e.target.value) : undefined,
              }))
            }
          />
          <Input
            label="Muscle mass (kg)"
            type="number"
            step="0.1"
            min="0"
            value={metricsForm.muscleMassKg ?? ''}
            onChange={(e) =>
              setMetricsForm((f) => ({
                ...f,
                muscleMassKg: e.target.value ? parseFloat(e.target.value) : undefined,
              }))
            }
          />
          <Input
            label="Height (cm)"
            type="number"
            step="0.1"
            min="0"
            value={metricsForm.heightCm ?? ''}
            onChange={(e) =>
              setMetricsForm((f) => ({
                ...f,
                heightCm: e.target.value ? parseFloat(e.target.value) : undefined,
              }))
            }
          />
          <Input
            label="Computed BMI"
            value={metricsFormBmi != null ? metricsFormBmi.toFixed(2) : '—'}
            disabled
          />
          <Input
            label="Chest (cm)"
            type="number"
            step="0.1"
            min="0"
            value={metricsForm.chestCm ?? ''}
            onChange={(e) =>
              setMetricsForm((f) => ({
                ...f,
                chestCm: e.target.value ? parseFloat(e.target.value) : undefined,
              }))
            }
          />
          <Input
            label="Waist (cm)"
            type="number"
            step="0.1"
            min="0"
            value={metricsForm.waistCm ?? ''}
            onChange={(e) =>
              setMetricsForm((f) => ({
                ...f,
                waistCm: e.target.value ? parseFloat(e.target.value) : undefined,
              }))
            }
          />
          <Input
            label="Hips (cm)"
            type="number"
            step="0.1"
            min="0"
            value={metricsForm.hipsCm ?? ''}
            onChange={(e) =>
              setMetricsForm((f) => ({
                ...f,
                hipsCm: e.target.value ? parseFloat(e.target.value) : undefined,
              }))
            }
          />
          <Input
            label="Biceps (cm)"
            type="number"
            step="0.1"
            min="0"
            value={metricsForm.bicepsCm ?? ''}
            onChange={(e) =>
              setMetricsForm((f) => ({
                ...f,
                bicepsCm: e.target.value ? parseFloat(e.target.value) : undefined,
              }))
            }
          />
          <Input
            label="Thighs (cm)"
            type="number"
            step="0.1"
            min="0"
            value={metricsForm.thighsCm ?? ''}
            onChange={(e) =>
              setMetricsForm((f) => ({
                ...f,
                thighsCm: e.target.value ? parseFloat(e.target.value) : undefined,
              }))
            }
          />
          <Input
            label="Neck (cm)"
            type="number"
            step="0.1"
            min="0"
            value={metricsForm.neckCm ?? ''}
            onChange={(e) =>
              setMetricsForm((f) => ({
                ...f,
                neckCm: e.target.value ? parseFloat(e.target.value) : undefined,
              }))
            }
          />
          <Input
            label="Shoulders (cm)"
            type="number"
            step="0.1"
            min="0"
            value={metricsForm.shouldersCm ?? ''}
            onChange={(e) =>
              setMetricsForm((f) => ({
                ...f,
                shouldersCm: e.target.value ? parseFloat(e.target.value) : undefined,
              }))
            }
          />
          <Input
            label="Forearms (cm)"
            type="number"
            step="0.1"
            min="0"
            value={metricsForm.forearmsCm ?? ''}
            onChange={(e) =>
              setMetricsForm((f) => ({
                ...f,
                forearmsCm: e.target.value ? parseFloat(e.target.value) : undefined,
              }))
            }
          />
          <Input
            label="Calves (cm)"
            type="number"
            step="0.1"
            min="0"
            value={metricsForm.calvesCm ?? ''}
            onChange={(e) =>
              setMetricsForm((f) => ({
                ...f,
                calvesCm: e.target.value ? parseFloat(e.target.value) : undefined,
              }))
            }
          />
          <div className="sm:col-span-2">
            <Input
              label="Notes"
              value={metricsForm.notes ?? ''}
              onChange={(e) =>
                setMetricsForm((f) => ({ ...f, notes: e.target.value || undefined }))
              }
            />
          </div>
              {metricsError && (
                <p className="sm:col-span-2 rounded-lg border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-sm text-rose-200">
                  {metricsError}
                </p>
              )}
          <div className="flex justify-end gap-2 sm:col-span-2">
            <Button type="button" variant="secondary" onClick={() => setAddMetricsOpen(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              isLoading={addMetricsMutation.isPending || updateMetricsMutation.isPending}
            >
              {editingMetricsId != null ? 'Update' : 'Save'}
            </Button>
          </div>
        </form>
      </Modal>

      <Modal
        open={assignWorkoutOpen}
        onClose={() => setAssignWorkoutOpen(false)}
        title="Assign workout plan"
      >
        <form onSubmit={handleSubmitAssignWorkout} className="space-y-4">
          {assignWorkoutError && (
            <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-sm text-rose-200">
              {assignWorkoutError}
            </div>
          )}
          <div>
            <label className={labelClass}>Workout plan</label>
            <select
              value={scheduleForm.workoutPlanId}
              onChange={(e) =>
                setScheduleForm((f) => ({ ...f, workoutPlanId: Number(e.target.value) }))
              }
              className={selectClass}
            >
              <option value={0} className="bg-slate-900">
                Select plan
              </option>
              {workoutPlans.map((plan) => (
                <option key={plan.id} value={plan.id} className="bg-slate-900">
                  {plan.name} ({plan.workoutType})
                </option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className={labelClass}>Schedule type</label>
              <select
                value={scheduleForm.scheduleType}
                onChange={(e) =>
                  setScheduleForm((f) => ({
                    ...f,
                    scheduleType: e.target.value as ScheduleType,
                  }))
                }
                className={selectClass}
              >
                <option value="OneMusclePerDay" className="bg-slate-900">One muscle per day</option>
                <option value="TwoMusclesPerDay" className="bg-slate-900">Two muscles per day</option>
                <option value="ThreeMusclesPerDay" className="bg-slate-900">Three muscles per day</option>
                <option value="FullBody" className="bg-slate-900">Full body</option>
                <option value="Custom" className="bg-slate-900">Custom</option>
              </select>
            </div>
            <div>
              <label className={labelClass}>Trainer</label>
              <select
                value={scheduleForm.trainerId ?? ''}
                onChange={(e) =>
                  setScheduleForm((f) => ({
                    ...f,
                    trainerId: e.target.value ? Number(e.target.value) : undefined,
                  }))
                }
                className={selectClass}
              >
                <option value="" className="bg-slate-900">Unassigned</option>
                {trainers.map((trainer) => (
                  <option key={trainer.id} value={trainer.id} className="bg-slate-900">
                    {trainer.firstName} {trainer.lastName}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClass}>Day of week</label>
              <select
                value={scheduleForm.dayOfWeek}
                onChange={(e) =>
                  setScheduleForm((f) => ({ ...f, dayOfWeek: Number(e.target.value) }))
                }
                className={selectClass}
              >
                <option value={1} className="bg-slate-900">Monday</option>
                <option value={2} className="bg-slate-900">Tuesday</option>
                <option value={3} className="bg-slate-900">Wednesday</option>
                <option value={4} className="bg-slate-900">Thursday</option>
                <option value={5} className="bg-slate-900">Friday</option>
                <option value={6} className="bg-slate-900">Saturday</option>
                <option value={0} className="bg-slate-900">Sunday</option>
              </select>
            </div>
            <Input
              label="Start time"
              type="time"
              step="1"
              value={scheduleForm.startTime.slice(0, 8)}
              onChange={(e) =>
                setScheduleForm((f) => ({ ...f, startTime: `${e.target.value}:00`.slice(0, 8) }))
              }
            />
            <Input
              label="End time"
              type="time"
              step="1"
              value={scheduleForm.endTime.slice(0, 8)}
              onChange={(e) =>
                setScheduleForm((f) => ({ ...f, endTime: `${e.target.value}:00`.slice(0, 8) }))
              }
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setAssignWorkoutOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" isLoading={createScheduleMutation.isPending}>
              Assign plan
            </Button>
          </div>
        </form>
      </Modal>
    </DashboardLayout>
  )
}

/* -------------------------------- HERO --------------------------------- */

interface HeroStats {
  age: number | null
  bmi: number | null
  latestWeight: number | null
  latestHeight: number | null
  streak: number
  visitsThisMonth: number
  totalVisits: number
}

function ProfileHero({
  user,
  displayName,
  initials,
  viewMode,
  heroStats,
  onEditProfile,
  onSwitchToEdit,
}: {
  user: User
  displayName: string
  initials: string
  viewMode: boolean
  heroStats: HeroStats
  onEditProfile: () => void
  onSwitchToEdit: () => void
}) {
  const [imgError, setImgError] = useState(false)
  const showImage = user.profilePictureUrl && !imgError
  const bmi = heroStats.bmi != null ? heroStats.bmi : null
  const bmiCat = bmi != null ? getBmiCategory(bmi) : null

  return (
    <section className="relative overflow-hidden rounded-3xl border border-white/10 bg-[rgba(15,12,30,0.7)]">
      {/* Background blobs */}
      <div
        aria-hidden
        className="pointer-events-none absolute -right-20 -top-20 size-72 rounded-full bg-gradient-to-br from-blue-500/30 via-violet-500/20 to-purple-500/20 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -left-10 -bottom-20 size-72 rounded-full bg-gradient-to-tr from-fuchsia-500/20 via-purple-500/15 to-transparent blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-blue-400/60 to-transparent"
      />

      <div className="relative flex flex-col gap-8 p-6 sm:p-8 lg:flex-row lg:items-start">
        {/* Avatar */}
        <div className="flex shrink-0 justify-center">
          <div className="relative">
            <div
              aria-hidden
              className="absolute -inset-2 rounded-full bg-gradient-to-br from-blue-500 via-violet-500 to-fuchsia-500 opacity-60 blur-lg"
            />
            <div className="relative size-32 overflow-hidden rounded-full border-[3px] border-white/20 bg-[linear-gradient(135deg,#1e1b4b,#4c1d95)] ring-4 ring-white/5 sm:size-36">
              {showImage ? (
                <img
                  src={user.profilePictureUrl!}
                  alt={displayName}
                  className="h-full w-full object-cover"
                  onError={() => setImgError(true)}
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-blue-500 via-violet-500 to-fuchsia-500 text-4xl font-black text-white">
                  {initials || '?'}
                </div>
              )}
            </div>
            {/* Active indicator */}
            <div
              className={`absolute bottom-2 right-2 flex size-6 items-center justify-center rounded-full ring-4 ring-[rgba(15,12,30,0.95)] ${
                user.isActive ? 'bg-emerald-400' : 'bg-slate-500'
              }`}
            >
              {user.isActive && (
                <span className="absolute inset-0 animate-ping rounded-full bg-emerald-400 opacity-60" />
              )}
            </div>
          </div>
        </div>

        {/* Info + stats */}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-blue-400/30 bg-blue-400/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-widest text-blue-200">
                  {viewMode ? 'View mode' : 'Member profile'}
                </span>
                {user.isActive ? (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 px-3 py-1 text-[11px] font-semibold text-emerald-200 ring-1 ring-emerald-400/30">
                    <span className="size-1.5 animate-pulse rounded-full bg-emerald-400" />
                    Active
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-500/15 px-3 py-1 text-[11px] font-semibold text-slate-300 ring-1 ring-slate-400/20">
                    <span className="size-1.5 rounded-full bg-slate-400" />
                    Inactive
                  </span>
                )}
                {user.userTypes?.map((t) => (
                  <span
                    key={t.id}
                    className="inline-flex items-center rounded-full bg-gradient-to-br from-violet-500/20 to-fuchsia-500/20 px-2.5 py-1 text-[11px] font-semibold text-violet-200 ring-1 ring-violet-400/30"
                  >
                    {t.name}
                  </span>
                ))}
              </div>
              <h1 className="mt-3 text-3xl font-bold tracking-tight text-white sm:text-4xl">
                {displayName.split(' ')[0]}{' '}
                <span className="bg-[linear-gradient(135deg,#60a5fa,#c084fc,#f472b6)] bg-clip-text text-transparent">
                  {displayName.split(' ').slice(1).join(' ') || ''}
                </span>
              </h1>
              <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-slate-400">
                <span className="inline-flex items-center gap-1.5">
                  <svg className="size-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  {user.email}
                </span>
                {user.phone && (
                  <span className="inline-flex items-center gap-1.5">
                    <svg className="size-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.95.68l1.5 4.5a1 1 0 01-.5 1.21l-2.26 1.13a11 11 0 005.52 5.52l1.13-2.26a1 1 0 011.21-.5l4.5 1.5a1 1 0 01.68.95V19a2 2 0 01-2 2h-1C9.72 21 3 14.28 3 6V5z" />
                    </svg>
                    {user.phone}
                  </span>
                )}
                <span className="inline-flex items-center gap-1.5 text-slate-500">
                  <span className="text-[10px] uppercase tracking-widest">ID</span>
                  <span className="font-mono text-slate-300">#{user.id}</span>
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {viewMode ? (
                <button
                  type="button"
                  onClick={onSwitchToEdit}
                  className="inline-flex items-center gap-2 rounded-xl bg-[linear-gradient(135deg,#3b82f6_0%,#8b5cf6_50%,#a855f7_100%)] px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-blue-500/25 transition hover:brightness-110"
                >
                  <svg className="size-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  Switch to edit
                </button>
              ) : (
                <button
                  type="button"
                  onClick={onEditProfile}
                  className="inline-flex items-center gap-2 rounded-xl bg-[linear-gradient(135deg,#3b82f6_0%,#8b5cf6_50%,#a855f7_100%)] px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-blue-500/25 transition hover:brightness-110"
                >
                  <svg className="size-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  Edit profile
                </button>
              )}
            </div>
          </div>

          {/* Quick stats strip */}
          <DashboardMetricsGrid cols={6} className="mt-6">
            <HeroVital
              label="Age"
              value={heroStats.age != null ? String(heroStats.age) : '—'}
              sublabel={user.gender || 'yrs'}
              gradient="from-sky-400 to-blue-500"
            />
            <HeroVital
              label="Weight"
              value={heroStats.latestWeight != null ? `${heroStats.latestWeight}` : '—'}
              sublabel="kg"
              gradient="from-rose-400 to-pink-500"
            />
            <HeroVital
              label="Height"
              value={heroStats.latestHeight != null ? `${heroStats.latestHeight}` : '—'}
              sublabel="cm"
              gradient="from-indigo-400 to-violet-500"
            />
            <HeroVital
              label="BMI"
              value={bmi != null ? bmi.toFixed(1) : '—'}
              sublabel={bmiCat?.label ?? 'not set'}
              gradient={bmiCat ? bmiCat.gradient : 'from-slate-400 to-slate-600'}
            />
            <HeroVital
              label="Streak"
              value={`${heroStats.streak}`}
              sublabel={heroStats.streak === 1 ? 'day' : 'days'}
              gradient="from-amber-400 to-orange-500"
            />
            <HeroVital
              label="Visits"
              value={`${heroStats.totalVisits}`}
              sublabel={`${heroStats.visitsThisMonth} this month`}
              gradient="from-emerald-400 to-teal-500"
            />
          </DashboardMetricsGrid>
        </div>
      </div>
    </section>
  )
}

function HeroVital({
  label,
  value,
  sublabel,
  gradient,
}: {
  label: string
  value: string
  sublabel: string
  gradient: string
}) {
  return (
    <div className="group relative h-full min-w-0 overflow-hidden rounded-2xl border border-white/10 bg-white/[0.04] p-3 backdrop-blur transition sm:hover:border-white/20">
      <div
        aria-hidden
        className={`pointer-events-none absolute -right-4 -top-4 size-14 rounded-full bg-gradient-to-br ${gradient} opacity-20 blur-xl transition-opacity group-hover:opacity-30`}
      />
      <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">{label}</p>
      <p className="mt-1 text-xl font-bold text-white sm:text-2xl">{value}</p>
      <p className="mt-0.5 truncate text-[11px] text-slate-500">{sublabel}</p>
    </div>
  )
}

/* ------------------------------ Details Tab ---------------------------- */

function DetailsTab({
  user,
  details,
  metricsList,
  userSchedules,
  userDietAssignments,
  workoutPlans,
  trainers,
  detailsLoading,
  dietLoading,
  viewMode,
  onEditProfile,
  onAddDetail,
  onAssignWorkout,
  onOpenWorkoutAssignmentsHub,
  onDeleteSchedule,
  onAssignDiet,
  onChangeDiet,
  onRemoveDiet,
  dietActionPending,
}: {
  user: User
  details: UserDetailDto[]
  metricsList: BodyMetricsDto[]
  userSchedules: UserScheduleDto[]
  userDietAssignments: UserDietPlanDto[]
  workoutPlans: WorkoutPlan[]
  trainers: Trainer[]
  detailsLoading: boolean
  dietLoading: boolean
  viewMode: boolean
  onEditProfile: () => void
  onAddDetail: () => void
  onAssignWorkout: () => void
  onOpenWorkoutAssignmentsHub?: () => void
  onDeleteSchedule: (schedule: UserScheduleDto) => void
  onAssignDiet: () => void
  onChangeDiet: () => void
  onRemoveDiet: (assignment: UserDietPlanDto) => void
  dietActionPending: boolean
}) {
  const activeWorkoutSchedules = userSchedules.filter((s) => s.isActive)
  const activeWorkoutPlanIds = new Set(activeWorkoutSchedules.map((s) => s.workoutPlanId))
  const hasWorkoutAssignment = activeWorkoutSchedules.length > 0

  const { data: healthSummary, isLoading: healthSummaryLoading } = useQuery({
    queryKey: ['health-profile-summary', user.id],
    queryFn: async () => {
      const { data } = await healthProfileService.getSummaryByUserId(user.id)
      return data
    },
  })

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <TrainerHealthAlertPanel summary={healthSummary} loading={healthSummaryLoading} />
        <Link
          to={`/dashboard/users/${user.id}/health-profile`}
          className="glass-card shrink-0 rounded-2xl border border-[rgba(245,196,0,0.25)] px-5 py-4 text-center transition hover:border-[#F5C400]/50 tiger-glow-soft lg:min-w-[200px]"
        >
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#F5C400]/80">
            Health Profile
          </p>
          <p className="mt-1 text-sm font-semibold text-white">
            {healthSummary?.isCompleted ? 'View / update' : 'Complete screening →'}
          </p>
        </Link>
      </div>
      <MemberSupplementsPanel
        userId={user.id}
        memberName={`${user.firstName} ${user.lastName}`.trim()}
        canManage={!viewMode}
        compact={viewMode}
      />
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <InfoCard
          title="Personal"
          icon={
            <svg className="size-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          }
          accent="from-blue-400 to-violet-500"
          action={
            !viewMode
              ? { label: 'Edit', onClick: onEditProfile }
              : undefined
          }
        >
          <InfoRow label="Full name" value={`${user.firstName} ${user.lastName}`.trim() || '—'} />
          <InfoRow label="Email" value={user.email} />
          <InfoRow label="Gender" value={user.gender || '—'} />
          <InfoRow label="Date of birth" value={formatDate(user.dateOfBirth)} />
          <InfoRow
            label="Registered"
            value={user.registrationDate ? formatDate(user.registrationDate) : '—'}
          />
        </InfoCard>

        <InfoCard
          title="Contact"
          icon={
            <svg className="size-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.95.68l1.5 4.5a1 1 0 01-.5 1.21l-2.26 1.13a11 11 0 005.52 5.52l1.13-2.26a1 1 0 011.21-.5l4.5 1.5a1 1 0 01.68.95V19a2 2 0 01-2 2h-1C9.72 21 3 14.28 3 6V5z" />
            </svg>
          }
          accent="from-rose-400 to-pink-500"
        >
          <InfoRow label="Phone" value={user.phone ?? '—'} />
          <InfoRow label="Address" value={user.address ?? '—'} />
          <InfoRow label="Emergency name" value={user.emergencyContact ?? '—'} />
          <InfoRow label="Emergency phone" value={user.emergencyPhone ?? '—'} />
        </InfoCard>

        <InfoCard
          title="Preferences"
          icon={
            <svg className="size-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
          accent="from-amber-400 to-orange-500"
        >
          <InfoRow label="Preferred time" value={user.preferredGymTime ?? '—'} />
          <InfoRow
            label="Personal coach"
            value={
              user.assignedTrainerName
                ? user.assignedTrainerName
                : user.assignedTrainerId
                  ? `Trainer #${user.assignedTrainerId}`
                  : '—'
            }
          />
          <InfoRow
            label="Status"
            value={
              <span
                className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-semibold ${
                  user.isActive
                    ? 'bg-emerald-500/15 text-emerald-200 ring-1 ring-emerald-400/30'
                    : 'bg-slate-500/15 text-slate-300 ring-1 ring-slate-400/20'
                }`}
              >
                <span
                  className={`size-1.5 rounded-full ${user.isActive ? 'bg-emerald-400' : 'bg-slate-400'}`}
                />
                {user.isActive ? 'Active' : 'Inactive'}
              </span>
            }
          />
          <InfoRow
            label="User types"
            value={
              user.userTypes && user.userTypes.length > 0 ? (
                <span className="flex flex-wrap gap-1">
                  {user.userTypes.map((t) => (
                    <span
                      key={t.id}
                      className="rounded-full bg-violet-500/15 px-2 py-0.5 text-[10px] font-semibold text-violet-200 ring-1 ring-violet-400/30"
                    >
                      {t.name}
                    </span>
                  ))}
                </span>
              ) : (
                '—'
              )
            }
          />
          <InfoRow label="Username" value={user.username ?? '—'} />
        </InfoCard>
      </div>

      {/* Measurement history */}
      <section className="overflow-hidden rounded-2xl border border-white/10 bg-[rgba(17,17,39,0.55)]">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/5 px-6 py-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-400">
              Measurement history
            </p>
            <h2 className="text-base font-semibold text-white">BMI, BMR &amp; goal checkpoints</h2>
          </div>
          {!viewMode && (
            <Button size="sm" onClick={onAddDetail}>
              + Add checkpoint
            </Button>
          )}
        </div>
        <div className="px-6 py-5">
          {detailsLoading ? (
            <p className="text-slate-400">Loading…</p>
          ) : details.length === 0 && metricsList.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.02] p-8 text-center">
              <p className="text-sm text-slate-400">
                No measurement details yet. Add a checkpoint to start tracking.
              </p>
            </div>
          ) : details.length > 0 ? (
            <div className="space-y-3">
              {details.map((d, idx) => (
                <DetailCheckpointCard key={d.id} detail={d} index={idx} total={details.length} />
              ))}
            </div>
          ) : (
            <div className="space-y-3">
              {metricsList.map((m, idx) => (
                <MetricsCheckpointCard key={m.id} metric={m} index={idx} total={metricsList.length} />
              ))}
            </div>
          )}
        </div>
      </section>

      <DietAssignmentsSection
        assignments={userDietAssignments}
        dietLoading={dietLoading}
        viewMode={viewMode}
        dietActionPending={dietActionPending}
        onAssignDiet={onAssignDiet}
        onChangeDiet={onChangeDiet}
        onRemoveDiet={onRemoveDiet}
      />

      <section className="overflow-hidden rounded-2xl border border-white/10 bg-[rgba(17,17,39,0.55)]">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/5 px-6 py-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-400">
              Workout assignments
            </p>
            <h2 className="text-base font-semibold text-white">Assigned plans & weekly schedule</h2>
            <p className="mt-0.5 text-xs text-slate-500">
              One active workout plan per member (multiple days for the same plan are OK).
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-white/5 px-2.5 py-1 text-[11px] text-slate-400 ring-1 ring-white/10">
              {activeWorkoutPlanIds.size > 0
                ? `${activeWorkoutPlanIds.size} plan · ${activeWorkoutSchedules.length} slot${activeWorkoutSchedules.length !== 1 ? 's' : ''}`
                : 'No active plan'}
            </span>
            {!viewMode && onOpenWorkoutAssignmentsHub && (
              <Button variant="secondary" size="sm" onClick={onOpenWorkoutAssignmentsHub}>
                Bulk assign
              </Button>
            )}
            {!viewMode && (
              <Button size="sm" onClick={onAssignWorkout}>
                {hasWorkoutAssignment ? 'Change workout plan' : '+ Assign workout plan'}
              </Button>
            )}
          </div>
        </div>
        <div className="px-6 py-5">
          {userSchedules.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.02] p-8 text-center">
              <p className="text-sm text-slate-400">
                No workout plans assigned yet. Assign one to start a structured member routine.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {userSchedules.map((schedule) => (
                <div
                  key={schedule.id}
                  className="rounded-xl border border-white/10 bg-white/[0.03] p-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-semibold text-white">{schedule.workoutPlanName}</p>
                        <span className="rounded-full bg-blue-500/15 px-2 py-0.5 text-[10px] font-semibold text-blue-200 ring-1 ring-blue-400/30">
                          {schedule.scheduleType}
                        </span>
                        {schedule.isActive && (
                          <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-semibold text-emerald-200 ring-1 ring-emerald-400/30">
                            Active
                          </span>
                        )}
                      </div>
                      <div className="mt-2 grid grid-cols-1 gap-2 text-xs text-slate-400 sm:grid-cols-3">
                        <span>
                          Day:{' '}
                          <strong className="text-slate-200">
                            {['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][schedule.dayOfWeek] ?? schedule.dayOfWeek}
                          </strong>
                        </span>
                        <span>
                          Time:{' '}
                          <strong className="text-slate-200">
                            {schedule.startTime.slice(0, 5)} - {schedule.endTime.slice(0, 5)}
                          </strong>
                        </span>
                        <span>
                          Trainer:{' '}
                          <strong className="text-slate-200">{schedule.trainerName || 'Unassigned'}</strong>
                        </span>
                      </div>
                    </div>
                    {!viewMode && (
                      <Button
                        variant="soft"
                        size="sm"
                        className="!bg-rose-500/10 !text-rose-300 hover:!bg-rose-500/20"
                        onClick={() => onDeleteSchedule(schedule)}
                      >
                        Remove
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
          <div className="mt-4 grid grid-cols-1 gap-3 lg:grid-cols-3">
            <QuickStatCard
              label="Available workout plans"
              value={workoutPlans.length.toString()}
              sublabel="Templates ready to assign"
            />
            <QuickStatCard
              label="Trainers available"
              value={trainers.filter((trainer) => trainer.isActive).length.toString()}
              sublabel="Active coaches"
            />
            <QuickStatCard
              label="Current assigned plans"
              value={userSchedules.filter((schedule) => schedule.isActive).length.toString()}
              sublabel="Live schedule entries"
            />
          </div>
        </div>
      </section>
    </div>
  )
}

function QuickStatCard({
  label,
  value,
  sublabel,
}: {
  label: string
  value: string
  sublabel: string
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
      <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">{label}</p>
      <p className="mt-1 text-2xl font-bold text-white">{value}</p>
      <p className="mt-0.5 text-[11px] text-slate-500">{sublabel}</p>
    </div>
  )
}

function InfoCard({
  title,
  icon,
  accent,
  children,
  action,
}: {
  title: string
  icon: ReactNode
  accent: string
  children: ReactNode
  action?: { label: string; onClick: () => void }
}) {
  return (
    <div className="group relative overflow-hidden rounded-2xl border border-white/10 bg-[rgba(17,17,39,0.55)] p-5 transition hover:border-white/20">
      <div
        aria-hidden
        className={`pointer-events-none absolute -right-10 -top-10 size-32 rounded-full bg-gradient-to-br ${accent} opacity-15 blur-3xl transition-opacity group-hover:opacity-25`}
      />
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div
            className={`flex size-9 items-center justify-center rounded-xl bg-gradient-to-br ${accent} text-white shadow-lg`}
          >
            {icon}
          </div>
          <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-300">{title}</h3>
        </div>
        {action && (
          <button
            type="button"
            onClick={action.onClick}
            className="rounded-lg border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] font-semibold text-slate-300 transition hover:border-white/25 hover:bg-white/10 hover:text-white"
          >
            {action.label}
          </button>
        )}
      </div>
      <dl className="space-y-2.5">{children}</dl>
    </div>
  )
}

function InfoRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-white/5 pb-2 last:border-0 last:pb-0">
      <dt className="shrink-0 text-xs text-slate-500">{label}</dt>
      <dd className="text-right text-sm text-slate-100">{value}</dd>
    </div>
  )
}

function DetailCheckpointCard({
  detail,
  index,
  total,
}: {
  detail: UserDetailDto
  index: number
  total: number
}) {
  const isLatest = index === 0
  const bmiCat = getBmiCategory(detail.bmi)
  return (
    <div className="group relative flex items-stretch gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-4 transition hover:border-white/20 hover:bg-white/[0.05]">
      {/* Timeline connector */}
      <div className="flex w-8 flex-col items-center">
        <div
          className={`flex size-8 items-center justify-center rounded-full text-white shadow-lg ${
            isLatest
              ? 'bg-gradient-to-br from-emerald-400 to-teal-500 ring-2 ring-emerald-400/40'
              : 'bg-gradient-to-br from-slate-600 to-slate-700'
          }`}
          aria-hidden
        >
          <span className="text-[11px] font-black">{total - index}</span>
        </div>
        {index !== total - 1 && <div className="mt-1 flex-1 w-px bg-white/10" />}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-white">{formatDate(detail.measurementDate)}</span>
            {isLatest && (
              <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-semibold text-emerald-200 ring-1 ring-emerald-400/30">
                Latest
              </span>
            )}
            {detail.goalType && (
              <span className="rounded-full bg-violet-500/15 px-2 py-0.5 text-[10px] font-semibold text-violet-200 ring-1 ring-violet-400/30">
                {detail.goalType}
              </span>
            )}
          </div>
          <span
            className={`rounded-full bg-gradient-to-br ${bmiCat.gradient} px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white shadow-md`}
          >
            {bmiCat.label}
          </span>
        </div>
        <DashboardMetricsGrid cols={6} className="mt-3">
          <MiniStat label="Height" value={`${detail.height}`} unit="cm" />
          <MiniStat label="Weight" value={`${detail.weight}`} unit="kg" />
          <MiniStat label="BMI" value={detail.bmi.toFixed(1)} />
          <MiniStat label="BMR" value={detail.bmr.toFixed(0)} unit="kcal" />
          <MiniStat label="Body fat" value={detail.bodyFatPercentage != null ? `${detail.bodyFatPercentage}` : '—'} unit="%" />
          <MiniStat label="Muscle" value={detail.muscleMass != null ? `${detail.muscleMass}` : '—'} unit="kg" />
        </DashboardMetricsGrid>
        {detail.notes && (
          <p className="mt-3 rounded-lg border border-white/5 bg-white/[0.02] px-3 py-2 text-xs text-slate-300">
            <span className="mr-1 font-semibold text-slate-400">Notes:</span>
            {detail.notes}
          </p>
        )}
      </div>
    </div>
  )
}

function MetricsCheckpointCard({
  metric,
  index,
  total,
}: {
  metric: BodyMetricsDto
  index: number
  total: number
}) {
  const isLatest = index === 0
  const bmi = calculateBmi(metric.weightKg, metric.heightCm)
  const bmiCat = bmi != null ? getBmiCategory(bmi) : null
  return (
    <div className="group relative flex items-stretch gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-4 transition hover:border-white/20 hover:bg-white/[0.05]">
      <div className="flex w-8 flex-col items-center">
        <div
          className={`flex size-8 items-center justify-center rounded-full text-white shadow-lg ${
            isLatest
              ? 'bg-gradient-to-br from-emerald-400 to-teal-500 ring-2 ring-emerald-400/40'
              : 'bg-gradient-to-br from-slate-600 to-slate-700'
          }`}
          aria-hidden
        >
          <span className="text-[11px] font-black">{total - index}</span>
        </div>
        {index !== total - 1 && <div className="mt-1 flex-1 w-px bg-white/10" />}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-white">{formatDate(metric.measurementDate)}</span>
            {isLatest && (
              <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-semibold text-emerald-200 ring-1 ring-emerald-400/30">
                Latest
              </span>
            )}
            <span className="rounded-full bg-blue-500/15 px-2 py-0.5 text-[10px] font-semibold text-blue-200 ring-1 ring-blue-400/30">
              Body metrics
            </span>
          </div>
          <span
            className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white shadow-md ${
              bmiCat ? `bg-gradient-to-br ${bmiCat.gradient}` : 'bg-slate-600'
            }`}
          >
            {bmiCat?.label ?? 'BMI N/A'}
          </span>
        </div>
        <DashboardMetricsGrid cols={6} className="mt-3">
          <MiniStat label="Height" value={metric.heightCm != null ? `${metric.heightCm}` : '—'} unit="cm" />
          <MiniStat label="Weight" value={`${metric.weightKg}`} unit="kg" />
          <MiniStat label="BMI" value={bmi != null ? bmi.toFixed(1) : '—'} />
          <MiniStat label="BMR" value="—" unit="kcal" />
          <MiniStat label="Body fat" value={metric.bodyFatPct != null ? `${metric.bodyFatPct}` : '—'} unit="%" />
          <MiniStat label="Muscle" value={metric.muscleMassKg != null ? `${metric.muscleMassKg}` : '—'} unit="kg" />
        </DashboardMetricsGrid>
        {metric.notes && (
          <p className="mt-3 rounded-lg border border-white/5 bg-white/[0.02] px-3 py-2 text-xs text-slate-300">
            <span className="mr-1 font-semibold text-slate-400">Notes:</span>
            {metric.notes}
          </p>
        )}
      </div>
    </div>
  )
}

function MiniStat({ label, value, unit }: { label: string; value: string; unit?: string }) {
  return (
    <div className="rounded-lg border border-white/5 bg-white/[0.02] px-2.5 py-1.5">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">{label}</p>
      <p className="mt-0.5 flex items-baseline gap-1">
        <span className="text-sm font-bold text-white">{value}</span>
        {unit && <span className="text-[10px] text-slate-400">{unit}</span>}
      </p>
    </div>
  )
}

/* ---------------------------- Body Metrics Tab -------------------------- */

function BodyMetricsTab({
  currentMetrics,
  metricsList,
  onAddMetrics,
  onEditMetrics,
  onDeleteMetrics,
}: {
  currentMetrics: BodyMetricsDto | null | undefined
  metricsList: BodyMetricsDto[]
  onAddMetrics: () => void
  onEditMetrics: (metric: BodyMetricsDto) => void
  onDeleteMetrics: (metric: BodyMetricsDto) => void
}) {
  const prev = metricsList.length > 1 ? metricsList[1] : null
  const currentBmi = calculateBmi(currentMetrics?.weightKg, currentMetrics?.heightCm)

  const weightDelta =
    currentMetrics && prev ? currentMetrics.weightKg - prev.weightKg : null
  const fatDelta =
    currentMetrics?.bodyFatPct != null && prev?.bodyFatPct != null
      ? currentMetrics.bodyFatPct - prev.bodyFatPct
      : null
  const muscleDelta =
    currentMetrics?.muscleMassKg != null && prev?.muscleMassKg != null
      ? currentMetrics.muscleMassKg - prev.muscleMassKg
      : null

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-2xl border border-white/10 bg-[rgba(17,17,39,0.55)]">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/5 px-6 py-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-400">Snapshot</p>
            <h2 className="text-base font-semibold text-white">
              Current body metrics
              {currentMetrics?.measurementDate && (
                <span className="ml-2 text-xs font-normal text-slate-500">
                  as of {formatDate(currentMetrics.measurementDate)}
                </span>
              )}
            </h2>
          </div>
          <Button size="sm" onClick={onAddMetrics}>
            + Log metrics
          </Button>
        </div>
        <div className="p-6">
          {!currentMetrics ? (
            <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.02] p-8 text-center">
              <p className="text-sm text-slate-400">
                No measurements yet. Log a measurement to unlock this view.
              </p>
            </div>
          ) : (
            <>
              {prev && (
                <div className="mb-5 rounded-xl border border-white/10 bg-white/[0.03] p-4">
                  <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-400">
                    Comparison with previous reading
                  </p>
                  <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-3">
                    <CompareItem
                      label="Weight change"
                      current={currentMetrics.weightKg}
                      previous={prev.weightKg}
                      unit="kg"
                      goodDirection="down"
                    />
                    <CompareItem
                      label="Body fat change"
                      current={currentMetrics.bodyFatPct}
                      previous={prev.bodyFatPct}
                      unit="%"
                      goodDirection="down"
                    />
                    <CompareItem
                      label="Muscle change"
                      current={currentMetrics.muscleMassKg}
                      previous={prev.muscleMassKg}
                      unit="kg"
                      goodDirection="up"
                    />
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <BigMetric
                  label="Weight"
                  value={currentMetrics.weightKg.toString()}
                  unit="kg"
                  gradient="from-rose-400 to-pink-500"
                  delta={weightDelta}
                  deltaUnit="kg"
                />
                <BigMetric
                  label="Body fat"
                  value={currentMetrics.bodyFatPct != null ? currentMetrics.bodyFatPct.toString() : '—'}
                  unit="%"
                  gradient="from-amber-400 to-orange-500"
                  delta={fatDelta}
                  deltaUnit="%"
                  deltaGood="down"
                />
                <BigMetric
                  label="Muscle mass"
                  value={
                    currentMetrics.muscleMassKg != null ? currentMetrics.muscleMassKg.toString() : '—'
                  }
                  unit="kg"
                  gradient="from-emerald-400 to-teal-500"
                  delta={muscleDelta}
                  deltaUnit="kg"
                  deltaGood="up"
                />
              </div>
              <div className="mt-4">
                <BigMetric
                  label="BMI"
                  value={currentBmi != null ? currentBmi.toFixed(1) : '—'}
                  unit=""
                  gradient="from-blue-400 to-violet-500"
                  delta={null}
                  deltaUnit=""
                />
              </div>

              <div className="mt-6">
                <p className="mb-2 text-[11px] font-semibold uppercase tracking-widest text-slate-400">
                  Body measurements
                </p>
                <DashboardMetricsGrid cols={6}>
                  <MeasureTile label="Chest" value={currentMetrics.chestCm} unit="cm" />
                  <MeasureTile label="Waist" value={currentMetrics.waistCm} unit="cm" />
                  <MeasureTile label="Hips" value={currentMetrics.hipsCm} unit="cm" />
                  <MeasureTile label="Biceps" value={currentMetrics.bicepsCm} unit="cm" />
                  <MeasureTile label="Thighs" value={currentMetrics.thighsCm} unit="cm" />
                  <MeasureTile label="Neck" value={currentMetrics.neckCm} unit="cm" />
                  <MeasureTile label="Shoulders" value={currentMetrics.shouldersCm} unit="cm" />
                  <MeasureTile label="Forearms" value={currentMetrics.forearmsCm} unit="cm" />
                  <MeasureTile label="Calves" value={currentMetrics.calvesCm} unit="cm" />
                  <MeasureTile label="Height" value={currentMetrics.heightCm} unit="cm" />
                </DashboardMetricsGrid>
              </div>

              {currentMetrics.notes && (
                <p className="mt-4 rounded-xl border border-white/5 bg-white/[0.02] px-4 py-3 text-sm text-slate-300">
                  <span className="mr-1 font-semibold text-slate-400">Notes:</span>
                  {currentMetrics.notes}
                </p>
              )}
            </>
          )}
        </div>
      </section>

      {metricsList.length > 0 && (
        <section className="overflow-hidden rounded-2xl border border-white/10 bg-[rgba(17,17,39,0.55)]">
          <div className="flex items-center justify-between border-b border-white/5 px-6 py-4">
            <h3 className="text-base font-semibold text-white">History</h3>
            <span className="text-[11px] text-slate-500">{metricsList.length} record{metricsList.length !== 1 ? 's' : ''}</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-white/5 text-xs font-semibold uppercase tracking-wider text-slate-400">
                  <th className="px-6 py-3 font-medium">Date</th>
                  <th className="px-6 py-3 font-medium">Weight</th>
                  <th className="px-6 py-3 font-medium">Body fat</th>
                  <th className="px-6 py-3 font-medium">Muscle</th>
                  <th className="px-6 py-3 font-medium">BMI</th>
                  <th className="px-6 py-3 font-medium">Chest / Waist</th>
                  <th className="px-6 py-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {metricsList.map((m, i) => {
                  const prevM = metricsList[i + 1]
                  const wDelta = prevM ? m.weightKg - prevM.weightKg : null
                  return (
                    <tr key={m.id} className="border-b border-white/5 transition-colors hover:bg-white/[0.03]">
                      <td className="whitespace-nowrap px-6 py-3 text-slate-100">
                        <span className="inline-flex items-center gap-2">
                          <span
                            className={`size-1.5 rounded-full ${
                              i === 0 ? 'bg-emerald-400' : 'bg-slate-500'
                            }`}
                            aria-hidden
                          />
                          {formatDate(m.measurementDate)}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-6 py-3 text-slate-300">
                        <span className="inline-flex items-center gap-1.5">
                          <strong className="text-white">{m.weightKg}</strong>
                          <span className="text-xs text-slate-500">kg</span>
                          {wDelta != null && wDelta !== 0 && (
                            <DeltaChip value={wDelta} unit="kg" />
                          )}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-6 py-3 text-slate-300">
                        {m.bodyFatPct != null ? `${m.bodyFatPct}%` : '—'}
                      </td>
                      <td className="whitespace-nowrap px-6 py-3 text-slate-300">
                        {m.muscleMassKg != null ? `${m.muscleMassKg} kg` : '—'}
                      </td>
                      <td className="whitespace-nowrap px-6 py-3 text-slate-300">
                        {(() => {
                          const bmi = calculateBmi(m.weightKg, m.heightCm)
                          return bmi != null ? bmi.toFixed(1) : '—'
                        })()}
                      </td>
                      <td className="whitespace-nowrap px-6 py-3 text-slate-400">
                        {m.chestCm != null ? `${m.chestCm}` : '—'} /{' '}
                        {m.waistCm != null ? `${m.waistCm}` : '—'}
                      </td>
                      <td className="whitespace-nowrap px-6 py-3 text-right">
                        <div className="inline-flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => onEditMetrics(m)}
                            className="rounded-lg border border-blue-400/30 bg-blue-500/10 px-2.5 py-1 text-xs font-semibold text-blue-200 transition hover:bg-blue-500/20"
                          >
                            Update
                          </button>
                          <button
                            type="button"
                            onClick={() => onDeleteMetrics(m)}
                            className="rounded-lg border border-rose-400/30 bg-rose-500/10 px-2.5 py-1 text-xs font-semibold text-rose-200 transition hover:bg-rose-500/20"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  )
}

function BigMetric({
  label,
  value,
  unit,
  gradient,
  delta,
  deltaUnit,
  deltaGood = 'up',
}: {
  label: string
  value: string
  unit: string
  gradient: string
  delta: number | null
  deltaUnit: string
  /** direction of change that is "good" (green) */
  deltaGood?: 'up' | 'down'
}) {
  return (
    <div className="group relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] p-5 transition hover:border-white/20">
      <div
        aria-hidden
        className={`pointer-events-none absolute -right-8 -top-8 size-28 rounded-full bg-gradient-to-br ${gradient} opacity-20 blur-2xl transition-opacity group-hover:opacity-30`}
      />
      <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-400">{label}</p>
      <div className="mt-2 flex items-end gap-2">
        <span className="text-4xl font-black tracking-tight text-white">{value}</span>
        <span className="pb-1.5 text-xs text-slate-400">{unit}</span>
      </div>
      {delta != null && delta !== 0 ? (
        <div className="mt-3">
          <DeltaChip value={delta} unit={deltaUnit} good={deltaGood} big />
        </div>
      ) : (
        <p className="mt-3 text-[11px] text-slate-500">No previous entry</p>
      )}
    </div>
  )
}

function DeltaChip({
  value,
  unit,
  good = 'up',
  big = false,
}: {
  value: number
  unit: string
  good?: 'up' | 'down'
  big?: boolean
}) {
  const isUp = value > 0
  const isGood = (good === 'up' && isUp) || (good === 'down' && !isUp)
  const toneClass = isGood
    ? 'bg-emerald-500/15 text-emerald-200 ring-emerald-400/30'
    : 'bg-rose-500/15 text-rose-200 ring-rose-400/30'
  const size = big ? 'px-2.5 py-1 text-xs' : 'px-1.5 py-0.5 text-[10px]'
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full ${size} font-semibold ring-1 ${toneClass}`}
    >
      <svg
        className={`size-3 ${isUp ? '' : 'rotate-180'}`}
        fill="none"
        stroke="currentColor"
        strokeWidth={2.5}
        viewBox="0 0 24 24"
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
      </svg>
      {isUp ? '+' : ''}
      {value.toFixed(1)} {unit}
    </span>
  )
}

function CompareItem({
  label,
  current,
  previous,
  unit,
  goodDirection,
}: {
  label: string
  current: number | null | undefined
  previous: number | null | undefined
  unit: string
  goodDirection: 'up' | 'down'
}) {
  const valid = current != null && previous != null
  const delta = valid ? current - previous : null
  return (
    <div className="rounded-lg border border-white/5 bg-white/[0.02] px-3 py-2">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">{label}</p>
      {valid && delta != null ? (
        <p className="mt-1 text-sm text-slate-200">
          {previous}
          {unit} → <strong className="text-white">{current}{unit}</strong>{' '}
          <DeltaChip value={delta} unit={unit} good={goodDirection} />
        </p>
      ) : (
        <p className="mt-1 text-xs text-slate-500">Not enough data</p>
      )}
    </div>
  )
}

function MeasureTile({ label, value, unit }: { label: string; value: number | null | undefined; unit: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3 transition hover:border-white/20">
      <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">{label}</p>
      <p className="mt-0.5 flex items-baseline gap-1">
        <span className="text-base font-bold text-white">{value != null ? value : '—'}</span>
        {value != null && <span className="text-[10px] text-slate-400">{unit}</span>}
      </p>
    </div>
  )
}

/* --------------------------------- Graph -------------------------------- */

function GraphTab({
  chartData,
  logs,
}: {
  chartData: { date: string; weight: number; bodyFat?: number; muscle?: number }[]
  logs: BodyMetricsLogDto[]
}) {
  const stats = useMemo(() => {
    if (chartData.length === 0)
      return {
        first: null,
        latest: null,
        delta: null,
        min: null,
        max: null,
        bodyFatDelta: null as number | null,
        muscleDelta: null as number | null,
      }
    const first = chartData[0]
    const latest = chartData[chartData.length - 1]
    const delta = latest.weight - first.weight
    const weights = chartData.map((d) => d.weight)
    const min = Math.min(...weights)
    const max = Math.max(...weights)
    const bodyFatDelta =
      first.bodyFat != null && latest.bodyFat != null ? latest.bodyFat - first.bodyFat : null
    const muscleDelta =
      first.muscle != null && latest.muscle != null ? latest.muscle - first.muscle : null
    return { first, latest, delta, min, max, bodyFatDelta, muscleDelta }
  }, [chartData])

  if (logs.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.02] p-12 text-center">
        <div className="mx-auto mb-4 inline-flex size-14 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 via-violet-500 to-fuchsia-500 text-white shadow-xl shadow-violet-500/30">
          <svg className="size-7" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 17l5-5 4 4 7-8m0 0v5m0-5h-5" />
          </svg>
        </div>
        <h3 className="text-lg font-semibold text-white">No progress data yet</h3>
        <p className="mx-auto mt-1.5 max-w-md text-sm text-slate-400">
          Log measurements in the Body Metrics tab and a beautiful progress chart will light up here.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* KPI strip */}
      {stats.first && stats.latest && stats.delta != null && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <GraphKpi label="Starting weight" value={`${stats.first.weight} kg`} sub={stats.first.date} />
          <GraphKpi label="Current weight" value={`${stats.latest.weight} kg`} sub={stats.latest.date} />
          <GraphKpi
            label="Total change"
            value={`${stats.delta > 0 ? '+' : ''}${stats.delta.toFixed(1)} kg`}
            sub={`${logs.length} logs`}
            highlight={stats.delta !== 0 ? (stats.delta < 0 ? 'emerald' : 'rose') : undefined}
          />
          <GraphKpi label="Min / Max" value={`${stats.min} / ${stats.max} kg`} sub="Range" />
        </div>
      )}
      {(stats.bodyFatDelta != null || stats.muscleDelta != null) && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="rounded-2xl border border-white/10 bg-[rgba(17,17,39,0.55)] p-4">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">Body Fat Improvement</p>
            <p className={`mt-1 text-xl font-bold ${stats.bodyFatDelta != null && stats.bodyFatDelta <= 0 ? 'text-emerald-300' : 'text-rose-300'}`}>
              {stats.bodyFatDelta != null ? `${stats.bodyFatDelta > 0 ? '+' : ''}${stats.bodyFatDelta.toFixed(1)}%` : '—'}
            </p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-[rgba(17,17,39,0.55)] p-4">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">Muscle Improvement</p>
            <p className={`mt-1 text-xl font-bold ${stats.muscleDelta != null && stats.muscleDelta >= 0 ? 'text-emerald-300' : 'text-rose-300'}`}>
              {stats.muscleDelta != null ? `${stats.muscleDelta > 0 ? '+' : ''}${stats.muscleDelta.toFixed(1)} kg` : '—'}
            </p>
          </div>
        </div>
      )}

      <section className="overflow-hidden rounded-2xl border border-white/10 bg-[rgba(17,17,39,0.55)]">
        <div className="flex items-center justify-between border-b border-white/5 px-6 py-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-400">Trend</p>
            <h2 className="text-base font-semibold text-white">Progress over time</h2>
          </div>
          <div className="flex items-center gap-3 text-[11px]">
            <span className="inline-flex items-center gap-1.5 text-slate-300">
              <span className="block size-2.5 rounded-full bg-gradient-to-r from-rose-400 to-pink-500" />
              Weight (kg)
            </span>
            <span className="inline-flex items-center gap-1.5 text-slate-300">
              <span className="block size-2.5 rounded-full bg-gradient-to-r from-sky-400 to-indigo-500" />
              Body fat %
            </span>
          </div>
        </div>
        <div className="h-80 p-4">
          <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={200}>
            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="weightFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#f472b6" stopOpacity={0.45} />
                  <stop offset="100%" stopColor="#f472b6" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="fatFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#60a5fa" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="#60a5fa" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.15)" />
              <XAxis
                dataKey="date"
                tick={{ fill: '#94a3b8', fontSize: 11 }}
                stroke="rgba(148,163,184,0.2)"
              />
              <YAxis
                yAxisId="left"
                tick={{ fill: '#94a3b8', fontSize: 11 }}
                stroke="rgba(148,163,184,0.2)"
              />
              <YAxis
                yAxisId="right"
                orientation="right"
                tick={{ fill: '#94a3b8', fontSize: 11 }}
                stroke="rgba(148,163,184,0.2)"
              />
              <Tooltip
                contentStyle={{
                  borderRadius: '12px',
                  border: '1px solid rgba(255,255,255,0.12)',
                  background: 'rgba(15,12,30,0.95)',
                  color: '#e2e8f0',
                  fontSize: '12px',
                }}
                formatter={(value: number | undefined) => [value != null ? value.toFixed(1) : '', '']}
                labelFormatter={(label) => `Date: ${label}`}
              />
              <Area
                yAxisId="left"
                type="monotone"
                dataKey="weight"
                stroke="#f472b6"
                strokeWidth={2.5}
                fill="url(#weightFill)"
                name="Weight (kg)"
                dot={{ r: 3, strokeWidth: 2, stroke: '#f472b6', fill: '#0b0b1a' }}
                activeDot={{ r: 5 }}
              />
              <Area
                yAxisId="right"
                type="monotone"
                dataKey="bodyFat"
                stroke="#60a5fa"
                strokeWidth={2.5}
                fill="url(#fatFill)"
                name="Body fat %"
                dot={{ r: 3, strokeWidth: 2, stroke: '#60a5fa', fill: '#0b0b1a' }}
                activeDot={{ r: 5 }}
              />
              <Area
                yAxisId="left"
                type="monotone"
                dataKey="muscle"
                stroke="#34d399"
                strokeWidth={2}
                fillOpacity={0}
                name="Muscle (kg)"
                dot={{ r: 2.5, strokeWidth: 2, stroke: '#34d399', fill: '#0b0b1a' }}
                activeDot={{ r: 4 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </section>
    </div>
  )
}

function GraphKpi({
  label,
  value,
  sub,
  highlight,
}: {
  label: string
  value: string
  sub: string
  highlight?: 'emerald' | 'rose'
}) {
  const valueClass =
    highlight === 'emerald'
      ? 'text-emerald-300'
      : highlight === 'rose'
        ? 'text-rose-300'
        : 'text-white'
  return (
    <div className="rounded-2xl border border-white/10 bg-[rgba(17,17,39,0.55)] p-4">
      <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">{label}</p>
      <p className={`mt-1 text-xl font-bold ${valueClass}`}>{value}</p>
      <p className="mt-0.5 truncate text-[11px] text-slate-500">{sub}</p>
    </div>
  )
}

/* -------------------------------- Attendance ----------------------------- */

function InActionTab({
  attendanceLogs,
  streak,
  visitsThisMonth,
  totalVisits,
  currentMetrics,
  previousMetrics,
}: {
  attendanceLogs: AttendanceLogDto[]
  streak: number
  visitsThisMonth: number
  totalVisits: number
  currentMetrics: BodyMetricsDto | null | undefined
  previousMetrics: BodyMetricsDto | null
}) {
  const sorted = [...attendanceLogs].sort(
    (a, b) => new Date(b.checkInTime).getTime() - new Date(a.checkInTime).getTime()
  )

  // This week visits
  const oneWeekAgo = Date.now() - 7 * 86400000
  const thisWeek = new Set<string>()
  sorted.forEach((l) => {
    const t = new Date(l.attendanceDate).getTime()
    if (!Number.isNaN(t) && t >= oneWeekAgo) {
      thisWeek.add(new Date(l.attendanceDate).toISOString().slice(0, 10))
    }
  })

  // Avg duration
  const durations = sorted
    .map((l) => l.durationMinutes)
    .filter((d): d is number => typeof d === 'number')
  const avgDuration =
    durations.length > 0 ? Math.round(durations.reduce((s, d) => s + d, 0) / durations.length) : null

  const weightInsight =
    currentMetrics && previousMetrics ? currentMetrics.weightKg - previousMetrics.weightKg : null

  if (sorted.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.02] p-12 text-center">
        <div className="mx-auto mb-4 inline-flex size-14 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-400 via-orange-500 to-rose-500 text-white shadow-xl shadow-orange-500/30">
          <svg className="size-7" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        </div>
        <h3 className="text-lg font-semibold text-white">No gym visits logged</h3>
        <p className="mx-auto mt-1.5 max-w-md text-sm text-slate-400">
          Check-in and check-out activity will appear here.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-white/10 bg-[rgba(17,17,39,0.55)] p-4">
        <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-400">In Action Insight</p>
        <p className="mt-1 text-sm text-slate-200">
          {weightInsight == null
            ? 'Log one more body metric reading to unlock progress insight here.'
            : weightInsight < 0
              ? `Great momentum: weight is down by ${Math.abs(weightInsight).toFixed(1)} kg since the previous reading.`
              : weightInsight > 0
                ? `Weight is up by ${weightInsight.toFixed(1)} kg since previous reading. Consider adjusting training/nutrition plan.`
                : 'Weight is stable since previous reading. Consistency is good.'}
        </p>
      </section>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <AttendanceKpi
          label="Current streak"
          value={`${streak}`}
          sub={streak === 1 ? 'day' : 'days'}
          gradient="from-amber-400 to-orange-500"
          icon={
            <svg className="size-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          }
        />
        <AttendanceKpi
          label="This week"
          value={`${thisWeek.size}`}
          sub="days visited"
          gradient="from-emerald-400 to-teal-500"
          icon={
            <svg className="size-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          }
        />
        <AttendanceKpi
          label="This month"
          value={`${visitsThisMonth}`}
          sub="unique days"
          gradient="from-sky-400 to-indigo-500"
          icon={
            <svg className="size-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 17v-2m3 2v-4m3 4v-6m2 10H5a2 2 0 01-2-2V5a2 2 0 012-2h14a2 2 0 012 2v14a2 2 0 01-2 2z" />
            </svg>
          }
        />
        <AttendanceKpi
          label="Avg session"
          value={avgDuration != null ? `${avgDuration}` : '—'}
          sub={avgDuration != null ? 'minutes' : `${totalVisits} total visits`}
          gradient="from-violet-400 to-fuchsia-500"
          icon={
            <svg className="size-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
        />
      </div>

      <section className="overflow-hidden rounded-2xl border border-white/10 bg-[rgba(17,17,39,0.55)]">
        <div className="flex items-center justify-between border-b border-white/5 px-6 py-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-400">Timeline</p>
            <h2 className="text-base font-semibold text-white">Recent gym activity</h2>
          </div>
          <span className="text-[11px] text-slate-500">{sorted.length} entr{sorted.length !== 1 ? 'ies' : 'y'}</span>
        </div>
        <ul className="divide-y divide-white/5">
          {sorted.slice(0, 30).map((log) => (
            <AttendanceRow key={log.id} log={log} />
          ))}
        </ul>
        {sorted.length > 30 && (
          <p className="border-t border-white/5 px-6 py-3 text-center text-xs text-slate-500">
            Showing first 30 of {sorted.length} entries
          </p>
        )}
      </section>
    </div>
  )
}

function AttendanceKpi({
  label,
  value,
  sub,
  gradient,
  icon,
}: {
  label: string
  value: string
  sub: string
  gradient: string
  icon: ReactNode
}) {
  return (
    <div className="group relative overflow-hidden rounded-2xl border border-white/10 bg-[rgba(17,17,39,0.55)] p-4 transition hover:border-white/20">
      <div
        aria-hidden
        className={`pointer-events-none absolute -right-6 -top-6 size-24 rounded-full bg-gradient-to-br ${gradient} opacity-20 blur-2xl transition-opacity group-hover:opacity-30`}
      />
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">{label}</p>
          <p className="mt-1.5 text-2xl font-bold text-white">{value}</p>
          <p className="mt-0.5 truncate text-[11px] text-slate-500">{sub}</p>
        </div>
        <div
          className={`flex size-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${gradient} text-white shadow-lg`}
        >
          {icon}
        </div>
      </div>
    </div>
  )
}

function AttendanceRow({ log }: { log: AttendanceLogDto }) {
  const checkIn = new Date(log.checkInTime)
  const checkInTime = Number.isNaN(checkIn.getTime()) ? '—' : checkIn.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  const checkOut = log.checkOutTime ? new Date(log.checkOutTime) : null
  const checkOutTime =
    checkOut && !Number.isNaN(checkOut.getTime())
      ? checkOut.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      : null

  const dayStr = (() => {
    const d = new Date(log.attendanceDate)
    if (Number.isNaN(d.getTime())) return { dayNum: '', dayMon: '' }
    return {
      dayNum: d.getDate().toString().padStart(2, '0'),
      dayMon: d.toLocaleString('default', { month: 'short' }).toUpperCase(),
    }
  })()

  return (
    <li className="group flex items-center gap-4 px-6 py-3.5 transition hover:bg-white/[0.03]">
      <div className="flex size-12 shrink-0 flex-col items-center justify-center rounded-xl border border-white/10 bg-white/[0.03]">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
          {dayStr.dayMon}
        </span>
        <span className="text-base font-bold text-white">{dayStr.dayNum}</span>
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-semibold text-white">{formatDate(log.attendanceDate)}</span>
          {log.isCheckedIn ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-semibold text-amber-200 ring-1 ring-amber-400/30">
              <span className="size-1.5 animate-pulse rounded-full bg-amber-400" />
              In gym
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-semibold text-emerald-200 ring-1 ring-emerald-400/30">
              Completed
            </span>
          )}
          {log.checkInMethod && (
            <span className="rounded-full bg-white/5 px-2 py-0.5 text-[10px] text-slate-400 ring-1 ring-white/10">
              {log.checkInMethod}
            </span>
          )}
        </div>
        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-slate-400">
          <span className="inline-flex items-center gap-1">
            <svg className="size-3" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
            In <strong className="text-slate-200">{checkInTime}</strong>
          </span>
          {checkOutTime && (
            <span className="inline-flex items-center gap-1">
              <svg className="size-3" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
              Out <strong className="text-slate-200">{checkOutTime}</strong>
            </span>
          )}
        </div>
      </div>
      <div className="shrink-0 text-right">
        {log.durationMinutes != null ? (
          <>
            <p className="text-sm font-bold text-white">
              {Math.floor(log.durationMinutes / 60) > 0 && `${Math.floor(log.durationMinutes / 60)}h `}
              {log.durationMinutes % 60}m
            </p>
            <p className="text-[10px] text-slate-500">duration</p>
          </>
        ) : log.isCheckedIn ? (
          <p className="text-[11px] text-amber-300">Live</p>
        ) : (
          <p className="text-[11px] text-slate-500">—</p>
        )}
      </div>
    </li>
  )
}

// Silence unused formatter helper used only in the page context
void formatDateTime
