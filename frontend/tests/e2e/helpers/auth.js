import { expect } from '@playwright/test'

const loginFlow = async (page, { email, password, expectedRoute }) => {
  await page.context().clearCookies()
  await page.goto('/login', { waitUntil: 'domcontentloaded' })
  await expect(page.getByRole('heading', { name: /welcome back/i })).toBeVisible({ timeout: 20_000 })

  await page.getByLabel(/email address/i).fill(email)
  await page.getByLabel(/^password$/i).fill(password)

  const loginResponsePromise = page.waitForResponse((response) => {
    const url = response.url()
    return url.includes('/auth/login') && response.request().method() === 'POST'
  }, { timeout: 30_000 })

  await page.getByRole('button', { name: /^sign in$/i }).click()
  await loginResponsePromise
  await page.waitForURL(new RegExp(expectedRoute), { timeout: 20_000 })

  await page.waitForResponse((response) => response.url().includes('/auth/me') && response.status() === 200, { timeout: 30_000 })
}

export async function loginAsAdmin(page) {
  const adminEmail = process.env.E2E_ADMIN_EMAIL
  const adminPassword = process.env.E2E_ADMIN_PASSWORD
  await loginFlow(page, { email: adminEmail, password: adminPassword, expectedRoute: '/admin/dashboard' })
  await page.waitForLoadState('networkidle')
  await expect(page.getByRole('heading', { name: /welcome back/i })).toBeVisible({ timeout: 20_000 })
}

export async function loginAsStudent(page) {
  const studentEmail = process.env.E2E_STUDENT_EMAIL
  const studentPassword = process.env.E2E_STUDENT_PASSWORD
  await loginFlow(page, { email: studentEmail, password: studentPassword, expectedRoute: '/student/dashboard' })
  await page.waitForLoadState('networkidle')
  await expect(page.getByRole('heading', { name: /student dashboard/i })).toBeVisible({ timeout: 20_000 })
}

export async function logout(page) {
  await page.goto('/admin/dashboard', { waitUntil: 'domcontentloaded' }).catch(() => page.goto('/student/dashboard', { waitUntil: 'domcontentloaded' }))
  await page.getByRole('button', { name: /logout|log out/i }).click()
  await page.waitForURL(/\/login/, { timeout: 20_000 })
  await page.context().clearCookies()
}

export { expect }
