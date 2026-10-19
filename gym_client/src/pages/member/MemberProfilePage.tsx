import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ArrowLeft, ArrowUpRight, CalendarDays, CircleHelp, Mail, Phone, UserRound } from 'lucide-react'
import { ChangePasswordCard } from '../../components/account/ChangePasswordCard'
import { MemberNotificationPreferencesCard } from '../../components/member/MemberNotificationPreferencesCard'
import { DashboardLayout } from '../../components/layout/DashboardLayout'
import { DashboardPageContent } from '../../components/layout/DataPageShell'
import { getDashboardUser } from '../../lib/dashboardUser'
import { getPersonaHomePath } from '../../features/auth/roleRouting'
import { useDashboardRoleOrCurrent } from '../../features/auth/DashboardRoleContext'
import { authService } from '../../services/auth.service'
import { meService } from '../../services/me.service'
import styles from '../../components/account/ProfileSettings.module.css'

export function MemberProfilePage() {
  const { userName } = getDashboardUser()
  const loginUser = authService.getCurrentUser()
  // Auth-only accounts must not call /me/profile: its 401 would trigger global logout.
  const hasMemberProfile = Boolean(loginUser?.userId)
  const { data: profile, isError: profileError, isLoading, refetch } = useQuery({
    queryKey: ['member-profile', loginUser?.userId],
    queryFn: async () => (await meService.getProfile()).data,
    enabled: hasMemberProfile,
    retry: false,
  })
  const displayName = profile?.fullName ?? loginUser?.fullName ?? userName
  const displayEmail = profile?.email ?? loginUser?.email ?? 'Not provided'
  const initials = displayName.trim().split(/\s+/).slice(0, 2).map((name) => name[0]).join('').toUpperCase()
  const role = useDashboardRoleOrCurrent()
  const roleLabel = role === 'other' ? 'Staff' : role === 'admin' ? 'Administrator' : role === 'trainer' ? 'Trainer' : 'Member'
  const registrationDate = profile?.registrationDate ? new Date(profile.registrationDate) : null
  const memberSince = registrationDate && !Number.isNaN(registrationDate.getTime())
    ? registrationDate.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })
    : 'Not available'

  return (
    <DashboardLayout userName={userName}>
      <DashboardPageContent className={styles.page}>
        <header className={styles.pageHeader}>
          <div>
            <p className={styles.eyebrow}>YOUR ACCOUNT</p>
            <h1>Profile & settings</h1>
            <p className={styles.description}>Your personal details, notifications, and sign-in preferences. All in one place.</p>
          </div>
          <Link to={getPersonaHomePath(role)} className={styles.backLink}><ArrowLeft size={16} /> Back to dashboard</Link>
        </header>
        <div className={styles.layout}>
          <aside className={styles.sidebar} aria-label="Account overview">
            <section className={`dashboard-panel ${styles.card} ${styles.identity}`}>
              <div className={styles.avatar}>
                {profile?.profilePictureUrl ? <img src={profile.profilePictureUrl} alt={displayName} /> : initials || <UserRound size={30} />}
              </div>
              <h2>{displayName}</h2>
              <span className={styles.roleBadge}>{roleLabel}</span>
              <p className={styles.identityEmail}>{displayEmail}</p>
              <dl className={styles.details}>
                <div><dt><Mail size={16} /> Email address</dt><dd>{displayEmail}</dd></div>
                {hasMemberProfile && <>
                  <div><dt><Phone size={16} /> Phone number</dt><dd>{isLoading ? 'Loading…' : profileError ? 'Unavailable' : profile?.phone || 'Not provided'}</dd></div>
                  <div><dt><CalendarDays size={16} /> Member since</dt><dd>{isLoading ? 'Loading…' : profileError ? 'Unavailable' : memberSince}</dd></div>
                </>}
              </dl>
              {profileError && <p className={styles.notice} role="alert">Some profile details could not be loaded. <button type="button" className={styles.textButton} onClick={() => void refetch()}>Try again</button></p>}
            </section>
            <section className={`dashboard-panel ${styles.card} ${styles.helpCard}`}>
              <CircleHelp size={22} className={styles.helpIcon} />
              <h2>Need a hand?</h2>
              <p className={styles.description}>Find answers and guidance in our help center.</p>
              <a href="/help" target="_blank" rel="noopener noreferrer" className={styles.helpLink}>Visit help center <ArrowUpRight size={16} /><span className="sr-only"> (opens in a new tab)</span></a>
            </section>
          </aside>
          <div className={styles.settings}>
            {hasMemberProfile && <MemberNotificationPreferencesCard />}
            <ChangePasswordCard />
          </div>
        </div>
      </DashboardPageContent>
    </DashboardLayout>
  )
}
