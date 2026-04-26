import { useRef, type ReactNode } from 'react'
import { DashboardLayout } from '../../../components/layout/DashboardLayout'
import { DashboardSubpageShell } from '../../../components/layout/DashboardSubpageShell'
import { usePageFadeIn } from '../hooks/useAnimations'

function getUserName(): string {
  try {
    const raw = localStorage.getItem('user')
    if (!raw) return 'User'
    const u = JSON.parse(raw) as { fullName?: string; username?: string }
    return u?.fullName?.trim() || u?.username?.trim() || 'User'
  } catch {
    return 'User'
  }
}

/**
 * Module-scoped page shell for Owner Analytics. Reuses the shared
 * DashboardLayout + DashboardSubpageShell without modifying them and adds a
 * subtle mount fade-in.
 */
export function ModulePageShell({
  eyebrow,
  titleBefore,
  titleGradient,
  subtitle,
  children,
}: {
  eyebrow: string
  titleBefore?: string
  titleGradient: string
  subtitle: string
  children: ReactNode
}) {
  const userName = getUserName()
  const ref = useRef<HTMLDivElement>(null)
  usePageFadeIn(ref)

  return (
    <DashboardLayout userName={userName}>
      <div ref={ref} className="min-w-0 max-w-[100%]">
        <DashboardSubpageShell
          eyebrow={eyebrow}
          titleBefore={titleBefore}
          titleGradient={titleGradient}
          subtitle={subtitle}
          showExport={false}
        >
          {children}
        </DashboardSubpageShell>
      </div>
    </DashboardLayout>
  )
}
