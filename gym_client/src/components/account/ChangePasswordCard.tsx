import { useState, type FormEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowRight, Eye, EyeOff, LockKeyhole, ShieldCheck } from 'lucide-react'
import { authService } from '../../services/auth.service'
import { getApiErrorMessage } from '../../lib/apiErrors'
import styles from './ProfileSettings.module.css'

function PasswordField({ label, value, onChange, autoComplete, hint, minLength }: {
  label: string
  value: string
  onChange: (value: string) => void
  autoComplete: string
  hint?: string
  minLength?: number
}) {
  const [visible, setVisible] = useState(false)
  return (
    <div className={styles.field}>
      <label>
        {label}
        <span className={styles.inputWrap}>
          <input type={visible ? 'text' : 'password'} autoComplete={autoComplete}
            value={value} onChange={(e) => onChange(e.target.value)}
            placeholder={label === 'Current password' ? 'Enter current password' : label === 'New password' ? 'Create a new password' : 'Re-enter new password'}
            minLength={minLength} required />
          <button type="button" className={styles.visibilityButton}
            aria-label={`${visible ? 'Hide' : 'Show'} ${label.toLowerCase()}`}
            aria-pressed={visible} onClick={() => setVisible(!visible)}>
            {visible ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        </span>
      </label>
      {hint && <p className={styles.fieldHint}>{hint}</p>}
    </div>
  )
}

export function ChangePasswordCard() {
  const queryClient = useQueryClient()
  const { data: account, isLoading: accountLoading, isError: accountError } = useQuery({
    queryKey: ['auth-account'],
    queryFn: () => authService.getAccount(),
    retry: false,
  })
  const requiresCurrent = account?.requiresCurrentPassword ?? true
  const email = account?.email ?? authService.getCurrentUser()?.email ?? ''
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const mutation = useMutation({
    mutationFn: () => authService.changePassword({
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
      void queryClient.invalidateQueries({ queryKey: ['auth-account'] })
    },
    onError: (err: unknown) => {
      setSuccessMessage(null)
      setErrorMessage(getApiErrorMessage(err, 'Could not update password.'))
    },
  })
  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    if (mutation.isPending) return
    setSuccessMessage(null)
    setErrorMessage(null)
    if (newPassword !== confirmPassword) {
      setErrorMessage('The new passwords do not match.')
      return
    }
    mutation.mutate()
  }

  return (
    <section className={`dashboard-panel ${styles.card}`} aria-labelledby="password-heading">
      <header className={styles.sectionHeader}>
        <span className={styles.sectionIcon}><LockKeyhole size={18} /></span>
        <div>
          <h2 id="password-heading">{!accountLoading && !accountError && !requiresCurrent ? 'Set a password' : 'Password & security'}</h2>
          <p className={styles.description}>Keep your account secure with a strong, unique password.</p>
        </div>
      </header>
      <div className={styles.sectionBody}>
        {accountLoading ? <p className={styles.description} role="status">Loading account…</p> : (
          <form onSubmit={handleSubmit} className={styles.passwordForm}>
            {accountError && <p className={styles.notice}>Could not load account details. You can still update your password below.</p>}
            {!accountError && email && <p className={styles.description}>Login email: <strong>{email}</strong></p>}
            {!accountError && !requiresCurrent && <p className={styles.notice}>You sign in with phone OTP. Set a password to also sign in with email and password.</p>}
            {requiresCurrent && <PasswordField label="Current password" value={currentPassword} onChange={setCurrentPassword} autoComplete="current-password" />}
            <div className={styles.passwordPair}>
              <PasswordField label="New password" value={newPassword} onChange={setNewPassword} autoComplete="new-password" minLength={6} hint="Use at least 6 characters." />
              <PasswordField label="Confirm new password" value={confirmPassword} onChange={setConfirmPassword} autoComplete="new-password" minLength={6} />
            </div>
            {errorMessage && <p className={styles.error} role="alert">{errorMessage}</p>}
            {successMessage && <p className={styles.success} role="status">{successMessage}</p>}
            <div className={styles.formFooter}>
              <p><ShieldCheck size={14} /> Never share your password.</p>
              <button type="submit" disabled={mutation.isPending} className={styles.primaryButton}>
                {mutation.isPending ? 'Saving…' : requiresCurrent ? 'Update password' : 'Set password'} <ArrowRight size={15} />
              </button>
            </div>
          </form>
        )}
      </div>
    </section>
  )
}
