import { Link } from 'react-router-dom'
import { useMemo, useState, type ComponentType } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  Activity,
  ArrowLeft,
  CalendarDays,
  ChevronRight,
  Clock,
  Coffee,
  Dumbbell,
  Flame,
  Heart,
  Moon,
  Play,
  RotateCcw,
  Sparkles,
  Target,
  Timer,
  TrendingUp,
  Trophy,
  User,
  Zap,
} from 'lucide-react'
import { DashboardLayout } from '../../components/layout/DashboardLayout'
import { GlassPanel } from '../../components/dashboard/premium/GlassPanel'
import { AnimatedStat } from '../../components/dashboard/premium/AnimatedStat'
import { getDashboardUser } from '../../lib/dashboardUser'
import {
  meService,
  type MeAssignedProgram,
  type MePlanDayOutline,
  type MeWorkoutExerciseLine,
} from '../../services/me.service'

type IconType = ComponentType<{ className?: string }>

const DOTNET_DOW = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'] as const
const ISO_LABELS_FULL = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'] as const
const ISO_LABELS_SHORT = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const
const ISO_LABELS_LETTER = ['M', 'T', 'W', 'T', 'F', 'S', 'S'] as const

function getTodayIsoDay(): number {
  // Mon = 1 ... Sun = 7
  const d = new Date().getDay() // Sun=0 ... Sat=6
  return d === 0 ? 7 : d
}

function formatLastSession(iso?: string | null) {
  if (!iso) return null
  try {
    return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
  } catch {
    return null
  }
}

function estimateDayMinutes(day: MePlanDayOutline): number {
  if (day.isRestDay) return 0
  return day.exercises.reduce((sum, ex) => {
    const setSeconds = (ex.targetSets ?? 0) * 45 // average set
    const restSeconds = Math.max(0, (ex.targetSets ?? 0) - 1) * (ex.restSeconds ?? 60)
    return sum + setSeconds + restSeconds
  }, 0) / 60
}

function uniqueBodyParts(day: MePlanDayOutline): string[] {
  const set = new Set<string>()
  day.exercises.forEach((e) => {
    if (e.bodyPartName) set.add(e.bodyPartName)
  })
  return Array.from(set)
}

// -------------------------------------------------------------
// Activity Ring (Apple Fitness inspired)
// -------------------------------------------------------------

function ActivityRing({
  pct,
  size = 132,
  stroke = 12,
  gradientId,
  fromColor,
  toColor,
  label,
  value,
  sublabel,
  icon: Icon,
}: {
  pct: number
  size?: number
  stroke?: number
  gradientId: string
  fromColor: string
  toColor: string
  label: string
  value: string
  sublabel?: string
  icon?: IconType
}) {
  const clamped = Math.max(0, Math.min(100, pct))
  const ringStyle = {
    background: 'conic-gradient(from -90deg, ' + fromColor + ' 0%, ' + toColor + ' ' + clamped + '%, rgba(255,255,255,0.05) ' + clamped + '%)',
    width: size + 'px',
    height: size + 'px',
    padding: stroke + 'px',
  }
  void gradientId
  return (
    <div className="flex flex-col items-center gap-2">
      <div className="rounded-full shadow-[0_0_30px_-6px_rgba(249,115,22,0.45)]" style={ringStyle}>
        <div className="flex h-full w-full flex-col items-center justify-center rounded-full border border-white/10 bg-neutral-950/85 backdrop-blur-xl">
          {Icon ? <Icon className="size-4 text-orange-300/90" /> : null}
          <p className="mt-0.5 text-xl font-bold tabular-nums text-white">{value}</p>
          {sublabel ? <p className="text-[10px] text-slate-400">{sublabel}</p> : null}
        </div>
      </div>
      <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">{label}</p>
    </div>
  )
}

// -------------------------------------------------------------
// Exercise Card (Apple Fitness style)
// -------------------------------------------------------------

