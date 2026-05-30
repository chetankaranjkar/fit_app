import { useQuery } from '@tanstack/react-query'
import { DashboardLayout } from '../../components/layout/DashboardLayout'
import { DashboardSubpageShell } from '../../components/layout/DashboardSubpageShell'
import { HealthProfileStepper } from '../../modules/health-profile/components/HealthProfileStepper'
import { healthProfileService } from '../../modules/health-profile/services/healthProfile.service'
import { authService } from '../../services/auth.service'
import { emptyHealthProfile } from '../../modules/health-profile/types/healthProfile'

export function MemberHealthProfilePage() {
  const user = authService.getCurrentUser()
  const userId = user?.userId ?? 0

  const { data: profile, isLoading } = useQuery({
    queryKey: ['health-profile', userId],
    queryFn: async () => {
      try {
        const { data } = await healthProfileService.getMine()
        return data
      } catch {
        return emptyHealthProfile(userId)
      }
    },
    enabled: userId > 0,
  })

  return (
    <DashboardLayout userName={user?.fullName?.trim() || user?.username?.trim() || 'Member'}>
      <DashboardSubpageShell
        eyebrow="Member"
        titleGradient="health profile"
        subtitle="Complete your premium health assessment for safer, smarter training."
        showExport={false}
      >
        {isLoading ? (
          <div className="glass-card h-64 animate-pulse rounded-3xl" />
        ) : (
          <HealthProfileStepper userId={userId} initial={profile} mode="member" />
        )}
      </DashboardSubpageShell>
    </DashboardLayout>
  )
}
