import { useMemo } from 'react'
import { Flame } from 'lucide-react'

/* ------------------------------------------------------------------ */
/* Muscle taxonomy + exercise → muscle mapping                         */
/* ------------------------------------------------------------------ */

type Activation = 'primary' | 'secondary' | 'none'

type MuscleKey =
  | 'chest'
  | 'shoulders-front'
  | 'shoulders-rear'
  | 'biceps'
  | 'triceps'
  | 'forearms'
  | 'abs'
  | 'obliques'
  | 'lats'
  | 'traps'
  | 'rhomboids'
  | 'lower-back'
  | 'quads'
  | 'hamstrings'
  | 'glutes'
  | 'calves'
  | 'adductors'
  | 'neck'

interface ExerciseMuscles {
  primary: MuscleKey[]
  secondary: MuscleKey[]
}

const EMPTY: ExerciseMuscles = { primary: [], secondary: [] }

const EXERCISE_DB: Array<{ pattern: RegExp; data: ExerciseMuscles }> = [
  { pattern: /squat/i, data: { primary: ['quads', 'glutes'], secondary: ['hamstrings', 'abs', 'calves', 'adductors'] } },
  {
    pattern: /deadlift|rdl|romanian|hinge|good\s*morning/i,
    data: { primary: ['hamstrings', 'glutes', 'lower-back'], secondary: ['lats', 'traps', 'forearms', 'abs'] },
  },
  {
    pattern: /bench|chest\s*press|incline\s*press|decline\s*press|dumbbell\s*press/i,
    data: { primary: ['chest'], secondary: ['shoulders-front', 'triceps'] },
  },
  {
    pattern: /overhead|shoulder\s*press|military|ohp|arnold\s*press/i,
    data: { primary: ['shoulders-front'], secondary: ['triceps', 'traps', 'abs'] },
  },
  {
    pattern: /push.?up|pushup/i,
    data: { primary: ['chest'], secondary: ['shoulders-front', 'triceps', 'abs'] },
  },
  {
    pattern: /pull.?up|chin.?up/i,
    data: { primary: ['lats'], secondary: ['biceps', 'rhomboids', 'shoulders-rear', 'forearms'] },
  },
  {
    pattern: /lat\s*pulldown|pulldown/i,
    data: { primary: ['lats'], secondary: ['biceps', 'shoulders-rear'] },
  },
  {
    pattern: /row|cable\s*row|seated\s*row|barbell\s*row|t.?bar\s*row/i,
    data: { primary: ['lats', 'rhomboids'], secondary: ['biceps', 'shoulders-rear', 'traps', 'forearms'] },
  },
  { pattern: /curl|bicep/i, data: { primary: ['biceps'], secondary: ['forearms'] } },
  {
    pattern: /tricep|skull\s*crusher|kickback|push.?down/i,
    data: { primary: ['triceps'], secondary: ['shoulders-front'] },
  },
  { pattern: /\bdip\b/i, data: { primary: ['triceps', 'chest'], secondary: ['shoulders-front'] } },
  {
    pattern: /lunge|split\s*squat|step.?up|bulgarian/i,
    data: { primary: ['quads', 'glutes'], secondary: ['hamstrings', 'calves'] },
  },
  { pattern: /leg\s*press/i, data: { primary: ['quads', 'glutes'], secondary: ['hamstrings'] } },
  { pattern: /leg\s*extension/i, data: { primary: ['quads'], secondary: [] } },
  {
    pattern: /leg\s*curl|hamstring\s*curl|nordic/i,
    data: { primary: ['hamstrings'], secondary: ['glutes'] },
  },
  {
    pattern: /hip\s*thrust|glute\s*bridge|glute\s*kickback/i,
    data: { primary: ['glutes'], secondary: ['hamstrings'] },
  },
  { pattern: /calf\s*raise|calf/i, data: { primary: ['calves'], secondary: [] } },
  { pattern: /plank/i, data: { primary: ['abs'], secondary: ['shoulders-front', 'obliques'] } },
  {
    pattern: /crunch|sit.?up|leg\s*raise|hollow/i,
    data: { primary: ['abs'], secondary: ['obliques'] },
  },
  {
    pattern: /russian\s*twist|woodchop|side\s*bend/i,
    data: { primary: ['obliques'], secondary: ['abs'] },
  },
  {
    pattern: /lateral\s*raise|side\s*raise|upright\s*row/i,
    data: { primary: ['shoulders-front'], secondary: ['traps'] },
  },
  {
    pattern: /face\s*pull|reverse\s*fly|rear\s*delt/i,
    data: { primary: ['shoulders-rear'], secondary: ['rhomboids', 'traps'] },
  },
  { pattern: /shrug/i, data: { primary: ['traps'], secondary: ['forearms'] } },
  { pattern: /fly|pec\s*deck/i, data: { primary: ['chest'], secondary: ['shoulders-front'] } },
  {
    pattern: /clean|snatch|jerk/i,
    data: {
      primary: ['quads', 'glutes', 'traps', 'shoulders-front'],
      secondary: ['hamstrings', 'abs', 'lower-back', 'forearms'],
    },
  },
  {
    pattern: /burpee/i,
    data: { primary: ['chest', 'quads'], secondary: ['shoulders-front', 'abs', 'glutes', 'triceps'] },
  },
  {
    pattern: /mountain\s*climber/i,
    data: { primary: ['abs'], secondary: ['shoulders-front', 'quads', 'obliques'] },
  },
  { pattern: /jump\s*rope|jumping\s*jack/i, data: { primary: ['calves'], secondary: ['quads'] } },
]

