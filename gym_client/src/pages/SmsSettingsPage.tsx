import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { DashboardLayout } from '../components/layout/DashboardLayout'
import { DashboardSubpageShell } from '../components/layout/DashboardSubpageShell'
import { PermissionGate } from '../components/auth/PermissionGate'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { authService } from '../services/auth.service'
import { smsSettingsService } from '../services/smsSettings.service'
import { getApiErrorMessage } from '../lib/apiErrors'
import type {
  SmsChannelSettings,
  TextChannel,
  UpdateSmsChannel,
  UpdateSmsSettings,
} from '../types/smsSettings'

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

type ChannelForm = {
  enabled: boolean
  webhookUrl: string
  senderId: string
  authHeader: string
  hasAuthHeaderConfigured: boolean
  sendPaymentReceipts: boolean
  sendMembershipExpiryReminders: boolean
}

const emptyForm: ChannelForm = {
  enabled: false,
  webhookUrl: '',
  senderId: '',
  authHeader: '',
  hasAuthHeaderConfigured: false,
  sendPaymentReceipts: true,
  sendMembershipExpiryReminders: true,
}

function toForm(c: SmsChannelSettings | undefined): ChannelForm {
  if (!c) return { ...emptyForm }
  return {
    enabled: c.enabled,
    webhookUrl: c.webhookUrl ?? '',
    senderId: c.senderId ?? '',
    authHeader: '',
    hasAuthHeaderConfigured: c.hasAuthHeaderConfigured,
    sendPaymentReceipts: c.sendPaymentReceipts,
    sendMembershipExpiryReminders: c.sendMembershipExpiryReminders,
  }
}

function toUpdate(f: ChannelForm, clearAuthHeader = false): UpdateSmsChannel {
  const payload: UpdateSmsChannel = {
    enabled: f.enabled,
    webhookUrl: f.webhookUrl.trim() || undefined,
    senderId: f.senderId.trim() || undefined,
    sendPaymentReceipts: f.sendPaymentReceipts,
    sendMembershipExpiryReminders: f.sendMembershipExpiryReminders,
  }
  if (clearAuthHeader) payload.clearAuthHeader = true
  else if (f.authHeader.trim()) payload.authHeader = f.authHeader.trim()
  return payload
}

type ChannelCardProps = {
  channel: TextChannel
  title: string
  badge: string
  description: string
  urlPlaceholder: string
  senderLabel: string
  senderPlaceholder: string
  form: ChannelForm
  onChange: (patch: Partial<ChannelForm>) => void
  onClearAuth: () => void
  onTest: (toPhone: string) => void
  testPending: boolean
  isConfigured: boolean
}

