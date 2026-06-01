import { useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { GlassPanel } from '../dashboard/premium/GlassPanel'
import { authService } from '../../services/auth.service'
import { getApiErrorMessage } from '../../lib/apiErrors'

export function ChangePasswordCard() {
  const { data: account, isLoading: accountLoading } = useQuery({
    queryKey: ['auth-account'],
    queryFn: () => authService.getAccount(),
  })

  const requiresCurrent = account?.requiresCurrentPassword ?? true
  const email = account?.email ?? authService.getCurrentUser()?.email ?? ''

  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const mutation = useMutation({
    mutationFn: () =>
      authService.changePassword({
        currentPassword: requiresCurrent ? currentPassword : undefined,
        newPassword,
        confirmPassword,
      }),
    onSuccess: () => {
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
      setErrorMessage(null)
      setSuccessMessage('Your password has been updated.')
    },
    onError: (err: unknown) => {
      setSuccessMessage(null)
      setErrorMessage(getApiErrorMessage(err, 'Could not update password.'))
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setSuccessMessage(null)
    setErrorMessage(null)
    mutation.mutate()
  }

  return (
    <GlassPanel role="member" title="Password">
      {accountLoading ? (
        <p className="text-sm text-slate-400">Loading account…</p>
      ) : (
        <>
          {email ? (
            <p className="mb-4 text-sm text-slate-400">
              Login email: <span className="text-white">{email}</span>
            </p>
          ) : null}
          {!requiresCurrent ? (
            <p className="mb-4 text-sm text-amber-200/90">
              You sign in with phone OTP. Set a password here to also sign in with email and password.
            </p>
          ) : null}
          <form onSubmit={handleSubmit} className="space-y-4">
            {requiresCurrent ? (
              <label className="block text-sm">
                <span className="text-slate-400">Current password</span>
                <input
                  type="password"
                  autoComplete="current-password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-white outline-none ring-blue-500/40 focus:ring-2"
                  required
                />
              </label>
            ) : null}
            <label className="block text-sm">
              <span className="text-slate-400">New password</span>
              <input
                type="password"
                autoComplete="new-password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                minLength={6}
                className="mt-1 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-white outline-none ring-blue-500/40 focus:ring-2"
                required
              />
            </label>
            <label className="block text-sm">
              <span className="text-slate-400">Confirm new password</span>
              <input
                type="password"
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                minLength={6}
                className="mt-1 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-white outline-none ring-blue-500/40 focus:ring-2"
                required
              />
            </label>
            {errorMessage ? (
              <p className="text-sm text-red-400" role="alert">
                {errorMessage}
              </p>
            ) : null}
            {successMessage ? (
              <p className="text-sm text-emerald-400" role="status">
                {successMessage}
              </p>
            ) : null}
            <button
              type="submit"
              disabled={mutation.isPending}
              className="w-full rounded-xl bg-blue-600 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-500 disabled:opacity-50"
            >
              {mutation.isPending ? 'Updating…' : 'Update password'}
            </button>
          </form>
        </>
      )}
    </GlassPanel>
  )
}
