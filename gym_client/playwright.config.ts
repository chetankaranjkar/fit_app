import { defineConfig, devices } from '@playwright/test'

const e2eBaseUrl = process.env.E2E_BASE_URL ?? 'http://127.0.0.1:5173'
const e2eApiBaseUrl = process.env.E2E_API_BASE_URL ?? 'http://127.0.0.1:5104/api'
const useExternalServers = Boolean(process.env.E2E_BASE_URL)

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false,
  timeout: 60_000,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: e2eBaseUrl,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  webServer: useExternalServers
    ? undefined
    : {
        command:
          'npx concurrently -k -s first -n API,WEB "dotnet run --project ../src/GymManagement.API/GymManagement.API.csproj --urls http://127.0.0.1:5104" "npm run dev -- --host 127.0.0.1 --port 5173"',
        url: e2eBaseUrl,
        timeout: 180_000,
        reuseExistingServer: !process.env.CI,
        env: {
          VITE_API_URL: e2eApiBaseUrl,
        },
      },
  metadata: {
    e2eBaseUrl,
    useExternalServers,
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
})

