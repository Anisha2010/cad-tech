import { expect, request as playwrightRequest, test } from '@playwright/test'
import { loginAsAdmin, loginAsInstructor, loginAsStudent } from './helpers/auth.js'
import { createStudentEnrollmentFixture, runBackendFixtureScript } from './helpers/backendFixture.js'
import { createRunId } from './helpers/runId.js'

test.describe.configure({ timeout: 360_000 })

function redactFixtureError(error) {
  let message = `${error?.name ?? 'Error'}: ${error?.message ?? String(error)}`
  for (const [key, secret] of Object.entries(process.env)) {
    if (secret && /(PASSWORD|SECRET|URI|COOKIE|TOKEN)/i.test(key)) {
      message = message.split(secret).join('[REDACTED]')
    }
  }
  return message
}

test('instructor, admin, and student complete a quiz lifecycle', async ({ page, request }, testInfo) => {
  const runId = createRunId(testInfo)
  const courseTitle = `E2E Quiz Course ${runId}`
  const courseSlug = `e2e-quiz-course-${runId.toLowerCase()}`
  const quizTitle = `E2E Quiz ${runId}`
  let courseId = ''
  let quizId = ''
  let enrollmentId = ''
  const attemptIds = []
  let fixtureSetupStatus = 'RUNNING'
  let testBodyStatus = 'SKIPPED'
  let cleanupAttempted = false
  let cleanupStatus = 'SKIPPED'
  let cleanupCounts = null
  let primaryError
  let cleanupError

  try {
    await loginAsAdmin(page)
    const instructorsResponse = await page.request.get(`${process.env.E2E_API_URL}/admin/instructors`)
    expect(instructorsResponse.ok()).toBeTruthy()
    const instructorsData = await instructorsResponse.json()
    const instructor = instructorsData.data?.instructors?.find((item) => item.name === 'E2E Instructor')
    expect(instructor?.id).toBeTruthy()

    const createCourseResponse = await page.request.post(`${process.env.E2E_API_URL}/admin/courses`, {
      data: {
        title: courseTitle,
        slug: courseSlug,
        shortDescription: `Quiz lifecycle fixture ${runId}`,
        description: `Isolated quiz lifecycle course ${runId}.`,
        category: 'Mechanical Design',
        software: 'AutoCAD',
        level: 'Beginner',
        duration: '1 Week',
        enrollmentOpen: false,
        instructorId: instructor.id
      }
    })
    expect(createCourseResponse.status()).toBe(201)
    const createdCourse = await createCourseResponse.json()
    courseId = createdCourse.data?.course?.id ?? ''
    expect(courseId).toBeTruthy()

    const createSectionResponse = await page.request.post(`${process.env.E2E_API_URL}/admin/courses/${courseId}/curriculum/sections`, {
      data: { title: `E2E Quiz Section ${runId}`, description: 'Quiz test section.' }
    })
    expect(createSectionResponse.status()).toBe(201)
    const sectionData = await createSectionResponse.json()
    const section = sectionData.data?.curriculum?.sections?.find((item) => item.title === `E2E Quiz Section ${runId}`)
    expect(section?.id).toBeTruthy()

    const createLessonResponse = await page.request.post(`${process.env.E2E_API_URL}/admin/courses/${courseId}/curriculum/sections/${section.id}/lessons`, {
      data: {
        title: `E2E Quiz Lesson ${runId}`,
        description: 'Published lesson for the quiz lifecycle test.',
        type: 'article',
        articleContent: `E2E lesson content ${runId}`,
        isPublished: true
      }
    })
    expect(createLessonResponse.status()).toBe(201)
    const lessonData = await createLessonResponse.json()
    const lesson = lessonData.data?.curriculum?.sections?.find((item) => item.id === section.id)?.lessons?.find((item) => item.title === `E2E Quiz Lesson ${runId}`)
    expect(lesson?.id).toBeTruthy()

    const curriculumResponse = await page.request.patch(`${process.env.E2E_API_URL}/admin/courses/${courseId}/curriculum/publish`, {
      data: { isPublished: true }
    })
    expect(curriculumResponse.ok()).toBeTruthy()
    expect((await curriculumResponse.json()).data?.curriculum?.isPublished).toBe(true)

    const courseApprovalResponse = await page.request.post(`${process.env.E2E_API_URL}/admin/courses/${courseId}/review/approve`)
    expect(courseApprovalResponse.ok()).toBeTruthy()
    expect((await courseApprovalResponse.json()).data?.course?.reviewStatus).toBe('approved')
    const coursePublicationResponse = await page.request.patch(`${process.env.E2E_API_URL}/admin/courses/${courseId}/status`, {
      data: { status: 'published' }
    })
    expect(coursePublicationResponse.ok()).toBeTruthy()
    expect((await coursePublicationResponse.json()).data?.course?.status).toBe('published')

    const enrollment = createStudentEnrollmentFixture(runId, courseId)
    enrollmentId = enrollment.enrollmentId
    expect(enrollment.courseId).toBe(courseId)
    fixtureSetupStatus = 'PASS'
    testBodyStatus = 'RUNNING'

    await loginAsInstructor(page)
    await page.goto(`/instructor/courses/${courseId}/assessments`)
    await expect(page.getByRole('heading', { name: courseTitle })).toBeVisible()
    await page.getByRole('link', { name: 'Add Quiz' }).first().click()
    await expect(page).toHaveURL(new RegExp(`/instructor/courses/${courseId}/quizzes/new`))
    await expect(page.locator('#quiz-course')).toHaveValue(courseTitle)

    const lessonRoute = `/instructor/courses/${courseId}/quizzes/new?lessonId=${encodeURIComponent(lesson.id)}`
    await page.goto(lessonRoute)
    await page.getByLabel('Quiz title').fill(quizTitle)
    await page.getByLabel('Quiz description').fill(`Description ${runId}`)
    await page.getByLabel('Student instructions').fill('Answer each question and submit once complete.')
    await page.getByLabel('Passing percentage (%)').fill('100')
    await page.getByLabel('Maximum attempts').fill('2')
    await page.getByLabel('Time limit (minutes)').fill('5')
    await expect(page.getByLabel('Associated lesson')).toHaveValue(`E2E Quiz Lesson ${runId}`)

    const createQuizResponsePromise = page.waitForResponse((response) => {
      const url = new URL(response.url())
      return url.pathname.endsWith(`/instructor/courses/${courseId}/quizzes`) && response.request().method() === 'POST'
    })
    await page.getByRole('button', { name: 'Save Draft' }).first().click()
    const createQuizResponse = await createQuizResponsePromise
    expect(createQuizResponse.ok()).toBeTruthy()
    const quizDraft = await createQuizResponse.json()
    quizId = quizDraft.data?.assessment?.id ?? ''
    expect(quizId).toBeTruthy()
    expect(quizDraft.data.assessment).toMatchObject({ title: quizTitle, reviewStatus: 'not_submitted', publicationStatus: 'draft', maximumAttempts: 2, passingPercentage: 100, shuffleQuestions: false })
    await expect(page).toHaveURL(new RegExp(`/instructor/courses/${courseId}/quizzes/${quizId}/edit`))

    let questionCreateRequests = 0
    const countQuestionCreateRequest = (browserRequest) => {
      const url = new URL(browserRequest.url())
      if (url.pathname.endsWith(`/instructor/courses/${courseId}/quizzes/${quizId}/questions`) && browserRequest.method() === 'POST') {
        questionCreateRequests += 1
      }
    }
    page.on('request', countQuestionCreateRequest)

    await page.getByRole('button', { name: /^Add Question$/i }).click()
    const mcqEditor = page.getByRole('region', { name: 'Question 1 editor' })
    await expect(mcqEditor).toBeVisible()
    expect(questionCreateRequests).toBe(0)
    await expect(page.getByText('1 questions', { exact: false })).toBeVisible()
    await mcqEditor.getByLabel('Question prompt').fill(`MCQ prompt ${runId}`)
    await mcqEditor.getByLabel('Option A').fill('Correct choice')
    await mcqEditor.getByLabel('Option B').fill('Incorrect choice')
    await mcqEditor.getByRole('radio').first().check()
    await expect(mcqEditor.getByRole('button', { name: /^Save Question$/i })).toBeVisible()
    await expect(mcqEditor.getByRole('button', { name: /^Save Question$/i })).toBeEnabled()
    const createMcqResponsePromise = page.waitForResponse((response) => {
      const url = new URL(response.url())
      return url.pathname.endsWith(`/instructor/courses/${courseId}/quizzes/${quizId}/questions`) && response.request().method() === 'POST'
    })
    await mcqEditor.getByRole('button', { name: /^Save Question$/i }).click()
    const createMcqResponse = await createMcqResponsePromise
    expect(createMcqResponse.ok()).toBeTruthy()
    const mcqAssessment = (await createMcqResponse.json()).data?.assessment
    const mcq = mcqAssessment?.questions?.find((question) => question.prompt === `MCQ prompt ${runId}`)
    expect(mcq?.id).toBeTruthy()
    expect(mcq?.options).toHaveLength(2)
    expect(mcq?.correctOptionId).toBe(mcq.options[0].id)
    expect(questionCreateRequests).toBe(1)

    await page.getByRole('button', { name: 'Add Question' }).first().click()
    const trueFalseEditor = page.getByRole('region', { name: 'Question 2 editor' })
    await trueFalseEditor.getByLabel('Question type').selectOption('true_false')
    await trueFalseEditor.getByLabel('Question prompt').fill(`True false prompt ${runId}`)
    await trueFalseEditor.getByRole('radio', { name: 'True' }).check()
    const createTrueFalseResponsePromise = page.waitForResponse((response) => {
      const url = new URL(response.url())
      return url.pathname.endsWith(`/instructor/courses/${courseId}/quizzes/${quizId}/questions`) && response.request().method() === 'POST'
    })
    await trueFalseEditor.getByRole('button', { name: 'Save Question' }).click()
    const createTrueFalseResponse = await createTrueFalseResponsePromise
    expect(createTrueFalseResponse.ok()).toBeTruthy()
    const finalAssessment = (await createTrueFalseResponse.json()).data?.assessment
    expect(finalAssessment.questions.map((question) => question.type)).toEqual(['multiple_choice', 'true_false'])
    expect(questionCreateRequests).toBe(2)
    page.off('request', countQuestionCreateRequest)

    await page.reload()
    await expect(page.getByText(`MCQ prompt ${runId}`, { exact: true })).toBeVisible()
    await expect(page.getByText(`True false prompt ${runId}`, { exact: true })).toBeVisible()

    const submitQuizReviewResponsePromise = page.waitForResponse((response) => {
      const url = new URL(response.url())
      return url.pathname.endsWith(`/instructor/courses/${courseId}/quizzes/${quizId}/submit-review`) && response.request().method() === 'POST'
    })
    await page.getByRole('button', { name: 'Submit for Review' }).first().click()
    const submitQuizReviewResponse = await submitQuizReviewResponsePromise
    expect(submitQuizReviewResponse.ok()).toBeTruthy()
    expect((await submitQuizReviewResponse.json()).data?.assessment?.reviewStatus).toBe('pending')

    await loginAsAdmin(page)
    await page.goto('/admin/assessments')
    await expect(page.getByRole('heading', { name: 'Assessment Management' })).toBeVisible()
    await page.getByPlaceholder('Search assessments').fill(quizTitle)
    const assessmentRow = page.getByRole('row').filter({ hasText: quizTitle })
    await expect(assessmentRow).toBeVisible()
    await expect(assessmentRow).toContainText('pending')
    await assessmentRow.getByRole('link', { name: `Review ${quizTitle}` }).click()
    await expect(page.getByRole('heading', { name: quizTitle })).toBeVisible()
    await expect(page.getByText(`MCQ prompt ${runId}`, { exact: true })).toBeVisible()
    await expect(page.getByText('Correct answer', { exact: false }).first()).toBeVisible()

    await loginAsInstructor(page)
    const selfApproveResponse = await page.request.post(`${process.env.E2E_API_URL}/admin/quizzes/${quizId}/review/approve`)
    expect(selfApproveResponse.status()).toBe(403)

    await loginAsAdmin(page)
    const approveQuizResponsePromise = page.waitForResponse((response) => {
      const url = new URL(response.url())
      return url.pathname.endsWith(`/admin/quizzes/${quizId}/review/approve`) && response.request().method() === 'POST'
    })
    await page.goto(`/admin/quizzes/${quizId}/review`)
    await page.getByRole('button', { name: 'Approve', exact: true }).click()
    const approveQuizResponse = await approveQuizResponsePromise
    expect(approveQuizResponse.ok()).toBeTruthy()
    expect((await approveQuizResponse.json()).data?.assessment?.reviewStatus).toBe('approved')

    const publishQuizResponsePromise = page.waitForResponse((response) => {
      const url = new URL(response.url())
      return url.pathname.endsWith(`/admin/quizzes/${quizId}/publish`) && response.request().method() === 'POST'
    })
    await page.getByRole('button', { name: 'Publish', exact: true }).click()
    const publishQuizResponse = await publishQuizResponsePromise
    expect(publishQuizResponse.ok()).toBeTruthy()
    expect((await publishQuizResponse.json()).data?.assessment?.publicationStatus).toBe('published')

    await loginAsStudent(page)
    await page.goto('/student/my-courses')
    const studentEnrollmentCard = page.getByRole('article').filter({ hasText: courseTitle })
    await expect(studentEnrollmentCard).toBeVisible()
    await studentEnrollmentCard.getByRole('link', { name: 'Continue Learning' }).click()
    await expect(page).toHaveURL(`/student/learn/${courseSlug}`)
    await expect(page.getByRole('heading', { name: 'E2E Quiz Lesson ' + runId })).toBeVisible()
    await expect(page.getByText('No approved and published quiz is currently available for this lesson.')).toBeVisible()

    const activeQuizLink = `/student/learn/${courseSlug}/quiz/${quizId}`
    const startResponsePromise = page.waitForResponse((response) => {
      const url = new URL(response.url())
      return url.pathname.endsWith(`/student/quizzes/${quizId}/attempts`) && response.request().method() === 'POST'
    })
    await page.goto(activeQuizLink)
    const startResponse = await startResponsePromise
    expect(startResponse.ok()).toBeTruthy()
    const firstAttempt = (await startResponse.json()).data
    const firstAttemptId = firstAttempt.id
    attemptIds.push(firstAttemptId)
    expect(firstAttempt.status).toBe('in_progress')
    expect(firstAttempt.expiresAt).toBeTruthy()
    expect(firstAttempt.questions).toHaveLength(2)
    for (const question of firstAttempt.questions) {
      for (const forbiddenKey of ['correctOptionId', 'correctAnswer', 'explanation', 'isCorrect']) {
        expect(question).not.toHaveProperty(forbiddenKey)
      }
    }

    const duplicateStartResponse = await page.request.post(`${process.env.E2E_API_URL}/student/quizzes/${quizId}/attempts`)
    expect(duplicateStartResponse.ok()).toBeTruthy()
    const duplicateStart = (await duplicateStartResponse.json()).data
    expect(duplicateStart.id).toBe(firstAttemptId)
    expect(duplicateStart.expiresAt).toBe(firstAttempt.expiresAt)

    const questionId = firstAttempt.questions[0].id
    const invalidQuestionResponse = await page.request.patch(`${process.env.E2E_API_URL}/student/quiz-attempts/${firstAttemptId}/answers`, {
      data: { questionId: 'invalid', selectedOptionId: firstAttempt.questions[0].options[0].id }
    })
    expect(invalidQuestionResponse.status()).toBe(400)
    const invalidOptionResponse = await page.request.patch(`${process.env.E2E_API_URL}/student/quiz-attempts/${firstAttemptId}/answers`, {
      data: { questionId, selectedOptionId: '000000000000000000000001' }
    })
    expect(invalidOptionResponse.status()).toBe(400)

    const optionFromOtherQuestionResponse = await page.request.patch(`${process.env.E2E_API_URL}/student/quiz-attempts/${firstAttemptId}/answers`, {
      data: { questionId, selectedOptionId: firstAttempt.questions[1].options[0].id }
    })
    expect(optionFromOtherQuestionResponse.status()).toBe(400)

    const saveAnswerResponsePromise = page.waitForResponse((response) => {
      const url = new URL(response.url())
      return url.pathname.endsWith(`/student/quiz-attempts/${firstAttemptId}/answers`) && response.request().method() === 'PATCH'
    })
    await page.getByLabel('Incorrect choice').check()
    const saveAnswerResponse = await saveAnswerResponsePromise
    expect(saveAnswerResponse.ok()).toBeTruthy()
    const savedAnswer = (await saveAnswerResponse.json()).data
    for (const forbiddenKey of ['correctOptionId', 'correctAnswer', 'explanation', 'isCorrect', 'correctness']) {
      expect(savedAnswer).not.toHaveProperty(forbiddenKey)
    }

    const resumedResponsePromise = page.waitForResponse((response) => {
      const url = new URL(response.url())
      return url.pathname.endsWith(`/student/quiz-attempts/${firstAttemptId}`) && response.request().method() === 'GET'
    })
    await page.reload()
    await expect(page).toHaveURL(new RegExp(`/student/quizzes/${quizId}/attempt/${firstAttemptId}`))
    const resumedResponse = await resumedResponsePromise
    expect(resumedResponse.ok()).toBeTruthy()
    const resumedAttempt = (await resumedResponse.json()).data
    expect(resumedAttempt.id).toBe(firstAttemptId)
    expect(resumedAttempt.expiresAt).toBe(firstAttempt.expiresAt)
    expect(resumedAttempt.questions[0].selectedOptionId).toBe(savedAnswer.selectedOptionId)

    await page.getByRole('button', { name: 'Next' }).click()
    await page.getByLabel('False').check()
    page.once('dialog', (dialog) => dialog.accept())
    const firstSubmitResponsePromise = page.waitForResponse((response) => {
      const url = new URL(response.url())
      return url.pathname.endsWith(`/student/quiz-attempts/${firstAttemptId}/submit`) && response.request().method() === 'POST'
    })
    await page.getByRole('button', { name: 'Submit Quiz' }).click()
    const firstSubmitResponse = await firstSubmitResponsePromise
    expect(firstSubmitResponse.ok()).toBeTruthy()
    const firstResult = (await firstSubmitResponse.json()).data
    expect(firstResult).toMatchObject({ id: firstAttemptId, status: 'submitted', passed: false, reviewAllowed: false, remainingAttempts: 1 })
    expect(firstResult.reviewMessage).toBe('Correct answers will be available after you pass or use all attempts.')
    for (const question of firstResult.questions) {
      expect(question.correctOptionId).toBeNull()
      expect(question.correctAnswer).toBeNull()
      expect(question.explanation).toBeNull()
      expect(question.isCorrect).toBeNull()
    }

    const repeatedSubmit = await page.request.post(`${process.env.E2E_API_URL}/student/quiz-attempts/${firstAttemptId}/submit`)
    expect(repeatedSubmit.ok()).toBeTruthy()
    expect((await repeatedSubmit.json()).data).toMatchObject({ id: firstAttemptId, earnedMarks: firstResult.earnedMarks, percentage: firstResult.percentage })
    await expect(page.getByText('Correct answers will be available after you pass or use all attempts.')).toBeVisible()

    const retryStartResponsePromise = page.waitForResponse((response) => {
      const url = new URL(response.url())
      return url.pathname.endsWith(`/student/quizzes/${quizId}/attempts`) && response.request().method() === 'POST'
    })
    await page.getByRole('button', { name: 'Retry Quiz' }).click()
    const retryStartResponse = await retryStartResponsePromise
    expect(retryStartResponse.ok()).toBeTruthy()
    const secondAttempt = (await retryStartResponse.json()).data
    attemptIds.push(secondAttempt.id)
    expect(secondAttempt.attemptNumber).toBe(2)

    const secondMcq = secondAttempt.questions[0]
    const correctChoice = mcq.options.find((option) => option.id === mcq.correctOptionId)
    const correctMcqOption = secondMcq.options.find((option) => option.text === correctChoice.text)
    const saveCorrectMcqResponsePromise = page.waitForResponse((response) => {
      const url = new URL(response.url())
      return url.pathname.endsWith(`/student/quiz-attempts/${secondAttempt.id}/answers`) && response.request().method() === 'PATCH'
    })
    await page.getByLabel('Correct choice').check()
    const saveCorrectMcqResponse = await saveCorrectMcqResponsePromise
    expect(saveCorrectMcqResponse.ok()).toBeTruthy()
    expect((await saveCorrectMcqResponse.json()).data.selectedOptionId).toBe(correctMcqOption.id)
    await page.getByRole('button', { name: 'Next' }).click()
    await page.getByLabel('True').check()

    page.once('dialog', (dialog) => dialog.accept())
    const secondSubmitResponsePromise = page.waitForResponse((response) => {
      const url = new URL(response.url())
      return url.pathname.endsWith(`/student/quiz-attempts/${secondAttempt.id}/submit`) && response.request().method() === 'POST'
    })
    await page.getByRole('button', { name: 'Submit Quiz' }).click()
    const secondSubmitResponse = await secondSubmitResponsePromise
    expect(secondSubmitResponse.ok()).toBeTruthy()
    const secondResult = (await secondSubmitResponse.json()).data
    expect(secondResult).toMatchObject({ id: secondAttempt.id, passed: true, reviewAllowed: true, remainingAttempts: 0 })
    expect(secondResult.questions.some((question) => question.correctOptionText)).toBe(true)

    await expect(page).toHaveURL(new RegExp(`/student/quizzes/${quizId}/results/${secondAttempt.id}`))
    await expect(page.getByRole('heading', { name: quizTitle })).toBeVisible()
    await expect(page.getByText('Passed', { exact: true })).toBeVisible()
    await page.goto('/student/quiz-history')
    await expect(page.getByRole('heading', { name: 'My Quiz Attempts' })).toBeVisible()
    await expect(page.getByRole('heading', { name: quizTitle }).first()).toBeVisible()
    const historyResponse = await page.request.get(`${process.env.E2E_API_URL}/student/quiz-history`)
    expect(historyResponse.ok()).toBeTruthy()
    const historyAttempts = (await historyResponse.json()).data?.attempts ?? []
    expect(historyAttempts.filter((attempt) => attempt.quizId === quizId).map((attempt) => attempt.id)).toEqual(expect.arrayContaining(attemptIds))

    const unauthenticatedContext = await playwrightRequest.newContext()
    const unauthenticatedResponse = await unauthenticatedContext.get(`${process.env.E2E_API_URL}/student/quiz-attempts/${firstAttemptId}`)
    expect(unauthenticatedResponse.status()).toBe(401)
    await unauthenticatedContext.dispose()

    await loginAsAdmin(page)
    const adminAttemptResponse = await page.request.get(`${process.env.E2E_API_URL}/student/quiz-attempts/${firstAttemptId}`)
    expect(adminAttemptResponse.status()).toBe(403)
    await loginAsInstructor(page)
    const instructorAttemptResponse = await page.request.get(`${process.env.E2E_API_URL}/student/quiz-attempts/${firstAttemptId}`)
    expect(instructorAttemptResponse.status()).toBe(403)
    testBodyStatus = 'PASS'
  } catch (error) {
    primaryError = error
    if (fixtureSetupStatus !== 'PASS') {
      fixtureSetupStatus = 'FAIL'
    } else {
      testBodyStatus = 'FAIL'
    }
  } finally {
    cleanupAttempted = true
    try {
      cleanupCounts = runBackendFixtureScript('cleanup-e2e-quiz-run.js', runId)
      cleanupStatus = 'PASS'
    } catch (error) {
      cleanupError = error
      cleanupStatus = 'FAIL'
    }

    const report = [
      `Fixture setup: ${fixtureSetupStatus}`,
      `Test body: ${testBodyStatus}`,
      `Cleanup attempted: ${cleanupAttempted ? 'YES' : 'NO'}`,
      `Cleanup result: ${cleanupStatus}`,
      `Primary error: ${primaryError ? redactFixtureError(primaryError) : 'none'}`,
      `Cleanup error: ${cleanupError ? redactFixtureError(cleanupError) : 'none'}`,
      `Cleanup counts: ${cleanupCounts ? JSON.stringify(cleanupCounts) : 'unavailable'}`
    ].join('\n')

    try {
      await testInfo.attach('quiz-lifecycle-fixture-report', {
        body: Buffer.from(report),
        contentType: 'text/plain'
      })
    } catch {
      // Reporting must not replace the test or cleanup failure.
    }
  }

  if (primaryError) throw primaryError
  if (cleanupError) throw cleanupError
})