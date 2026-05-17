import { Button } from '../ui/Button'
import { memberHasDietAssignment } from '../../lib/userDietPlanUtils'
import type { UserDietPlanDto } from '../../types/dietPlan'

function formatDate(iso: string) {
  if (!iso) return '—'
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleDateString()
}

export function DietAssignmentsSection({
  assignments,
  dietLoading,
  viewMode,
  dietActionPending,
  onAssignDiet,
  onChangeDiet,
  onRemoveDiet,
}: {
  assignments: UserDietPlanDto[]
  dietLoading: boolean
  viewMode: boolean
  dietActionPending: boolean
  onAssignDiet: () => void
  onChangeDiet: () => void
  onRemoveDiet: (assignment: UserDietPlanDto) => void
}) {
  const hasActiveDiet = memberHasDietAssignment(assignments)

  return (
    <section className="overflow-hidden rounded-2xl border border-white/10 bg-[rgba(17,17,39,0.55)]">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/5 px-6 py-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-400">Diet plan</p>
          <h2 className="text-base font-semibold text-white">Nutrition assignment</h2>
          <p className="mt-0.5 text-xs text-slate-500">One active diet plan per member.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-white/5 px-2.5 py-1 text-[11px] text-slate-400 ring-1 ring-white/10">
            {assignments.length} assignment{assignments.length !== 1 ? 's' : ''}
          </span>
          {!viewMode && (
            <Button
              size="sm"
              onClick={hasActiveDiet ? onChangeDiet : onAssignDiet}
              disabled={dietActionPending}
            >
              {hasActiveDiet ? 'Change plan' : '+ Assign diet plan'}
            </Button>
          )}
        </div>
      </div>
      <div className="px-6 py-5">
        {dietLoading ? (
          <p className="text-sm text-slate-400">Loading diet assignments…</p>
        ) : assignments.length === 0 ? (
          <div>
            <p className="text-sm text-slate-400">
              No diet plan assigned. Assign one so the member sees meals in the mobile app.
            </p>
            {!viewMode && (
              <Button size="sm" className="mt-3" onClick={onAssignDiet}>
                Assign diet plan
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {assignments.map((assignment) => {
              const isEnded = assignment.endDate
                ? new Date(assignment.endDate).getTime() < Date.now()
                : false
              return (
                <div
                  key={assignment.id}
                  className="rounded-xl border border-white/10 bg-white/[0.03] p-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-semibold text-white">
                          {assignment.dietPlanName ?? `Plan #${assignment.dietPlanId}`}
                        </p>
                        {assignment.isActive ? (
                          <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-semibold text-emerald-200 ring-1 ring-emerald-400/30">
                            Active
                          </span>
                        ) : (
                          <span className="rounded-full bg-slate-500/15 px-2 py-0.5 text-[10px] font-semibold text-slate-300 ring-1 ring-slate-400/20">
                            Inactive
                          </span>
                        )}
                        {isEnded && (
                          <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-semibold text-amber-200 ring-1 ring-amber-400/30">
                            Ended
                          </span>
                        )}
                      </div>
                      <div className="mt-2 grid grid-cols-1 gap-2 text-xs text-slate-400 sm:grid-cols-2">
                        <span>
                          Start:{' '}
                          <strong className="text-slate-200">
                            {assignment.startDate ? formatDate(assignment.startDate) : '—'}
                          </strong>
                        </span>
                        <span>
                          End:{' '}
                          <strong className="text-slate-200">
                            {assignment.endDate ? formatDate(assignment.endDate) : 'Ongoing'}
                          </strong>
                        </span>
                      </div>
                      {assignment.notes && (
                        <p className="mt-2 text-xs text-slate-500">{assignment.notes}</p>
                      )}
                    </div>
                    {!viewMode && (
                      <Button
                        variant="soft"
                        size="sm"
                        className="!bg-rose-500/10 !text-rose-300 hover:!bg-rose-500/20"
                        disabled={dietActionPending}
                        onClick={() => onRemoveDiet(assignment)}
                      >
                        Remove
                      </Button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </section>
  )
}