function ExerciseCard({ line, index }: { line: MeWorkoutExerciseLine; index: number }) {
  const last = formatLastSession(line.lastSessionDateUtc)
  const hasHistory = last != null || line.lastWeightUsed != null || line.lastRepsDone != null

  return (
    <article className="group relative overflow-hidden rounded-2xl border border-white/[0.07] bg-gradient-to-br from-white/[0.04] to-transparent p-4 transition-all duration-200 hover:-translate-y-0.5 hover:border-orange-400/30 hover:shadow-[0_12px_40px_-12px_rgba(249,115,22,0.35)]">
      <span aria-hidden className="pointer-events-none absolute -right-10 -top-10 size-32 rounded-full bg-orange-500/10 blur-2xl opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
      <div className="relative flex items-start gap-4">
        <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-orange-500/30 to-amber-600/15 text-base font-bold text-white border border-white/10 shadow-inner tabular-nums">
          {String(index + 1).padStart(2, '0')}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="min-w-0">
              <h4 className="truncate text-base font-semibold text-white sm:text-lg">{line.exerciseName}</h4>
              {line.bodyPartName ? (
                <span className="mt-1 inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-slate-300">
                  <Target className="size-2.5" />
                  {line.bodyPartName}
                </span>
              ) : null}
            </div>
            {line.suggestedWeight != null ? (
              <span className="flex shrink-0 items-center gap-1 rounded-xl border border-orange-400/20 bg-orange-500/10 px-2.5 py-1 text-xs font-semibold text-orange-200">
                <Dumbbell className="size-3" />
                <span className="tabular-nums">{line.suggestedWeight}</span>
                <span className="text-orange-300/70">kg</span>
              </span>
            ) : null}
          </div>

          <div className="mt-3 grid grid-cols-3 gap-2">
            <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] px-3 py-2">
              <p className="text-[10px] font-medium uppercase tracking-wider text-slate-500">Sets</p>
              <p className="text-lg font-bold tabular-nums text-white">{line.targetSets}</p>
            </div>
            <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] px-3 py-2">
              <p className="text-[10px] font-medium uppercase tracking-wider text-slate-500">Reps</p>
              <p className="text-lg font-bold tabular-nums text-white">{line.targetReps}</p>
            </div>
            <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] px-3 py-2">
              <p className="text-[10px] font-medium uppercase tracking-wider text-slate-500 flex items-center gap-1">
                <Timer className="size-2.5" /> Rest
              </p>
              <p className="text-lg font-bold tabular-nums text-white">
                {line.restSeconds}
                <span className="ml-0.5 text-xs font-normal text-slate-400">s</span>
              </p>
            </div>
          </div>

          {hasHistory ? (
            <div className="mt-3 flex flex-wrap items-center gap-2 rounded-xl border border-emerald-400/15 bg-emerald-500/[0.06] px-3 py-2 text-xs">
              <TrendingUp className="size-3.5 shrink-0 text-emerald-300" />
              <span className="font-medium text-emerald-200">Last session</span>
              <span className="text-emerald-300/80">
                {last ?? '-'}
                {line.lastWeightUsed != null ? ' . ' + line.lastWeightUsed + ' kg' : ''}
                {line.lastRepsDone != null ? ' x ' + line.lastRepsDone : ''}
              </span>
            </div>
          ) : null}
        </div>
      </div>
    </article>
  )
}

// -------------------------------------------------------------
// Day Chip (week strip)
// -------------------------------------------------------------

