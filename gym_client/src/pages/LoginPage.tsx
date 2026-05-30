import { useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import gsap from 'gsap'
import { TigerLogo } from '../components/marketing/TigerLogo'
import { LoginForm } from '../features/auth/components/LoginForm'
import { authService } from '../services/auth.service'
import { getPostLoginPath, resolveDashboardRole } from '../features/auth/roleRouting'

export function LoginPage() {
  const sessionExpiredMessage = authService.popSessionExpiredMessage()
  const navigate = useNavigate()

  useEffect(() => {
    if (authService.getAccessToken()) {
      const role = resolveDashboardRole(authService.getCurrentUser())
      navigate(getPostLoginPath(role), { replace: true })
    }
  }, [navigate])

  useEffect(() => {
    gsap.fromTo(
      '.login-card',
      { opacity: 0, y: 40, scale: 0.95 },
      { opacity: 1, y: 0, scale: 1, duration: 0.7, ease: 'back.out(1.2)', delay: 0.2 }
    )
    gsap.fromTo(
      '.login-logo',
      { y: -20, opacity: 0 },
      { y: 0, opacity: 1, duration: 0.8, ease: 'power3.out' }
    )
    gsap.fromTo(
      '.login-form > *',
      { opacity: 0, y: 20 },
      { opacity: 1, y: 0, duration: 0.5, stagger: 0.08, ease: 'power2.out', delay: 0.5 }
    )
  }, [])

  return (
    <div className="relative flex min-h-screen w-[100vw] max-w-[100vw] flex-col items-center justify-center overflow-hidden px-4 py-8">
      {/* Ambient orbs */}
      <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-24 left-1/4 size-[28rem] rounded-full bg-blue-500/25 blur-3xl animate-float-slow" />
        <div
          className="absolute bottom-0 right-10 size-[32rem] rounded-full bg-purple-500/20 blur-3xl animate-float-slow"
          style={{ animationDelay: '3s' }}
        />
        <div
          className="absolute top-1/2 left-1/2 size-[36rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-fuchsia-500/10 blur-3xl animate-float-slow"
          style={{ animationDelay: '5s' }}
        />
      </div>

      <div className="relative w-full max-w-sm">
        {/* Brand */}
        <div className="login-logo mb-6 flex justify-center">
          <Link to="/" aria-label="Tiger Fitness — home">
            <TigerLogo variant="full" size={72} />
          </Link>
        </div>

        <div className="login-card glass-card-strong border-gradient-neon rounded-2xl p-6">
          <div className="mb-5 text-center">
            <h1 className="text-xl font-semibold text-white">Welcome back</h1>
            <p className="mt-1 text-xs text-slate-400">Sign in to your Tiger Fitness account</p>
          </div>
          {sessionExpiredMessage && (
            <div
              className="mb-4 rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-xs text-amber-200"
              role="status"
            >
              {sessionExpiredMessage}
            </div>
          )}
          <div className="login-form">
            <LoginForm />
          </div>
        </div>

        <p className="mt-5 text-center text-xs text-slate-500">
          <Link to="/" className="text-slate-400 transition hover:text-white">
            ← Back to home
          </Link>
        </p>
      </div>
    </div>
  )
}
