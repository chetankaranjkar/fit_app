import { useQuery } from '@tanstack/react-query'
import { DashboardLayout } from '../../../components/layout/DashboardLayout'
import { DashboardSubpageShell } from '../../../components/layout/DashboardSubpageShell'
import { authService } from '../../../services/auth.service'
import { SupplementCard } from '../components/SupplementCard'
import { supplementTrackingService } from '../services/supplementTracking.service'

export function MemberSupplementsPage() {
  const user = authService.getCurrentUser()
  const userId = user?.userId ?? 0

  const { data: active = [], isLoading } = useQuery({
    queryKey: ['member-supplements-me'],
    queryFn: async () => (await supplementTrackingService.getMine(true)).data,
    enabled: userId > 0,
  })

  return (
    <DashboardLayout userName={user?.fullName?.trim() || user?.username?.trim() || 'Member'}>
      <DashboardSubpageShell
        eyebrow="Member"
        titleGradient="my supplements"
        subtitle="Your active supplement protocol — dosage, timing, and coach instructions."
        showExport={false}
      >
        {isLoading ? (
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="glass-card h-44 animate-pulse rounded-2xl" />
            <div className="glass-card h-44 animate-pulse rounded-2xl" />
          </div>
        ) : active.length === 0 ? (
          <div className="glass-card rounded-3xl border border-dashed border-white/15 p-12 text-center">
            <p className="font-display text-xl text-white">No supplements assigned yet</p>
            <p className="mt-2 text-sm text-slate-400">
              Your trainer or front desk will add your protocol here when ready.
            </p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {active.map((item) => (
              <SupplementCard key={item.id} item={item} />
            ))}
          </div>
        )}
      </DashboardSubpageShell>
    </DashboardLayout>
  )
}
