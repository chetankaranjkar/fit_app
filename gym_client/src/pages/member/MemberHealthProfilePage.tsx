import axios from 'axios'
import { useQuery } from '@tanstack/react-query'
import { DashboardLayout } from '../../components/layout/DashboardLayout'
import { DashboardSubpageShell } from '../../components/layout/DashboardSubpageShell'
import { MemberLoadError, MemberLoadingState } from '../../components/member/MemberQueryState'
import { HealthProfileStepper } from '../../modules/health-profile/components/HealthProfileStepper'
import { healthProfileService } from '../../modules/health-profile/services/healthProfile.service'
import { authService } from '../../services/auth.service'
import { emptyHealthProfile } from '../../modules/health-profile/types/healthProfile'

export function MemberHealthProfilePage() {
  const user = authService.getCurrentUser()
  const userId = user?.userId ?? 0

  const { data: profile, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['health-profile', userId],
    queryFn: async () => {
      try {
        const { data } = await healthProfileService.getMine()
        return data
      } catch (err) {
        if (axios.isAxiosError(err) && err.response?.status === 404) {
          return emptyHealthProfile(userId)
        }
        throw err
      }
    },
    enabled: userId > 0,
    retry: false,
  })

  return (
    <DashboardLayout userName={user?.fullName?.trim() || user?.username?.trim() || 'Member'}>
      <DashboardSubpageShell
        eyebrow="Member"
        titleGradient="health profile"
        subtitle="Your own health assessment. This page never loads another member’s profile."
        showExport={false}
      >
        {userId <= 0 ? (
          <MemberLoadError error={{ response: { status: 403 } }} fallback="Sign in as a member to open this page." />
        ) : isLoading ? (
          <MemberLoadingState label="Loading your health profile…" />
        ) : isError ? (
          <MemberLoadError
            error={error}
            fallback="Could not load your health profile."
            onRetry={() => void refetch()}
          />
        ) : (
          <HealthProfileStepper userId={userId} initial={profile} mode="member" />
        )}
      </DashboardSubpageShell>
    </DashboardLayout>
  )
}
