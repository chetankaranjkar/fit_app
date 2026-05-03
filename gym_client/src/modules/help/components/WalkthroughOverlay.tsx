import { useCallback, useEffect, useLayoutEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { useQuery } from '@tanstack/react-query'
import { AnimatePresence, motion } from 'framer-motion'
import { useHelpUi } from '../HelpUiContext'
import { fetchWalkthrough } from '../helpApi.service'

function walkthroughStorageKey(moduleKey: string) {
  return `walkthrough_${moduleKey}_completed`
}

export function WalkthroughOverlay() {
  const { walkthroughModuleKey, dismissWalkthrough } = useHelpUi()
  const [stepIndex, setStepIndex] = useState(0)
  const [rect, setRect] = useState<{ top: number; left: number; width: number; height: number } | null>(null)

  const { data, isLoading, isFetched } = useQuery({
    queryKey: ['help', 'walkthrough', walkthroughModuleKey],
    queryFn: () => fetchWalkthrough(walkthroughModuleKey!),
    enabled: !!walkthroughModuleKey,
  })

  const steps = data?.steps ?? []
  const step = steps[stepIndex]

  const updateRect = useCallback(() => {
    if (!step?.selector) {
      setRect(null)
      return
    }
    const el = document.querySelector(step.selector)
    if (!el || !(el instanceof HTMLElement)) {
      setRect(null)
      return
    }
    const r = el.getBoundingClientRect()
    setRect({ top: r.top, left: r.left, width: r.width, height: r.height })
  }, [step])

  useEffect(() => {
    setStepIndex(0)
  }, [walkthroughModuleKey])

  useLayoutEffect(() => {
    updateRect()
  }, [updateRect, stepIndex])

  useEffect(() => {
    if (!walkthroughModuleKey) return
    window.addEventListener('scroll', updateRect, true)
    window.addEventListener('resize', updateRect)
    return () => {
      window.removeEventListener('scroll', updateRect, true)
      window.removeEventListener('resize', updateRect)
    }
  }, [walkthroughModuleKey, updateRect])

  useEffect(() => {
    if (!isFetched || !walkthroughModuleKey) return
    if (!data?.steps?.length) dismissWalkthrough()
  }, [isFetched, walkthroughModuleKey, data, dismissWalkthrough])

  if (!walkthroughModuleKey) return null

  const finish = () => {
    try {
      localStorage.setItem(walkthroughStorageKey(walkthroughModuleKey), 'true')
    } catch {
      /* ignore */
    }
    dismissWalkthrough()
  }

  const onNext = () => {
    if (stepIndex >= steps.length - 1) finish()
    else setStepIndex((i) => i + 1)
  }

  const onSkip = () => dismissWalkthrough()

  if (typeof document === 'undefined') return null

  return createPortal(
    <AnimatePresence>
      {walkthroughModuleKey && (
        <motion.div
          key={walkthroughModuleKey}
          className="fixed inset-0 z-[215]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <div className="absolute inset-0 bg-slate-950/75 backdrop-blur-[2px] dark:bg-black/80" />

          {isLoading && (
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-white/10 bg-white/5 px-6 py-4 text-sm text-white">
              Loading tour…
            </div>
          )}

          {!isLoading && step && (
            <>
              {rect ? (
                <div
                  className="pointer-events-none absolute rounded-xl ring-2 ring-sky-400/90 shadow-[0_0_0_9999px_rgba(15,23,42,0.78)] dark:shadow-[0_0_0_9999px_rgba(0,0,0,0.82)]"
                  style={{
                    top: rect.top,
                    left: rect.left,
                    width: rect.width,
                    height: rect.height,
                  }}
                />
              ) : (
                <p className="absolute left-1/2 top-[22%] max-w-sm -translate-x-1/2 rounded-xl border border-amber-400/30 bg-amber-950/40 px-4 py-3 text-center text-sm text-amber-100">
                  This step highlights a part of the page that is not visible. Scroll or resize, then press Next.
                </p>
              )}

              <motion.div
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 16 }}
                transition={{ type: 'spring', damping: 26, stiffness: 320 }}
                className="absolute bottom-8 left-1/2 w-[min(24rem,calc(100vw-2rem))] -translate-x-1/2 rounded-2xl border border-white/10 bg-[rgba(11,11,26,0.95)] p-5 shadow-2xl shadow-black/40 backdrop-blur-xl"
              >
                <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">
                  Step {stepIndex + 1} of {steps.length}
                </p>
                <h3 className="mt-1 text-lg font-semibold text-white">{step.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-300">{step.body}</p>
                <div className="mt-5 flex flex-wrap items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={onSkip}
                    className="rounded-xl border border-white/10 px-4 py-2 text-sm font-medium text-slate-300 transition hover:bg-white/5"
                  >
                    Skip
                  </button>
                  <button
                    type="button"
                    onClick={onNext}
                    className="rounded-xl bg-[linear-gradient(135deg,#3b82f6_0%,#a855f7_100%)] px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-purple-500/20 transition hover:brightness-110"
                  >
                    {stepIndex >= steps.length - 1 ? 'Done' : 'Next'}
                  </button>
                </div>
              </motion.div>
            </>
          )}
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  )
}
