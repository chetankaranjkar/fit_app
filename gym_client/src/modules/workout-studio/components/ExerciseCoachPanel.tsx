import { useMemo, useState } from 'react'
import { AlertTriangle, ChevronDown, ChevronUp, ImageOff, ListChecks, Timer } from 'lucide-react'
import type { WorkoutCanvasExercise } from '../types'

/* ------------------------------------------------------------------ */
/* Exercise classification + coaching cues                             */
/* ------------------------------------------------------------------ */

type ExerciseKind =
  | 'squat'
  | 'deadlift'
  | 'bench'
  | 'overhead'
  | 'push-up'
  | 'pull-up'
  | 'row'
  | 'curl'
  | 'tricep'
  | 'lunge'
  | 'plank'
  | 'core'
  | 'cardio'
  | 'idle'

function classifyExercise(name: string | null | undefined): ExerciseKind {
  const n = (name ?? '').toLowerCase().trim()
  if (!n) return 'idle'
  if (/squat/.test(n)) return 'squat'
  if (/deadlift|hinge|rdl|good\s*morning/.test(n)) return 'deadlift'
  if (/bench|chest\s*press|incline\s*press|decline\s*press|fly|pec\s*deck/.test(n)) return 'bench'
  if (/overhead|shoulder\s*press|military|ohp|lateral\s*raise/.test(n)) return 'overhead'
  if (/push.?up|pushup/.test(n)) return 'push-up'
  if (/pull.?up|chin.?up|lat\s*pulldown|pulldown/.test(n)) return 'pull-up'
  if (/row|seated\s*row|t.?bar/.test(n)) return 'row'
  if (/curl|bicep/.test(n)) return 'curl'
  if (/tricep|skull|push.?down|kickback|\bdip\b/.test(n)) return 'tricep'
  if (/lunge|split\s*squat|step.?up|bulgarian/.test(n)) return 'lunge'
  if (/plank/.test(n)) return 'plank'
  if (/crunch|sit.?up|leg\s*raise|hollow|russian\s*twist|woodchop/.test(n)) return 'core'
  if (/run|jog|cycle|row\s*erg|jump\s*rope|jumping\s*jack|burpee|mountain\s*climber/.test(n)) return 'cardio'
  return 'idle'
}

interface CoachingCues {
  label: string
  tempo: string
  setup: string[]
  execution: string[]
  mistakes: string[]
}

