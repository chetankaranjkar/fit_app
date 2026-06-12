import { Input } from '../../../components/ui/Input'
import type { ExerciseFilters } from '../types'

const selectClass =
  'w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-100 transition-colors focus:border-blue-400/60 focus:outline-none focus:ring-2 focus:ring-blue-400/20'

export function FilterBar({
  value,
  onChange,
}: {
  value: ExerciseFilters
  onChange: (next: ExerciseFilters) => void
}) {
  return (
    <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
      <Input
        value={value.search}
        onChange={(event) => onChange({ ...value, search: event.target.value })}
        placeholder="Search name or muscle group"
      />
      <select
        className={selectClass}
        value={value.category}
        onChange={(event) => onChange({ ...value, category: event.target.value })}
        aria-label="Filter by exercise category"
      >
        <option className="bg-slate-900 text-slate-100" value="">All categories</option>
        <option className="bg-slate-900 text-slate-100" value="Strength">Strength</option>
        <option className="bg-slate-900 text-slate-100" value="Cardio">Cardio</option>
        <option className="bg-slate-900 text-slate-100" value="Mobility">Mobility</option>
        <option className="bg-slate-900 text-slate-100" value="Rehab">Rehab</option>
      </select>
      <select
        className={selectClass}
        value={value.difficulty}
        onChange={(event) => onChange({ ...value, difficulty: event.target.value })}
        aria-label="Filter by difficulty"
      >
        <option className="bg-slate-900 text-slate-100" value="">All difficulty</option>
        <option className="bg-slate-900 text-slate-100" value="Beginner">Beginner</option>
        <option className="bg-slate-900 text-slate-100" value="Intermediate">Intermediate</option>
        <option className="bg-slate-900 text-slate-100" value="Advanced">Advanced</option>
      </select>
      <Input
        value={value.equipment}
        onChange={(event) => onChange({ ...value, equipment: event.target.value })}
        placeholder="Equipment filter"
      />
    </div>
  )
}
