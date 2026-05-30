import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate, useSearchParams } from 'react-router-dom'
import toast from 'react-hot-toast'
import { getSafeDashboardReturnPath, parseMemberIdsQuery } from '../../lib/safeReturnPath'
import { DashboardLayout } from '../../components/layout/DashboardLayout'
import {
  DashboardSubpageShell,
  DashboardTablePanel,
} from '../../components/layout/DashboardSubpageShell'
import { MetricCard } from '../../components/dashboard/MetricCard'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Modal } from '../../components/ui/Modal'
import { userSchedulesService } from '../../services/userSchedules.service'
import { usersService } from '../../services/users.service'
import { workoutPlansService } from '../../services/workoutPlans.service'
import { trainersService } from '../../services/trainers.service'
import { TrainerHealthAlertPanel } from '../../modules/health-profile/components/TrainerHealthAlertPanel'
import { healthProfileService } from '../../modules/health-profile/services/healthProfile.service'
import type { AssignWorkoutPlanDto, ScheduleType, UserScheduleDto } from '../../types/userSchedule'
import type { User } from '../../types/user'
import type { WorkoutPlan } from '../../types/workoutPlan'
import type { Trainer } from '../../types/trainer'

const scheduleTypes: ScheduleType[] = ['Custom', 'FullBody', 'OneMusclePerDay', 'TwoMusclesPerDay', 'ThreeMusclesPerDay']
const weekDays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
const selectClass =
  'w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-slate-100 transition-colors focus:border-blue-400/60 focus:bg-white/[0.07] focus:outline-none focus:ring-2 focus:ring-blue-400/20'

function formatMemberLabel(user: User) {
  return `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim() || `User #${user.id}`
}

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