function classifyMuscles(name: string | null | undefined): ExerciseMuscles {
  if (!name) return EMPTY
  for (const entry of EXERCISE_DB) if (entry.pattern.test(name)) return entry.data
  return EMPTY
}

function activationOf(muscle: MuscleKey, m: ExerciseMuscles): Activation {
  if (m.primary.includes(muscle)) return 'primary'
  if (m.secondary.includes(muscle)) return 'secondary'
  return 'none'
}

const MUSCLE_LABELS: Record<MuscleKey, string> = {
  chest: 'Chest',
  'shoulders-front': 'Front Delts',
  'shoulders-rear': 'Rear Delts',
  biceps: 'Biceps',
  triceps: 'Triceps',
  forearms: 'Forearms',
  abs: 'Abs',
  obliques: 'Obliques',
  lats: 'Lats',
  traps: 'Traps',
  rhomboids: 'Rhomboids',
  'lower-back': 'Lower Back',
  quads: 'Quads',
  hamstrings: 'Hamstrings',
  glutes: 'Glutes',
  calves: 'Calves',
  adductors: 'Adductors',
  neck: 'Neck',
}

const COLOR = {
  primary: '#ef4444',
  secondary: '#f59e0b',
  none: '#1e293b',
  body: '#334155',
  joint: '#475569',
  outline: '#0f172a',
} as const

function fillFor(a: Activation) {
  return COLOR[a]
}

/* ------------------------------------------------------------------ */
/* Front silhouette                                                    */
/* ------------------------------------------------------------------ */

