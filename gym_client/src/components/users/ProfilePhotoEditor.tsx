import { useEffect, useRef, useState } from 'react'
import toast from 'react-hot-toast'
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'
import { ProfilePhotoCameraModal } from './ProfilePhotoCameraModal'
import { getCameraErrorMessage, requestUserCamera, stopMediaStream } from '../../lib/cameraMedia'

const labelClass = 'mb-1.5 block text-xs font-medium uppercase tracking-wider text-slate-400'

export interface ProfilePhotoEditorProps {
  imageUrl: string
  onImageUrlChange: (url: string) => void
  /** Upload multipart file; return final image URL (relative or absolute). */
  uploadFile: (file: File) => Promise<string>
  /** When set, called after a successful upload so the server stores the URL immediately. */
  persistUrl?: (url: string) => Promise<void>
  onError?: (message: string) => void
  /** Shown in helper copy, e.g. "member" or "trainer". */
  subjectLabel?: string
  showUrlField?: boolean
  className?: string
}

export function ProfilePhotoEditor({
  imageUrl,
  onImageUrlChange,
  uploadFile,
  persistUrl,
  onError,
  subjectLabel = 'profile',
  showUrlField = true,
  className = '',
}: ProfilePhotoEditorProps) {
  const [uploading, setUploading] = useState(false)
  const [cameraOpen, setCameraOpen] = useState(false)
  const [cameraAcquiring, setCameraAcquiring] = useState(false)
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null)
  const [cameraError, setCameraError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const closeCamera = () => {
    stopMediaStream(cameraStream)
    setCameraStream(null)
    setCameraError(null)
    setCameraOpen(false)
  }

  useEffect(() => {
    return () => {
      stopMediaStream(cameraStream)
    }
  }, [cameraStream])

  const openCamera = async () => {
    stopMediaStream(cameraStream)
    setCameraStream(null)
    setCameraError(null)
    setCameraAcquiring(true)
    try {
      const stream = await requestUserCamera()
      setCameraStream(stream)
      setCameraOpen(true)
    } catch (err: unknown) {
      setCameraError(getCameraErrorMessage(err))
      setCameraOpen(true)
      toast.error('Could not access the camera.')
    } finally {
      setCameraAcquiring(false)
    }
  }

  const handleUpload = async (file: File) => {
    setUploading(true)
    try {
      const url = (await uploadFile(file))?.trim()
      if (!url) throw new Error('Server did not return imageUrl')
      onImageUrlChange(url)
      if (persistUrl) await persistUrl(url)
      toast.success('Profile photo saved.')
      closeCamera()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Upload failed'
      onError?.(msg)
      toast.error(msg)
      throw err
    } finally {
      setUploading(false)
    }
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    await handleUpload(file)
  }

  return (
    <>
      <div
        className={`space-y-3 rounded-2xl border border-white/10 bg-white/[0.03] p-4 ${className}`.trim()}
      >
        <div>
          <p className={labelClass}>Profile photo</p>
          <p className="mt-1 text-xs text-slate-500">
            Upload a file (JPG, PNG, GIF, WebP — max 5MB), use your webcam
            {showUrlField ? ', or set a URL below' : ''}. Upload saves immediately to this {subjectLabel}
            &apos;s profile.
          </p>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/gif,image/webp,.jpg,.jpeg,.png,.gif,.webp"
          className="sr-only"
          disabled={uploading}
          onChange={handleFileChange}
          aria-label="Upload profile photo from files"
        />
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            disabled={uploading}
            onClick={() => fileInputRef.current?.click()}
          >
            {uploading ? 'Uploading…' : 'From device'}
          </Button>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            disabled={uploading || cameraAcquiring}
            onClick={() => void openCamera()}
          >
            {cameraAcquiring ? 'Opening camera…' : 'Use camera'}
          </Button>
        </div>
        {imageUrl ? (
          <div className="flex flex-wrap items-center gap-3">
            <img
              src={imageUrl}
              alt=""
              className="size-14 rounded-full border border-white/15 object-cover"
            />
            <span className="max-w-[240px] truncate text-xs text-slate-500" title={imageUrl}>
              {imageUrl}
            </span>
          </div>
        ) : null}
        {showUrlField ? (
          <>
            <Input
              label="Picture URL (optional)"
              value={imageUrl}
              placeholder="/uploads/profiles/users/… or https://…"
              onChange={(e) => onImageUrlChange(e.target.value)}
            />
            <p className="text-xs text-slate-500">
              Use upload above, or paste a link. Save the form to persist URL-only changes.
            </p>
          </>
        ) : null}
      </div>

      <ProfilePhotoCameraModal
        open={cameraOpen}
        stream={cameraStream}
        error={cameraError}
        onClose={closeCamera}
        onRetry={() => void openCamera()}
        onCapture={handleUpload}
        busy={uploading}
      />
    </>
  )
}
