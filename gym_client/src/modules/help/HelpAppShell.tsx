import { Outlet } from 'react-router-dom'
import { HelpUiProvider } from './HelpUiContext'
import { HelpGlobalLayer } from './HelpGlobalLayer'

export function HelpAppShell() {
  return (
    <HelpUiProvider>
      <HelpGlobalLayer />
      <Outlet />
    </HelpUiProvider>
  )
}
