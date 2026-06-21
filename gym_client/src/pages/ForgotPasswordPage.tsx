import { type FormEvent, useState } from 'react'
import { Link } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import { TigerLogo } from '../components/marketing/TigerLogo'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { authService } from '../services/auth.service'
import { getApiErrorMessage } from '../lib/apiErrors'

export function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [validationMessage, setValidationMessage] = useState<string | null>(null)
  const [submittedEmail, setSubmittedEmail] = useState<string | null>(null)

  const mutation = useMutation({
    mutationFn: () => authService.forgotPassword(email.trim()),
    onSuccess: (data) => {
      setSubmittedEmail(email.trim())
      if (import.meta.env.DEV && data.devResetUrl) {
        console.info('Dev password reset link:', data.devResetUrl)
      }
    },
  })

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setValidationMessage(null)
    const value = email.trim()
    if (!value) {
      setValidationMessage('Enter the email address for your account.')
      return
    }
    mutation.mutate()
  }

  const errorMessage = mutation.isError
    ? getApiErrorMessage(mutation.error, 'Could not send reset instructions.')
    : null

  return (
    <div className="relative flex min-h-screen w-[100vw] max-w-[100vw] flex-col items-center justify-center overflow-hidden px-4 py-8">
      <div className="relative w-full max-w-sm">
        <div className="mb-6 flex justify-center">
          <Link to="/" aria-label="Tiger Fitness — home">
            <TigerLogo variant="full" size={72} />
          </Link>
        </div>

        <div className="glass-card-strong border-gradient-neon rounded-2xl p-6">
          <div className="mb-5 text-center">
            <h1 className="text-xl font-semibold text-white">Forgot password</h1>
            <p className="mt-1 text-xs text-slate-400">
              Enter your login email and we&apos;ll send reset instructions if an account exists.
            </p>
          </div>

          {submittedEmail ? (
            <div className="space-y-4">
              <div
                className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-4 py-3 text-xs text-emerald-200"
                role="status"
              >
                If an account exists for <span className="font-medium text-white">{submittedEmail}</span>,
                password reset instructions have been sent.
              </div>
              {import.meta.env.DEV && mutation.data?.devResetUrl ? (
                <p className="text-xs text-slate-400">
                  Dev reset link:{' '}
                  <Link to={mutation.data.devResetUrl.replace(window.location.origin, '')} className="text-blue-300">
                    open reset page
                  </Link>
                </p>
              ) : null}
              <Link
                to="/login"
                className="inline-flex w-full items-center justify-center rounded-xl border border-white/10 bg-white/5 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-white/10"
              >
                Back to sign in
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <Input
                label="Email"
                type="email"
                name="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
              />

              {(validationMessage || errorMessage) && (
                <div
                  className="rounded-xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-xs text-rose-300"
                  role="alert"
                >
                  {validationMessage ?? errorMessage}
                </div>
              )}

              <Button type="submit" fullWidth size="md" isLoading={mutation.isPending}>
                Send reset link
              </Button>

              <p className="text-center text-xs text-slate-400">
                <Link to="/login" className="font-medium text-blue-300 transition hover:text-blue-200">
                  Back to sign in
                </Link>
              </p>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
