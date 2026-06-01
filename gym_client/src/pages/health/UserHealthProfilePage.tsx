import { useQuery } from '@tanstack/react-query'
import { Link, useParams } from 'react-router-dom'
import { DashboardLayout } from '../../components/layout/DashboardLayout'
import { DashboardSubpageShell } from '../../components/layout/DashboardSubpageShell'
import { HealthProfileStepper } from '../../modules/health-profile/components/HealthProfileStepper'
import { healthProfileService } from '../../modules/health-profile/services/healthProfile.service'
import { authService } from '../../services/auth.service'
import { emptyHealthProfile } from '../../modules/health-profile/types/healthProfile'

function dashboardUserName() {
  const user = authService.getCurrentUser()
  return user?.fullName?.trim() || user?.username?.trim() || 'User'
}

export function UserHealthProfilePage() {
  const { userId: userIdParam } = useParams()
  const userId = Number.parseInt(userIdParam ?? '', 10)

  const { data: profile, isLoading } = useQuery({
    queryKey: ['health-profile', userId],
    queryFn: async () => {
      try {
        const { data } = await healthProfileService.getByUserId(userId)
        return data
      } catch {
        return emptyHealthProfile(userId)
      }
    },
    enabled: Number.isInteger(userId) && userId > 0,
    placeholderData: (previous) => previous,
  })

  const showInitialSkeleton = isLoading && profile === undefined

  if (!Number.isInteger(userId) || userId <= 0) {
    return (
      <DashboardLayout userName={dashboardUserName()}>
        <p className="p-8 text-slate-400">Invalid member.</p>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout userName={dashboardUserName()}>
      <div className="mb-4">
        <Link
          to={`/dashboard/users/${userId}`}
          className="text-sm text-[#F5C400] hover:underline"
        >
          ← Back to member
        </Link>
      </div>
      <DashboardSubpageShell
        eyebrow="Members"
        titleGradient="health profile"
        subtitle="Modern medical screening & exercise readiness for safe coaching."
        showExport={false}
      >
        {showInitialSkeleton ? (
          <div className="glass-card h-64 animate-pulse rounded-3xl" />
        ) : (
          <HealthProfileStepper userId={userId} initial={profile} mode="staff" />
        )}
      </DashboardSubpageShell>
    </DashboardLayout>
  )
}
