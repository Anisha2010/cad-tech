import { expect, test } from '@playwright/test'
import { loginAsAdmin, loginAsStudent } from './helpers/auth.js'

test('logged out user cannot access admin dashboard', async ({ page }) => {
  await page.context().clearCookies()
  await page.goto('/admin/dashboard')
  await expect(page).toHaveURL(/\/login/)
})

test('admin login reaches dashboard and admin course management stays accessible', async ({ page }) => {
  await loginAsAdmin(page)
  await expect(page).toHaveURL(/\/admin\/dashboard/)
  await expect(page.getByRole('heading', { name: /welcome back/i })).toBeVisible()

  await page.goto('/admin/courses')
  await expect(page).toHaveURL(/\/admin\/courses/)
  await expect(page.getByRole('heading', { name: 'Course Management' })).toBeVisible()
})

test('student cannot access admin routes', async ({ page }) => {
  await loginAsStudent(page)
  await page.goto('/admin/courses')
  await expect(page).toHaveURL(/\/student\/dashboard|\/login/)
})
