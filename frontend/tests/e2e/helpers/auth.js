import { expect } from '@playwright/test'

const buildLoginFormSelector = (page) =>
  page.locator('form').filter({
    has: page.locator('input[type="password"]'),
  }).first()

export async function loginFlow({ page, email, password, expectedPath }) {
  await page.context().clearCookies()
  await page.goto('/login', { waitUntil: 'domcontentloaded' })

  await expect(page.getByRole('heading', { name: /welcome back/i })).toBeVisible({ timeout: 20_000 })

  const form = buildLoginFormSelector(page)
  await form.waitFor({ state: 'visible', timeout: 15_000 })

  const emailInput = form
    .locator('#login-email, input[name="email"], input[autocomplete="email"], input[type="email"]')
    .first()

  const passwordInput = form
    .locator('#login-password, input[name="password"], input[autocomplete="current-password"], input[type="password"]')
    .first()

  await emailInput.waitFor({ state: 'visible', timeout: 15_000 })
  await passwordInput.waitFor({ state: 'visible', timeout: 15_000 })

  await emailInput.fill(email)
  await passwordInput.fill(password)

  const loginResponsePromise = page.waitForResponse((response) => {
    const url = new URL(response.url())
    return url.pathname.endsWith('/auth/login') && response.request().method() === 'POST'
  }, { timeout: 30_000 })

  const submitButton = form.getByRole('button', { name: /sign in|log in/i }).first()
  await expect(submitButton).toBeVisible({ timeout: 15_000 })
  await submitButton.click()

  const loginResponse = await loginResponsePromise
  if (!loginResponse.ok()) {
    throw new Error(`Login failed with HTTP ${loginResponse.status()}.`)
  }

  await page.waitForURL((url) => url.pathname.startsWith(expectedPath), { timeout: 20_000 })
}

export async function loginAsAdmin(page) {
  const adminEmail = process.env.E2E_ADMIN_EMAIL
  const adminPassword = process.env.E2E_ADMIN_PASSWORD
  await loginFlow({ page, email: adminEmail, password: adminPassword, expectedPath: '/admin/dashboard' })
  await expect(page.getByRole('heading', { name: /welcome back/i })).toBeVisible({ timeout: 20_000 })
}

export async function loginAsStudent(page) {
  const studentEmail = process.env.E2E_STUDENT_EMAIL
  const studentPassword = process.env.E2E_STUDENT_PASSWORD
  await loginFlow({ page, email: studentEmail, password: studentPassword, expectedPath: '/student/dashboard' })
  const studentDashboardHeading = page.locator('h1.student-page-title, h2#student-dashboard-heading').filter({ hasText: /student dashboard/i }).first()
  await expect(studentDashboardHeading).toBeVisible({ timeout: 20_000 })
}

export async function loginAsInstructor(page) {
  const instructorEmail = process.env.E2E_INSTRUCTOR_EMAIL
  const instructorPassword = process.env.E2E_INSTRUCTOR_PASSWORD
  await loginFlow({ page, email: instructorEmail, password: instructorPassword, expectedPath: '/instructor/dashboard' })
  await expect(page.getByRole('heading', { name: /welcome back/i })).toBeVisible({ timeout: 20_000 })
}

export async function logout(page) {
  await page.goto('/admin/dashboard', { waitUntil: 'domcontentloaded' }).catch(() => page.goto('/student/dashboard', { waitUntil: 'domcontentloaded' }))
  await page.getByRole('button', { name: /logout|log out/i }).click()
  await page.waitForURL(/\/login/, { timeout: 20_000 })
  await page.context().clearCookies()
}

export { expect }
