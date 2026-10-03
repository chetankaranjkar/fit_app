import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { DashboardLayout } from '../../components/layout/DashboardLayout'
import { DashboardPageContent } from '../../components/layout/DataPageShell'
import { GlassPanel } from '../../components/dashboard/premium/GlassPanel'
import { TrendAreaChart } from '../../components/dashboard/premium/TrendAreaChart'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { MemberEmptyState, MemberLoadError, MemberLoadingState } from '../../components/member/MemberQueryState'
import { getDashboardUser } from '../../lib/dashboardUser'
import { getApiErrorMessage } from '../../lib/apiErrors'
import { meService } from '../../services/me.service'

export function MemberProgressPage() {
  const { userName } = getDashboardUser()
  const queryClient = useQueryClient()
  const [weight, setWeight] = useState('')

  const dashQuery = useQuery({
    queryKey: ['member-progress'],
    queryFn: async () => (await meService.getDashboard()).data,
    retry: false,
  })

  const metricsQuery = useQuery({
    queryKey: ['member-body-metrics'],
    queryFn: () => meService.getBodyMetrics(30),
    retry: false,
  })

  const logMutation = useMutation({
    mutationFn: () => meService.createBodyMetric({ weightKg: Number(weight) }),
    onSuccess: () => {
      toast.success('Weigh-in recorded')
      setWeight('')
      void queryClient.invalidateQueries({ queryKey: ['member-body-metrics'] })
      void queryClient.invalidateQueries({ queryKey: ['member-progress'] })
      void queryClient.invalidateQueries({ queryKey: ['member-dashboard'] })
    },
    onError: (err) => toast.error(getApiErrorMessage(err, 'Could not save this weigh-in.')),
  })

  const chart =
    dashQuery.data?.attendance?.last30Days?.map((d) => ({
      label: new Date(d.date).toLocaleDateString(undefined, { day: 'numeric' }),
      value: d.visited ? 1 : 0,
    })) ?? []

  const latest = metricsQuery.data?.[0] ?? dashQuery.data?.latestBodyMetric
  const recordedVisits = dashQuery.data?.attendance?.last30Days?.filter((d) => d.visited).length ?? 0

  const submit = (e: FormEvent) => {
    e.preventDefault()
    const kg = Number(weight)
    if (!Number.isFinite(kg) || kg <= 0) {
      toast.error('Enter a weight greater than zero.')
      return
    }
    logMutation.mutate()
  }

  return (
    <DashboardLayout userName={userName}>
      <DashboardPageContent className="max-w-3xl pb-20 lg:pb-8">
        <header>
          <h1 className="text-2xl font-bold text-white">Progress</h1>
          <p className="text-sm text-slate-400">
            Recorded weigh-ins and recorded check-ins only — assigned workouts live under Workouts.
          </p>
        </header>

        <GlassPanel role="member" title="Recorded body metrics" subtitle="What you (or the gym) logged">
          {metricsQuery.isLoading && dashQuery.isLoading ? (
            <MemberLoadingState label="Loading recorded metrics…" />
          ) : metricsQuery.isError ? (
            <MemberLoadError
              error={metricsQuery.error}
              fallback="Could not load recorded metrics."
              onRetry={() => void metricsQuery.refetch()}
            />
          ) : (
            <>
              <p className="text-3xl font-bold text-white">
                {latest?.weight != null ? `${latest.weight} kg` : 'No weigh-in recorded'}
              </p>
              <p className="mt-1 text-xs text-slate-400">
                Body fat {latest && 'bodyFatPercent' in latest ? (latest.bodyFatPercent ?? '—') : '—'}% · BMI{' '}
                {latest?.bmi != null ? latest.bmi.toFixed(1) : '—'}
              </p>
              <form className="mt-4 flex flex-wrap items-end gap-2" onSubmit={submit}>
                <div>
                  <label className="mb-1 block text-xs text-slate-400" htmlFor="member-weight">
                    Log weight (kg)
                  </label>
                  <Input
                    id="member-weight"
                    inputMode="decimal"
                    value={weight}
                    onChange={(e) => setWeight(e.target.value)}
                    placeholder="e.g. 72.5"
                  />
                </div>
                <Button type="submit" disabled={logMutation.isPending}>
                  {logMutation.isPending ? 'Saving…' : 'Record weigh-in'}
                </Button>
              </form>
              {(metricsQuery.data ?? []).length === 0 && latest?.weight == null ? (
                <div className="mt-4">
                  <MemberEmptyState
                    title="No recorded body metrics"
                    body="Log a weigh-in to start a recorded history. Assigned workout targets are not shown here."
                  />
                </div>
              ) : null}
            </>
          )}
        </GlassPanel>

        <GlassPanel role="member" title="Recorded check-ins" subtitle="Last 30 days of gym visits on file">
          {dashQuery.isLoading ? (
            <MemberLoadingState label="Loading recorded visits…" />
          ) : dashQuery.isError ? (
            <MemberLoadError
              error={dashQuery.error}
              fallback="Could not load recorded visits."
              onRetry={() => void dashQuery.refetch()}
            />
          ) : recordedVisits === 0 && chart.length === 0 ? (
            <MemberEmptyState
              title="No recorded visits yet"
              body="Grey days are not inferred misses. Only a check-in creates a recorded visit."
            />
          ) : (
            <>
              {chart.length ? <TrendAreaChart role="member" data={chart} height={200} /> : null}
              <p className="mt-2 text-xs text-slate-500">{recordedVisits} recorded visit(s) in this window.</p>
            </>
          )}
        </GlassPanel>

        <Link to="/dashboard/member/portal" className="text-sm text-orange-400 hover:underline">
          ← Back to home
        </Link>
      </DashboardPageContent>
    </DashboardLayout>
  )
}
