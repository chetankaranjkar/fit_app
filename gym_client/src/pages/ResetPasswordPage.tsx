import { type FormEvent, useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import { TigerLogo } from '../components/marketing/TigerLogo'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { authService } from '../services/auth.service'
import { getApiErrorMessage } from '../lib/apiErrors'

export function ResetPasswordPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const token = useMemo(() => (searchParams.get('token') ?? '').trim(), [searchParams])
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [validationMessage, setValidationMessage] = useState<string | null>(null)

  const mutation = useMutation({
    mutationFn: () =>
      authService.resetPassword({
        token,
        newPassword: newPassword.trim(),
        confirmPassword: confirmPassword.trim(),
      }),
    onSuccess: () => {
      navigate('/login', { replace: true, state: { passwordReset: true } })
    },
  })

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setValidationMessage(null)
    if (!token) {
      setValidationMessage('This reset link is invalid. Request a new one.')
      return
    }
    if (newPassword.trim().length < 6) {
      setValidationMessage('Password must be at least 6 characters.')
      return
    }
    if (newPassword.trim() !== confirmPassword.trim()) {
      setValidationMessage('New password and confirmation do not match.')
      return
    }
    mutation.mutate()
  }

  const errorMessage = mutation.isError
    ? getApiErrorMessage(mutation.error, 'Could not reset password.')
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
            <h1 className="text-xl font-semibold text-white">Set new password</h1>
            <p className="mt-1 text-xs text-slate-400">Choose a new password for your account.</p>
          </div>

          {!token ? (
            <div className="space-y-4">
              <div
                className="rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-xs text-amber-200"
                role="alert"
              >
                This reset link is missing or invalid. Request a new one from the sign-in page.
              </div>
              <Link
                to="/login/forgot-password"
                className="inline-flex w-full items-center justify-center rounded-xl border border-white/10 bg-white/5 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-white/10"
              >
                Request reset link
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <Input
                label="New password"
                type="password"
                name="newPassword"
                autoComplete="new-password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="At least 6 characters"
                required
              />
              <Input
                label="Confirm password"
                type="password"
                name="confirmPassword"
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Repeat new password"
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
                Update password
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
