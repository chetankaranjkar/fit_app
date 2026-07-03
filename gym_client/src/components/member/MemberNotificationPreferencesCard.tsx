import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { meService } from '../../services/me.service'
import { getApiErrorMessage } from '../../lib/apiErrors'

export function MemberNotificationPreferencesCard() {
  const queryClient = useQueryClient()

  const { data, isLoading, isError } = useQuery({
    queryKey: ['member-notification-preferences'],
    queryFn: () => meService.getNotificationPreferences(),
  })

  const saveMutation = useMutation({
    mutationFn: meService.updateNotificationPreferences,
    onSuccess: (saved) => {
      queryClient.setQueryData(['member-notification-preferences'], saved)
      toast.success('Notification preferences saved')
    },
    onError: (err: unknown) =>
      toast.error(getApiErrorMessage(err, 'Could not save notification preferences')),
  })

  const emailOn = data?.receiveEmailNotifications ?? false
  const smsOn = data?.receiveSmsNotifications ?? false

  return (
    <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
      <h2 className="text-base font-semibold text-white">Notification preferences</h2>
      <p className="mt-1 text-xs text-slate-400">
        Choose how the gym may contact you. Off by default — turn on only what you want.
      </p>

      {isLoading ? (
        <p className="mt-4 text-sm text-slate-500">Loading…</p>
      ) : isError ? (
        <p className="mt-4 text-sm text-rose-300">Could not load preferences.</p>
      ) : (
        <div className="mt-4 space-y-4">
          <label className="flex items-start gap-3">
            <input
              type="checkbox"
              checked={emailOn}
              disabled={saveMutation.isPending}
              onChange={(e) =>
                saveMutation.mutate({
                  receiveEmailNotifications: e.target.checked,
                  receiveSmsNotifications: smsOn,
                })
              }
              className="mt-0.5 size-4 rounded border-white/20 bg-black/30"
            />
            <span>
              <span className="block text-sm font-medium text-slate-200">Receive email</span>
              <span className="block text-xs text-slate-500">
                Payment receipts and membership renewal reminders
              </span>
            </span>
          </label>

          <label className="flex items-start gap-3">
            <input
              type="checkbox"
              checked={smsOn}
              disabled={saveMutation.isPending}
              onChange={(e) =>
                saveMutation.mutate({
                  receiveEmailNotifications: emailOn,
                  receiveSmsNotifications: e.target.checked,
                })
              }
              className="mt-0.5 size-4 rounded border-white/20 bg-black/30"
            />
            <span>
              <span className="block text-sm font-medium text-slate-200">Receive SMS / WhatsApp</span>
              <span className="block text-xs text-slate-500">
                Text alerts when your gym has SMS or WhatsApp enabled
              </span>
            </span>
          </label>
        </div>
      )}
    </section>
  )
}