const CUES: Record<ExerciseKind, CoachingCues> = {
  squat: {
    label: 'Back Squat',
    tempo: '3-1-1-0',
    setup: [
      'Bar racked across upper traps; feet shoulder-width, toes 10–15° out',
      'Brace core, big chest, neutral spine',
    ],
    execution: [
      'Push hips back and down — knees track over toes',
      'Descend until hip crease passes knee',
      'Drive through mid-foot to stand',
    ],
    mistakes: ['Knees caving inward', 'Heels lifting off the floor', 'Lower back rounding at the bottom'],
  },
  deadlift: {
    label: 'Deadlift',
    tempo: '1-0-2-1',
    setup: [
      'Bar over mid-foot, shins ~1 inch from bar',
      'Hips between knees and shoulders, lats tight, neutral spine',
    ],
    execution: [
      'Push the floor away — bar drags up the shins',
      'Lock out hips and knees together',
      'Hinge back the same path — control the descent',
    ],
    mistakes: ['Rounding the lower back', 'Bar drifting away from the body', 'Hyperextending at lockout'],
  },
  bench: {
    label: 'Bench Press',
    tempo: '2-1-1-0',
    setup: [
      'Eyes under the bar, shoulder blades pinned, slight arch',
      'Grip just outside shoulder width, feet planted',
    ],
    execution: [
      'Unrack and lower bar to mid-chest with control',
      'Elbows tucked ~45° from torso',
      'Press up and slightly back over shoulders',
    ],
    mistakes: ['Flaring elbows to 90°', 'Bouncing the bar off the chest', 'Losing scapular retraction'],
  },
  overhead: {
    label: 'Overhead Press',
    tempo: '2-0-1-0',
    setup: [
      'Bar on front delts, grip just outside shoulders',
      'Glutes + abs braced, ribs stacked over hips',
    ],
    execution: [
      'Press the bar straight up, head moves forward as bar clears',
      'Lock out with biceps near ears',
      'Lower under control to the start',
    ],
    mistakes: ['Excessive lower-back arch', 'Pressing the bar in front of the body', 'Soft core leading to leg drive'],
  },
  'push-up': {
    label: 'Push-up',
    tempo: '2-1-1-0',
    setup: [
      'Hands under shoulders, body in a straight line head-to-heels',
      'Brace abs and squeeze glutes',
    ],
    execution: [
      'Lower chest to within an inch of the floor',
      'Elbows angle back ~45°',
      'Press explosively to full lockout',
    ],
    mistakes: ['Sagging hips', 'Flared elbows', 'Partial range of motion'],
  },
  'pull-up': {
    label: 'Pull-up',
    tempo: '2-1-1-1',
    setup: [
      'Grip slightly wider than shoulders, full hang with active shoulders',
      'Engage lats — think "pull elbows to back pocket"',
    ],
    execution: [
      'Pull chest toward bar, chin clears top',
      'Pause briefly, then lower under control',
    ],
    mistakes: ['Kipping for momentum', 'Half reps without full hang', 'Shrugging shoulders to the ears'],
  },
  row: {
    label: 'Row',
    tempo: '2-1-1-1',
    setup: [
      'Hinge at hips, chest up, neutral spine',
      'Grip with elbows ready to drive back, not flare out',
    ],
    execution: [
      'Pull elbows past your ribs',
      'Squeeze shoulder blades together at the top',
      'Lower with control, full stretch at the bottom',
    ],
    mistakes: ['Using lower back to swing the weight', 'Shortened range of motion', 'Pulling with biceps instead of back'],
  },
  curl: {
    label: 'Bicep Curl',
    tempo: '2-1-2-0',
    setup: ['Stand tall, elbows tucked at sides, palms facing up'],
    execution: [
      'Curl the weight by flexing the elbow only',
      'Squeeze biceps at the top',
      'Lower slowly — fight the eccentric',
    ],
    mistakes: ['Swinging hips for momentum', 'Elbows drifting forward', 'Half reps cutting off the stretch'],
  },
  tricep: {
    label: 'Tricep Work',
    tempo: '2-1-1-0',
    setup: ['Elbows pinned to your sides or overhead position locked in'],
    execution: [
      'Extend at the elbow only — upper arm stays still',
      'Squeeze triceps at full lockout',
      'Lower under control to a deep stretch',
    ],
    mistakes: ['Elbow flaring out', 'Using shoulder to push', 'Cutting range of motion short'],
  },
  lunge: {
    label: 'Lunge',
    tempo: '2-1-1-0',
    setup: [
      'Stand tall, step to a stride length that lets the front shin stay vertical',
      'Brace core, eyes forward',
    ],
    execution: [
      'Lower the back knee toward the floor',
      'Drive through the front mid-foot to return',
      'Alternate legs or finish all reps on one side',
    ],
    mistakes: ['Front knee collapsing inward', 'Leaning torso too far forward', 'Stride too short — knee travels past toes'],
  },
  plank: {
    label: 'Plank',
    tempo: 'Hold',
    setup: [
      'Forearms shoulder-width, elbows under shoulders',
      'Body in a straight line, glutes and abs squeezed',
    ],
    execution: ['Hold position — breathe steadily through the nose', 'Keep neck neutral, eyes down'],
    mistakes: ['Hips sagging or piking up', 'Holding breath', 'Letting shoulders drift toward ears'],
  },
  core: {
    label: 'Core Work',
    tempo: '2-1-1-1',
    setup: ['Lie or set up in start position with lower back lightly pressed down'],
    execution: [
      'Move with the abs — not the hip flexors',
      'Exhale on the contraction, inhale on the return',
    ],
    mistakes: ['Yanking on the neck', 'Using momentum instead of control', 'Holding breath throughout the set'],
  },
  cardio: {
    label: 'Conditioning',
    tempo: 'Pace',
    setup: ['Start with a 2–3 minute light warm-up to raise heart rate'],
    execution: [
      'Settle into a sustainable pace — nasal breathing if possible',
      'Progress effort across the interval or duration',
    ],
    mistakes: ['Going out too hot and fading', 'Holding tension in shoulders', 'Inconsistent breathing'],
  },
  idle: {
    label: 'Ready Stance',
    tempo: '—',
    setup: ['Pick an exercise from the canvas to load form cues here'],
    execution: [],
    mistakes: [],
  },
}

/* ------------------------------------------------------------------ */
/* Media — video loop or image fallback                                */
/* ------------------------------------------------------------------ */