function DayChip({
  isoDay,
  focusName,
  isToday,
  isSelected,
  isRest,
  exerciseCount,
  onClick,
}: {
  isoDay: number
  focusName: string | null
  isToday: boolean
  isSelected: boolean
  isRest: boolean
  exerciseCount: number
  onClick: () => void
}) {
  const letter = ISO_LABELS_LETTER[isoDay - 1] ?? '-'
  const short = ISO_LABELS_SHORT[isoDay - 1] ?? '-'
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        'group relative flex shrink-0 flex-col items-center justify-between gap-2 rounded-2xl border px-3 py-3 text-center transition-all duration-200',
        'min-w-[68px] sm:min-w-[80px]',
        isSelected
          ? 'border-orange-400/40 bg-gradient-to-br from-orange-500/20 to-amber-600/10 shadow-[0_8px_28px_-8px_rgba(249,115,22,0.45)]'
          : 'border-white/[0.08] bg-white/[0.02] hover:border-white/15 hover:bg-white/[0.05]',
      ].join(' ')}
    >
      {isToday ? (
        <span className="absolute -top-1.5 right-2 flex size-2 items-center justify-center">
          <span className="absolute inline-flex size-2 animate-ping rounded-full bg-orange-400 opacity-75" />
          <span className="relative inline-flex size-1.5 rounded-full bg-orange-400" />
        </span>
      ) : null}
      <div className="flex flex-col items-center">
        <span className={['text-[10px] font-semibold uppercase tracking-wider', isSelected ? 'text-orange-200' : 'text-slate-500'].join(' ')}>
          {short}
        </span>
        <span className={['text-xl font-bold sm:text-2xl', isSelected ? 'text-white' : 'text-slate-300'].join(' ')}>
          {letter}
        </span>
      </div>
      <div className="flex flex-col items-center gap-0.5">
        {isRest ? (
          <span className="text-[9px] font-medium uppercase tracking-wider text-slate-500">Rest</span>
        ) : (
          <>
            <span className="text-[9px] uppercase tracking-wider text-slate-500">
              {exerciseCount > 0 ? exerciseCount + ' ex' : 'Free'}
            </span>
            {focusName ? (
              <span className={['truncate text-[10px] font-medium', isSelected ? 'text-orange-100' : 'text-slate-400'].join(' ')}>
                {focusName.split(' ')[0]}
              </span>
            ) : null}
          </>
        )}
      </div>
    </button>
  )
}

// -------------------------------------------------------------
// Today Hero Card
// -------------------------------------------------------------

function TodayHero({
  greeting,
  userName,
  programName,
  todayDay,
  todayLabel,
}: {
  greeting: string
  userName: string
  programName: string
  todayDay: MePlanDayOutline | null
  todayLabel: string
}) {
  const isRest = todayDay?.isRestDay ?? false
  const exerciseCount = todayDay?.exercises.length ?? 0
  const estMinutes = todayDay ? Math.round(estimateDayMinutes(todayDay)) : 0
  const bodyParts = todayDay ? uniqueBodyParts(todayDay) : []

  return (
    <section className="glass-card relative overflow-hidden rounded-3xl border border-white/[0.08] p-5 sm:p-8">
      <span aria-hidden className="pointer-events-none absolute -right-20 -top-20 size-72 rounded-full bg-orange-500/20 blur-3xl" />
      <span aria-hidden className="pointer-events-none absolute -left-16 bottom-0 size-56 rounded-full bg-amber-500/15 blur-3xl" />
      <span aria-hidden className="pointer-events-none absolute right-1/3 top-1/2 size-40 rounded-full bg-rose-500/10 blur-3xl" />

      <div className="relative">
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-orange-400/30 bg-orange-500/15 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-orange-200">
            <Sparkles className="size-3" />
            Today . {todayLabel}
          </span>
          <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[10px] text-slate-300">
            {programName}
          </span>
        </div>

        <h2 className="mt-3 text-2xl font-bold tracking-tight text-white sm:text-4xl">
          {greeting}, <span className="bg-gradient-to-br from-orange-300 to-amber-400 bg-clip-text text-transparent">{userName.split(' ')[0]}</span>
        </h2>

        {isRest ? (
          <div className="mt-5 flex flex-col items-start gap-4 sm:flex-row sm:items-center">
            <span className="flex size-16 items-center justify-center rounded-2xl border border-violet-400/20 bg-gradient-to-br from-violet-500/25 to-indigo-600/15 text-violet-200">
              <Moon className="size-8" />
            </span>
            <div>
              <p className="text-lg font-semibold text-white">Recovery day</p>
              <p className="mt-0.5 text-sm text-slate-300/90">
                Take it easy today. Light walk, stretching, and hydration. Your body grows when you rest.
              </p>
            </div>
          </div>
        ) : todayDay && exerciseCount > 0 ? (
          <div className="mt-5">
            <p className="text-lg font-semibold text-white sm:text-xl">{todayDay.name}</p>
            {todayDay.focusArea ? (
              <p className="mt-0.5 text-sm text-slate-300/90">Focus: {todayDay.focusArea}</p>
            ) : null}

            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-3 backdrop-blur-xl">
                <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-orange-300/90">
                  <Dumbbell className="size-3" /> Exercises
                </p>
                <AnimatedStat value={exerciseCount} format={(n) => String(n)} className="mt-1 block text-2xl font-bold tabular-nums text-white" />
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-3 backdrop-blur-xl">
                <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-rose-300/90">
                  <Clock className="size-3" /> Est. time
                </p>
                <p className="mt-1 text-2xl font-bold tabular-nums text-white">
                  <AnimatedStat value={estMinutes} format={(n) => String(n)} />
                  <span className="ml-1 text-sm font-normal text-slate-400">min</span>
                </p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-3 backdrop-blur-xl">
                <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-emerald-300/90">
                  <Heart className="size-3" /> Muscle groups
                </p>
                <AnimatedStat value={bodyParts.length} format={(n) => String(n)} className="mt-1 block text-2xl font-bold tabular-nums text-white" />
              </div>
            </div>

            <button
              type="button"
              className="mt-5 inline-flex items-center gap-2 rounded-2xl border border-orange-400/30 bg-gradient-to-r from-orange-500 to-amber-500 px-5 py-2.5 text-sm font-semibold text-white shadow-[0_8px_24px_-6px_rgba(249,115,22,0.55)] transition-transform hover:scale-[1.02] active:scale-[0.98]"
            >
              <Play className="size-4 fill-current" />
              Start workout
              <ChevronRight className="size-4" />
            </button>
          </div>
        ) : (
          <div className="mt-5 flex flex-col items-start gap-4 sm:flex-row sm:items-center">
            <span className="flex size-16 items-center justify-center rounded-2xl border border-amber-400/20 bg-gradient-to-br from-amber-500/25 to-orange-600/15 text-amber-200">
              <Coffee className="size-8" />
            </span>
            <div>
              <p className="text-lg font-semibold text-white">Free day</p>
              <p className="mt-0.5 text-sm text-slate-300/90">No structured workout planned for today. Stay active your way.</p>
            </div>
          </div>
        )}
      </div>
    </section>
  )
}