function FrontBody({ muscles }: { muscles: ExerciseMuscles }) {
  const a = (m: MuscleKey) => activationOf(m, muscles)
  return (
    <svg viewBox="0 0 200 460" xmlns="http://www.w3.org/2000/svg" className="h-full w-full">
      <g stroke={COLOR.outline} strokeWidth={1.2} strokeLinejoin="round">
        {/* Body silhouette base — neutral fill so spots not covered by a muscle still read as "body" */}
        <g fill={COLOR.body}>
          {/* Head */}
          <circle cx={100} cy={30} r={24} />
          {/* Neck */}
          <path d={`M 88,50 L 112,50 L 116,68 L 84,68 Z`} fill={fillFor(a('neck'))} />
          {/* Torso slab (shoulders → hips) */}
          <path d="M 50,72 Q 60,68 76,70 L 124,70 Q 140,68 150,72 L 154,128 L 148,200 L 138,228 L 62,228 L 52,200 L 46,128 Z" />
          {/* Upper arms */}
          <path d="M 32,80 Q 24,84 22,96 L 26,164 L 38,170 L 54,168 L 56,118 L 50,82 Z" />
          <path d="M 168,80 Q 176,84 178,96 L 174,164 L 162,170 L 146,168 L 144,118 L 150,82 Z" />
          {/* Forearms */}
          <path d="M 26,164 L 38,170 L 36,222 L 24,224 L 18,180 Z" />
          <path d="M 174,164 L 162,170 L 164,222 L 176,224 L 182,180 Z" />
          {/* Hands */}
          <ellipse cx={29} cy={236} rx={11} ry={9} />
          <ellipse cx={171} cy={236} rx={11} ry={9} />
          {/* Pelvis */}
          <path d="M 62,224 L 138,224 L 134,256 L 66,256 Z" fill={COLOR.joint} />
          {/* Thighs */}
          <path d="M 66,252 L 100,252 L 100,338 L 70,344 L 60,290 Z" />
          <path d="M 134,252 L 100,252 L 100,338 L 130,344 L 140,290 Z" />
          {/* Knees */}
          <ellipse cx={82} cy={344} rx={14} ry={9} fill={COLOR.joint} />
          <ellipse cx={118} cy={344} rx={14} ry={9} fill={COLOR.joint} />
          {/* Lower legs (front shin/tib) */}
          <path d="M 70,348 L 96,348 L 92,420 L 72,420 Z" />
          <path d="M 130,348 L 104,348 L 108,420 L 128,420 Z" />
          {/* Feet */}
          <path d="M 68,420 L 96,420 L 92,442 L 70,442 Z" fill={COLOR.joint} />
          <path d="M 132,420 L 104,420 L 108,442 L 130,442 Z" fill={COLOR.joint} />
        </g>
      </g>

      {/* ---- Muscle highlights on top ---- */}
      <g strokeWidth={0.6} stroke={COLOR.outline}>
        {/* Trapezius (front upper) */}
        <path d="M 76,68 L 124,68 L 144,82 L 56,82 Z" fill={fillFor(a('traps'))} />
        {/* Anterior deltoids */}
        <ellipse cx={56} cy={92} rx={16} ry={13} fill={fillFor(a('shoulders-front'))} />
        <ellipse cx={144} cy={92} rx={16} ry={13} fill={fillFor(a('shoulders-front'))} />
        {/* Pectorals (left & right halves) */}
        <path d="M 60,98 Q 60,134 92,134 L 100,132 L 100,108 Q 92,98 78,98 Z" fill={fillFor(a('chest'))} />
        <path d="M 140,98 Q 140,134 108,134 L 100,132 L 100,108 Q 108,98 122,98 Z" fill={fillFor(a('chest'))} />
        {/* Biceps */}
        <ellipse cx={42} cy={128} rx={12} ry={26} fill={fillFor(a('biceps'))} />
        <ellipse cx={158} cy={128} rx={12} ry={26} fill={fillFor(a('biceps'))} />
        {/* Forearms */}
        <ellipse cx={32} cy={190} rx={10} ry={26} fill={fillFor(a('forearms'))} />
        <ellipse cx={168} cy={190} rx={10} ry={26} fill={fillFor(a('forearms'))} />
        {/* Abdominals — 6-pack stack */}
        <g fill={fillFor(a('abs'))}>
          <rect x={90} y={138} width={20} height={14} rx={3} />
          <rect x={90} y={154} width={20} height={14} rx={3} />
          <rect x={90} y={170} width={20} height={14} rx={3} />
          <rect x={90} y={186} width={20} height={14} rx={3} />
          <rect x={90} y={202} width={20} height={16} rx={4} />
        </g>
        {/* Obliques */}
        <path d="M 64,140 L 88,148 L 88,210 L 70,212 Z" fill={fillFor(a('obliques'))} />
        <path d="M 136,140 L 112,148 L 112,210 L 130,212 Z" fill={fillFor(a('obliques'))} />
        {/* Quads */}
        <ellipse cx={82} cy={296} rx={18} ry={42} fill={fillFor(a('quads'))} />
        <ellipse cx={118} cy={296} rx={18} ry={42} fill={fillFor(a('quads'))} />
        {/* Adductors (inner thigh) */}
        <ellipse cx={100} cy={284} rx={6} ry={32} fill={fillFor(a('adductors'))} opacity={0.92} />
        {/* Lower-leg fronts (use 'calves' so they react with calves activation) */}
        <ellipse cx={82} cy={384} rx={11} ry={32} fill={fillFor(a('calves'))} />
        <ellipse cx={118} cy={384} rx={11} ry={32} fill={fillFor(a('calves'))} />
      </g>
    </svg>
  )
}

/* ------------------------------------------------------------------ */
/* Back silhouette                                                     */
/* ------------------------------------------------------------------ */

