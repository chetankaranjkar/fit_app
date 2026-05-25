import { useQuery } from '@tanstack/react-query'
import { workoutTrackingService } from '../../../services/workoutTracking.service'

export function useMemberId() {
  return useQuery({
    queryKey: ['workout-tracking-member-id'],
    queryFn: async () => {
      const { data } = await workoutTrackingService.myMemberId()
      return data.memberId
    },
    staleTime: 60_000,
  })
}
