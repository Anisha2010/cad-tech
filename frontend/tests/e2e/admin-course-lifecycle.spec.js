import { expect, test } from '@playwright/test'
import { loginAsAdmin, loginAsInstructor } from './helpers/auth.js'
import { createRunId } from './helpers/runId.js'

test.describe.configure({ timeout: 360_000 })

let runId = ''
let createdCourseId = ''
let unassignedCourseId = ''
let createdCourseArchived = false

test.beforeEach(async ({ page: _page }, testInfo) => {
  runId = createRunId(testInfo)
  createdCourseId = ''
  unassignedCourseId = ''
  createdCourseArchived = false
})

test.afterEach(async ({ page }) => {
  const courseIdsToArchive = [createdCourseId, unassignedCourseId].filter(Boolean)
  if (!courseIdsToArchive.length) return

  await loginAsAdmin(page)
  for (const courseId of courseIdsToArchive) {
    if (courseId === createdCourseId && createdCourseArchived) continue
    const cleanupResponse = await page.request.delete(`${process.env.E2E_API_URL}/admin/courses/${courseId}`)
    expect(cleanupResponse.ok()).toBeTruthy()
    const cleanupResult = await cleanupResponse.json()
    expect(cleanupResult.data?.archived).toBe(true)
  }
})

const buildCourseData = () => ({
  title: `E2E Course ${runId}`,
  slug: `playwright-course-${runId.toLowerCase()}`,
})