function BackBody({ muscles }: { muscles: ExerciseMuscles }) {
  const a = (m: MuscleKey) => activationOf(m, muscles)
  return (
    <svg viewBox="0 0 200 460" xmlns="http://www.w3.org/2000/svg" className="h-full w-full">
      <g stroke={COLOR.outline} strokeWidth={1.2} strokeLinejoin="round">
        <g fill={COLOR.body}>
          {/* Head */}
          <circle cx={100} cy={30} r={24} />
          {/* Neck */}
          <path d="M 88,50 L 112,50 L 116,68 L 84,68 Z" fill={fillFor(a('neck'))} />
          {/* Torso slab */}
          <path d="M 50,72 Q 60,68 76,70 L 124,70 Q 140,68 150,72 L 154,128 L 148,200 L 138,228 L 62,228 L 52,200 L 46,128 Z" />
          {/* Arms */}
          <path d="M 32,80 Q 24,84 22,96 L 26,164 L 38,170 L 54,168 L 56,118 L 50,82 Z" />
          <path d="M 168,80 Q 176,84 178,96 L 174,164 L 162,170 L 146,168 L 144,118 L 150,82 Z" />
          {/* Forearms */}
          <path d="M 26,164 L 38,170 L 36,222 L 24,224 L 18,180 Z" />
          <path d="M 174,164 L 162,170 L 164,222 L 176,224 L 182,180 Z" />
          {/* Hands */}
          <ellipse cx={29} cy={236} rx={11} ry={9} />
          <ellipse cx={171} cy={236} rx={11} ry={9} />
          {/* Pelvis (will be covered by glutes if highlighted) */}
          <path d="M 62,224 L 138,224 L 134,260 L 66,260 Z" fill={COLOR.joint} />
          {/* Thighs */}
          <path d="M 66,252 L 100,252 L 100,338 L 70,344 L 60,290 Z" />
          <path d="M 134,252 L 100,252 L 100,338 L 130,344 L 140,290 Z" />
          {/* Knees (back) */}
          <ellipse cx={82} cy={344} rx={14} ry={9} fill={COLOR.joint} />
          <ellipse cx={118} cy={344} rx={14} ry={9} fill={COLOR.joint} />
          {/* Lower legs */}
          <path d="M 70,348 L 96,348 L 92,420 L 72,420 Z" />
          <path d="M 130,348 L 104,348 L 108,420 L 128,420 Z" />
          {/* Heels */}
          <path d="M 68,420 L 96,420 L 92,442 L 70,442 Z" fill={COLOR.joint} />
          <path d="M 132,420 L 104,420 L 108,442 L 130,442 Z" fill={COLOR.joint} />
        </g>
      </g>

      {/* Back muscles overlay */}
      <g strokeWidth={0.6} stroke={COLOR.outline}>
        {/* Trapezius — diamond covering upper back */}
        <path d="M 100,52 L 144,82 L 136,150 L 100,158 L 64,150 L 56,82 Z" fill={fillFor(a('traps'))} />
        {/* Posterior deltoids */}
        <ellipse cx={56} cy={92} rx={15} ry={13} fill={fillFor(a('shoulders-rear'))} />
        <ellipse cx={144} cy={92} rx={15} ry={13} fill={fillFor(a('shoulders-rear'))} />
        {/* Lats — wing shape */}
        <path d="M 56,114 L 90,128 L 90,196 L 68,212 L 54,170 Z" fill={fillFor(a('lats'))} />
        <path d="M 144,114 L 110,128 L 110,196 L 132,212 L 146,170 Z" fill={fillFor(a('lats'))} />
        {/* Rhomboids — between shoulder blades */}
        <rect x={90} y={146} width={20} height={36} rx={4} fill={fillFor(a('rhomboids'))} />
        {/* Triceps */}
        <ellipse cx={42} cy={128} rx={12} ry={26} fill={fillFor(a('triceps'))} />
        <ellipse cx={158} cy={128} rx={12} ry={26} fill={fillFor(a('triceps'))} />
        {/* Forearms */}
        <ellipse cx={32} cy={190} rx={10} ry={26} fill={fillFor(a('forearms'))} />
        <ellipse cx={168} cy={190} rx={10} ry={26} fill={fillFor(a('forearms'))} />
        {/* Lower back / erector spinae */}
        <path d="M 86,184 L 114,184 L 116,220 L 84,220 Z" fill={fillFor(a('lower-back'))} />
        {/* Glutes */}
        <ellipse cx={82} cy={244} rx={20} ry={20} fill={fillFor(a('glutes'))} />
        <ellipse cx={118} cy={244} rx={20} ry={20} fill={fillFor(a('glutes'))} />
        {/* Hamstrings */}
        <ellipse cx={82} cy={300} rx={17} ry={36} fill={fillFor(a('hamstrings'))} />
        <ellipse cx={118} cy={300} rx={17} ry={36} fill={fillFor(a('hamstrings'))} />
        {/* Calves */}
        <ellipse cx={82} cy={384} rx={13} ry={34} fill={fillFor(a('calves'))} />
        <ellipse cx={118} cy={384} rx={13} ry={34} fill={fillFor(a('calves'))} />
      </g>
    </svg>
  )
}

