import { useContext } from 'react'
import { CircleHelp } from 'lucide-react'
import { motion } from 'framer-motion'
import { HelpUiContext } from '../HelpUiContext'

/**
 * Compact floating help — bottom-right corner (same drawer as ? shortcut).
 */
export function HelpFloatingButton() {
  const ctx = useContext(HelpUiContext)
  if (!ctx) return null
  const { openDrawer, resolvedModuleKey } = ctx

  return (
    <motion.button
      type="button"
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 420, damping: 30 }}
      whileHover={{ scale: 1.06 }}
      whileTap={{ scale: 0.95 }}
      onClick={() => openDrawer(resolvedModuleKey)}
      className="help-floating fixed bottom-4 right-4 z-[190] flex min-h-11 items-center justify-center gap-2 rounded-full px-4 shadow-lg"
      aria-label="Open help for this page"
      title="Help (keyboard ? )"
    >
      <CircleHelp className="size-4" strokeWidth={2} />
      <span className="text-xs font-semibold">Page help</span>
    </motion.button>
  )
}
