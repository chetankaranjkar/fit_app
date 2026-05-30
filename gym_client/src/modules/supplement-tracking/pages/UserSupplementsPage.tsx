import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { DashboardLayout } from '../../../components/layout/DashboardLayout'
import { DashboardSubpageShell } from '../../../components/layout/DashboardSubpageShell'
import { usersService } from '../../../services/users.service'
import { authService } from '../../../services/auth.service'
import { MemberSupplementsPanel } from '../components/MemberSupplementsPanel'
import { MemberSupplementsTimeline } from '../components/MemberSupplementsTimeline'
import { supplementTrackingService } from '../services/supplementTracking.service'

export function UserSupplementsPage() {
  const { userId: userIdParam } = useParams()
  const userId = Number(userIdParam)
  const [tab, setTab] = useState<'current' | 'timeline'>('current')
  const currentUser = authService.getCurrentUser()

  const { data: user } = useQuery({
    queryKey: ['user', userId],
    queryFn: async () => (await usersService.getById(userId)).data,
    enabled: userId > 0,
  })

  const { data: history = [] } = useQuery({
    queryKey: ['member-supplements', userId, 'history-full'],
    queryFn: async () => (await supplementTrackingService.getHistoryByUser(userId)).data,
    enabled: userId > 0 && tab === 'timeline',
  })

  const memberName = user ? `${user.firstName} ${user.lastName}`.trim() : ''

  return (
    <DashboardLayout userName={currentUser?.fullName?.trim() || currentUser?.username?.trim() || 'Staff'}>
      <DashboardSubpageShell
        eyebrow="Member supplements"
        titleGradient={memberName || 'Supplements'}
        subtitle="Current protocol, assignment history, and trainer notes."
        showExport={false}
      >
        <Link
          to={`/dashboard/users/${userId}`}
          className="mb-4 inline-block text-sm text-[#F5C400] hover:text-amber-300"
        >
          ← Back to member
        </Link>

        <div className="mb-6 flex gap-2">
          {(['current', 'timeline'] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className={`rounded-full px-4 py-1.5 text-sm font-semibold capitalize ${
                tab === t ? 'bg-[#F5C400]/20 text-[#F5C400]' : 'bg-white/5 text-slate-400'
              }`}
            >
              {t === 'current' ? 'Current' : 'Timeline'}
            </button>
          ))}
        </div>

        {tab === 'current' ? (
          <MemberSupplementsPanel userId={userId} memberName={memberName} canManage />
        ) : (
          <MemberSupplementsTimeline items={history} />
        )}
      </DashboardSubpageShell>
    </DashboardLayout>
  )
}
