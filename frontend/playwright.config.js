import { defineConfig, devices } from '@playwright/test'
import dotenv from 'dotenv'
import fs from 'node:fs'
import path from 'node:path'

const envPath = path.resolve(process.cwd(), '.env.e2e')
if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath })
}

const localEnvPath = path.resolve(process.cwd(), '.env.e2e.local')
if (fs.existsSync(localEnvPath)) {
  dotenv.config({ path: localEnvPath })
}

const requiredEnv = [
  'E2E_BASE_URL',
  'E2E_API_URL',
  'E2E_ADMIN_EMAIL',
  'E2E_ADMIN_PASSWORD',
  'E2E_STUDENT_EMAIL',
  'E2E_STUDENT_PASSWORD'
]

const missing = requiredEnv.filter((key) => !process.env[key] || String(process.env[key]).trim() === '')

if (missing.length) {
  throw new Error(
    `Missing required E2E environment variables: ${missing.join(', ')}. Create frontend/.env.e2e from frontend/.env.e2e.example and keep real values out of source control.`
  )
}

const baseURL = process.env.E2E_BASE_URL || 'http://127.0.0.1:5173'
const apiURL = process.env.E2E_API_URL || 'http://127.0.0.1:5000'
const useExternalServers = process.env.E2E_EXTERNAL_SERVERS === 'true'

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 45_000,
  expect: { timeout: 12_000 },
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 2 : 0,
  reporter: [
    ['list'],
    ['html', { open: 'never', outputFolder: 'playwright-report' }]
  ],
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
        command: 'npm --prefix ../backend run dev',
        url: `${apiURL}/health`,
        reuseExistingServer: !process.env.CI,
        timeout: 120_000
      },
      {
        command: 'npm run dev -- --host 127.0.0.1 --port 5173',
        url: baseURL,
        reuseExistingServer: !process.env.CI,
        timeout: 120_000
      }
    ]
})
