import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { DashboardLayout } from '../components/layout/DashboardLayout'
import { DashboardSubpageShell } from '../components/layout/DashboardSubpageShell'
import { PermissionGate } from '../components/auth/PermissionGate'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { authService } from '../services/auth.service'
import { emailSettingsService } from '../services/emailSettings.service'
import { getApiErrorMessage } from '../lib/apiErrors'
import type { EmailProvider, UpdateEmailSettings } from '../types/emailSettings'

function getDashboardUser() {
  try {
    const userJson = localStorage.getItem('user')
    if (!userJson) return { userName: 'User' }
    const user = JSON.parse(userJson) as { fullName?: string; username?: string }
    return { userName: user?.fullName?.trim() || user?.username?.trim() || 'User' }
  } catch {
    return { userName: 'User' }
  }
}

const PROVIDER_PRESETS: Record<EmailProvider, { host: string; port: number; startTls: boolean }> = {
  gmail: { host: 'smtp.gmail.com', port: 587, startTls: true },
  outlook: { host: 'smtp.office365.com', port: 587, startTls: true },
  custom: { host: '', port: 587, startTls: true },
}

export function EmailSettingsPage() {
  const { userName } = getDashboardUser()
  const queryClient = useQueryClient()
  const [provider, setProvider] = useState<EmailProvider>('gmail')
  const [enabled, setEnabled] = useState(false)
  const [smtpHost, setSmtpHost] = useState('smtp.gmail.com')
  const [smtpPort, setSmtpPort] = useState('587')
  const [smtpUseStartTls, setSmtpUseStartTls] = useState(true)
  const [smtpUsername, setSmtpUsername] = useState('')
  const [smtpPassword, setSmtpPassword] = useState('')
  const [fromAddress, setFromAddress] = useState('')
  const [fromDisplayName, setFromDisplayName] = useState('')
  const [sendPaymentReceipts, setSendPaymentReceipts] = useState(true)
  const [sendMembershipExpiryReminders, setSendMembershipExpiryReminders] = useState(true)
  const [sendDietAssignments, setSendDietAssignments] = useState(true)
  const [testTo, setTestTo] = useState('')
  const [hasPasswordConfigured, setHasPasswordConfigured] = useState(false)

  const { data, isLoading, isError } = useQuery({
    queryKey: ['email-settings'],
    queryFn: () => emailSettingsService.get(),
  })

  useEffect(() => {
    if (!data) return
    const p = (data.provider === 'gmail' || data.provider === 'outlook' || data.provider === 'custom'
      ? data.provider
      : 'custom') as EmailProvider
    setProvider(p)
    setEnabled(data.enabled)
    setSmtpHost(data.smtpHost ?? PROVIDER_PRESETS[p].host)
    setSmtpPort(String(data.smtpPort || PROVIDER_PRESETS[p].port))
    setSmtpUseStartTls(data.smtpUseStartTls)
    setSmtpUsername(data.smtpUsername ?? '')
    setFromAddress(data.fromAddress ?? '')
    setFromDisplayName(data.fromDisplayName ?? '')
    setSendPaymentReceipts(data.sendPaymentReceipts)
    setSendMembershipExpiryReminders(data.sendMembershipExpiryReminders)
    setSendDietAssignments(data.sendDietAssignments)
    setHasPasswordConfigured(data.hasPasswordConfigured)
    setSmtpPassword('')
  }, [data])

  const saveMutation = useMutation({
    mutationFn: (payload: UpdateEmailSettings) => emailSettingsService.update(payload),
    onSuccess: (saved) => {
      queryClient.setQueryData(['email-settings'], saved)
      setHasPasswordConfigured(saved.hasPasswordConfigured)
      setSmtpPassword('')
      toast.success('Email settings saved')
      void queryClient.invalidateQueries({ queryKey: ['dashboard-notification-hooks'] })
    },
    onError: (err: unknown) => toast.error(getApiErrorMessage(err, 'Could not save email settings')),
  })

  const testMutation = useMutation({
    mutationFn: (to: string) => emailSettingsService.sendTest(to),
    onSuccess: () => toast.success('Test email sent'),
    onError: (err: unknown) => toast.error(getApiErrorMessage(err, 'Test email failed')),
  })

  const applyProvider = (next: EmailProvider) => {
    setProvider(next)
    const preset = PROVIDER_PRESETS[next]
    if (next !== 'custom') {
      setSmtpHost(preset.host)
      setSmtpPort(String(preset.port))
      setSmtpUseStartTls(preset.startTls)
    }
  }

  const handleSave = () => {
    const port = Number(smtpPort)
    if (!smtpHost.trim()) {
      toast.error('SMTP host is required')
      return
    }
    if (!Number.isFinite(port) || port < 1) {
      toast.error('Enter a valid SMTP port')
      return
    }
    if (!smtpUsername.trim()) {
      toast.error('SMTP username is required')
      return
    }
    if (!fromAddress.trim()) {
      toast.error('From email is required')
      return
    }
    if (!hasPasswordConfigured && !smtpPassword.trim()) {
      toast.error('App password is required on first save')
      return
    }

    const payload: UpdateEmailSettings = {
      enabled,
      provider,
      smtpHost: smtpHost.trim(),
      smtpPort: port,
      smtpUseStartTls,
      smtpUsername: smtpUsername.trim(),
      fromAddress: fromAddress.trim(),
      fromDisplayName: fromDisplayName.trim() || undefined,
      sendPaymentReceipts,
      sendMembershipExpiryReminders,
      sendDietAssignments,
    }
    if (smtpPassword.trim()) payload.smtpPassword = smtpPassword.trim()
    saveMutation.mutate(payload)
  }

  return (
    <DashboardLayout userName={userName}>
      <PermissionGate
        permission={authService.permissionCodes.config}
        fallback={
          <div className="glass-card dashboard-card rounded-2xl p-6 text-sm text-amber-200">
            You do not have permission to configure email. Ask an admin to grant Config access.
          </div>
        }
      >
        <DashboardSubpageShell
          eyebrow="Notifications"
          titleBefore="Email "
          titleGradient="settings"
          subtitle="Connect Gmail or another SMTP account to send payment receipts and membership renewal reminders."
        >
          <div className="glass-card dashboard-card max-w-3xl rounded-2xl p-6">
            {isLoading ? (
              <p className="text-sm text-slate-400">Loading email settings…</p>
            ) : isError ? (
              <p className="text-sm text-rose-300">Could not load email settings.</p>
            ) : (
              <div className="space-y-6">
                <div className="rounded-xl border border-blue-400/20 bg-blue-500/5 p-4 text-sm text-slate-300">
                  <p className="font-medium text-blue-100">Gmail setup</p>
                  <p className="mt-1 text-xs leading-relaxed text-slate-400">
                    Turn on 2-Step Verification, then create an App Password under Google Account → Security.
                    Use that 16-character password below (not your normal Gmail password). Username is usually your
                    full Gmail address.
                  </p>
                </div>

                <label className="flex items-center gap-3 text-sm text-slate-200">
                  <input
                    type="checkbox"
                    checked={enabled}
                    onChange={(e) => setEnabled(e.target.checked)}
                    className="size-4 rounded border-white/20 bg-black/30"
                  />
                  Enable outbound email from this system
                </label>

                <div>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Provider</p>
                  <div className="flex flex-wrap gap-2">
                    {(['gmail', 'outlook', 'custom'] as EmailProvider[]).map((p) => (
                      <button
                        key={p}
                        type="button"
                        onClick={() => applyProvider(p)}
                        className={`rounded-lg border px-3 py-1.5 text-xs font-medium capitalize ${
                          provider === p
                            ? 'border-violet-400/40 bg-violet-500/15 text-violet-100'
                            : 'border-white/10 text-slate-400 hover:bg-white/5'
                        }`}
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <Input label="SMTP host" value={smtpHost} onChange={(e) => setSmtpHost(e.target.value)} />
                  <Input label="SMTP port" value={smtpPort} onChange={(e) => setSmtpPort(e.target.value)} />
                  <Input
                    label="SMTP username"
                    value={smtpUsername}
                    onChange={(e) => setSmtpUsername(e.target.value)}
                    placeholder="you@gmail.com"
                  />
                  <Input
                    label={hasPasswordConfigured ? 'App password (leave blank to keep)' : 'App password'}
                    type="password"
                    value={smtpPassword}
                    onChange={(e) => setSmtpPassword(e.target.value)}
                    autoComplete="new-password"
                  />
                  <Input
                    label="From email"
                    value={fromAddress}
                    onChange={(e) => setFromAddress(e.target.value)}
                    placeholder="you@gmail.com"
                  />
                  <Input
                    label="From display name"
                    value={fromDisplayName}
                    onChange={(e) => setFromDisplayName(e.target.value)}
                    placeholder="Tiger Fitness"
                  />
                </div>

                <label className="flex items-center gap-3 text-sm text-slate-300">
                  <input
                    type="checkbox"
                    checked={smtpUseStartTls}
                    onChange={(e) => setSmtpUseStartTls(e.target.checked)}
                    className="size-4 rounded border-white/20 bg-black/30"
                  />
                  Use STARTTLS (recommended for Gmail / Outlook on port 587)
                </label>

                <div className="space-y-2 rounded-xl border border-white/10 bg-black/20 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Send these emails</p>
                  <label className="flex items-center gap-3 text-sm text-slate-300">
                    <input
                      type="checkbox"
                      checked={sendPaymentReceipts}
                      onChange={(e) => setSendPaymentReceipts(e.target.checked)}
                      className="size-4 rounded border-white/20 bg-black/30"
                    />
                    Payment receipts (after collect payment)
                  </label>
                  <label className="flex items-center gap-3 text-sm text-slate-300">
                    <input
                      type="checkbox"
                      checked={sendMembershipExpiryReminders}
                      onChange={(e) => setSendMembershipExpiryReminders(e.target.checked)}
                      className="size-4 rounded border-white/20 bg-black/30"
                    />
                    Membership renewal reminders (14, 7, 3, 1, 0 days before expiry)
                  </label>
                  <label className="flex items-center gap-3 text-sm text-slate-300">
                    <input
                      type="checkbox"
                      checked={sendDietAssignments}
                      onChange={(e) => setSendDietAssignments(e.target.checked)}
                      className="size-4 rounded border-white/20 bg-black/30"
                    />
                    Diet plan assignments
                  </label>
                </div>

                <div className="flex flex-wrap gap-3">
                  <Button onClick={handleSave} isLoading={saveMutation.isPending}>
                    Save settings
                  </Button>
                </div>

                <div className="border-t border-white/10 pt-6">
                  <p className="mb-3 text-sm font-medium text-white">Send test email</p>
                  <div className="flex flex-wrap items-end gap-3">
                    <div className="min-w-[220px] flex-1">
                      <Input
                        label="Recipient"
                        value={testTo}
                        onChange={(e) => setTestTo(e.target.value)}
                        placeholder="test@example.com"
                      />
                    </div>
                    <Button
                      variant="soft"
                      onClick={() => testMutation.mutate(testTo.trim())}
                      disabled={!testTo.trim()}
                      isLoading={testMutation.isPending}
                    >
                      Send test
                    </Button>
                  </div>
                </div>

                {data?.passwordNeedsReentry ? (
                  <p className="text-xs text-amber-300/90">
                    Your saved app password could not be read (usually after an API restart). Re-enter the app
                    password below and click Save settings.
                  </p>
                ) : data?.isConfigured ? (
                  <p className="text-xs text-emerald-300/90">
                    SMTP is configured
                    {data.updatedDateUtc
                      ? ` · last updated ${new Date(data.updatedDateUtc).toLocaleString()}`
                      : ''}
                  </p>
                ) : (
                  <p className="text-xs text-slate-500">SMTP not configured yet.</p>
                )}
              </div>
            )}
          </div>
        </DashboardSubpageShell>
      </PermissionGate>
    </DashboardLayout>
  )
}
