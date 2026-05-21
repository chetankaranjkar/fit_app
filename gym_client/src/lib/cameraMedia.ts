export function stopMediaStream(stream: MediaStream | null | undefined) {
  stream?.getTracks().forEach((t) => t.stop())
}

export function getCameraErrorMessage(err: unknown): string {
  const name = err instanceof DOMException ? err.name : ''
  if (name === 'NotAllowedError' || name === 'PermissionDeniedError') {
    return 'Camera access was blocked. Use the steps below to allow camera for this site, then click Try again.'
  }
  if (name === 'NotFoundError' || name === 'DevicesNotFoundError') {
    return 'No camera was found. Connect a webcam or use “From device” to upload a photo.'
  }
  if (name === 'NotReadableError' || name === 'TrackStartError') {
    return 'The camera is in use by another app (Teams, Zoom, etc.). Close it and try again.'
  }
  if (name === 'SecurityError') {
    return 'Camera requires a secure context. Open the app at http://localhost:5173 in Chrome or Edge.'
  }
  return 'Could not open the camera. Try “From device” or use Chrome/Edge on localhost.'
}

/** Call directly from a button click — browsers require a recent user gesture. */
export async function requestUserCamera(): Promise<MediaStream> {
  if (!navigator.mediaDevices?.getUserMedia) {
    throw new DOMException('Camera API not available', 'NotSupportedError')
  }

  const attempts: MediaStreamConstraints[] = [
    {
      video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } },
      audio: false,
    },
    { video: true, audio: false },
  ]

  let lastError: unknown
  for (const constraints of attempts) {
    try {
      return await navigator.mediaDevices.getUserMedia(constraints)
    } catch (e) {
      lastError = e
      if (e instanceof DOMException && (e.name === 'NotAllowedError' || e.name === 'PermissionDeniedError')) {
        throw e
      }
    }
  }
  throw lastError ?? new Error('Could not access camera')
}

function delay(ms: number) {
  return new Promise<void>((resolve) => window.setTimeout(resolve, ms))
}

function isIgnorablePlayError(err: unknown) {
  if (!(err instanceof DOMException)) return false
  return err.name === 'AbortError' || err.name === 'NotSupportedError'
}

/**
 * Bind a MediaStream to a &lt;video&gt; and start playback. Retries play() when interrupted by
 * React strict mode or rapid re-attach (common cause of false "preview failed" errors).
 */
export async function attachStreamToVideoPreview(
  video: HTMLVideoElement,
  stream: MediaStream,
): Promise<void> {
  const track = stream.getVideoTracks()[0]
  if (!track) throw new Error('No video track on camera stream')

  video.muted = true
  video.defaultMuted = true
  video.playsInline = true
  video.setAttribute('playsinline', 'true')
  video.setAttribute('webkit-playsinline', 'true')
  video.autoplay = true

  if (video.srcObject !== stream) {
    video.srcObject = stream
  }

  await new Promise<void>((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
  })

  let lastErr: unknown
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      await video.play()
      if (!video.paused) return
    } catch (e) {
      lastErr = e
      if (!isIgnorablePlayError(e)) break
    }
    await delay(60 + attempt * 40)
  }

  if (!video.paused) return

  if (video.videoWidth > 0 && video.videoHeight > 0) return

  if (track.readyState === 'live') {
    await new Promise<void>((resolve, reject) => {
      const timeout = window.setTimeout(() => {
        cleanup()
        reject(lastErr ?? new Error('Preview timed out'))
      }, 3000)
      const onReady = () => {
        if (video.videoWidth > 0) {
          cleanup()
          resolve()
        }
      }
      const cleanup = () => {
        window.clearTimeout(timeout)
        video.removeEventListener('loadeddata', onReady)
        video.removeEventListener('playing', onReady)
      }
      video.addEventListener('loadeddata', onReady)
      video.addEventListener('playing', onReady)
      void video.play().catch(() => {})
    })
    return
  }

  throw lastErr ?? new Error('Could not start camera preview')
}

export function isVideoPreviewReady(video: HTMLVideoElement | null) {
  return Boolean(video && !video.paused && video.videoWidth > 0)
}
