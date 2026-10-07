import { expect, test } from '@playwright/test'
import { loginAsAdmin, loginAsInstructor, loginAsStudent } from './helpers/auth.js'

test.describe.configure({ timeout: 90_000 })

for (const protectedRoute of [
  { role: 'student', path: '/student/dashboard' },
  { role: 'instructor', path: '/instructor/dashboard' },
  { role: 'admin', path: '/admin/dashboard' }
]) {
  test(`logged out user cannot access ${protectedRoute.role} dashboard`, async ({ page }) => {
    await page.context().clearCookies()
    await page.goto(protectedRoute.path)
    await expect(page).toHaveURL(/\/login$/)
    await expect(page.getByRole('heading', { name: /welcome back/i })).toBeVisible()
  })
}

test('admin login reaches dashboard and admin course management stays accessible', async ({ page }) => {
  await loginAsAdmin(page)
  await expect(page).toHaveURL(/\/admin\/dashboard/)
  await expect(page.getByRole('heading', { name: /welcome back/i })).toBeVisible()

  await page.goto('/admin/courses')
  await expect(page).toHaveURL(/\/admin\/courses/)
  await expect(page.getByRole('heading', { name: 'Course Management' })).toBeVisible({ timeout: 20_000 })
})

test('student cannot access admin routes', async ({ page }) => {
  await loginAsStudent(page)
  await page.goto('/admin/courses')
  await expect(page).toHaveURL(/\/student\/dashboard$/)
  await expect(page.locator('h1.student-page-title, h2#student-dashboard-heading').filter({ hasText: /student dashboard/i }).first()).toBeVisible()
  await page.goto('/instructor/courses')
  await expect(page).toHaveURL(/\/student\/dashboard$/)
  await expect(page.locator('h1.student-page-title, h2#student-dashboard-heading').filter({ hasText: /student dashboard/i }).first()).toBeVisible()

  const response = await page.request.get(`${process.env.E2E_API_URL}/admin/dashboard`)
  expect(response.status()).toBe(403)
})

test('student session survives refresh and logout invalidates browser history', async ({ page }) => {
  await loginAsStudent(page)
  await page.reload()
  await expect(page).toHaveURL(/\/student\/dashboard$/)
  await expect(page.locator('h1.student-page-title, h2#student-dashboard-heading').filter({ hasText: /student dashboard/i }).first()).toBeVisible()

  await page.getByLabel('Student portal navigation').getByRole('button', { name: /log out|logout/i }).click()
  await expect(page).toHaveURL(/\/login$/)
  await expect(page.getByRole('heading', { name: /welcome back/i })).toBeVisible()
  await page.goBack()
  await expect(page).not.toHaveURL(/\/student\/dashboard/)
  await page.goto('/student/dashboard')
  await expect(page).toHaveURL(/\/login$/)
  await expect(page.getByRole('heading', { name: /welcome back/i })).toBeVisible()
})

test('instructor cannot access admin pages or student-only API', async ({ page }) => {
  await loginAsInstructor(page)
  await page.goto('/admin/dashboard')
  await expect(page).toHaveURL(/\/instructor\/dashboard$/)
  await expect(page.getByRole('heading', { name: /welcome back/i })).toBeVisible()

  const response = await page.request.get(`${process.env.E2E_API_URL}/student/dashboard`)
  expect(response.status()).toBe(403)
})

test('admin session survives refresh and admin content pages load', async ({ page }) => {
  await loginAsAdmin(page)
  await page.reload()
  await expect(page).toHaveURL(/\/admin\/dashboard$/)
  await expect(page.getByRole('heading', { name: /welcome back/i })).toBeVisible()

  for (const [path, heading] of [
    ['/admin/courses', 'Course Management'],
    ['/admin/site-content', /site settings/i],
    ['/admin/contact-enquiries', /contact enquiries/i]
  ]) {
    await page.goto(path)
    await expect(page).toHaveURL(new RegExp(`${path.replaceAll('/', '\\/')}$`))
    await expect(page.getByRole('heading', { name: heading })).toBeVisible({ timeout: 20_000 })
  }
})
