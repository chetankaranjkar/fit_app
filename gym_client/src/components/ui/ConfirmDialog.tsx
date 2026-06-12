import { useState } from 'react'
import { Button } from './Button'
import { Modal } from './Modal'

type ConfirmTone = 'danger' | 'default'

export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  tone = 'danger',
  isLoading = false,
  onConfirm,
  onCancel,
}: {
  open: boolean
  title: string
  message: React.ReactNode
  confirmLabel?: string
  cancelLabel?: string
  tone?: ConfirmTone
  isLoading?: boolean
  onConfirm: () => void
  onCancel: () => void
}) {
  return (
    <Modal open={open} onClose={onCancel} title={title}>
      <div className="space-y-5">
        <div className="text-sm leading-relaxed text-slate-300">{message}</div>
        <div className="flex justify-end gap-2">
          <Button variant="secondary" size="sm" onClick={onCancel} disabled={isLoading}>
            {cancelLabel}
          </Button>
          <Button
            size="sm"
            isLoading={isLoading}
            onClick={onConfirm}
            className={
              tone === 'danger'
                ? '!bg-none !bg-rose-500/15 !text-rose-200 !shadow-rose-500/10 hover:!bg-rose-500/25 focus:!ring-rose-400/40'
                : undefined
            }
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </Modal>
  )
}

/**
 * Imperative-friendly confirm state helper.
 *
 * const confirm = useConfirm<WorkoutPlan>()
 * confirm.request(plan)                  // open dialog for a target
 * confirm.target                         // the pending target (null when closed)
 * confirm.close()                        // dismiss
 */
export function useConfirm<T>() {
  const [target, setTarget] = useState<T | null>(null)
  return {
    target,
    open: target !== null,
    request: (value: T) => setTarget(value),
    close: () => setTarget(null),
  }
}