/* ------------------------------------------------------------------ */
/* Public component                                                    */
/* ------------------------------------------------------------------ */

export function MuscleActivationMap({ selectedExercise }: { selectedExercise: string | null }) {
  const muscles = useMemo(() => classifyMuscles(selectedExercise), [selectedExercise])
  const exerciseLabel = selectedExercise ?? 'No exercise selected'
  const totalGroups = muscles.primary.length + muscles.secondary.length

  return (
    <div className="overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 shadow-[0_18px_40px_-20px_rgba(239,68,68,0.35)]">
      {/* Header */}
      <div className="flex items-center justify-between gap-2 border-b border-white/5 bg-slate-950/60 px-3 py-2 backdrop-blur">
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-rose-300/80">Muscles Worked</p>
          <p className="truncate text-sm font-semibold text-white">{exerciseLabel}</p>
        </div>
        <div className="flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-2 py-1 text-[10px] uppercase tracking-[0.18em] text-slate-300">
          <Flame size={11} className="text-rose-400" />
          {totalGroups} {totalGroups === 1 ? 'group' : 'groups'}
        </div>
      </div>

      {/* Body views */}
      <div
        className="grid grid-cols-2 gap-2 p-3"
        style={{
          background:
            'radial-gradient(ellipse at center, rgba(239,68,68,0.10), transparent 60%), radial-gradient(ellipse at top, rgba(56,189,248,0.06), transparent 70%)',
        }}
      >
        <div className="flex flex-col items-center">
          <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">Front</p>
          <div className="h-[300px] w-full">
            <FrontBody muscles={muscles} />
          </div>
        </div>
        <div className="flex flex-col items-center">
          <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">Back</p>
          <div className="h-[300px] w-full">
            <BackBody muscles={muscles} />
          </div>
        </div>
      </div>

      {/* Legend + muscle list */}
      <div className="space-y-2.5 border-t border-white/5 bg-slate-950/60 px-3 py-3">
        <div className="flex items-center gap-3 text-[11px]">
          <div className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-rose-500 shadow-[0_0_8px_rgba(239,68,68,0.6)]" />
            <span className="text-slate-300">Primary</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.5)]" />
            <span className="text-slate-300">Secondary</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-slate-700" />
            <span className="text-slate-400">Inactive</span>
          </div>
        </div>

        {totalGroups > 0 ? (
          <div className="space-y-2">
            {muscles.primary.length > 0 ? (
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-rose-300/80">Primary movers</p>
                <div className="mt-1 flex flex-wrap gap-1">
                  {muscles.primary.map((m) => (
                    <span
                      key={m}
                      className="rounded-full border border-rose-400/30 bg-rose-500/10 px-2 py-0.5 text-[11px] font-medium text-rose-200"
                    >
                      {MUSCLE_LABELS[m]}
                    </span>
                  ))}
                </div>
              </div>
            ) : null}
            {muscles.secondary.length > 0 ? (
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-amber-300/80">
                  Secondary &amp; stabilizers
                </p>
                <div className="mt-1 flex flex-wrap gap-1">
                  {muscles.secondary.map((m) => (
                    <span
                      key={m}
                      className="rounded-full border border-amber-400/30 bg-amber-500/10 px-2 py-0.5 text-[11px] font-medium text-amber-100"
                    >
                      {MUSCLE_LABELS[m]}
                    </span>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        ) : (
          <p className="text-[11px] leading-relaxed text-slate-400">
            Select an exercise from the canvas (or click one in the library) to see which muscles it works.
          </p>
        )}
      </div>
    </div>
  )
}