// -------------------------------------------------------------
// Program View (one program with day selector)
// -------------------------------------------------------------

function ProgramView({ program }: { program: MeAssignedProgram }) {
  const { plan, scheduleSlots, days } = program
  const todayIso = getTodayIsoDay()

  // Build a map: isoDay (1..7) -> day data (first match wins)
  const dayByIso = useMemo(() => {
    const map = new Map<number, MePlanDayOutline>()
    days.forEach((d) => {
      if (d.dayNumber >= 1 && d.dayNumber <= 7 && !map.has(d.dayNumber)) {
        map.set(d.dayNumber, d)
      }
    })
    return map
  }, [days])

  const initialSelected = dayByIso.has(todayIso)
    ? todayIso
    : (Array.from(dayByIso.keys())[0] ?? todayIso)
  const [selectedIso, setSelectedIso] = useState<number>(initialSelected)

  const selectedDay = dayByIso.get(selectedIso) ?? null
  const totalExercises = days.reduce((acc, d) => acc + d.exercises.length, 0)
  const activeDays = days.filter((d) => !d.isRestDay && d.exercises.length > 0).length
  const totalRest = days.filter((d) => d.isRestDay).length

  // Pct: how much of the week is "active workout"
  const weekActivePct = Math.round((activeDays / 7) * 100)
  // Pct: completion proxy (we don't track real session log here)
  const programCompletionPct = Math.min(100, Math.max(0, weekActivePct))
  // Pct: muscle coverage (unique body parts) capped at 8
  const allBodyParts = new Set<string>()
  days.forEach((d) => d.exercises.forEach((e) => e.bodyPartName && allBodyParts.add(e.bodyPartName)))
  const coveragePct = Math.min(100, Math.round((allBodyParts.size / 8) * 100))

  const greeting = (() => {
    const h = new Date().getHours()
    if (h < 12) return 'Good morning'
    if (h < 17) return 'Good afternoon'
    return 'Good evening'
  })()

  const todayLabel = ISO_LABELS_FULL[todayIso - 1] ?? ''
  const todayDay = dayByIso.get(todayIso) ?? null

  const { userName } = getDashboardUser()

  return (
    <div className="space-y-6">
      <TodayHero
        greeting={greeting}
        userName={userName || 'Athlete'}
        programName={plan.planName}
        todayDay={todayDay}
        todayLabel={todayLabel}
      />

      {/* Activity Rings */}
      <section className="glass-card relative overflow-hidden rounded-3xl border border-white/[0.08] p-5 sm:p-6">
        <header className="mb-5 flex items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-semibold tracking-tight text-white">Your training rings</h3>
            <p className="text-xs text-slate-400">Snapshot of this program at a glance.</p>
          </div>
          <Trophy className="size-5 text-amber-300/70" />
        </header>
        <div className="grid grid-cols-3 gap-3 sm:gap-6">
          <ActivityRing
            pct={weekActivePct}
            gradientId="ring-1"
            fromColor="#f97316"
            toColor="#fb923c"
            label="Active days"
            value={activeDays + '/7'}
            sublabel="per week"
            icon={Flame}
          />
          <ActivityRing
            pct={programCompletionPct}
            gradientId="ring-2"
            fromColor="#ef4444"
            toColor="#f59e0b"
            label="Workouts"
            value={String(totalExercises)}
            sublabel="exercises"
            icon={Dumbbell}
          />
          <ActivityRing
            pct={coveragePct}
            gradientId="ring-3"
            fromColor="#10b981"
            toColor="#06b6d4"
            label="Muscle groups"
            value={String(allBodyParts.size)}
            sublabel={'of 8 targeted'}
            icon={Heart}
          />
        </div>
      </section>

      {/* Week strip */}
      <section>
        <div className="mb-3 flex items-end justify-between">
          <div>
            <h3 className="text-base font-semibold tracking-tight text-white">This week</h3>
            <p className="text-xs text-slate-400">Tap a day to view its plan.</p>
          </div>
          <span className="hidden sm:inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[10px] text-slate-300">
            <CalendarDays className="size-3" /> {activeDays} active . {totalRest} rest
          </span>
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1 sm:grid sm:grid-cols-7 sm:gap-3 sm:overflow-visible">
          {ISO_LABELS_SHORT.map((_, i) => {
            const iso = i + 1
            const day = dayByIso.get(iso) ?? null
            return (
              <DayChip
                key={iso}
                isoDay={iso}
                focusName={day?.focusArea ?? day?.name ?? null}
                isToday={iso === todayIso}
                isSelected={iso === selectedIso}
                isRest={day?.isRestDay ?? !day}
                exerciseCount={day?.exercises.length ?? 0}
                onClick={() => setSelectedIso(iso)}
              />
            )
          })}
        </div>
      </section>

      {/* Selected Day */}
      {selectedDay ? (
        <section className="glass-card relative overflow-hidden rounded-3xl border border-white/[0.08] p-5 sm:p-6">
          <header className="mb-4 flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-orange-300/80">
                {ISO_LABELS_FULL[selectedIso - 1] ?? 'Day'}
              </p>
              <h3 className="mt-1 text-xl font-bold text-white sm:text-2xl">{selectedDay.name}</h3>
              {selectedDay.focusArea ? (
                <p className="mt-1 text-sm text-slate-400">Focus: {selectedDay.focusArea}</p>
              ) : null}
            </div>
            {selectedDay.isRestDay ? (
              <span className="rounded-full border border-violet-400/25 bg-violet-500/10 px-3 py-1 text-xs font-semibold text-violet-200">
                <Moon className="mr-1 inline-block size-3" />
                Rest day
              </span>
            ) : (
              <div className="flex items-center gap-2">
                <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] text-slate-300">
                  <Dumbbell className="mr-1 inline-block size-3" />
                  {selectedDay.exercises.length} ex
                </span>
                <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] text-slate-300">
                  <Clock className="mr-1 inline-block size-3" />
                  ~{Math.round(estimateDayMinutes(selectedDay))} min
                </span>
              </div>
            )}
          </header>

          {selectedDay.isRestDay ? (
            <div className="flex flex-col items-center gap-3 py-8 text-center">
              <span className="flex size-16 items-center justify-center rounded-2xl border border-violet-400/20 bg-gradient-to-br from-violet-500/25 to-indigo-600/15 text-violet-200">
                <Moon className="size-8" />
              </span>
              <p className="text-base font-semibold text-white">Recovery day</p>
              <p className="max-w-md text-sm text-slate-400">
                Active recovery only - mobility work, walking, and stretching. Sleep is your secret weapon.
              </p>
            </div>
          ) : selectedDay.exercises.length === 0 ? (
            <p className="py-6 text-center text-sm text-slate-500">No exercises listed for this day yet.</p>
          ) : (
            <div className="space-y-2.5">
              {selectedDay.exercises
                .slice()
                .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
                .map((line, idx) => (
                  <ExerciseCard key={line.planExerciseId} line={line} index={idx} />
                ))}
            </div>
          )}
        </section>
      ) : null}

      {/* Schedule Slots */}
      {scheduleSlots.length > 0 ? (
        <section className="glass-card relative overflow-hidden rounded-3xl border border-white/[0.08] p-5 sm:p-6">
          <header className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-semibold tracking-tight text-white">Your gym schedule</h3>
              <p className="text-xs text-slate-400">Booked time slots & trainers.</p>
            </div>
            <Clock className="size-5 text-cyan-300/70" />
          </header>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {scheduleSlots.map((s) => (
              <article
                key={s.scheduleId}
                className="group relative overflow-hidden rounded-2xl border border-white/[0.07] bg-gradient-to-br from-cyan-500/[0.06] via-transparent to-transparent p-4 transition-all hover:-translate-y-0.5 hover:border-cyan-400/30"
              >
                <span aria-hidden className="pointer-events-none absolute -right-6 -top-6 size-24 rounded-full bg-cyan-500/15 blur-2xl" />
                <div className="relative">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-semibold text-white">
                      {DOTNET_DOW[s.dayOfWeek] ?? 'Day ' + s.dayOfWeek}
                    </p>
                    <span className="rounded-full bg-violet-500/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-violet-200 ring-1 ring-violet-400/20">
                      {s.scheduleType}
                    </span>
                  </div>
                  <p className="mt-2 text-lg font-bold tabular-nums text-white">
                    {s.startTime}
                    <span className="mx-1.5 text-slate-500">to</span>
                    {s.endTime}
                  </p>
                  {s.trainerName ? (
                    <p className="mt-2 inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[11px] text-slate-300">
                      <User className="size-3" /> {s.trainerName}
                    </p>
                  ) : null}
                </div>
              </article>
            ))}
          </div>
        </section>
      ) : null}

      {/* Plan info */}
      <section className="rounded-2xl border border-orange-400/15 bg-gradient-to-br from-orange-500/10 via-amber-500/5 to-transparent p-4 sm:p-5">
        <div className="flex items-start gap-3">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-orange-500/15 text-orange-300">
            <Zap className="size-4" />
          </span>
          <div className="text-sm text-slate-200">
            <p className="font-medium text-white">About this program</p>
            <p className="mt-1 text-slate-300/90">
              {plan.description ?? 'Your trainer crafted this plan to match your goals. Stay consistent - that is the real secret.'}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {plan.workoutType ? (
                <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] text-slate-300">
                  <Activity className="mr-1 inline-block size-3" /> {plan.workoutType}
                </span>
              ) : null}
              {plan.goal ? (
                <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] text-slate-300">
                  <Target className="mr-1 inline-block size-3" /> {plan.goal}
                </span>
              ) : null}
              {plan.difficultyLevel ? (
                <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] text-slate-300">
                  <Flame className="mr-1 inline-block size-3" /> {plan.difficultyLevel}
                </span>
              ) : null}
              {plan.workoutsPerWeek ? (
                <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] text-slate-300">
                  <RotateCcw className="mr-1 inline-block size-3" /> {plan.workoutsPerWeek}x / week
                </span>
              ) : null}
              {plan.durationDays ? (
                <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] text-slate-300">
                  <CalendarDays className="mr-1 inline-block size-3" /> {plan.durationDays} day program
                </span>
              ) : null}
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}