function ChannelCard({
  channel,
  title,
  badge,
  description,
  urlPlaceholder,
  senderLabel,
  senderPlaceholder,
  form,
  onChange,
  onClearAuth,
  onTest,
  testPending,
  isConfigured,
}: ChannelCardProps) {
  const [testTo, setTestTo] = useState('')
  const accent = channel === 'whatsapp' ? 'text-green-200' : 'text-sky-200'
  const ring = channel === 'whatsapp' ? 'border-green-400/20' : 'border-sky-400/20'

  return (
    <div className={`rounded-2xl border ${ring} bg-black/20 p-5`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-base font-semibold text-white">{title}</h3>
            <span className={`rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide ${accent}`}>
              {badge}
            </span>
          </div>
          <p className="mt-1 text-xs leading-relaxed text-slate-400">{description}</p>
        </div>
        <span
          className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium ${
            isConfigured ? 'bg-emerald-500/15 text-emerald-300' : 'bg-white/5 text-slate-500'
          }`}
        >
          {isConfigured ? 'Configured' : 'Not set'}
        </span>
      </div>

      <div className="mt-4 space-y-4">
        <label className="flex items-center gap-3 text-sm text-slate-200">
          <input
            type="checkbox"
            checked={form.enabled}
            onChange={(e) => onChange({ enabled: e.target.checked })}
            className="size-4 rounded border-white/20 bg-black/30"
          />
          Enable {title}
        </label>

        <Input
          label="Webhook URL"
          value={form.webhookUrl}
          onChange={(e) => onChange({ webhookUrl: e.target.value })}
          placeholder={urlPlaceholder}
        />

        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label={senderLabel}
            value={form.senderId}
            onChange={(e) => onChange({ senderId: e.target.value })}
            placeholder={senderPlaceholder}
          />
          <Input
            label={
              form.hasAuthHeaderConfigured
                ? 'Authorization header (leave blank to keep)'
                : 'Authorization header (optional)'
            }
            type="password"
            value={form.authHeader}
            onChange={(e) => onChange({ authHeader: e.target.value })}
            autoComplete="new-password"
            placeholder="Bearer xxxxx"
          />
        </div>
        {form.hasAuthHeaderConfigured && (
          <button
            type="button"
            onClick={onClearAuth}
            className="self-start text-xs text-rose-300/80 underline-offset-2 hover:underline"
          >
            Remove stored authorization header
          </button>
        )}

        <div className="space-y-2 rounded-xl border border-white/10 bg-black/20 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Send these messages</p>
          <label className="flex items-center gap-3 text-sm text-slate-300">
            <input
              type="checkbox"
              checked={form.sendPaymentReceipts}
              onChange={(e) => onChange({ sendPaymentReceipts: e.target.checked })}
              className="size-4 rounded border-white/20 bg-black/30"
            />
            Payment receipts (after collect payment)
          </label>
          <label className="flex items-center gap-3 text-sm text-slate-300">
            <input
              type="checkbox"
              checked={form.sendMembershipExpiryReminders}
              onChange={(e) => onChange({ sendMembershipExpiryReminders: e.target.checked })}
              className="size-4 rounded border-white/20 bg-black/30"
            />
            Membership renewal reminders (14, 7, 3, 1, 0 days before expiry)
          </label>
        </div>

        <div className="border-t border-white/10 pt-4">
          <p className="mb-2 text-xs font-medium text-slate-300">Send a test message</p>
          <div className="flex flex-wrap items-end gap-3">
            <div className="min-w-[200px] flex-1">
              <Input
                label="Recipient phone"
                value={testTo}
                onChange={(e) => setTestTo(e.target.value)}
                placeholder="+919999999999"
              />
            </div>
            <Button
              variant="soft"
              onClick={() => onTest(testTo.trim())}
              disabled={!testTo.trim()}
              isLoading={testPending}
            >
              Send test
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

export function SmsSettingsPage() {
  const { userName } = getDashboardUser()
  const queryClient = useQueryClient()
  const [smsForm, setSmsForm] = useState<ChannelForm>({ ...emptyForm })
  const [waForm, setWaForm] = useState<ChannelForm>({ ...emptyForm })

  const { data, isLoading, isError } = useQuery({
    queryKey: ['sms-settings'],
    queryFn: () => smsSettingsService.get(),
  })

  useEffect(() => {
    if (!data) return
    setSmsForm(toForm(data.sms))
    setWaForm(toForm(data.whatsApp))
  }, [data])

  const saveMutation = useMutation({
    mutationFn: (payload: UpdateSmsSettings) => smsSettingsService.update(payload),
    onSuccess: (saved) => {
      queryClient.setQueryData(['sms-settings'], saved)
      setSmsForm(toForm(saved.sms))
      setWaForm(toForm(saved.whatsApp))
      toast.success('Notification channels saved')
      void queryClient.invalidateQueries({ queryKey: ['dashboard-notification-hooks'] })
    },
    onError: (err: unknown) => toast.error(getApiErrorMessage(err, 'Could not save settings')),
  })

  const testMutation = useMutation({
    mutationFn: ({ to, channel }: { to: string; channel: TextChannel }) =>
      smsSettingsService.sendTest(to, channel),
    onSuccess: (res) => toast.success(res.message ?? 'Test sent'),
    onError: (err: unknown) => toast.error(getApiErrorMessage(err, 'Test failed')),
  })
  const [testingChannel, setTestingChannel] = useState<TextChannel | null>(null)

  const validate = (label: string, form: ChannelForm) => {
    const url = form.webhookUrl.trim()
    if (form.enabled && !url) {
      toast.error(`Webhook URL is required to enable ${label}`)
      return false
    }
    if (url && !/^https?:\/\//i.test(url)) {
      toast.error(`${label} webhook URL must start with http:// or https://`)
      return false
    }
    return true
  }

  const handleSave = () => {
    if (!validate('SMS', smsForm) || !validate('WhatsApp', waForm)) return
    saveMutation.mutate({ sms: toUpdate(smsForm), whatsApp: toUpdate(waForm) })
  }

  const clearAuth = (channel: TextChannel) => {
    saveMutation.mutate({
      sms: toUpdate(smsForm, channel === 'sms'),
      whatsApp: toUpdate(waForm, channel === 'whatsapp'),
    })
  }

  const runTest = (channel: TextChannel, to: string) => {
    if (!to) return
    setTestingChannel(channel)
    testMutation.mutate({ to, channel })
  }

  return (
    <DashboardLayout userName={userName}>
      <PermissionGate
        permission={authService.permissionCodes.config}
        fallback={
          <div className="glass-card dashboard-card rounded-2xl p-6 text-sm text-amber-200">
            You do not have permission to configure SMS. Ask an admin to grant Config access.
          </div>
        }
      >
        <DashboardSubpageShell
          eyebrow="Notifications"
          titleBefore="SMS & WhatsApp "
          titleGradient="settings"
          subtitle="Send text messages through outbound webhooks (n8n, Zapier, Make, or a custom gateway bridge)."
        >
          <div className="glass-card dashboard-card max-w-3xl rounded-2xl p-6">
            {isLoading ? (
              <p className="text-sm text-slate-400">Loading settings…</p>
            ) : isError ? (
              <p className="text-sm text-rose-300">Could not load settings.</p>
            ) : (
              <div className="space-y-6">
                <div className="rounded-xl border border-emerald-400/20 bg-emerald-500/5 p-4 text-sm text-slate-300">
                  <p className="font-medium text-emerald-100">How text-message delivery works</p>
                  <p className="mt-1 text-xs leading-relaxed text-slate-400">
                    This system does not talk to a gateway directly. It POSTs a JSON payload to the webhook URL of
                    each enabled channel. Your automation reads{' '}
                    <code className="text-emerald-200">data.memberPhone</code> and{' '}
                    <code className="text-emerald-200">data.message</code> (and{' '}
                    <code className="text-emerald-200">channel</code>) and forwards it. Members still need SMS
                    notifications enabled on their profile to receive messages.
                  </p>
                </div>

                <ChannelCard
                  channel="sms"
                  title="SMS settings"
                  badge="SMS"
                  description="Deliver text messages via an SMS gateway webhook (Twilio, MSG91, custom bridge)."
                  urlPlaceholder="https://your-n8n.example.com/webhook/gym-sms"
                  senderLabel="Sender ID (optional)"
                  senderPlaceholder="TIGERF"
                  form={smsForm}
                  onChange={(patch) => setSmsForm((f) => ({ ...f, ...patch }))}
                  onClearAuth={() => clearAuth('sms')}
                  onTest={(to) => runTest('sms', to)}
                  testPending={testMutation.isPending && testingChannel === 'sms'}
                  isConfigured={Boolean(data?.sms.isConfigured)}
                />

                <ChannelCard
                  channel="whatsapp"
                  title="WhatsApp settings"
                  badge="WhatsApp"
                  description="Deliver messages via a WhatsApp webhook (WhatsApp Cloud API, WATI, Interakt, Gupshup bridge)."
                  urlPlaceholder="https://your-n8n.example.com/webhook/gym-whatsapp"
                  senderLabel="WhatsApp number (optional)"
                  senderPlaceholder="+919999999999"
                  form={waForm}
                  onChange={(patch) => setWaForm((f) => ({ ...f, ...patch }))}
                  onClearAuth={() => clearAuth('whatsapp')}
                  onTest={(to) => runTest('whatsapp', to)}
                  testPending={testMutation.isPending && testingChannel === 'whatsapp'}
                  isConfigured={Boolean(data?.whatsApp.isConfigured)}
                />

                <div className="flex flex-wrap items-center gap-3 border-t border-white/10 pt-6">
                  <Button onClick={handleSave} isLoading={saveMutation.isPending}>
                    Save settings
                  </Button>
                  {data?.updatedDateUtc && (
                    <span className="text-xs text-slate-500">
                      Last updated {new Date(data.updatedDateUtc).toLocaleString()}
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>
        </DashboardSubpageShell>
      </PermissionGate>
    </DashboardLayout>
  )
}