export function WorkoutAssignmentsPage() {
  const { userName } = getDashboardUser()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const queryClient = useQueryClient()
  const presetUserId = Number.parseInt(searchParams.get('userId') ?? '', 10)
  const memberIdsQuery = searchParams.get('memberIds') ?? ''
  const returnToSafe = useMemo(
    () => getSafeDashboardReturnPath(searchParams.get('returnTo')),
    [searchParams],
  )
  const [searchQuery, setSearchQuery] = useState('')
  const [memberFilter, setMemberFilter] = useState<number | 'all'>('all')
  const [modalOpen, setModalOpen] = useState(false)
  const [bulkAssignMembers, setBulkAssignMembers] = useState(false)
  const [bulkMemberIds, setBulkMemberIds] = useState<number[]>([])
  const [bulkSaving, setBulkSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [form, setForm] = useState<AssignWorkoutPlanDto>({
    userId: 0,
    trainerId: null,
    workoutPlanId: 0,
    scheduleType: 'Custom',
    dayOfWeek: 1,
    startTime: '06:00:00',
    endTime: '07:00:00',
    deactivateExistingAssignments: true,
  })

  const { data: schedules = [], isLoading } = useQuery({
    queryKey: ['user-schedules'],
    queryFn: async () => {
      const { data } = await userSchedulesService.getAll()
      return Array.isArray(data) ? data : []
    },
  })
  const { data: users = [] } = useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      const { data } = await usersService.getAll()
      return Array.isArray(data) ? (data as User[]) : []
    },
  })
  const { data: workoutPlans = [] } = useQuery({
    queryKey: ['programs'],
    queryFn: async () => {
      const { data } = await workoutPlansService.getAll()
      return Array.isArray(data) ? (data as WorkoutPlan[]) : []
    },
  })
  const { data: trainers = [] } = useQuery({
    queryKey: ['trainers'],
    queryFn: async () => {
      const { data } = await trainersService.getAll()
      return Array.isArray(data) ? (data as Trainer[]) : []
    },
  })

  const selectedMemberId = !bulkAssignMembers && form.userId > 0 ? form.userId : 0
  const { data: assignHealthSummary, isLoading: assignHealthLoading } = useQuery({
    queryKey: ['health-profile-summary', selectedMemberId],
    queryFn: async () => {
      const { data } = await healthProfileService.getSummaryByUserId(selectedMemberId)
      return data
    },
    enabled: modalOpen && selectedMemberId > 0,
  })

  useEffect(() => {
    const bulkPreset = parseMemberIdsQuery(memberIdsQuery)
    if (bulkPreset.length > 1) {
      setBulkAssignMembers(true)
      setBulkMemberIds(bulkPreset)
      setForm((f) => ({ ...f, userId: 0 }))
      setModalOpen(true)
      return
    }
    if (Number.isInteger(presetUserId) && presetUserId > 0) {
      setBulkAssignMembers(false)
      setBulkMemberIds([])
      setForm((f) => ({ ...f, userId: presetUserId }))
      setModalOpen(true)
    }
  }, [presetUserId, memberIdsQuery])

  const toggleBulkMemberId = (userId: number) => {
    setBulkMemberIds((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId],
    )
  }

  const assignMutation = useMutation({
    mutationFn: (payload: AssignWorkoutPlanDto) => userSchedulesService.assignWorkoutPlan(payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['user-schedules'] })
      setModalOpen(false)
      setFormError(null)
      setBulkAssignMembers(false)
      setBulkMemberIds([])
      toast.success('Workout plan assigned.')
      if (returnToSafe) navigate(returnToSafe)
    },
    onError: (error: Error) => setFormError(error.message || 'Failed to assign workout plan'),
  })

  const filteredSchedules = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    return schedules
      .filter((schedule) => {
        const matchesQuery =
          q.length === 0 ||
          schedule.userName.toLowerCase().includes(q) ||
          schedule.workoutPlanName.toLowerCase().includes(q) ||
          (schedule.trainerName ?? '').toLowerCase().includes(q)
        const matchesMember = memberFilter === 'all' || schedule.userId === memberFilter
        return matchesQuery && matchesMember
      })
      .sort((a, b) => new Date(b.assignedAt).getTime() - new Date(a.assignedAt).getTime())
  }, [memberFilter, schedules, searchQuery])

  const stats = useMemo(() => {
    const active = schedules.filter((s) => s.isActive).length
    const members = new Set(schedules.map((s) => s.userId)).size
    return { total: schedules.length, active, members, history: schedules.length - active }
  }, [schedules])

  function trainerLabel(trainer: Trainer) {
    const name = `${trainer.firstName ?? ''} ${trainer.lastName ?? ''}`.trim()
    return name || `Trainer #${trainer.id}`
  }

  function openAssignModal() {
    setForm({
      userId: 0,
      trainerId: null,
      workoutPlanId: 0,
      scheduleType: 'Custom',
      dayOfWeek: 1,
      startTime: '06:00:00',
      endTime: '07:00:00',
      deactivateExistingAssignments: true,
    })
    setBulkAssignMembers(false)
    setBulkMemberIds([])
    setFormError(null)
    setModalOpen(true)
  }

  async function handleAssign(event: React.FormEvent) {
    event.preventDefault()
    setFormError(null)
    if (form.workoutPlanId <= 0) {
      setFormError('Workout plan is required.')
      return
    }

    if (bulkAssignMembers) {
      const targetIds = bulkMemberIds
      if (targetIds.length === 0) {
        setFormError('Select one or more members.')
        return
      }
      const base: AssignWorkoutPlanDto = {
        userId: 0,
        trainerId: form.trainerId,
        workoutPlanId: form.workoutPlanId,
        scheduleType: form.scheduleType,
        dayOfWeek: form.dayOfWeek,
        startTime: form.startTime,
        endTime: form.endTime,
        deactivateExistingAssignments: form.deactivateExistingAssignments,
      }
      setBulkSaving(true)
      try {
        let succeeded = 0
        let failed = 0
        for (const userId of targetIds) {
          try {
            await userSchedulesService.assignWorkoutPlan({ ...base, userId })
            succeeded++
          } catch {
            failed++
          }
        }
        await queryClient.invalidateQueries({ queryKey: ['user-schedules'] })
        if (succeeded > 0) {
          toast.success(
            `Assigned plan to ${succeeded} member${succeeded === 1 ? '' : 's'}.`,
          )
        }
        if (failed > 0) {
          toast.error(
            `${failed} assignment${failed === 1 ? '' : 's'} failed — retry individually if needed.`,
          )
        }
        setModalOpen(false)
        setBulkAssignMembers(false)
        setBulkMemberIds([])
        if (returnToSafe && succeeded > 0 && targetIds.length === 1) {
          navigate(returnToSafe)
        }
      } finally {
        setBulkSaving(false)
      }
      return
    }

    if (form.userId <= 0 || form.workoutPlanId <= 0) {
      setFormError('Member and workout plan are required.')
      return
    }
    assignMutation.mutate(form)
  }

  return (
    <DashboardLayout userName={userName}>
      <div className="mb-4 min-w-0">
        {returnToSafe ? (
          <button
            type="button"
            onClick={() => navigate(returnToSafe)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold text-slate-300 transition hover:border-white/20 hover:bg-white/10 hover:text-white"
          >
            <svg className="size-3.5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            Back to member
          </button>
        ) : null}
      </div>

      <DashboardSubpageShell
        eyebrow="Training"
        titleGradient="member assignments"
        subtitle="Assign workout plans to members and keep assignment history for trainer handover and progress reviews."
        showExport={false}
        primaryAction={{ label: '+ Assign plan', onClick: openAssignModal }}
      >
        <div className="grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard title="Assignments" value={stats.total} gradient="from-blue-500 to-indigo-500" icon={<span className="text-lg">A</span>} caption="All-time records" />
          <MetricCard title="Active" value={stats.active} gradient="from-emerald-500 to-teal-500" icon={<span className="text-lg">C</span>} caption="Current plans" />
          <MetricCard title="History" value={stats.history} gradient="from-violet-500 to-fuchsia-500" icon={<span className="text-lg">H</span>} caption="Inactive records" />
          <MetricCard title="Members" value={stats.members} gradient="from-amber-500 to-orange-500" icon={<span className="text-lg">M</span>} caption="Covered members" />
        </div>

        <DashboardTablePanel
          title="Workout Plan Assignment History"
          description="Every reassignment creates a new record while previous active assignments are marked inactive."
          toolbar={
            <>
              <Input value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} placeholder="Search member, plan, trainer..." className="min-w-[220px] !py-2" />
              <select
                value={memberFilter}
                onChange={(event) =>
                  setMemberFilter(event.target.value === 'all' ? 'all' : Number(event.target.value))
                }
                className={`${selectClass} min-w-[220px] py-2`}
              >
                <option value="all" className="bg-slate-900">All members</option>
                {users.map((user) => (
                  <option key={user.id} value={user.id} className="bg-slate-900">
                    {`${user.firstName ?? ''} ${user.lastName ?? ''}`.trim() || `User #${user.id}`}
                  </option>
                ))}
              </select>
            </>
          }
        >
          {isLoading ? (
            <p className="px-6 py-8 text-sm text-slate-400">Loading assignments...</p>
          ) : filteredSchedules.length === 0 ? (
            <p className="px-6 py-8 text-sm text-slate-400">No assignments found.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[980px] text-left text-sm">
                <thead>
                  <tr className="border-b border-white/10 text-xs font-semibold uppercase tracking-wider text-slate-400">
                    <th className="px-6 py-3">Member</th><th className="px-6 py-3">Plan</th><th className="px-6 py-3">Trainer</th><th className="px-6 py-3">Schedule</th><th className="px-6 py-3">Assigned</th><th className="px-6 py-3">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredSchedules.map((schedule: UserScheduleDto) => (
                    <tr key={schedule.id} className="border-b border-white/5 transition-colors hover:bg-white/[0.03]">
                      <td className="px-6 py-4 font-medium text-white">{schedule.userName}</td>
                      <td className="px-6 py-4 text-slate-300">{schedule.workoutPlanName}</td>
                      <td className="px-6 py-4 text-slate-300">{schedule.trainerName?.trim() || 'Unassigned'}</td>
                      <td className="px-6 py-4 text-slate-300">{weekDays[schedule.dayOfWeek]} | {schedule.startTime.slice(0, 5)}-{schedule.endTime.slice(0, 5)}</td>
                      <td className="px-6 py-4 text-slate-300">{new Date(schedule.assignedAt).toLocaleString()}</td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${schedule.isActive ? 'bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-500/30' : 'bg-white/5 text-slate-300 ring-1 ring-white/10'}`}>
                          {schedule.isActive ? 'Active' : 'History'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </DashboardTablePanel>
      </DashboardSubpageShell>

      <Modal
        open={modalOpen}
        onClose={() => {
          setModalOpen(false)
          setFormError(null)
        }}
        title="Assign workout plan"
      >
        <form onSubmit={(e) => void handleAssign(e)} className="space-y-4">
          {formError && <div role="alert" className="rounded-xl border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-sm text-rose-200">{formError}</div>}
          <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5">
            <input
              type="checkbox"
              checked={bulkAssignMembers}
              onChange={(event) => {
                const on = event.target.checked
                setBulkAssignMembers(on)
                setFormError(null)
                if (on && form.userId > 0) {
                  setBulkMemberIds([form.userId])
                }
                if (!on) {
                  setBulkMemberIds([])
                }
              }}
              className="h-4 w-4 rounded border-white/20 bg-white/5 text-blue-500 focus:ring-blue-400/40"
            />
            <span className="text-sm text-slate-200">Assign to multiple members</span>
          </label>
          {bulkAssignMembers ? (
            <div>
              <p className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-slate-400">
                Members ({bulkMemberIds.length} selected)
              </p>
              <div className="max-h-44 overflow-y-auto rounded-xl border border-white/10 bg-white/[0.03] p-2">
                {users.length === 0 ? (
                  <p className="px-2 py-3 text-sm text-slate-500">No members loaded.</p>
                ) : (
                  <ul className="space-y-1">
                    {users.map((u) => (
                      <li key={u.id}>
                        <label className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-slate-200 hover:bg-white/[0.06]">
                          <input
                            type="checkbox"
                            checked={bulkMemberIds.includes(u.id)}
                            onChange={() => toggleBulkMemberId(u.id)}
                            className="h-4 w-4 rounded border-white/20 bg-white/5 text-blue-500"
                          />
                          <span className="min-w-0 truncate">
                            {formatMemberLabel(u)}{' '}
                            <span className="text-slate-500">({u.email})</span>
                          </span>
                        </label>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          ) : (
            <div>
              <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-slate-400">Member</label>
              <select value={form.userId} onChange={(event) => setForm((c) => ({ ...c, userId: Number(event.target.value) }))} className={selectClass}>
                <option value={0} className="bg-slate-900">Select member</option>
                {users.map((user) => (
                  <option key={user.id} value={user.id} className="bg-slate-900">
                    {formatMemberLabel(user)}
                  </option>
                ))}
              </select>
            </div>
          )}
          {selectedMemberId > 0 && (
            <TrainerHealthAlertPanel summary={assignHealthSummary} loading={assignHealthLoading} compact />
          )}
          <div>
            <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-slate-400">Workout plan</label>
            <select value={form.workoutPlanId} onChange={(event) => setForm((c) => ({ ...c, workoutPlanId: Number(event.target.value) }))} className={selectClass}>
              <option value={0} className="bg-slate-900">Select plan</option>
              {workoutPlans.map((plan) => (
                <option key={plan.id} value={plan.id} className="bg-slate-900">{plan.name}</option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-slate-400">Trainer</label>
              <select value={form.trainerId ?? 0} onChange={(event) => setForm((c) => ({ ...c, trainerId: Number(event.target.value) || null }))} className={selectClass}>
                <option value={0} className="bg-slate-900">Unassigned</option>
                {trainers.map((trainer) => (
                  <option key={trainer.id} value={trainer.id} className="bg-slate-900">{trainerLabel(trainer)}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-slate-400">Schedule type</label>
              <select value={form.scheduleType} onChange={(event) => setForm((c) => ({ ...c, scheduleType: event.target.value as ScheduleType }))} className={selectClass}>
                {scheduleTypes.map((type) => (<option key={type} value={type} className="bg-slate-900">{type}</option>))}
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-slate-400">Day</label>
              <select value={form.dayOfWeek} onChange={(event) => setForm((c) => ({ ...c, dayOfWeek: Number(event.target.value) }))} className={selectClass}>
                {weekDays.map((day, index) => (<option key={day} value={index} className="bg-slate-900">{day}</option>))}
              </select>
            </div>
            <Input label="Start time" type="time" value={form.startTime.slice(0, 5)} onChange={(event) => setForm((c) => ({ ...c, startTime: `${event.target.value}:00` }))} />
            <Input label="End time" type="time" value={form.endTime.slice(0, 5)} onChange={(event) => setForm((c) => ({ ...c, endTime: `${event.target.value}:00` }))} />
          </div>
          <label className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3">
            <input type="checkbox" checked={!!form.deactivateExistingAssignments} onChange={(event) => setForm((c) => ({ ...c, deactivateExistingAssignments: event.target.checked }))} className="h-4 w-4 rounded border-white/20 bg-white/5" />
            <span className="text-sm text-slate-200">Mark existing active assignments as history</span>
          </label>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" type="button" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button type="submit" isLoading={assignMutation.isPending || bulkSaving}>Assign</Button>
          </div>
        </form>
      </Modal>
    </DashboardLayout>
  )
}