// -------------------------------------------------------------
// Loading skeleton
// -------------------------------------------------------------

function LoadingSkeleton() {
  return (
    <div className="space-y-6">
      <div className="h-56 animate-pulse rounded-3xl bg-white/[0.04]" />
      <div className="h-44 animate-pulse rounded-3xl bg-white/[0.04]" />
      <div className="grid grid-cols-7 gap-3">
        {Array.from({ length: 7 }).map((_, i) => (
          <div key={i} className="h-20 animate-pulse rounded-2xl bg-white/[0.04]" />
        ))}
      </div>
      <div className="h-72 animate-pulse rounded-3xl bg-white/[0.04]" />
    </div>
  )
}

// -------------------------------------------------------------
// Empty state
// -------------------------------------------------------------

function EmptyState() {
  return (
    <GlassPanel role="member">
      <div className="flex flex-col items-center px-4 py-12 text-center sm:py-16">
        <div className="relative">
          <span aria-hidden className="absolute inset-0 -m-4 rounded-full bg-gradient-to-br from-orange-500/30 to-amber-600/10 blur-2xl" />
          <span className="relative flex size-24 items-center justify-center rounded-3xl border border-white/10 bg-gradient-to-br from-orange-500/20 to-amber-600/10 text-orange-300">
            <Dumbbell className="size-12" />
          </span>
        </div>
        <h3 className="mt-6 text-xl font-semibold text-white">No workouts yet</h3>
        <p className="mt-2 max-w-md text-sm text-slate-400">
          Your trainer hasn&apos;t assigned a program yet. Once they do, your weekly schedule, every exercise, and your last logged numbers will appear right here.
        </p>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-2 text-xs">
          <span className="flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-slate-300">
            <CalendarDays className="size-3.5 text-orange-300" />
            Weekly schedule
          </span>
          <span className="flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-slate-300">
            <Target className="size-3.5 text-emerald-300" />
            Goal-driven
          </span>
          <span className="flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-slate-300">
            <TrendingUp className="size-3.5 text-amber-300" />
            Progress tracked
          </span>
        </div>
      </div>
    </GlassPanel>
  )
}

