import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ChangePasswordCard } from '../../components/account/ChangePasswordCard'
import { DashboardLayout } from '../../components/layout/DashboardLayout'
import { GlassPanel } from '../../components/dashboard/premium/GlassPanel'
import { getDashboardUser } from '../../lib/dashboardUser'
import { authService } from '../../services/auth.service'
import { meService } from '../../services/me.service'

export function MemberProfilePage() {
  const { userName } = getDashboardUser()
  const loginUser = authService.getCurrentUser()
  const { data: profile, isError: profileError } = useQuery({
    queryKey: ['member-profile'],
    queryFn: async () => {
      const { data } = await meService.getProfile()
      return data
    },
    retry: false,
  })

  const displayName = profile?.fullName ?? loginUser?.fullName ?? userName
  const displayEmail = profile?.email ?? loginUser?.email ?? '—'

  return (
    <DashboardLayout userName={userName}>
      <section className="mx-auto max-w-lg space-y-6 pb-12">
        <header>
          <h1 className="text-2xl font-bold text-white">Account</h1>
          <p className="mt-1 text-sm text-slate-400">Profile and sign-in settings</p>
        </header>
        <GlassPanel role="member" title={displayName}>
          <dl className="space-y-3 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-slate-400">Email</dt>
              <dd className="text-right text-white">{displayEmail}</dd>
            </div>
            {!profileError && profile ? (
              <>
                <div className="flex justify-between gap-4">
                  <dt className="text-slate-400">Phone</dt>
                  <dd className="text-right text-white">{profile.phone ?? '—'}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-slate-400">Member since</dt>
                  <dd className="text-right text-white">
                    {profile.registrationDate
                      ? new Date(profile.registrationDate).toLocaleDateString()
                      : '—'}
                  </dd>
                </div>
              </>
            ) : null}
          </dl>
          <div className="mt-5 border-t border-white/10 pt-4">
            <button
              type="button"
              onClick={() => {
                const base = typeof window !== 'undefined' ? window.location.origin : ''
                window.open(`${base}/help`, '_blank', 'noopener,noreferrer')
              }}
              className="w-full rounded-xl border border-blue-400/30 bg-blue-500/10 py-2.5 text-sm font-semibold text-blue-100 transition hover:bg-blue-500/20"
            >
              Help center (opens in browser)
            </button>
          </div>
        </GlassPanel>
        <ChangePasswordCard />
        <Link to="/dashboard" className="text-sm text-orange-400 hover:underline">
          ← Back to home
        </Link>
      </section>
    </DashboardLayout>
  )
}
