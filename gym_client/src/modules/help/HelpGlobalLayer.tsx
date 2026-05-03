import { useLocation } from 'react-router-dom'
import { HelpDrawer } from './components/HelpDrawer'
import { HelpFloatingButton } from './components/HelpFloatingButton'
import { WalkthroughOverlay } from './components/WalkthroughOverlay'

/**
 * Global help UI: drawer, walkthrough host, floating action (dashboard + help center only).
 */
export function HelpGlobalLayer() {
  const { pathname } = useLocation()
  const showFloating =
    pathname.startsWith('/dashboard') || pathname.startsWith('/help')

  return (
    <>
      <HelpDrawer />
      <WalkthroughOverlay />
      {showFloating && <HelpFloatingButton />}
    </>
  )
}
