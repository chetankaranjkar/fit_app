import { type FormEvent, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useMutation, useQuery } from '@tanstack/react-query'
import { TigerLogo } from '../components/marketing/TigerLogo'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { authService } from '../services/auth.service'
import { commercialService, type PublicMembershipPlan } from '../services/commercial.service'
import { getApiErrorMessage } from '../lib/apiErrors'
import { getPostLoginPath, resolveDashboardRole } from '../features/auth/roleRouting'
import { useRazorpayCheckout } from '../features/commercial/useRazorpayCheckout'
import { formatInr } from '../lib/formatInr'

export function SignupPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { payMembership } = useRazorpayCheckout()

  const configQuery = useQuery({
    queryKey: ['public-commercial-config'],
    queryFn: async () => (await commercialService.getConfig()).data,
  })

  const plansQuery = useQuery({
    queryKey: ['public-membership-plans'],
    queryFn: async () => (await commercialService.getPlans()).data,
    enabled: Boolean(configQuery.data?.enableSelfSignup),
  })

  const initialPlanId = Number(searchParams.get('planId') ?? 0)

  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [planId, setPlanId] = useState(initialPlanId > 0 ? initialPlanId : 0)
  const [validationMessage, setValidationMessage] = useState<string | null>(null)
  const [payMessage, setPayMessage] = useState<string | null>(null)
  const [paying, setPaying] = useState(false)

  useEffect(() => {
    if (initialPlanId > 0) setPlanId(initialPlanId)
  }, [initialPlanId])

  const selectedPlan = useMemo(
    () => plansQuery.data?.find((p) => p.id === planId) ?? null,
    [plansQuery.data, planId],
  )

  const signupMutation = useMutation({
    mutationFn: () =>
      commercialService.signup({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim(),
        phone: phone.trim(),
        password,
        planId,
      }),
    onSuccess: async (response) => {
      const data = response.data
      if (data.session) {
        authService.storeSession(data.session)
      }

      const pending =
        data.pendingAmount ??
        data.member.pendingPaymentAmount ??
        selectedPlan?.price ??
        0
      const paymentId = data.openMembershipPaymentId ?? data.member.openMembershipPaymentId ?? undefined
      const onlineEnabled = Boolean(configQuery.data?.enableOnlinePayments)

      if (onlineEnabled && pending > 0 && paymentId) {
        setPaying(true)
        setPayMessage('Opening secure checkout…')
        try {
          await payMembership(paymentId)
          setPayMessage('Payment received. Welcome to Tiger Fitness!')
          const role = resolveDashboardRole(authService.getCurrentUser())
          setTimeout(() => navigate(getPostLoginPath(role), { replace: true }), 1200)
        } catch (err) {
          setPayMessage(
            getApiErrorMessage(err, 'Signup succeeded but payment was not completed. You can pay from your member portal after signing in.'),
          )
          setPaying(false)
        }
        return
      }

      const role = resolveDashboardRole(authService.getCurrentUser())
      navigate(getPostLoginPath(role), { replace: true })
    },
  })

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setValidationMessage(null)
    if (!firstName.trim() || !lastName.trim()) {
      setValidationMessage('Enter your first and last name.')
      return
    }
    if (!email.trim()) {
      setValidationMessage('Enter your email address.')
      return
    }
    if (!phone.trim()) {
      setValidationMessage('Enter your mobile number.')
      return
    }
    if (password.length < 6) {
      setValidationMessage('Password must be at least 6 characters.')
      return
    }
    if (planId <= 0) {
      setValidationMessage('Select a membership plan.')
      return
    }
    signupMutation.mutate()
  }

  if (configQuery.isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-slate-400">
        Loading…
      </div>
    )
  }

  if (!configQuery.data?.enableSelfSignup) {
    return (
      <div className="relative flex min-h-screen flex-col items-center justify-center px-4 py-8">
        <div className="glass-card-strong w-full max-w-sm rounded-2xl p-6 text-center">
          <h1 className="text-xl font-semibold text-white">Signup unavailable</h1>
          <p className="mt-2 text-sm text-slate-400">
            Online registration is not enabled. Contact the gym front desk to join.
          </p>
          <Link to="/" className="mt-6 inline-block text-sm text-amber-300 hover:underline">
            Back to home
          </Link>
        </div>
      </div>
    )
  }

  const errorMessage = signupMutation.isError
    ? getApiErrorMessage(signupMutation.error, 'Could not complete signup.')
    : null

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center px-4 py-8">
      <div className="relative w-full max-w-lg">
        <div className="mb-6 flex justify-center">
          <Link to="/" aria-label="Tiger Fitness — home">
            <TigerLogo variant="full" size={72} />
          </Link>
        </div>

        <div className="glass-card-strong border-gradient-neon rounded-2xl p-6">
          <div className="mb-5 text-center">
            <h1 className="text-xl font-semibold text-white">Join Tiger Fitness</h1>
            <p className="mt-1 text-xs text-slate-400">
              Create your member account and choose a plan.{' '}
              {configQuery.data.enableOnlinePayments ? 'Pay securely online after signup.' : 'Pay at the front desk after signup.'}
            </p>
          </div>

          {payMessage ? (
            <div
              className="mb-4 rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-4 py-3 text-xs text-emerald-200"
              role="status"
            >
              {payMessage}
            </div>
          ) : null}

          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="grid gap-3 sm:grid-cols-2">
              <Input label="First name" value={firstName} onChange={(e) => setFirstName(e.target.value)} required />
              <Input label="Last name" value={lastName} onChange={(e) => setLastName(e.target.value)} required />
            </div>
            <Input label="Email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            <Input label="Mobile" type="tel" autoComplete="tel" value={phone} onChange={(e) => setPhone(e.target.value)} required />
            <Input
              label="Password"
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />

            <fieldset>
              <legend className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
                Membership plan
              </legend>
              <div className="space-y-2">
                {(plansQuery.data ?? []).map((plan: PublicMembershipPlan) => (
                  <label
                    key={plan.id}
                    className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition ${
                      planId === plan.id
                        ? 'border-amber-400/60 bg-amber-400/10'
                        : 'border-white/10 bg-white/[0.03] hover:border-white/20'
                    }`}
                  >
                    <input
                      type="radio"
                      name="plan"
                      className="mt-1"
                      checked={planId === plan.id}
                      onChange={() => setPlanId(plan.id)}
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-semibold text-white">{plan.planName}</span>
                      <span className="block text-xs text-slate-400">
                        {plan.durationDays} days · {formatInr(plan.price)}
                      </span>
                      {plan.description ? (
                        <span className="mt-1 block text-xs text-slate-500">{plan.description}</span>
                      ) : null}
                    </span>
                  </label>
                ))}
                {(plansQuery.data ?? []).length === 0 && !plansQuery.isLoading ? (
                  <p className="text-xs text-slate-500">No plans are configured yet. Contact the gym.</p>
                ) : null}
              </div>
            </fieldset>

            {(validationMessage || errorMessage) && (
              <p className="text-xs text-rose-300" role="alert">
                {validationMessage ?? errorMessage}
              </p>
            )}

            <Button type="submit" className="w-full" disabled={signupMutation.isPending || paying}>
              {signupMutation.isPending || paying ? 'Please wait…' : 'Create account'}
            </Button>
          </form>

          <p className="mt-5 text-center text-xs text-slate-500">
            Already a member?{' '}
            <Link to="/login" className="font-medium text-amber-300 hover:underline">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
