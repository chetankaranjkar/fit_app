import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './dashboardTheme.css'
import App from './App.tsx'
import { Toaster } from 'react-hot-toast'
import { setupChunkLoadRecovery } from './lib/chunkLoadRecovery'
import { initializeDashboardTheme } from './lib/dashboardTheme'

setupChunkLoadRecovery()
initializeDashboardTheme()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
    <Toaster
      position="top-right"
      containerStyle={{ top: 72, right: 16 }}
      toastOptions={{
        className: '!bg-slate-900 !text-slate-100 !border !border-white/10',
        ariaProps: { role: 'status', 'aria-live': 'polite' },
      }}
    />
  </StrictMode>,
)
