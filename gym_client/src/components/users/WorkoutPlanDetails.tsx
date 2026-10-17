import { CalendarDays, Clock3, Dumbbell, Flame, Layers3, LockKeyhole, Play, Repeat2, Sparkles, StretchHorizontal, Timer, UserRound, Wind } from 'lucide-react'
import type { WorkoutPlan, WorkoutPlanExercise } from '../../types/workoutPlan'
import type { WorkoutPlanWarmup } from '../../types/warmup'
import type { WorkoutPlanStretch } from '../../types/stretch'
import type { UserScheduleDto } from '../../types/userSchedule'
import './workoutPlanDetails.css'

const number = (value?: number | null) => value == null ? '—' : value.toLocaleString()
const formatLabel = (value?: string | null) => value?.replace(/([a-z])([A-Z])/g, '$1 $2') || '—'
const date = (value?: string | null) => {
  if (!value) return '—'
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? '—' : parsed.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })
}

function VideoLink({ url }: { url?: string | null }) {
  if (!url || !/^https?:\/\//i.test(url)) return null
  return <a href={url} target="_blank" rel="noopener noreferrer" className="workout-video"><Play size={12} aria-hidden="true" />Watch demonstration</a>
}

function ExerciseList({ exercises }: { exercises: WorkoutPlanExercise[] }) {
  if (!exercises.length) return <p className="workout-empty">No exercises added.</p>
  return <ol className="workout-exercises">
    {[...exercises].sort((a, b) => a.order - b.order).map((exercise, index) => <li key={exercise.id} className="workout-exercise">
      <div className="workout-exercise-heading"><span className="workout-exercise-number">{String(index + 1).padStart(2, '0')}</span><div><h6>{exercise.exerciseName}</h6>{exercise.bodyPartName && <p>{exercise.bodyPartName}</p>}</div></div>
      <dl className="workout-prescription">
        {[['Sets', exercise.sets, ''], ['Reps', exercise.reps, ''], ['Rest', exercise.restBetweenSets, 'sec'], ['Weight', exercise.weight, 'kg']].map(([label, value, unit]) => <div key={label}>
          <dt>{label}</dt><dd><strong>{number(value as number | null | undefined)}</strong>{value != null && unit && <span>{unit}</span>}</dd>
        </div>)}
      </dl>
      {(exercise.tempo || exercise.intensity) && <div className="workout-exercise-tags">{exercise.tempo && <span>Tempo <strong>{exercise.tempo}</strong></span>}{exercise.intensity && <span>Intensity <strong>{exercise.intensity}</strong></span>}</div>}
      {exercise.notes && <p className="workout-exercise-note">{exercise.notes}</p>}
      <VideoLink url={exercise.videoUrl} />
    </li>)}
  </ol>
}

function Mobility({ title, items, compact = false }: { title: string; items?: (WorkoutPlanWarmup | WorkoutPlanStretch)[]; compact?: boolean }) {
  const isWarmup = title.toLowerCase().includes('warmup')
  const Icon = isWarmup ? Wind : StretchHorizontal
  return <section className={`workout-mobility ${isWarmup ? 'workout-warmup' : 'workout-stretch'} ${compact ? 'workout-mobility-compact' : ''}`}>
    <div className="workout-section-heading"><h4><Icon size={16} aria-hidden="true" />{title}</h4><span>{items?.length ?? 0} {items?.length === 1 ? 'movement' : 'movements'}</span></div>
    {!items?.length && <p className="workout-empty">No {title.toLowerCase()} added.</p>}
    {[...(items ?? [])].sort((a, b) => a.displayOrder - b.displayOrder).map((item) => <div key={item.id} className="workout-movement">
      <div className="workout-movement-heading"><h5>{item.name}</h5><span><Timer size={12} aria-hidden="true" />{number(item.durationSeconds)} sec</span></div>
      {(item.bodyPart || item.difficultyLevel || ('caloriesBurn' in item && item.caloriesBurn != null)) && <div className="workout-movement-meta">{[item.bodyPart, item.difficultyLevel, 'caloriesBurn' in item && item.caloriesBurn != null ? `${number(item.caloriesBurn)} kcal` : null].filter(Boolean).join(' · ')}</div>}
      {item.description && <p className="workout-description">{item.description}</p>}
      <VideoLink url={item.videoUrl} />
    </div>)}
  </section>
}

export function WorkoutPlanDetails({ plan, schedule }: { plan: WorkoutPlan; schedule: UserScheduleDto }) {
  const weeks = [...(plan.weeks ?? [])].sort((a, b) => a.weekNumber - b.weekNumber)
  const exerciseCount = weeks.length ? weeks.reduce((total, week) => total + week.days.reduce((sum, day) => sum + (day.exercises?.length ?? 0), 0), 0) : (plan.exercises?.length ?? 0)
  return <div className="workout-detail space-y-6">
    <section className="workout-hero">
      <div className="workout-hero-main">
        <div className="workout-eyebrow"><Dumbbell size={14} aria-hidden="true" /> YOUR TRAINING PLAN</div>
        <h3>{plan.name}</h3>
        <div className="workout-badges"><span className="workout-type">{formatLabel(plan.workoutType)}</span><span className="workout-status"><i className={schedule.isActive ? 'active' : ''} />{schedule.isActive ? 'Active assignment' : 'Inactive assignment'}</span>{plan.difficultyLevel && <span className="workout-status">{plan.difficultyLevel}</span>}</div>
        {plan.description && <p className="workout-description">{plan.description}</p>}
        <p className="workout-readonly"><LockKeyhole size={12} aria-hidden="true" /> Read only <span>·</span> {exerciseCount} exercise {exerciseCount === 1 ? 'entry' : 'entries'}{weeks.length > 0 && <><span>·</span>{weeks.length} template {weeks.length === 1 ? 'week' : 'weeks'}</>}</p>
      </div>
      <div className="workout-duration"><span className="workout-duration-icon"><Clock3 size={22} aria-hidden="true" /></span><strong>{number(plan.duration)}</strong><span>minutes / workout</span></div>
    </section>

    <section className="workout-metrics" aria-label="Program summary">
      {[{ label: 'Program length', value: number(plan.durationDays), unit: 'days', icon: CalendarDays }, { label: 'Weekly frequency', value: number(plan.workoutsPerWeek), unit: 'workouts', icon: Repeat2 }, { label: 'Estimated burn', value: number(plan.estimatedCaloriesBurn), unit: 'kcal / workout', icon: Flame }].map(({ label, value, unit, icon: Icon }) => <div key={label} className="workout-metric"><span><Icon size={15} aria-hidden="true" />{label}</span><p><strong>{value}</strong><small>{unit}</small></p></div>)}
    </section>

    <section className="workout-assignment" aria-label="Assignment details">
      <div className="workout-section-heading"><h4><CalendarDays size={16} aria-hidden="true" />Your schedule</h4><span>Assigned {date(schedule.assignedAt)}</span></div>
      <div className="workout-slot"><div><span className="workout-meta-label">TRAINING DAY</span><strong>{['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][schedule.dayOfWeek] ?? '—'}</strong></div><div><span className="workout-meta-label">TIME SLOT</span><strong>{schedule.startTime.slice(0, 5)} – {schedule.endTime.slice(0, 5)}</strong></div><div><span className="workout-meta-label">PERSONAL COACH</span><strong className="workout-coach"><UserRound size={13} aria-hidden="true" />{schedule.trainerName || 'Unassigned'}</strong></div></div>
      <div className="workout-plan-meta">{[
        ['Goal', plan.goal], ['Category', plan.workoutCategoryName], ['Schedule', formatLabel(schedule.scheduleType)],
        ['Plan status', plan.status ?? (plan.isActive ? 'Active' : 'Inactive')], ['Plan trainer', plan.trainerName],
        ['Repeats template', plan.repeatTemplate ? 'Yes' : 'No'],
      ].filter(([, value]) => value).map(([label, value]) => <span key={label}>{label}: <strong>{value}</strong></span>)}</div>
      {!!plan.tags?.length && <p className="workout-description">Tags: {plan.tags.join(', ')}</p>}
    </section>

    <Mobility title="Warmups" items={plan.warmups} />

    <section className="space-y-4" aria-label="Workout routine">
      <div className="workout-section-heading"><div><span className="workout-eyebrow">THE TRAINING ROUTINE</span><h4 className="workout-routine-title"><Layers3 size={19} aria-hidden="true" />{weeks.length ? 'Weekly schedule' : 'Exercises'}</h4></div><span className="workout-count">{exerciseCount} {exerciseCount === 1 ? 'exercise' : 'exercises'}</span></div>
      {weeks.length ? weeks.map((week) => <section key={week.id} className="workout-week">
        <header className="workout-week-heading"><span className="workout-week-icon"><Layers3 size={17} aria-hidden="true" /></span><h4>Week {week.weekNumber}{week.name ? ` · ${week.name}` : ''}</h4><span>{week.days.length} days</span></header>
        {[...week.days].sort((a, b) => a.orderIndex - b.orderIndex).map((day) => <section key={day.id} className={`workout-day ${day.isRestDay ? 'workout-rest-day' : ''}`}>
          <div className="workout-day-heading"><span className="workout-day-number">{String(day.dayNumber).padStart(2, '0')}</span><div><h5>Day {day.dayNumber} · {day.dayName}{day.isRestDay ? ' · Rest day' : ''}</h5><p>{[day.focusArea, day.durationMinutes != null ? `${number(day.durationMinutes)} min` : null].filter(Boolean).join(' · ') || (day.isRestDay ? 'Time to recover and recharge' : 'Follow the prescribed routine')}</p></div>{day.isRestDay && <Sparkles size={18} aria-hidden="true" />}</div>
          {day.notes && <p className="workout-day-note">{day.notes}</p>}
          {!!day.warmups?.length && <Mobility title="Day warmups" items={day.warmups} compact />}
          {!day.isRestDay && <ExerciseList exercises={day.exercises ?? []} />}
          {!!day.stretches?.length && <Mobility title="Day stretches" items={day.stretches} compact />}
        </section>)}
      </section>) : <ExerciseList exercises={plan.exercises ?? []} />}
    </section>

    <Mobility title="Stretches" items={plan.stretches} />
    <p className="workout-footnote"><LockKeyhole size={13} aria-hidden="true" />Your assigned routine, shown in read-only mode. These are planned exercises, not completed sessions.</p>
  </div>
}
