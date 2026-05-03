import { useEffect, useId, useRef } from 'react'
import { Html5Qrcode } from 'html5-qrcode'
import toast from 'react-hot-toast'
import { normalizeScannedQrPayload } from './scanUtils'

function qrBoxSize() {
  const w = Math.min(320, typeof window !== 'undefined' ? window.innerWidth - 48 : 320)
  return Math.max(200, Math.floor(w))
}

export function ScannerView({
  onDecoded,
}: {
  onDecoded: (token: string) => void | Promise<void>
}) {
  const reactId = useId().replace(/:/g, '')
  const mounted = useRef(true)
  const onDecodedRef = useRef(onDecoded)
  onDecodedRef.current = onDecoded

  useEffect(() => {
    mounted.current = true
    let scanner: Html5Qrcode | null = null

    async function teardown() {
      if (!scanner) return
      try {
        await scanner.stop()
      } catch {
        // Already stopped — ignore races with success callback.
      }
      try {
        scanner.clear()
      } catch {
        // Renderer may already be gone.
      }
    }

    async function startup() {
      const readerId = `qr-reader-${reactId}`
      scanner = new Html5Qrcode(readerId, false)
      await scanner.start(
        { facingMode: 'environment' },
        {
          fps: 12,
          qrbox: { width: qrBoxSize(), height: qrBoxSize() },
          aspectRatio: 1,
        },
        async (decoded) => {
          const token = normalizeScannedQrPayload(decoded)
          if (!mounted.current || token.length === 0) return
          await teardown()
          await onDecodedRef.current(token)
        },
        () => {},
      )
    }

    startup().catch(() => {
      toast.error('Could not access the camera.')
    })

    return () => {
      mounted.current = false
      void teardown()
    }
  }, [reactId])

  return (
    <div className="w-full overflow-hidden rounded-3xl border border-white/10 bg-black/70 shadow-2xl">
      <div className="flex items-center gap-3 border-b border-white/10 px-4 py-3 text-xs text-slate-400">
        Live QR · allow camera permission when prompted.
      </div>
      <div id={`qr-reader-${reactId}`} className="aspect-square w-full min-h-[260px]" />
    </div>
  )
}