function ExerciseMedia({
  videoUrl,
  imageUrl,
  exerciseName,
}: {
  videoUrl?: string | null
  imageUrl?: string | null
  exerciseName: string | null
}) {
  if (videoUrl) {
    return (
      <video
        key={videoUrl}
        autoPlay
        loop
        muted
        playsInline
        preload="metadata"
        poster={imageUrl ?? undefined}
        className="h-full w-full object-cover"
      >
        <source src={videoUrl} />
      </video>
    )
  }
  if (imageUrl) {
    return (
      <img
        src={imageUrl}
        alt={exerciseName ?? 'Exercise demo'}
        className="h-full w-full object-cover"
      />
    )
  }
  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-2 bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900 text-slate-500">
      <ImageOff size={28} className="opacity-60" />
      <p className="text-[11px] uppercase tracking-[0.18em]">No demo available</p>
      <p className="px-6 text-center text-[11px] text-slate-600">
        Add a <span className="font-mono text-slate-400">videoUrl</span> to this exercise in the library to preview the movement here.
      </p>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Public component                                                    */
/* ------------------------------------------------------------------ */

interface ExerciseCoachPanelProps {
  selectedExercise: WorkoutCanvasExercise | null
}

export function ExerciseCoachPanel({ selectedExercise }: ExerciseCoachPanelProps) {
  const [showMistakes, setShowMistakes] = useState(false)
  const exerciseName = selectedExercise?.name ?? null
  const kind = useMemo(() => classifyExercise(exerciseName), [exerciseName])
  const cues = CUES[kind]
  const headerLabel = exerciseName ?? cues.label

  return (
    <div className="overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 shadow-[0_18px_40px_-20px_rgba(14,165,233,0.45)]">
      {/* Header */}
      <div className="flex items-center justify-between gap-2 border-b border-white/5 bg-slate-950/60 px-3 py-2 backdrop-blur">
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-sky-300/80">Exercise Coach</p>
          <p className="truncate text-sm font-semibold text-white">{headerLabel}</p>
        </div>
        <div className="flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-2 py-1 text-[10px] uppercase tracking-[0.18em] text-slate-300">
          <Timer size={11} className="text-sky-300" />
          {cues.tempo}
        </div>
      </div>

      {/* Media */}
      <div className="relative aspect-video w-full overflow-hidden border-b border-white/5 bg-slate-950">
        <ExerciseMedia
          videoUrl={selectedExercise?.videoUrl}
          imageUrl={selectedExercise?.imageUrl}
          exerciseName={exerciseName}
        />
        {selectedExercise?.muscleGroupPrimary ? (
          <div className="absolute left-2 top-2 rounded-full border border-white/10 bg-slate-950/70 px-2 py-1 text-[10px] uppercase tracking-[0.18em] text-sky-200 backdrop-blur">
            {selectedExercise.muscleGroupPrimary}
          </div>
        ) : null}
        {selectedExercise?.difficulty ? (
          <div className="absolute right-2 top-2 rounded-full border border-amber-300/30 bg-amber-500/10 px-2 py-1 text-[10px] uppercase tracking-[0.18em] text-amber-200 backdrop-blur">
            {selectedExercise.difficulty}
          </div>
        ) : null}
      </div>

      {/* Cues */}
      <div className="space-y-3 px-3 py-3 text-[12px] leading-relaxed text-slate-200">
        {cues.setup.length > 0 ? (
          <section>
            <p className="mb-1 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-sky-300/80">
              <ListChecks size={11} /> Setup
            </p>
            <ul className="space-y-1 pl-1">
              {cues.setup.map((line) => (
                <li key={line} className="flex gap-2">
                  <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-sky-400" />
                  <span>{line}</span>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {cues.execution.length > 0 ? (
          <section>
            <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-emerald-300/80">Execution</p>
            <ol className="space-y-1 pl-1">
              {cues.execution.map((line, i) => (
                <li key={line} className="flex gap-2">
                  <span className="mt-0.5 inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-emerald-500/15 text-[10px] font-semibold text-emerald-300">
                    {i + 1}
                  </span>
                  <span>{line}</span>
                </li>
              ))}
            </ol>
          </section>
        ) : null}

        {cues.mistakes.length > 0 ? (
          <section>
            <button
              type="button"
              onClick={() => setShowMistakes((v) => !v)}
              className="flex w-full items-center justify-between rounded-lg border border-rose-400/20 bg-rose-500/5 px-2 py-1.5 text-left text-[11px] font-semibold uppercase tracking-[0.16em] text-rose-200 hover:bg-rose-500/10"
            >
              <span className="flex items-center gap-1.5">
                <AlertTriangle size={12} /> Common mistakes
              </span>
              {showMistakes ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>
            {showMistakes ? (
              <ul className="mt-2 space-y-1 pl-1">
                {cues.mistakes.map((line) => (
                  <li key={line} className="flex gap-2 text-rose-100/90">
                    <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-rose-400" />
                    <span>{line}</span>
                  </li>
                ))}
              </ul>
            ) : null}
          </section>
        ) : null}
      </div>
    </div>
  )
}
