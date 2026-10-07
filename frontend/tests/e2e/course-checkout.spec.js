import { expect, test } from '@playwright/test'

const course = {
  id: '507f1f77bcf86cd799439012',
  slug: 'cad-essentials',
  title: 'CAD Essentials',
  shortDescription: 'Learn CAD essentials.',
  description: 'A test course.',
  category: 'Mechanical',
  software: 'AutoCAD',
  level: 'Beginner',
  duration: '4 weeks',
  lessonCount: 8,
  priceInPaise: 29900,
  currency: 'INR',
  enrollmentOpen: true,
  status: 'published'
}

const setupCheckoutPage = async (page, { role = 'student', statusHandler } = {}) => {
  await page.addInitScript(() => {
    window.__checkoutMode = 'success'
    window.Razorpay = class {
      constructor(options) { this.options = options }
      open() {
        if (window.__checkoutMode === 'dismiss') {
          this.options.modal.ondismiss()
          return
        }
        this.options.handler({
          razorpay_order_id: this.options.order_id,
          razorpay_payment_id: 'pay_test_123',
          razorpay_signature: 'test-signature'
        })
      }
    }
  })

  await page.route('**/auth/me', (route) => route.fulfill({
    json: { success: true, data: { user: { id: '507f1f77bcf86cd799439011', role } } }
  }))
  await page.route('**/courses/cad-essentials', (route) => route.fulfill({ json: { success: true, data: { course } } }))
  await page.route('**/courses?*', (route) => route.fulfill({ json: { success: true, data: { courses: [] } } }))
  await page.route('**/payments/status**', statusHandler || ((route) => route.fulfill({ json: { success: true, data: { status: 'not_enrolled', enrollment: null } } })))
  await page.goto('/courses/cad-essentials')
}

const mockOrder = (route, orderId = 'order_test_123') => route.fulfill({
  json: { success: true, data: { providerOrderId: orderId, keyId: 'rzp_test_checkout', amount: course.priceInPaise, currency: 'INR', courseTitle: course.title } }
})

test('successful backend verification replaces Buy Course with Start Learning', async ({ page }) => {
  await setupCheckoutPage(page)
  await page.route('**/payments/orders', mockOrder)
  await page.route('**/payments/verify', (route) => route.fulfill({
    json: { success: true, data: { enrollment: { id: 'enrollment_test_123', progressPercentage: 0, lastAccessedAt: null } } }
  }))

  await expect(page.getByRole('button', { name: 'Buy Course' })).toBeVisible()
  await page.getByRole('button', { name: 'Buy Course' }).click()
  await expect(page.getByRole('status')).toContainText('Payment successful! You are now enrolled in this course.')
  await expect(page.getByRole('button', { name: 'Start Learning' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Buy Course' })).toHaveCount(0)
  await page.getByRole('button', { name: 'Start Learning' }).click()
  await expect(page).toHaveURL(/\/student\/learn\/cad-essentials$/)
})

test('order creation shows a disabled processing button', async ({ page }) => {
  let releaseOrder
  const orderGate = new Promise((resolve) => { releaseOrder = resolve })
  await setupCheckoutPage(page)
  await page.route('**/payments/orders', async (route) => {
    await orderGate
    await mockOrder(route)
  })
  await page.route('**/payments/verify', (route) => route.fulfill({
    json: { success: true, data: { enrollment: { id: 'enrollment_test_123', progressPercentage: 0 } } }
  }))

  await page.getByRole('button', { name: 'Buy Course' }).click()
  await expect(page.getByRole('button', { name: 'Preparing Checkout...' })).toBeDisabled()
  releaseOrder()
  await expect(page.getByRole('button', { name: 'Start Learning' })).toBeVisible()
})

test('pending verification keeps Buy Course hidden and offers status check', async ({ page }) => {
  await setupCheckoutPage(page, { statusHandler: (route) => route.fulfill({ json: { success: true, data: { status: 'pending', enrollment: null } } }) })
  await page.route('**/payments/orders', mockOrder)
  await page.route('**/payments/verify', (route) => route.fulfill({ status: 503, json: { success: false, message: 'Temporary verification outage.' } }))

  await expect(page.getByRole('button', { name: 'Buy Course' })).toBeVisible()
  await page.getByRole('button', { name: 'Buy Course' }).click()
  await expect(page.getByText('Payment verification pending')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Check Payment Status' })).toBeEnabled()
  await expect(page.getByRole('button', { name: 'Buy Course' })).toHaveCount(0)
  await page.getByRole('button', { name: 'Check Payment Status' }).click()
  await expect(page.getByText('Payment verification pending')).toBeVisible()
})

test('reload with a backend enrollment shows Continue Learning without Buy Course', async ({ page }) => {
  await setupCheckoutPage(page, { statusHandler: (route) => route.fulfill({
    json: { success: true, data: { status: 'enrolled', enrollment: { id: 'enrollment_test_123', progressPercentage: 18, lastAccessedAt: '2026-09-28T12:00:00.000Z' } } }
  }) })

  await expect(page.getByRole('button', { name: 'Continue Learning' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Buy Course' })).toHaveCount(0)
  await page.reload()
  await expect(page.getByRole('button', { name: 'Continue Learning' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Buy Course' })).toHaveCount(0)
})

test('cancelled checkout shows a safe retry without enrollment', async ({ page }) => {
  await setupCheckoutPage(page)
  await page.route('**/payments/orders', mockOrder)
  await page.evaluate(() => { window.__checkoutMode = 'dismiss' })

  await page.getByRole('button', { name: 'Buy Course' }).click()
  await expect(page.getByRole('alert')).toContainText('Payment was cancelled. No enrollment was created.')
  await expect(page.getByRole('button', { name: 'Buy Course' })).toBeEnabled()
})

test('non-student account cannot start checkout', async ({ page }) => {
  await setupCheckoutPage(page, { role: 'instructor' })

  await expect(page.getByText('Sign in with a student account to enroll.')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Buy Course' })).toHaveCount(0)
})

test('unauthenticated checkout redirects to login', async ({ page }) => {
  await setupCheckoutPage(page, { role: null })

  await expect(page.getByRole('button', { name: 'Buy Course' })).toBeVisible()
  await page.getByRole('button', { name: 'Buy Course' }).click()
  await expect(page).toHaveURL(/\/login$/)
})