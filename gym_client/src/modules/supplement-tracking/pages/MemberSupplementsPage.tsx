import { useQuery } from '@tanstack/react-query'
import { DashboardLayout } from '../../../components/layout/DashboardLayout'
import { DashboardSubpageShell } from '../../../components/layout/DashboardSubpageShell'
import { MemberEmptyState, MemberLoadError, MemberLoadingState } from '../../../components/member/MemberQueryState'
import { authService } from '../../../services/auth.service'
import { SupplementCard } from '../components/SupplementCard'
import { supplementTrackingService } from '../services/supplementTracking.service'

export function MemberSupplementsPage() {
  const user = authService.getCurrentUser()
  const userId = user?.userId ?? 0

  const { data: active = [], isLoading, isError, error, refetch } = useQuery({
    queryKey: ['member-supplements-me'],
    queryFn: async () => (await supplementTrackingService.getMine(true)).data,
    enabled: userId > 0,
    retry: false,
  })

  return (
    <DashboardLayout userName={user?.fullName?.trim() || user?.username?.trim() || 'Member'}>
      <DashboardSubpageShell
        eyebrow="Member"
        titleGradient="my supplements"
        subtitle="Assigned protocol on your account — dosage, timing, and coach instructions."
        showExport={false}
      >
        {userId <= 0 ? (
          <MemberLoadError error={{ response: { status: 403 } }} />
        ) : isLoading ? (
          <MemberLoadingState label="Loading assigned supplements…" />
        ) : isError ? (
          <MemberLoadError
            error={error}
            fallback="Could not load your supplements."
            onRetry={() => void refetch()}
          />
        ) : active.length === 0 ? (
          <MemberEmptyState
            title="No supplements assigned yet"
            body="Your coach or front desk will add your protocol here. This list is assigned targets, not a purchase history."
          />
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