// -------------------------------------------------------------
// Page
// -------------------------------------------------------------

export function MemberWorkoutsPage() {
  const { userName } = getDashboardUser()
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['member-workout-program'],
    queryFn: async () => {
      const { data: payload } = await meService.getWorkoutProgram()
      return payload
    },
  })

  const programs = data?.programs ?? []

  return (
    <DashboardLayout userName={userName}>
      <div className="mx-auto w-full max-w-5xl pb-16">
        <Link
          to="/dashboard"
          className="mb-4 inline-flex items-center gap-1.5 text-xs font-medium text-slate-400 transition-colors hover:text-orange-300"
        >
          <ArrowLeft className="size-3.5" />
          Back to dashboard
        </Link>

        <header className="mb-6 flex items-center gap-3">
          <span className="flex size-10 items-center justify-center rounded-xl border border-white/10 bg-gradient-to-br from-orange-500/20 to-amber-600/10 text-orange-300">
            <Dumbbell className="size-5" />
          </span>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">Workouts</h1>
            <p className="text-sm text-slate-400">Your training plan, day by day.</p>
          </div>
        </header>

        {isLoading ? (
          <LoadingSkeleton />
        ) : isError ? (
          <GlassPanel role="member" title="Couldn't load workouts">
            <p className="text-sm text-rose-300">
              {error instanceof Error ? error.message : 'Something went wrong. Try again later.'}
            </p>
          </GlassPanel>
        ) : programs.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="space-y-8">
            {programs.map((program) => (
              <ProgramView key={program.plan.id} program={program} />
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
