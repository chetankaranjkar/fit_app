import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Bell, Info, Mail, MessageSquare } from 'lucide-react'
import toast from 'react-hot-toast'
import { meService } from '../../services/me.service'
import { getApiErrorMessage } from '../../lib/apiErrors'
import styles from '../account/ProfileSettings.module.css'

export function MemberNotificationPreferencesCard() {
  const queryClient = useQueryClient()
  const { data, isLoading, isError, refetch } = useQuery({
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
    <section className={`dashboard-panel ${styles.card}`} aria-labelledby="notification-heading">
      <header className={styles.sectionHeader}>
        <span className={styles.sectionIcon}><Bell size={18} /></span>
        <div>
          <h2 id="notification-heading">Notification preferences</h2>
          <p className={styles.description}>Choose how you hear from your gym. Changes save automatically.</p>
        </div>
      </header>
      <div className={styles.sectionBody} aria-busy={saveMutation.isPending}>
        {isLoading ? <p className={styles.description} role="status">Loading preferences…</p> : isError ? (
          <p className={styles.error} role="alert">Could not load preferences. <button type="button" className={styles.textButton} onClick={() => void refetch()}>Try again</button></p>
        ) : (
          <>
            <label className={styles.channelRow}>
              <Mail size={19} className={styles.channelIcon} />
              <span className={styles.channelText}>
                <span className={styles.channelTitle}>Receive email</span>
                <span className={styles.channelDescription}>Payment receipts and membership renewal reminders.</span>
              </span>
              <input type="checkbox" role="switch" aria-label="Receive email" className={styles.switch}
                checked={emailOn} disabled={saveMutation.isPending}
                onChange={(e) => saveMutation.mutate({ receiveEmailNotifications: e.target.checked, receiveSmsNotifications: smsOn })} />
            </label>
            <label className={styles.channelRow}>
              <MessageSquare size={19} className={styles.channelIcon} />
              <span className={styles.channelText}>
                <span className={styles.channelTitle}>Receive SMS / WhatsApp</span>
                <span className={styles.channelDescription}>Text updates and reminders. One preference covers both channels.</span>
              </span>
              <input type="checkbox" role="switch" aria-label="Receive SMS / WhatsApp" className={styles.switch}
                checked={smsOn} disabled={saveMutation.isPending}
                onChange={(e) => saveMutation.mutate({ receiveEmailNotifications: emailOn, receiveSmsNotifications: e.target.checked })} />
            </label>
            <div className={styles.notice}>
              <Info size={15} />
              <div>
                <p>Email and texts are off until you opt in. Nothing is sent through a channel while it is off.</p>
                <p><strong>In-app & push:</strong> dashboard and mobile alerts are managed separately by your gym and mobile app.</p>
              </div>
            </div>
          </>
        )}
      </div>
    </section>
  )
}
