import { createPortal } from 'react-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { X, BookOpen, ExternalLink } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useHelpUi } from '../HelpUiContext'
import { useHelpModuleArticle } from '../hooks/useHelp'

export function HelpDrawer() {
  const { drawerOpen, drawerModuleKey, closeDrawer } = useHelpUi()
  const { data, isLoading, isError } = useHelpModuleArticle(drawerModuleKey, drawerOpen)

  if (typeof document === 'undefined') return null

  return createPortal(
    <AnimatePresence>
      {drawerOpen && (
        <>
          <motion.button
            key="help-drawer-backdrop"
            type="button"
            aria-label="Close help"
            className="fixed inset-0 z-[205] bg-slate-950/55 backdrop-blur-sm dark:bg-black/60"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={closeDrawer}
          />
          <motion.aside
            key="help-drawer-panel"
            role="dialog"
            aria-modal="true"
            aria-labelledby="help-drawer-title"
            className="fixed inset-y-0 right-0 z-[210] flex w-full max-w-md flex-col border-l border-white/10 bg-[rgba(11,11,26,0.97)] shadow-2xl shadow-black/50 backdrop-blur-xl dark:bg-[rgba(8,8,18,0.98)]"
            initial={{ x: '105%' }}
            animate={{ x: 0 }}
            exit={{ x: '105%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 360 }}
          >
            <div className="flex items-center justify-between border-b border-white/5 px-5 py-4">
              <div className="flex items-center gap-2">
                <span className="flex size-9 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500/20 to-violet-500/20 text-sky-300">
                  <BookOpen className="size-4" />
                </span>
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">Explain this page</p>
                  <h2 id="help-drawer-title" className="text-base font-semibold text-white">
                    {isLoading ? 'Loading…' : data?.title ?? 'Help'}
                  </h2>
                </div>
              </div>
              <button
                type="button"
                onClick={closeDrawer}
                className="rounded-xl p-2 text-slate-400 transition hover:bg-white/5 hover:text-white"
                aria-label="Close"
              >
                <X className="size-5" />
              </button>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-5">
              {isError && (
                <p className="text-sm text-amber-200/90">Could not load help. Showing defaults where available.</p>
              )}
              {data && (
                <div className="space-y-5">
                  <p className="text-sm leading-relaxed text-slate-300">{data.description}</p>
                  <div>
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">What you can do</p>
                    <ul className="list-disc space-y-2 pl-4 marker:text-sky-400">
                      {data.bullets.map((b, i) => (
                        <li key={i} className="text-sm text-slate-200">
                          {b}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}
            </div>

            <div className="border-t border-white/5 px-5 py-4">
              <Link
                to="/help"
                onClick={closeDrawer}
                className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-medium text-slate-200 transition hover:bg-white/10"
              >
                <ExternalLink className="size-4 opacity-80" />
                Open Help Center
              </Link>
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>,
    document.body,
  )
}
