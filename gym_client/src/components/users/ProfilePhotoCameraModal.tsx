import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Button } from '../ui/Button'
import { attachStreamToVideoPreview, isVideoPreviewReady } from '../../lib/cameraMedia'

type Props = {
  open: boolean
  stream: MediaStream | null
  error: string | null
  onClose: () => void
  onRetry: () => void
  onCapture: (file: File) => void | Promise<void>
  busy?: boolean
}

function CameraPermissionHelp() {
  return (
    <ol className="mt-3 list-decimal space-y-2 pl-5 text-xs leading-relaxed text-slate-300">
      <li>
        Click the <strong className="text-white">lock or tune icon</strong> left of the address bar.
      </li>
      <li>
        Set <strong className="text-white">Camera</strong> to <strong className="text-emerald-300">Allow</strong>.
      </li>
      <li>Reload the page, then click <strong className="text-white">Use camera</strong> again.</li>
      <li>
        Close other apps using the webcam (Teams, Zoom, Camera app), then click <strong className="text-white">Try again</strong>.
      </li>
    </ol>
  )
}

export function ProfilePhotoCameraModal({
  open,
  stream,
  error,
  onClose,
  onRetry,
  onCapture,
  busy = false,
}: Props) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const attachGenRef = useRef(0)
  const [ready, setReady] = useState(false)
  const [previewError, setPreviewError] = useState<string | null>(null)
  const [attaching, setAttaching] = useState(false)

  useLayoutEffect(() => {
    if (!open || !stream || error) {
      setReady(false)
      setAttaching(false)
      setPreviewError(null)
      const video = videoRef.current
      if (video) video.srcObject = null
      return
    }

    const video = videoRef.current
    if (!video) return

    const gen = ++attachGenRef.current
    setAttaching(true)
    setReady(false)
    setPreviewError(null)

    void (async () => {
      try {
        await attachStreamToVideoPreview(video, stream)
        if (attachGenRef.current !== gen) return
        if (isVideoPreviewReady(video)) {
          setReady(true)
        } else {
          await new Promise((r) => window.setTimeout(r, 200))
          if (attachGenRef.current === gen && isVideoPreviewReady(video)) setReady(true)
        }
      } catch {
        if (attachGenRef.current !== gen) return
        setPreviewError(
          'Could not start the camera preview. Close other apps using the camera, then click Try again — or use From device.',
        )
      } finally {
        if (attachGenRef.current === gen) setAttaching(false)
      }
    })()

    return () => {
      attachGenRef.current += 1
      video.srcObject = null
    }
  }, [open, stream, error])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !busy) onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose, busy])

  const handleCapture = async () => {
    const video = videoRef.current
    if (!video || video.videoWidth === 0) return

    const canvas = document.createElement('canvas')
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    ctx.translate(canvas.width, 0)
    ctx.scale(-1, 1)
    ctx.drawImage(video, 0, 0)

    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob((b) => resolve(b), 'image/jpeg', 0.92)
    })
    if (!blob) return

    const file = new File([blob], `profile-${Date.now()}.jpg`, { type: 'image/jpeg' })
    await onCapture(file)
  }

  const displayError = error ?? previewError
  const showOverlay = attaching || (!ready && stream && !displayError)

  if (!open) return null

  return createPortal(
    <div className="fixed inset-0 z-[320]" data-lenis-prevent>
      <button
        type="button"
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        aria-label="Close camera"
        disabled={busy}
        onClick={() => !busy && onClose()}
      />
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center p-4">
        <div
          className="pointer-events-auto w-full max-w-lg overflow-hidden rounded-2xl border border-white/10 bg-[#12101f] shadow-2xl"
          role="dialog"
          aria-modal="true"
          aria-labelledby="profile-camera-title"
        >
          <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
            <h2 id="profile-camera-title" className="text-lg font-semibold text-white">
              Take profile photo
            </h2>
            <button
              type="button"
              className="rounded-lg p-1 text-slate-400 transition hover:bg-white/10 hover:text-white"
              disabled={busy}
              onClick={onClose}
              aria-label="Close"
            >
              ✕
            </button>
          </div>

          <div className="p-5">
            {displayError ? (
              <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
                <p>{displayError}</p>
                <CameraPermissionHelp />
              </div>
            ) : !stream ? (
              <div className="flex aspect-[4/3] items-center justify-center rounded-xl border border-white/10 bg-black/80 text-sm text-slate-300">
                Opening camera…
              </div>
            ) : (
              <div className="relative aspect-[4/3] min-h-[240px] overflow-hidden rounded-xl border border-white/10 bg-black">
                <video
                  ref={videoRef}
                  className="size-full object-cover"
                  playsInline
                  muted
                  autoPlay
                  style={{ transform: 'scaleX(-1)' }}
                />
                {showOverlay && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/70 text-sm text-slate-300">
                    Starting preview…
                  </div>
                )}
              </div>
            )}
            {!displayError && stream && ready && (
              <p className="mt-3 text-xs text-slate-500">Position your face in the frame, then capture.</p>
            )}
          </div>

          <div className="flex flex-wrap justify-end gap-2 border-t border-white/10 px-5 py-4">
            <Button type="button" variant="secondary" onClick={onClose} disabled={busy}>
              Cancel
            </Button>
            {displayError ? (
              <Button type="button" onClick={onRetry} disabled={busy}>
                Try again
              </Button>
            ) : (
              <Button
                type="button"
                onClick={() => void handleCapture()}
                disabled={busy || !ready || !stream}
              >
                {busy ? 'Saving…' : 'Capture photo'}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>,
    document.body,
  )
}
