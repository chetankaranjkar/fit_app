import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:5104',
        changeOrigin: true,
      },
      '/uploads': {
        target: 'http://localhost:5104',
        changeOrigin: true,
      },
    },
    // Start transforming the app shell while the browser is still fetching
    // index.html. This removes the "dead time" between page request and the
    // first meaningful JS execution.
    warmup: {
      clientFiles: [
        './src/main.tsx',
        './src/App.tsx',
        './src/routes/index.tsx',
        './src/components/layout/DashboardLayout.tsx',
        './src/components/layout/SidebarNav.tsx',
      ],
    },
  },
  // Pre-bundle heavy CJS / large-surface deps up front with esbuild. Without
  // this, Vite discovers them on the first request, triggers a mid-session
  // re-optimize, and the page visibly stalls while it reloads. Listing them
  // here makes the very first `/login` (or any route) feel instant.
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react-dom/client',
      'react-router-dom',
      '@tanstack/react-query',
      'axios',
      'gsap',
      'date-fns',
      'zod',
      'react-hot-toast',
      'lucide-react',
      'recharts',
      'three',
      '@react-three/fiber',
      '@react-three/drei',
      'locomotive-scroll',
      'xlsx',
    ],
  },
  plugins: [
    tailwindcss(),
    react({
      babel: {
        plugins: [['babel-plugin-react-compiler']],
      },
    }),
  ],
})
