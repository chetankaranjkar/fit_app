import { QueryClientProvider } from '@tanstack/react-query'
import { queryClient } from './lib/queryClient'
import { AppRoutes } from './routes'
import { ScrollProgress } from './components/ui/ScrollProgress'
import { BackToTop } from './components/ui/BackToTop'

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ScrollProgress color="#F5C400" height={3} />
      <AppRoutes />
      <BackToTop threshold={300} />
    </QueryClientProvider>
  )
}

export default App
