import { useQuery } from '@tanstack/react-query'
import { MEMBER_BATCH_META, MEMBER_BATCH_VALUES, type MemberBatchValue } from '../lib/memberBatches'
import { usersService } from '../services/users.service'

export type MemberBatchStat = {
  key: MemberBatchValue | 'Unassigned'
  label: string
  count: number
  barClass: string
}

/** @deprecated Use MemberBatchStat */
export type TrainerBatchStat = MemberBatchStat

type UseMemberDirectoryStatsOptions = {
  assignedToCoachOnly?: boolean
}

function statsQueryKey(scope: 'coach' | 'all', segment: string) {
  return ['member-directory-stats', scope, segment] as const
}

export function useMemberDirectoryStats(
  enabled: boolean,
  { assignedToCoachOnly = false }: UseMemberDirectoryStatsOptions = {},
) {
  const scope = assignedToCoachOnly ? 'coach' : 'all'

  const statsQuery = useQuery({
    queryKey: statsQueryKey(scope, 'aggregate'),
    enabled,
    staleTime: 60_000,
    queryFn: async () => {
      const { data } = await usersService.getMembersDirectoryStats({ assignedToCoachOnly })
      return data
    },
  })

  const total = statsQuery.data?.total ?? 0
  const active = statsQuery.data?.active ?? 0
  const inactive = statsQuery.data?.inactive ?? 0

  const batchCountByName = new Map(
    (statsQuery.data?.batches ?? []).map((b) => [b.batch, b.count]),
  )
  const knownBatchTotal = MEMBER_BATCH_VALUES.reduce(
    (sum, batch) => sum + (batchCountByName.get(batch) ?? 0),
    0,
  )
  const unassignedCount = Math.max(0, total - knownBatchTotal)

  const batches: MemberBatchStat[] = MEMBER_BATCH_VALUES.map((batch) => {
    const meta = MEMBER_BATCH_META[batch]
    return {
      key: batch,
      label: meta.label,
      count: batchCountByName.get(batch) ?? 0,
      barClass: meta.barClass,
    }
  })

  if (unassignedCount > 0) {
    batches.push({
      key: 'Unassigned',
      label: 'Unassigned',
      count: unassignedCount,
      barClass: 'bg-gradient-to-r from-slate-500 to-slate-400',
    })
  }

  const maxBatchCount = Math.max(1, ...batches.map((b) => b.count))

  return { total, active, inactive, batches, maxBatchCount, isLoading: statsQuery.isLoading }
}

/** Coach-scoped member stats for trainer dashboard. */
export function useTrainerMemberStats(enabled: boolean) {
  return useMemberDirectoryStats(enabled, { assignedToCoachOnly: true })
}
