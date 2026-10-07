import { defineConfig, devices } from '@playwright/test'
import { assertE2EUrls, E2E_API_URL, E2E_BASE_URL, loadE2EEnvironment } from './tests/e2e/helpers/e2eEnvironment.js'

loadE2EEnvironment()

const requiredEnv = [
  'E2E_BASE_URL',
  'E2E_API_URL',
  'E2E_MONGODB_URI',
  'E2E_ADMIN_EMAIL',
  'E2E_ADMIN_PASSWORD',
  'E2E_INSTRUCTOR_EMAIL',
  'E2E_INSTRUCTOR_PASSWORD',
  'E2E_STUDENT_EMAIL',
  'E2E_STUDENT_PASSWORD'
]

const missing = requiredEnv.filter((key) => !process.env[key] || String(process.env[key]).trim() === '')
if (missing.length) {
  throw new Error(`Missing required E2E environment variables: ${missing.join(', ')}`)
}

assertE2EUrls()
const baseURL = E2E_BASE_URL
const apiURL = E2E_API_URL
const useExternalServers = process.env.E2E_EXTERNAL_SERVERS === 'true'

export default defineConfig({
  testDir: './tests/e2e',
  globalSetup: './tests/e2e/global-setup.js',
  timeout: 45_000,
  expect: { timeout: 12_000 },
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [['line']],
  outputDir: 'test-results',
  use: {
    baseURL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    actionTimeout: 15_000,
    navigationTimeout: 20_000,
    headless: true
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: useExternalServers
    ? undefined
    : [
      {
        command: 'npm --prefix ../backend run start:e2e',
        url: `${apiURL}/health`,
        reuseExistingServer: false,
        env: { E2E_API_URL: apiURL },
        timeout: 120_000
      },
      {
        command: 'npm run dev -- --host 127.0.0.1 --port 5173',
        url: baseURL,
        reuseExistingServer: false,
        env: {
          VITE_API_BASE_URL: apiURL,
          VITE_PUBLIC_SITE_URL: baseURL
        },
        timeout: 120_000
      }
    ]
})
