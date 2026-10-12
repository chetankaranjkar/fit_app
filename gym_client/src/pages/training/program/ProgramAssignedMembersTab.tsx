import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ListPagination } from '../../../components/ui/ListPagination'
import { TrainingEmptyState } from '../../../components/training/TrainingEmptyState'
import { getApiErrorMessage } from '../../../lib/apiErrors'
import { programsService } from '../../../services/workoutPlans.service'

function formatDate(value?: string | null, empty = 'Ongoing') {
  if (!value) return empty
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  return date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
}

export function ProgramAssignedMembersTab({ programId }: { programId: number }) {
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const assignmentsUrl = `/dashboard/training/workout-assignments?highlightProgram=${programId}`

  const roster = useQuery({
    queryKey: ['program-assigned-members', programId, page, pageSize],
    queryFn: () => programsService.getAssignedMembers(programId, page, pageSize).then((r) => r.data),
  })

  const totalCount = roster.data?.totalCount ?? 0
  const memberLabel = totalCount === 1 ? 'current member' : 'current members'

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03]">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-white/10 px-6 py-4">
        <div>
          <p className="text-sm text-slate-200">
            {roster.isSuccess ? `${totalCount} ${memberLabel}` : 'Assigned members'}
          </p>
          {roster.data?.profileAccessLimited ? (
            <p className="mt-1 max-w-xl text-xs text-slate-400">
              You can see everyone currently assigned to this program. Profile access is limited to members
              actively assigned to you.
            </p>
          ) : null}
        </div>
        <Link
          to={assignmentsUrl}
          className="text-sm text-cyan-300 underline-offset-2 hover:underline"
        >
          Manage assignments
        </Link>
      </div>

      {roster.isLoading ? (
        <p className="px-6 py-8 text-sm text-slate-400">Loading assigned members…</p>
      ) : roster.isError ? (
        <div className="px-6 py-8 text-sm text-slate-300">
          <p>{getApiErrorMessage(roster.error, 'Could not load assigned members.')}</p>
          <button
            type="button"
            onClick={() => void roster.refetch()}
            className="mt-3 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold text-slate-200 transition hover:bg-white/10"
          >
            Retry
          </button>
        </div>
      ) : totalCount === 0 ? (
        <TrainingEmptyState
          title="No members assigned"
          body="Nobody has a current assignment on this program. Assign it from workout assignments when a member has an active membership."
          actionLabel="Manage assignments"
          to={assignmentsUrl}
        />
      ) : (
        <div className="px-2 pb-4 sm:px-4">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead>
                <tr className="border-b border-white/10 text-xs font-semibold uppercase tracking-wider text-slate-400">
                  <th className="px-4 py-3">Member</th>
                  <th className="px-4 py-3">Assigned coach</th>
                  <th className="px-4 py-3">Assignment</th>
                </tr>
              </thead>
              <tbody>
                {roster.data?.items.map((member) => (
                  <tr key={member.userId} className="border-b border-white/5 transition-colors hover:bg-white/[0.03]">
                    <td className="px-4 py-4 font-medium text-white">
                      {member.canOpenProfile ? (
                        <Link
                          to={`/dashboard/users/${member.userId}`}
                          className="text-cyan-200 underline-offset-2 hover:underline"
                        >
                          {member.memberName}
                        </Link>
                      ) : (
                        <span>{member.memberName}</span>
                      )}
                    </td>
                    <td className="px-4 py-4 text-slate-300">{member.coachLabel}</td>
                    <td className="px-4 py-4 text-slate-300">
                      {formatDate(member.assignmentStartedAt, '—')}
                      {' – '}
                      {formatDate(member.assignmentEndedAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="px-4">
            <ListPagination
              page={page}
              pageSize={pageSize}
              totalCount={totalCount}
              isFetching={roster.isFetching}
              onPageChange={setPage}
              onPageSizeChange={(size) => {
                setPageSize(size)
                setPage(1)
              }}
            />
          </div>
        </div>
      )}
    </div>
  )
}
