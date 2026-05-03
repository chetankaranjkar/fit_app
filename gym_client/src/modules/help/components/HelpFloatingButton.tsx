import { CircleHelp } from 'lucide-react'
import { motion } from 'framer-motion'
import { useHelpUi } from '../HelpUiContext'

/**
 * Compact floating help — bottom-right corner (same drawer as ? shortcut).
 */
export function HelpFloatingButton() {
  const { openDrawer, resolvedModuleKey } = useHelpUi()

  return (
    <motion.button
      type="button"
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 420, damping: 30 }}
      whileHover={{ scale: 1.06 }}
      whileTap={{ scale: 0.95 }}
      onClick={() => openDrawer(resolvedModuleKey)}
      className="fixed bottom-4 right-4 z-[190] flex size-9 items-center justify-center rounded-xl border border-white/12 bg-[linear-gradient(135deg,rgba(59,130,246,0.28),rgba(168,85,247,0.28))] text-white/95 shadow-md shadow-black/25 backdrop-blur-sm dark:border-white/10 dark:shadow-black/40"
      aria-label="Open help for this page"
      title="Help (keyboard ? )"
    >
      <CircleHelp className="size-4" strokeWidth={2} />
    </motion.button>
  )
}
