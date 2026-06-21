import { Link } from 'react-router-dom'
import { LockerStatusBadge } from '../../modules/locker-management/components/LockerStatusBadge'
import { useMemberLockerAssignments } from '../../modules/locker-management/hooks/useLockerManagement'
import type { LockerAssignment } from '../../modules/locker-management/types'

function formatDate(iso: string) {
  if (!iso) return '—'
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleDateString()
}

function AssignmentStatusBadge({ status }: { status: LockerAssignment['assignmentStatus'] }) {
  const active = status !== 'Expired'
  return (
    <span
      className={[
        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold',
        active
          ? 'border-emerald-400/25 bg-emerald-500/10 text-emerald-200'
          : 'border-slate-400/20 bg-slate-500/10 text-slate-300',
      ].join(' ')}
    >
      <span
        className={['size-1.5 rounded-full', active ? 'bg-emerald-400' : 'bg-slate-400'].join(' ')}
      />
      {active ? 'Active' : 'Expired'}
    </span>
  )
}

export function MemberLockerSection({ userId, memberName }: { userId: number; memberName: string }) {
  const { data: assignments = [], isLoading, isError } = useMemberLockerAssignments(userId)
  const activeCount = assignments.filter((a) => a.assignmentStatus !== 'Expired').length

  return (
    <section className="overflow-hidden rounded-2xl border border-white/10 bg-[rgba(17,17,39,0.55)]">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/5 px-6 py-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-400">
            Locker
          </p>
          <h2 className="text-base font-semibold text-white">Locker allocation</h2>
          <p className="mt-0.5 text-xs text-slate-500">
            Assigned lockers for {memberName || 'this member'}.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-white/5 px-2.5 py-1 text-[11px] text-slate-400 ring-1 ring-white/10">
            {activeCount} active
          </span>
          <Link
            to="/dashboard/locker-management/assignments"
            className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold text-slate-300 transition hover:border-white/20 hover:bg-white/10 hover:text-white"
          >
            Manage lockers
          </Link>
        </div>
      </div>

      <div className="px-6 py-5">
        {isLoading ? (
          <p className="text-sm text-slate-400">Loading locker assignments…</p>
        ) : isError ? (
          <p className="text-sm text-rose-300">Could not load locker assignments.</p>
        ) : assignments.length === 0 ? (
          <p className="text-sm text-slate-400">No locker assigned to this member yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead>
                <tr className="border-b border-white/10 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                  <th className="px-3 py-2">Locker #</th>
                  <th className="px-3 py-2">Locker status</th>
                  <th className="px-3 py-2">Assignment</th>
                  <th className="px-3 py-2">Assigned on</th>
                  <th className="px-3 py-2">Expires</th>
                </tr>
              </thead>
              <tbody>
                {assignments.map((assignment) => (
                  <tr
                    key={assignment.id}
                    className="border-b border-white/5 last:border-0 hover:bg-white/[0.02]"
                  >
                    <td className="px-3 py-3 font-semibold text-white">{assignment.lockerNumber}</td>
                    <td className="px-3 py-3">
                      {assignment.lockerStatus ? (
                        <LockerStatusBadge status={assignment.lockerStatus} />
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="px-3 py-3">
                      <AssignmentStatusBadge status={assignment.assignmentStatus} />
                    </td>
                    <td className="px-3 py-3 text-slate-300">{formatDate(assignment.assignedDate)}</td>
                    <td className="px-3 py-3 text-slate-400">{formatDate(assignment.expiryDate)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  )
}