const fillCourseForm = async (page, override = {}) => {
  const { title, slug } = buildCourseData()

  await page.getByLabel('Course Title').fill(override.title || title)
  await page.getByLabel('Slug').fill(override.slug || slug)
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
  const { title, slug } = buildCourseData()
  const updatedTitle = `${title} Updated`

  await loginAsAdmin(page)

  await page.goto('/admin/courses')
  await expect(page).toHaveURL(/\/admin\/courses$/)
  await expect(page.getByRole('heading', { name: 'Course Management' })).toBeVisible({ timeout: 20_000 })
  await page.getByRole('link', { name: /add course/i }).click()
  await expect(page).toHaveURL(/\/admin\/courses\/new$/)

  await fillCourseForm(page)
  const createResponsePromise = page.waitForResponse((response) => {
    const url = new URL(response.url())
    return url.pathname.endsWith('/admin/courses') && response.request().method() === 'POST'
  })
  await page.getByRole('button', { name: /save course/i }).click()
  const createResponse = await createResponsePromise
  expect(createResponse.ok()).toBeTruthy()
  const createResult = await createResponse.json()
  createdCourseId = createResult.data?.course?.id ?? createResult.data?.course?._id ?? ''
  expect(createdCourseId).toBeTruthy()

  await page.waitForURL(/\/admin\/courses$/)
  const createdCourseRow = page.getByRole('row').filter({ hasText: title })
  await expect(createdCourseRow).toBeVisible()
  await expect(createdCourseRow.getByRole('cell', { name: 'Draft', exact: true })).toBeVisible()
  await expect(createdCourseRow.getByRole('cell', { name: 'Not configured', exact: true })).toBeVisible()
  await expect(createdCourseRow.getByRole('cell', { name: 'Closed', exact: true })).toBeVisible()

  const unassignedResponse = await page.request.post(`${process.env.E2E_API_URL}/admin/courses`, {
    data: {
      title: `E2E Unassigned ${runId}`,
      slug: `playwright-unassigned-${runId.toLowerCase()}`,
      shortDescription: 'Unassigned E2E authorization fixture.',
      description: 'Unassigned E2E authorization fixture.',
      category: 'Mechanical Design',
      software: 'AutoCAD',
      level: 'Beginner',
      duration: '1 Week',
      enrollmentOpen: false
    }
  })
  expect(unassignedResponse.status()).toBe(201)
  const unassignedResult = await unassignedResponse.json()
  unassignedCourseId = unassignedResult.data?.course?.id ?? unassignedResult.data?.course?._id ?? ''
  expect(unassignedCourseId).toBeTruthy()

  const instructorsResponsePromise = page.waitForResponse((response) => {
    const url = new URL(response.url())
    return url.pathname.endsWith('/admin/instructors') && response.request().method() === 'GET'
  })
  await page.goto(`/admin/courses/${createdCourseId}/edit`)
  await expect(page.getByRole('heading', { name: 'Edit Course' })).toBeVisible()
  const instructorsResponse = await instructorsResponsePromise
  expect(instructorsResponse.ok()).toBeTruthy()
  const instructorsResult = await instructorsResponse.json()
  const instructor = instructorsResult.data?.instructors?.find((item) => item.name === 'E2E Instructor')
  expect(instructor?.id).toBeTruthy()
  const selectedInstructorId = String(instructor.id)

  await page.getByLabel('Course Title').fill(updatedTitle)
  await page.getByLabel('Short Description').fill(`Updated description ${runId}`)
  await page.getByLabel('Level').selectOption('Intermediate')
  await page.getByLabel('Duration').fill('7 Weeks')
  await page.getByLabel('Assigned Instructor').selectOption(selectedInstructorId)

  const updateResponsePromise = page.waitForResponse((response) => {
    const url = new URL(response.url())
    return url.pathname.endsWith(`/admin/courses/${createdCourseId}`) && response.request().method() === 'PATCH'
  })
  const assignmentResponsePromise = page.waitForResponse((response) => {
    const url = new URL(response.url())
    return url.pathname.endsWith(`/admin/courses/${createdCourseId}/instructor`) && response.request().method() === 'PATCH'
  })
  await page.getByRole('button', { name: 'Save Course' }).click()
  const [updateResponse, assignmentResponse] = await Promise.all([updateResponsePromise, assignmentResponsePromise])
  expect(updateResponse.ok()).toBeTruthy()
  expect(assignmentResponse.ok()).toBeTruthy()
  const updatedCourseResponse = await updateResponse.json()
  const assignedCourseResponse = await assignmentResponse.json()
  expect(updatedCourseResponse.data?.course?.title).toBe(updatedTitle)
  expect(assignedCourseResponse.data?.course?.instructorId).toBe(selectedInstructorId)
  await expect(page).toHaveURL(/\/admin\/courses$/)

  await page.goto(`/admin/courses/${createdCourseId}/edit`)
  await expect(page.getByLabel('Course Title')).toHaveValue(updatedTitle)
  await expect(page.getByLabel('Short Description')).toHaveValue(`Updated description ${runId}`)
  await expect(page.getByLabel('Level')).toHaveValue('Intermediate')
  await expect(page.getByLabel('Duration')).toHaveValue('7 Weeks')
  await expect(page.getByLabel('Assigned Instructor')).toHaveValue(selectedInstructorId)
  await expect(page.getByLabel('Assigned Instructor').locator('option:checked')).toContainText('E2E Instructor')

  await loginAsInstructor(page)
  await page.goto('/instructor/courses')
  await expect(page.getByRole('heading', { name: 'My Courses' })).toBeVisible()
  const instructorCourseRow = page.getByRole('row').filter({ hasText: updatedTitle })
  await expect(instructorCourseRow).toBeVisible()
  await expect(instructorCourseRow.getByRole('link', { name: `Manage curriculum for ${updatedTitle}` })).toBeVisible()
  await expect(page.getByText(`E2E Unassigned ${runId}`, { exact: true })).toHaveCount(0)

  const unassignedAccessResponse = await page.request.get(`${process.env.E2E_API_URL}/instructor/courses/${unassignedCourseId}`)
  expect(unassignedAccessResponse.status()).toBe(403)
  await page.goto('/admin/dashboard')
  await expect(page).toHaveURL(/\/instructor\/dashboard$/)

  await page.goto(`/instructor/courses/${createdCourseId}/curriculum`)
  const sectionTitle = `E2E Section ${runId}`
  const lessonTitle = `E2E Lesson ${runId}`
  const createSectionResponsePromise = page.waitForResponse((response) => {
    const url = new URL(response.url())
    return url.pathname.endsWith(`/instructor/courses/${createdCourseId}/curriculum/sections`) && response.request().method() === 'POST'
  })
  await page.getByLabel('Section title').fill(sectionTitle)
  await page.getByRole('button', { name: 'Create section' }).click()
  const createSectionResponse = await createSectionResponsePromise
  expect(createSectionResponse.status()).toBe(201)
  const sectionResult = await createSectionResponse.json()
  const createdSection = sectionResult.data?.curriculum?.sections?.find((section) => section.title === sectionTitle)
  expect(createdSection?.id).toBeTruthy()

  await page.getByLabel('Title', { exact: true }).fill(lessonTitle)
  await page.locator('.lesson-form').getByRole('combobox').selectOption('article')
  await page.getByLabel('Article content', { exact: true }).fill(`Course lesson content ${runId}`)
  const createLessonResponsePromise = page.waitForResponse((response) => {
    const url = new URL(response.url())
    return url.pathname.endsWith(`/sections/${createdSection.id}/lessons`) && response.request().method() === 'POST'
  })
  await page.getByRole('button', { name: 'Add lesson' }).click()
  const createLessonResponse = await createLessonResponsePromise
  expect(createLessonResponse.status()).toBe(201)
  const lessonResult = await createLessonResponse.json()
  const createdLesson = lessonResult.data?.curriculum?.sections?.find((section) => section.id === createdSection.id)?.lessons?.find((lesson) => lesson.title === lessonTitle)
  expect(createdLesson?.id).toBeTruthy()

  await page.reload()
  await expect(page.locator('input[id^="instructor-section-title-"]')).toHaveValue(sectionTitle)
  await expect(page.getByText(lessonTitle, { exact: true })).toBeVisible()

  await page.goto(`/instructor/courses/${createdCourseId}/edit`)
  const courseReviewResponsePromise = page.waitForResponse((response) => {
    const url = new URL(response.url())
    return url.pathname.endsWith(`/instructor/courses/${createdCourseId}/submit-review`) && response.request().method() === 'POST'
  })
  await page.getByRole('button', { name: 'Submit for Review' }).click()
  const courseReviewResponse = await courseReviewResponsePromise
  expect(courseReviewResponse.ok()).toBeTruthy()
  const courseReviewResult = await courseReviewResponse.json()
  expect(courseReviewResult.data?.course?.reviewStatus).toBe('pending')

  await loginAsAdmin(page)
  const approveCourseResponse = await page.request.post(`${process.env.E2E_API_URL}/admin/courses/${createdCourseId}/review/approve`)
  expect(approveCourseResponse.ok()).toBeTruthy()
  const approvalResult = await approveCourseResponse.json()
  expect(approvalResult.data?.course?.reviewStatus).toBe('approved')

  const publishLessonResponse = await page.request.patch(
    `${process.env.E2E_API_URL}/admin/courses/${createdCourseId}/curriculum/sections/${createdSection.id}/lessons/${createdLesson.id}`,
    { data: { isPublished: true } }
  )
  expect(publishLessonResponse.ok()).toBeTruthy()
  const publishLessonResult = await publishLessonResponse.json()
  const publishedLesson = publishLessonResult.data?.curriculum?.sections?.find((section) => section.id === createdSection.id)?.lessons?.find((lesson) => lesson.id === createdLesson.id)
  expect(publishedLesson?.isPublished).toBe(true)

  await page.goto(`/admin/courses/${createdCourseId}/curriculum`)
  const publishCurriculumResponsePromise = page.waitForResponse((response) => {
    const url = new URL(response.url())
    return url.pathname.endsWith(`/admin/courses/${createdCourseId}/curriculum/publish`) && response.request().method() === 'PATCH'
  })
  await page.getByRole('button', { name: 'Publish' }).click()
  const publishCurriculumResponse = await publishCurriculumResponsePromise
  expect(publishCurriculumResponse.ok()).toBeTruthy()
  const publishedCurriculumResult = await publishCurriculumResponse.json()
  expect(publishedCurriculumResult.data?.curriculum?.isPublished).toBe(true)

  await page.goto('/admin/courses')
  await expect(page.getByRole('row').filter({ hasText: updatedTitle })).toBeVisible()
  page.once('dialog', (dialog) => dialog.accept())
  const publishCourseResponsePromise = page.waitForResponse((response) => {
    const url = new URL(response.url())
    return url.pathname.endsWith(`/admin/courses/${createdCourseId}/status`) && response.request().method() === 'PATCH'
  })
  await page.getByRole('button', { name: `Publish ${updatedTitle}` }).click()
  const publishCourseResponse = await publishCourseResponsePromise
  expect(publishCourseResponse.ok()).toBeTruthy()
  const publishCourseResult = await publishCourseResponse.json()
  expect(publishCourseResult.data?.course?.status).toBe('published')

  await page.goto('/courses')
  const publicCourseLink = page.getByRole('link', { name: `View course: ${updatedTitle}` })
  await expect(publicCourseLink).toBeVisible({ timeout: 20_000 })
  await publicCourseLink.click()
  await expect(page).toHaveURL(`/courses/${slug}`)
  await expect(page.getByRole('heading', { name: updatedTitle })).toBeVisible()
  await expect(page.getByText('E2E Instructor', { exact: true })).toHaveCount(0)
  const publicCourseResponse = await page.request.get(`${process.env.E2E_API_URL}/courses/${slug}`)
  expect(publicCourseResponse.ok()).toBeTruthy()
  const publicCourseResult = await publicCourseResponse.json()
  expect(publicCourseResult.data?.course?.title).toBe(updatedTitle)
  expect(publicCourseResult.data?.course).not.toHaveProperty('instructorId')
  expect(publicCourseResult.data?.course).not.toHaveProperty('instructor')
  expect(publicCourseResult.data?.course).not.toHaveProperty('instructorName')
  expect(publicCourseResult.data?.course).not.toHaveProperty('instructorEmail')
  expect(publicCourseResult.data?.course).not.toHaveProperty('reviewStatus')

  await page.goto('/admin/courses')
  page.once('dialog', (dialog) => dialog.accept())
  const archiveCourseResponsePromise = page.waitForResponse((response) => {
    const url = new URL(response.url())
    return url.pathname.endsWith(`/admin/courses/${createdCourseId}`) && response.request().method() === 'DELETE'
  })
  await page.getByRole('button', { name: `Archive ${updatedTitle}` }).click()
  const archiveCourseResponse = await archiveCourseResponsePromise
  expect(archiveCourseResponse.ok()).toBeTruthy()
  const archiveCourseResult = await archiveCourseResponse.json()
  expect(archiveCourseResult.data?.archived).toBe(true)
  createdCourseArchived = true

  const archivedPublicResponse = await page.request.get(`${process.env.E2E_API_URL}/courses/${slug}`)
  expect(archivedPublicResponse.ok()).toBe(false)
})
