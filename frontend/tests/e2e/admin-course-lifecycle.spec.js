import { expect, test } from '@playwright/test'
import { loginAsAdmin } from './helpers/auth.js'

const uniqueSuffix = Date.now()
const courseTitle = `E2E Course ${uniqueSuffix}`
const courseSlug = `playwright-course-${uniqueSuffix}`

const fillCourseForm = async (page, override = {}) => {
  await page.getByLabel('Course Title').fill(override.title || courseTitle)
  await page.getByLabel('Slug').fill(override.slug || courseSlug)
  await page.getByLabel('Short Description').fill(override.shortDescription || 'Course created during Playwright regression testing.')
  await page.getByLabel('Full Description').fill(override.description || 'Validation course for verifying admin course management flow.')
  await page.getByLabel('Category').fill(override.category || 'Mechanical Design')
  await page.getByLabel('Software').fill(override.software || 'AutoCAD')
  await page.getByLabel('Level').selectOption(override.level || 'Beginner')
  await page.getByLabel('Duration').fill(override.duration || '6 Weeks')
  await page.getByLabel('Status').selectOption(override.status || 'draft')
  await page.getByLabel('Price in INR').fill(override.priceInRupees ?? '')
  await page.getByLabel('Enrollment Open').uncheck()
}

test('admin can create and manage a course lifecycle', async ({ page }) => {
  await loginAsAdmin(page)

  await page.goto('/admin/courses')
  await expect(page).toHaveURL(/\/admin\/courses$/)
  await expect(page.getByRole('heading', { name: 'Course Management' })).toBeVisible()
  await page.getByRole('link', { name: /add course/i }).click()
  await expect(page).toHaveURL(/\/admin\/courses\/new$/)

  await fillCourseForm(page)
  await page.getByRole('button', { name: /save course/i }).click()

  await page.waitForURL(/\/admin\/courses$/)
  await expect(page.getByText(courseTitle, { exact: true })).toBeVisible()
  await expect(page.getByText('Draft', { exact: true })).toBeVisible()
  await expect(page.getByText('Not configured', { exact: true })).toBeVisible()
  await expect(page.getByText('Closed', { exact: true })).toBeVisible()
})
