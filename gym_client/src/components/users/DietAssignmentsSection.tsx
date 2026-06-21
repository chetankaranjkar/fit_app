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
  canAssignTrainingServices = true,
  trainingBlockedMessage,
  onAssignDiet,
  onChangeDiet,
  onRemoveDiet,
}: {
  assignments: UserDietPlanDto[]
  dietLoading: boolean
  viewMode: boolean
  dietActionPending: boolean
  canAssignTrainingServices?: boolean
  trainingBlockedMessage?: string
  onAssignDiet: () => void
  onChangeDiet: () => void
  onRemoveDiet: (assignment: UserDietPlanDto) => void
}) {
  const hasActiveDiet = memberHasDietAssignment(assignments)
  const assignDisabled = dietActionPending || !canAssignTrainingServices

  return (
    <section className="relative overflow-hidden rounded-3xl border border-amber-500/25 bg-gradient-to-br from-amber-950/45 via-[rgba(22,18,32,0.88)] to-orange-950/35 shadow-lg shadow-amber-950/25">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r from-amber-400 via-orange-400 to-rose-400 opacity-90"
      />
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-amber-500/15 px-8 py-5">
        <div className="flex min-w-0 items-start gap-4">
          <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 text-white shadow-md shadow-amber-900/40">
            <svg className="size-6" fill="none" stroke="currentColor" strokeWidth={1.75} viewBox="0 0 24 24" aria-hidden>
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M11.25 20.25c-4.556 0-8.25-2.912-8.25-6.75 0-2.017 1.023-3.865 2.706-5.044C7.318 6.486 9.578 6 12 6c2.422 0 4.682.486 6.294 1.456 1.683 1.179 2.706 3.027 2.706 5.044 0 3.838-3.694 6.75-8.25 6.75H11.25z"
              />
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v14.25M12 6C10 8.5 10 11 10 13.5" />
            </svg>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-amber-300/90">Diet plan</p>
            <h2 className="text-lg font-semibold text-white">Nutrition assignment</h2>
            <p className="mt-1 text-sm text-amber-100/50">One active diet plan per member.</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          <span className="rounded-full bg-amber-500/10 px-3 py-1.5 text-xs text-amber-100/90 ring-1 ring-amber-400/25">
            {assignments.length} assignment{assignments.length !== 1 ? 's' : ''}
          </span>
          {!viewMode && (
            <Button
              className="!bg-gradient-to-r !from-amber-500 !to-orange-500 !px-4 !py-2.5 !text-sm !text-white hover:!brightness-110"
              onClick={hasActiveDiet ? onChangeDiet : onAssignDiet}
              disabled={assignDisabled}
            >
              {hasActiveDiet ? 'Change plan' : '+ Assign diet plan'}
            </Button>
          )}
        </div>
      </div>
      <div className="px-8 py-7">
        {!canAssignTrainingServices && !viewMode && trainingBlockedMessage ? (
          <p className="mb-5 rounded-xl border border-amber-400/25 bg-amber-500/10 px-5 py-4 text-sm text-amber-100">
            {trainingBlockedMessage}
          </p>
        ) : null}
        {dietLoading ? (
          <p className="text-base text-slate-400">Loading diet assignments…</p>
        ) : assignments.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-amber-500/25 bg-amber-500/[0.04] p-10 text-center">
            <p className="text-base text-amber-100/60">
              No diet plan assigned. Assign one so the member sees meals in the mobile app.
            </p>
            {!viewMode && (
              <Button
                className="mt-4 !bg-gradient-to-r !from-amber-500 !to-orange-500 !px-4 !py-2.5 !text-sm !text-white hover:!brightness-110"
                onClick={onAssignDiet}
                disabled={assignDisabled}
              >
                Assign diet plan
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {assignments.map((assignment) => {
              const isEnded = assignment.endDate
                ? new Date(assignment.endDate).getTime() < Date.now()
                : false
              return (
                <div
                  key={assignment.id}
                  className="rounded-2xl border border-amber-500/20 bg-amber-500/[0.06] p-5"
                >
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <div className="flex flex-wrap items-center gap-2.5">
                        <p className="text-base font-semibold text-white">
                          {assignment.dietPlanName ?? `Plan #${assignment.dietPlanId}`}
                        </p>
                        {assignment.isActive ? (
                          <span className="rounded-full bg-emerald-500/15 px-2.5 py-1 text-xs font-semibold text-emerald-200 ring-1 ring-emerald-400/30">
                            Active
                          </span>
                        ) : (
                          <span className="rounded-full bg-slate-500/15 px-2.5 py-1 text-xs font-semibold text-slate-300 ring-1 ring-slate-400/20">
                            Inactive
                          </span>
                        )}
                        {isEnded && (
                          <span className="rounded-full bg-amber-500/15 px-2.5 py-1 text-xs font-semibold text-amber-200 ring-1 ring-amber-400/30">
                            Ended
                          </span>
                        )}
                      </div>
                      <div className="mt-3 grid grid-cols-1 gap-2.5 text-sm text-slate-400 sm:grid-cols-2">
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
                        <p className="mt-3 text-sm text-slate-500">{assignment.notes}</p>
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
