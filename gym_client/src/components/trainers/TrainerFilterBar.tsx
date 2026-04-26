import type { TrainerFilters, AvailabilityStatus } from '../../types/trainer'
import { AVAILABILITY_STATUSES, DEFAULT_TRAINER_FILTERS } from '../../types/trainer'

type SortKey = 'name' | 'rating' | 'clients' | 'experience' | 'joined'

interface Props {
  filters: TrainerFilters
  onChange: (f: TrainerFilters) => void
  specializations: string[]
  resultCount: number
  totalCount: number
  sort: { key: SortKey; dir: 'asc' | 'desc' }
  onSortChange: (s: { key: SortKey; dir: 'asc' | 'desc' }) => void
  sortOptions: Array<{ key: SortKey; label: string }>
}

const selectClass =
  'rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-slate-100 transition-colors focus:border-blue-400/60 focus:bg-white/[0.07] focus:outline-none focus:ring-2 focus:ring-blue-400/20'

export function TrainerFilterBar({
  filters,
  onChange,
  specializations,
  resultCount,
  totalCount,
  sort,
  onSortChange,
  sortOptions,
}: Props) {
  const update = <K extends keyof TrainerFilters>(key: K, value: TrainerFilters[K]) =>
    onChange({ ...filters, [key]: value })

  const activeFilters =
    (filters.search ? 1 : 0) +
    (filters.specialization !== 'All' ? 1 : 0) +
    (filters.availability !== 'All' ? 1 : 0) +
    (filters.activeOnly ? 1 : 0) +
    (filters.personalTrainerOnly ? 1 : 0) +
    (filters.minRating != null ? 1 : 0) +
    (filters.minExperienceYears != null ? 1 : 0)

  return (
    <div className="border-b border-white/5 bg-white/[0.02] px-6 py-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        {/* Search + primary filters */}
        <div className="flex flex-1 flex-wrap items-center gap-2">
          <div className="relative min-w-[220px] flex-1 lg:max-w-xs">
            <svg
              className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-4.35-4.35M10 18a8 8 0 100-16 8 8 0 000 16z"
              />
            </svg>
            <input
              type="search"
              value={filters.search}
              onChange={(e) => update('search', e.target.value)}
              placeholder="Search by name, email, code, specialization…"
              className="w-full rounded-xl border border-white/10 bg-white/5 py-2 pl-9 pr-3 text-xs text-slate-100 placeholder:text-slate-500 transition-colors focus:border-blue-400/60 focus:bg-white/[0.07] focus:outline-none focus:ring-2 focus:ring-blue-400/20"
              aria-label="Search trainers"
            />
          </div>

          <select
            aria-label="Filter by specialization"
            className={selectClass}
            value={filters.specialization}
            onChange={(e) => update('specialization', e.target.value as TrainerFilters['specialization'])}
          >
            <option value="All" className="bg-slate-900">
              All specializations
            </option>
            {specializations.map((s) => (
              <option key={s} value={s} className="bg-slate-900">
                {s}
              </option>
            ))}
          </select>

          <select
            aria-label="Filter by availability"
            className={selectClass}
            value={filters.availability}
            onChange={(e) =>
              update('availability', e.target.value as AvailabilityStatus | 'All')
            }
          >
            <option value="All" className="bg-slate-900">
              Any availability
            </option>
            {AVAILABILITY_STATUSES.map((s) => (
              <option key={s} value={s} className="bg-slate-900">
                {s}
              </option>
            ))}
          </select>

          <select
            aria-label="Minimum rating"
            className={selectClass}
            value={filters.minRating ?? ''}
            onChange={(e) =>
              update('minRating', e.target.value ? Number(e.target.value) : null)
            }
          >
            <option value="" className="bg-slate-900">
              Any rating
            </option>
            {[3, 3.5, 4, 4.5].map((v) => (
              <option key={v} value={v} className="bg-slate-900">
                {v}+ ★
              </option>
            ))}
          </select>

          <select
            aria-label="Minimum experience"
            className={selectClass}
            value={filters.minExperienceYears ?? ''}
            onChange={(e) =>
              update('minExperienceYears', e.target.value ? Number(e.target.value) : null)
            }
          >
            <option value="" className="bg-slate-900">
              Any experience
            </option>
            {[1, 3, 5, 10].map((v) => (
              <option key={v} value={v} className="bg-slate-900">
                {v}+ yrs
              </option>
            ))}
          </select>

          <label className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-slate-300">
            <input
              type="checkbox"
              checked={filters.activeOnly}
              onChange={(e) => update('activeOnly', e.target.checked)}
              className="accent-blue-500"
            />
            Active only
          </label>

          <label className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-slate-300">
            <input
              type="checkbox"
              checked={filters.personalTrainerOnly}
              onChange={(e) => update('personalTrainerOnly', e.target.checked)}
              className="accent-blue-500"
            />
            PT only
          </label>

          {activeFilters > 0 && (
            <button
              type="button"
              onClick={() => onChange(DEFAULT_TRAINER_FILTERS)}
              className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-slate-300 transition hover:bg-white/10"
            >
              Clear ({activeFilters})
            </button>
          )}
        </div>

        {/* Sort + count */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-slate-400">
            <span className="font-semibold text-white">{resultCount}</span>
            {' / '}
            {totalCount}
          </span>
          <div className="flex items-center gap-1 rounded-xl border border-white/10 bg-white/5 p-1">
            <select
              aria-label="Sort by"
              value={sort.key}
              onChange={(e) =>
                onSortChange({ ...sort, key: e.target.value as SortKey })
              }
              className="rounded-lg bg-transparent px-2 py-1 text-xs text-slate-200 focus:outline-none"
            >
              {sortOptions.map((o) => (
                <option key={o.key} value={o.key} className="bg-slate-900">
                  {o.label}
                </option>
              ))}
            </select>
            <button
              type="button"
              aria-label={sort.dir === 'asc' ? 'Ascending' : 'Descending'}
              onClick={() =>
                onSortChange({ ...sort, dir: sort.dir === 'asc' ? 'desc' : 'asc' })
              }
              className="rounded-lg px-2 py-1 text-xs text-slate-300 transition hover:bg-white/10 hover:text-white"
              title="Toggle sort direction"
            >
              {sort.dir === 'asc' ? '↑' : '↓'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
