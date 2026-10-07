import mongoose from 'mongoose'
import { Quiz } from '../models/Quiz.js'
import { Course } from '../models/Course.js'
import { Enrollment } from '../models/Enrollment.js'
import { QuizAttempt } from '../models/QuizAttempt.js'
import { AppError } from '../utils/AppError.js'

const toObjectId = (value) => (mongoose.isValidObjectId(value) ? new mongoose.Types.ObjectId(String(value)) : null)

const shuffleList = (list = []) => {
  const copy = [...list]
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1))
      ;[copy[index], copy[swapIndex]] = [copy[swapIndex], copy[index]]
  }
  return copy
}

const normalizeShortAnswer = (value) => String(value || '').trim().replace(/\s+/g, ' ').toLocaleLowerCase()

const normalizeQuestionSnapshot = (question = {}, order = 0) => ({
  questionId: question._id ? new mongoose.Types.ObjectId(String(question._id)) : new mongoose.Types.ObjectId(),
  type: question.type || 'multiple_choice',
  prompt: String(question.prompt || '').trim(),
  options: Array.isArray(question.options) ? question.options.map((option) => ({
    optionId: option?._id ? new mongoose.Types.ObjectId(String(option._id)) : new mongoose.Types.ObjectId(),
    text: String(option?.text || '').trim()
  })) : [],
  correctOptionId: question.correctOptionId ? new mongoose.Types.ObjectId(String(question.correctOptionId)) : null,
  correctAnswer: question.correctAnswer ?? null,
  explanation: question.explanation ?? null,
  marks: Number(question.marks ?? 0),
  order: Number(order ?? 0)
})

export const toSafeQuestion = (question) => ({
  id: String(question.questionId || question._id || ''),
  type: question.type,
  prompt: question.prompt,
  options: Array.isArray(question.options) ? question.options.map((option) => ({
    id: String(option.optionId || option.id || ''),
    text: option.text || ''
  })) : [],
  textAnswer: question.textAnswer || '',
  marks: Number(question.marks ?? 0),
  order: Number(question.order ?? 0)
})

export const getAnswerMap = (answers = []) => {
  const map = new Map()
  for (const entry of answers || []) {
    if (!entry || !entry.questionId) continue
    map.set(String(entry.questionId), {
      questionId: String(entry.questionId),
      selectedOptionId: entry.selectedOptionId ? String(entry.selectedOptionId) : null,
      textAnswer: typeof entry.textAnswer === 'string' ? entry.textAnswer : '',
      savedAt: entry.savedAt ? new Date(entry.savedAt).toISOString() : null
    })
  }
  return map
}

export const buildReviewMessage = () => 'Correct answers will be available after you pass or use all attempts.'

export const isAnswerReviewAllowed = ({ passed, usedAttempts, maximumAttempts }) =>
  Boolean(passed) || Number(usedAttempts) >= Number(maximumAttempts)

export const computeAttemptGrade = ({ quiz, snapshotQuestions, answersMap }) => {
  const totalMarks = snapshotQuestions.reduce((sum, question) => sum + Number(question.marks || 0), 0)
  let earnedMarks = 0

  for (const question of snapshotQuestions) {
    const answer = answersMap.get(String(question.questionId))
    const selectedOptionId = answer?.selectedOptionId || null
    const isCorrect = question.type === 'short_answer'
      ? Boolean(answer?.textAnswer && normalizeShortAnswer(answer.textAnswer) === normalizeShortAnswer(question.correctAnswer))
      : Boolean(selectedOptionId && String(selectedOptionId) === String(question.correctOptionId))
    if (isCorrect) {
      earnedMarks += Number(question.marks || 0)
    }
  }

  const percentage = totalMarks > 0 ? Number(((earnedMarks / totalMarks) * 100).toFixed(2)) : 0
  const passed = percentage >= Number(quiz?.passingPercentage ?? 0)

  return { earnedMarks, totalMarks, percentage, passed }
}

const getActiveEnrollmentForStudent = async ({ studentId, courseId }) => {
  if (!toObjectId(studentId) || !toObjectId(courseId)) return null
  return Enrollment.findOne({
    userId: new mongoose.Types.ObjectId(String(studentId)),
    courseId: new mongoose.Types.ObjectId(String(courseId)),
    status: { $in: ['active', 'completed'] }
  }).lean()
}

const getAccessibleQuizContext = async ({ studentId, quizId, attempt = null }) => {
  if (!toObjectId(studentId) || !toObjectId(quizId)) throw new AppError('Invalid quiz reference.', 400)
  const quiz = await Quiz.findById(quizId).lean()
  if (!quiz) throw new AppError('Quiz not found.', 404)
  if (quiz.reviewStatus !== 'approved' || quiz.publicationStatus !== 'published') {
    throw new AppError('This quiz is not available for students.', 403)
  }

  const courseId = attempt?.courseId || quiz.courseId
  if (String(quiz.courseId) !== String(courseId)) throw new AppError('Quiz does not belong to this course.', 403)
  const course = await Course.findOne({ _id: courseId, status: 'published' }).lean()
  if (!course) throw new AppError('Parent course is not currently available.', 403)

  const enrollment = await getActiveEnrollmentForStudent({ studentId, courseId })
  if (!enrollment || (attempt?.enrollmentId && String(enrollment._id) !== String(attempt.enrollmentId))) {
    throw new AppError('Active enrollment is required to access this quiz.', 403)
  }

  return { quiz, course, enrollment }
}

const ensureAttemptBelongsToStudent = async ({ studentId, attemptId }) => {
  if (!toObjectId(studentId) || !toObjectId(attemptId)) {
    throw new AppError('Invalid attempt reference.', 400)
  }

  const attempt = await QuizAttempt.findOne({
    _id: attemptId,
    studentId: new mongoose.Types.ObjectId(String(studentId))
  }).lean()

  if (!attempt) {
    throw new AppError('Attempt not found.', 404)
  }

  return attempt
}

const finalizeExpiredAttempt = async ({ attempt, quiz }) => {
  if (!attempt) return attempt
  let current = attempt

  for (let retry = 0; retry < 3; retry += 1) {
    if (current.status !== 'in_progress' || !current.expiresAt || new Date(current.expiresAt) > new Date()) return current
    const answersMap = getAnswerMap(current.answers || [])
    const snapshotQuestions = Array.isArray(current.questionSnapshot) ? current.questionSnapshot : []
    const grade = computeAttemptGrade({ quiz, snapshotQuestions, answersMap })
    const finalizedAt = new Date()
    const finalized = await QuizAttempt.findOneAndUpdate(
      { _id: current._id, status: 'in_progress', updatedAt: current.updatedAt, expiresAt: { $lte: finalizedAt } },
      { $set: { status: 'expired', submittedAt: finalizedAt, ...grade, updatedAt: finalizedAt } },
      { new: true }
    ).lean()
    if (finalized) return finalized
    current = await QuizAttempt.findById(current._id).lean()
    if (!current) return null
  }

  return current
}

export const buildAttemptSummary = (attempt, quiz, course = null, attemptCounts = {}) => {
  const snapshot = Array.isArray(attempt.questionSnapshot) ? attempt.questionSnapshot : []
  const answersMap = getAnswerMap(attempt.answers || [])

  const questions = snapshot.map((question) => ({
    ...toSafeQuestion(question),
    answered: Boolean(answersMap.get(String(question.questionId))?.selectedOptionId || answersMap.get(String(question.questionId))?.textAnswer?.trim()),
    selectedOptionId: answersMap.get(String(question.questionId))?.selectedOptionId || null,
    textAnswer: answersMap.get(String(question.questionId))?.textAnswer || ''
  }))

  return {
    id: String(attempt._id || attempt.id),
    attemptNumber: Number(attempt.attemptNumber || 1),
    status: attempt.status,
    quizId: String(attempt.quizId || ''),
    quizTitle: quiz?.title || '',
    courseId: String(attempt.courseId || ''),
    courseSlug: course?.slug || null,
    courseTitle: course?.title || '',
    instructions: quiz?.instructions || '',
    totalQuestions: questions.length,
    totalMarks: Number(attempt.totalMarks || quiz?.totalMarks || 0),
    passingPercentage: Number(quiz?.passingPercentage ?? 0),
    startedAt: attempt.startedAt ? new Date(attempt.startedAt).toISOString() : null,
    expiresAt: attempt.expiresAt ? new Date(attempt.expiresAt).toISOString() : null,
    submittedAt: attempt.submittedAt ? new Date(attempt.submittedAt).toISOString() : null,
    earnedMarks: attempt.earnedMarks !== null && attempt.earnedMarks !== undefined ? Number(attempt.earnedMarks) : null,
    percentage: attempt.percentage !== null && attempt.percentage !== undefined ? Number(attempt.percentage) : null,
    passed: attempt.passed !== null && attempt.passed !== undefined ? Boolean(attempt.passed) : null,
    maximumAttempts: Number(quiz?.maximumAttempts ?? 1),
    usedAttempts: Number(attemptCounts.used ?? 0),
    remainingAttempts: Math.max(Number(quiz?.maximumAttempts ?? 1) - Number(attemptCounts.used ?? 0), 0),
    questions,
    answers: Array.isArray(attempt.answers) ? attempt.answers.map((entry) => ({
      questionId: String(entry.questionId),
      selectedOptionId: entry.selectedOptionId ? String(entry.selectedOptionId) : null,
      savedAt: entry.savedAt ? new Date(entry.savedAt).toISOString() : null
    })) : []
  }
}

export const buildSubmissionResult = async (attempt, quiz, course = null) => {
  const usedAttempts = await QuizAttempt.countDocuments({
    studentId: new mongoose.Types.ObjectId(String(attempt.studentId)),
    quizId: new mongoose.Types.ObjectId(String(attempt.quizId)),
    status: { $in: ['submitted', 'expired'] }
  })
  const maximumAttempts = Number(quiz?.maximumAttempts ?? 1)
  const reviewAllowed = isAnswerReviewAllowed({ passed: attempt?.passed, usedAttempts, maximumAttempts })

  const rawQuestions = Array.isArray(attempt?.questionSnapshot) ? attempt.questionSnapshot : []
  const answersMap = getAnswerMap(attempt?.answers || [])

  const questions = rawQuestions.map((question) => {
    const answer = answersMap.get(String(question.questionId))
    const answerValue = answer?.selectedOptionId || null
    const answerText = answer?.textAnswer || ''
    const isCorrect = question.type === 'short_answer'
      ? Boolean(answerText && normalizeShortAnswer(answerText) === normalizeShortAnswer(question.correctAnswer))
      : Boolean(answerValue && String(answerValue) === String(question.correctOptionId))

    if (reviewAllowed) {
      return {
        ...toSafeQuestion(question),
        selectedOptionId: answerValue ? String(answerValue) : null,
        answered: Boolean(answerValue),
        correctOptionId: question.correctOptionId ? String(question.correctOptionId) : null,
        correctOptionText: question.options.find((option) => String(option.optionId) === String(question.correctOptionId))?.text || null,
        selectedOptionText: question.options.find((option) => String(option.optionId) === String(answerValue))?.text || null,
        selectedAnswer: question.type === 'short_answer' ? answerText : null,
        correctAnswer: question.type === 'short_answer' ? question.correctAnswer : null,
        explanation: question.explanation ?? null,
        isCorrect
      }
    }

    return {
      ...toSafeQuestion(question),
      selectedOptionId: answerValue ? String(answerValue) : null,
      answered: Boolean(answerValue),
      correctOptionId: null,
      selectedAnswer: question.type === 'short_answer' ? answerText : null,
      correctAnswer: null,
      explanation: null,
      isCorrect: null,
      message: buildReviewMessage()
    }
  })

  return {
    id: String(attempt?._id || ''),
    attemptNumber: Number(attempt?.attemptNumber || 1),
    quizId: String(attempt?.quizId || quiz?._id || ''),
    quizTitle: quiz?.title || '',
    courseId: String(attempt?.courseId || course?._id || ''),
    courseSlug: course?.slug || null,
    courseTitle: course?.title || '',
    status: attempt?.status || 'submitted',
    earnedMarks: Number(attempt?.earnedMarks ?? 0),
    totalMarks: Number(attempt?.totalMarks ?? quiz?.totalMarks ?? 0),
    percentage: Number(attempt?.percentage ?? 0),
    passingPercentage: Number(quiz?.passingPercentage ?? 0),
    passed: Boolean(attempt?.passed),
    submittedAt: attempt?.submittedAt ? new Date(attempt.submittedAt).toISOString() : null,
    maximumAttempts,
    usedAttempts,
    remainingAttempts: Math.max(maximumAttempts - usedAttempts, 0),
    reviewAllowed,
    reviewMessage: reviewAllowed ? null : buildReviewMessage(),
    questions
  }
}

export const startQuizAttempt = async ({ studentId, quizId }) => {
  const { quiz, course, enrollment } = await getAccessibleQuizContext({ studentId, quizId })
  const studentObjectId = new mongoose.Types.ObjectId(String(studentId))
  const quizObjectId = new mongoose.Types.ObjectId(String(quizId))
  const now = new Date()

  const expiredAttempts = await QuizAttempt.find({
    studentId: studentObjectId,
    quizId: quizObjectId,
    status: 'in_progress',
    expiresAt: { $ne: null, $lte: now }
  }).lean()
  for (const expiredAttempt of expiredAttempts) await finalizeExpiredAttempt({ attempt: expiredAttempt, quiz })

  const usedAttempts = await QuizAttempt.countDocuments({
    studentId: studentObjectId,
    quizId: quizObjectId,
    status: { $in: ['submitted', 'expired'] }
  })

  if (usedAttempts >= Number(quiz.maximumAttempts || 1)) {
    throw new AppError('You have used all attempts for this quiz.', 409)
  }

  const activeAttempt = await QuizAttempt.findOne({
    studentId: studentObjectId,
    quizId: quizObjectId,
    status: 'in_progress',
    $or: [{ expiresAt: null }, { expiresAt: { $gt: now } }]
  }).sort({ startedAt: -1 }).lean()

  if (activeAttempt) {
    const resumeDto = buildAttemptSummary(activeAttempt, quiz, course)
    resumeDto.usedAttempts = usedAttempts + 1
    resumeDto.remainingAttempts = Math.max(Number(quiz.maximumAttempts || 1) - usedAttempts - 1, 0)
    resumeDto.resume = true
    return resumeDto
  }

  const baseQuestions = Array.isArray(quiz.questions) ? [...quiz.questions] : []
  const orderedQuestions = quiz.shuffleQuestions ? shuffleList(baseQuestions) : baseQuestions
  const snapshot = orderedQuestions.map((question, index) => normalizeQuestionSnapshot(question, index))
  const startedAt = new Date()
  const expiresAt = quiz.timeLimitMinutes ? new Date(startedAt.getTime() + Number(quiz.timeLimitMinutes) * 60 * 1000) : null

  if (!snapshot.length) throw new AppError('This quiz does not contain any questions.', 409)

  let attempt
  try {
    attempt = await QuizAttempt.create({
      studentId: studentObjectId,
      quizId: quizObjectId,
      courseId: new mongoose.Types.ObjectId(String(course._id)),
      enrollmentId: new mongoose.Types.ObjectId(String(enrollment._id)),
      attemptNumber: usedAttempts + 1,
      status: 'in_progress',
      startedAt,
      expiresAt,
      questionSnapshot: snapshot,
      totalMarks: Number(quiz.totalMarks || orderedQuestions.reduce((sum, question) => sum + Number(question.marks || 0), 0)),
      answers: [],
      earnedMarks: null,
      percentage: null,
      passed: null
    })
  } catch (error) {
    if (error?.code !== 11000) throw error
    const racedAttempt = await QuizAttempt.findOne({ studentId: studentObjectId, quizId: quizObjectId, status: 'in_progress' }).sort({ startedAt: -1 }).lean()
    if (!racedAttempt) throw new AppError('Unable to start another attempt right now.', 409)
    const racedDto = buildAttemptSummary(racedAttempt, quiz, course)
    racedDto.usedAttempts = usedAttempts
    racedDto.remainingAttempts = Math.max(Number(quiz.maximumAttempts || 1) - usedAttempts, 0)
    racedDto.resume = true
    return racedDto
  }

  const result = buildAttemptSummary(attempt.toObject ? attempt.toObject() : attempt, quiz, course)
  result.usedAttempts = usedAttempts + 1
  result.remainingAttempts = Math.max(Number(quiz.maximumAttempts || 1) - usedAttempts - 1, 0)
  result.resume = false
  return result
}

export const getQuizAttemptForStudent = async ({ studentId, attemptId, expectedQuizId = null }) => {
  const attempt = await ensureAttemptBelongsToStudent({ studentId, attemptId })
  if (expectedQuizId && !toObjectId(expectedQuizId)) throw new AppError('Invalid quiz reference.', 400)
  if (expectedQuizId && String(attempt.quizId) !== String(expectedQuizId)) throw new AppError('Attempt not found.', 404)
  const { quiz, course } = await getAccessibleQuizContext({ studentId, quizId: attempt.quizId, attempt })

  if (attempt.status === 'in_progress' && attempt.expiresAt && new Date() >= new Date(attempt.expiresAt)) {
    const finalized = await finalizeExpiredAttempt({ attempt, quiz })
    if (finalized) {
      const usedAttempts = await QuizAttempt.countDocuments({ studentId, quizId: attempt.quizId, status: { $in: ['submitted', 'expired'] } })
      const dto = buildAttemptSummary(finalized, quiz, course)
      dto.usedAttempts = usedAttempts
      dto.remainingAttempts = Math.max(Number(quiz.maximumAttempts || 1) - usedAttempts, 0)
      return dto
    }
  }

  const latestAttempt = attempt.status === 'in_progress' && attempt.expiresAt && new Date() >= new Date(attempt.expiresAt)
    ? await QuizAttempt.findById(attempt._id).lean()
    : attempt
  const completedAttempts = await QuizAttempt.countDocuments({ studentId, quizId: attempt.quizId, status: { $in: ['submitted', 'expired'] } })
  const usedAttempts = completedAttempts + (latestAttempt.status === 'in_progress' ? 1 : 0)
  const dto = buildAttemptSummary(latestAttempt, quiz, course)
  dto.usedAttempts = usedAttempts
  dto.remainingAttempts = Math.max(Number(quiz.maximumAttempts || 1) - usedAttempts, 0)
  return dto
}

export const saveQuizAnswer = async ({ studentId, attemptId, questionId, selectedOptionId = null, textAnswer = null }) => {
  const attempt = await ensureAttemptBelongsToStudent({ studentId, attemptId })
  await getAccessibleQuizContext({ studentId, quizId: attempt.quizId, attempt })
  if (String(attempt.status) !== 'in_progress') throw new AppError('This attempt is no longer active.', 409)

  const quiz = await Quiz.findById(attempt.quizId).lean()
  if (!quiz) throw new AppError('Quiz not found.', 404)

  if (attempt.expiresAt && new Date() >= new Date(attempt.expiresAt)) {
    await finalizeExpiredAttempt({ attempt, quiz })
    throw new AppError('This attempt expired before submission.', 410)
  }

  if (!mongoose.isValidObjectId(questionId)) {
    throw new AppError('Invalid question ID.', 400)
  }

  if (selectedOptionId !== null && selectedOptionId !== undefined && !mongoose.isValidObjectId(selectedOptionId)) {
    throw new AppError('Invalid option ID.', 400)
  }

  const question = (attempt.questionSnapshot || []).find((entry) => String(entry.questionId) === String(questionId))
  if (!question) throw new AppError('Question not found in this attempt.', 404)

  if (question.type === 'short_answer' && typeof textAnswer !== 'string') {
    throw new AppError('Enter a text answer for this question.', 422, { textAnswer: 'A text answer is required.' })
  }
  if (question.type === 'short_answer' && selectedOptionId !== null && selectedOptionId !== undefined) {
    throw new AppError('This question requires a text answer.', 400)
  }
  if (question.type !== 'short_answer' && textAnswer !== null && textAnswer !== undefined) {
    throw new AppError('This question requires selecting an option.', 400)
  }
  if (question.type !== 'short_answer' && selectedOptionId !== null && selectedOptionId !== undefined && !question.options.some((option) => String(option.optionId) === String(selectedOptionId))) {
    throw new AppError('Selected option is invalid for this question.', 400)
  }

  const sanitizedSelectedOption = question.type !== 'short_answer' && selectedOptionId !== null && selectedOptionId !== undefined ? new mongoose.Types.ObjectId(String(selectedOptionId)) : null
  const sanitizedTextAnswer = question.type === 'short_answer' ? String(textAnswer).trim() : null
  if (question.type === 'short_answer' && !sanitizedTextAnswer) throw new AppError('Enter a text answer for this question.', 422, { textAnswer: 'Answer cannot be empty.' })
  const updatedAnswer = {
    questionId: new mongoose.Types.ObjectId(String(questionId)),
    selectedOptionId: sanitizedSelectedOption,
    textAnswer: sanitizedTextAnswer,
    savedAt: new Date()
  }

  const savedAt = updatedAnswer.savedAt
  const updated = await QuizAttempt.findOneAndUpdate(
    {
      _id: attempt._id,
      studentId: new mongoose.Types.ObjectId(String(studentId)),
      status: 'in_progress',
      $or: [{ expiresAt: null }, { expiresAt: { $gt: new Date() } }]
    },
    [{
      $set: {
        answers: {
          $concatArrays: [
            { $filter: { input: { $ifNull: ['$answers', []] }, as: 'answer', cond: { $ne: ['$$answer.questionId', updatedAnswer.questionId] } } },
            [updatedAnswer]
          ]
        },
        updatedAt: savedAt
      }
    }],
    { new: true }
  ).lean()
  if (!updated) throw new AppError('This attempt is no longer active.', 409)

  return {
    questionId: String(questionId),
    selectedOptionId: sanitizedSelectedOption ? String(sanitizedSelectedOption) : null,
    textAnswer: sanitizedTextAnswer,
    savedAt: new Date().toISOString()
  }
}

export const submitQuizAttempt = async ({ studentId, attemptId }) => {
  for (let retry = 0; retry < 3; retry += 1) {
    const attempt = await ensureAttemptBelongsToStudent({ studentId, attemptId })
    const { quiz, course } = await getAccessibleQuizContext({ studentId, quizId: attempt.quizId, attempt })
    if (attempt.status === 'submitted' || attempt.status === 'expired') return buildSubmissionResult(attempt, quiz, course)

    const now = new Date()
    if (attempt.expiresAt && now >= new Date(attempt.expiresAt)) {
      const expired = await finalizeExpiredAttempt({ attempt, quiz })
      return buildSubmissionResult(expired, quiz, course)
    }

    const answersMap = getAnswerMap(attempt.answers || [])
    const grade = computeAttemptGrade({ quiz, snapshotQuestions: attempt.questionSnapshot || [], answersMap })
    const updated = await QuizAttempt.findOneAndUpdate(
      { _id: attempt._id, studentId: new mongoose.Types.ObjectId(String(studentId)), status: 'in_progress', updatedAt: attempt.updatedAt },
      { $set: { status: 'submitted', submittedAt: now, ...grade, updatedAt: now } },
      { new: true }
    ).lean()
    if (updated) return buildSubmissionResult(updated, quiz, course)
  }

  const latest = await ensureAttemptBelongsToStudent({ studentId, attemptId })
  if (latest.status === 'submitted' || latest.status === 'expired') {
    const { quiz, course } = await getAccessibleQuizContext({ studentId, quizId: latest.quizId, attempt: latest })
    return buildSubmissionResult(latest, quiz, course)
  }
  throw new AppError('Unable to finalize this quiz right now. Please retry.', 409)
}

export const getQuizResultForStudent = async ({ studentId, quizId, attemptId }) => {
  if (!toObjectId(studentId) || !toObjectId(quizId) || !toObjectId(attemptId)) {
    throw new AppError('Invalid request.', 400)
  }

  const attempt = await QuizAttempt.findOne({
    _id: attemptId,
    quizId: new mongoose.Types.ObjectId(String(quizId)),
    studentId: new mongoose.Types.ObjectId(String(studentId))
  }).lean()

  if (!attempt) throw new AppError('Result not found.', 404)

  const { quiz, course } = await getAccessibleQuizContext({ studentId, quizId, attempt })

  if (attempt.status === 'in_progress' && attempt.expiresAt && new Date() >= new Date(attempt.expiresAt)) {
    const finalized = await finalizeExpiredAttempt({ attempt, quiz })
    return buildSubmissionResult(finalized, quiz, course)
  }

  if (attempt.status === 'in_progress') throw new AppError('Submit this quiz before viewing its result.', 409)
  return buildSubmissionResult(attempt, quiz, course)
}

export const getStudentQuizHistory = async ({ studentId, courseId = null }) => {
  if (!toObjectId(studentId)) throw new AppError('Invalid student reference.', 400)
  if (courseId && !toObjectId(courseId)) throw new AppError('Invalid course reference.', 400)
  const studentObjectId = new mongoose.Types.ObjectId(String(studentId))
  const enrollmentQuery = { userId: studentObjectId, status: { $in: ['active', 'completed'] } }
  if (courseId) enrollmentQuery.courseId = new mongoose.Types.ObjectId(String(courseId))
  const enrollments = await Enrollment.find(enrollmentQuery).select('_id courseId').lean()
  const enrollmentIds = enrollments.map((enrollment) => enrollment._id)
  if (!enrollmentIds.length) return []
  const filter = {
    studentId: studentObjectId,
    enrollmentId: { $in: enrollmentIds },
    status: { $in: ['submitted', 'expired'] }
  }

  const attempts = await QuizAttempt.find(filter).sort({ submittedAt: -1, createdAt: -1 }).lean()
  const quizIds = [...new Set(attempts.map((attempt) => String(attempt.quizId)))]
  const quizzes = await Quiz.find({ _id: { $in: quizIds.map((id) => new mongoose.Types.ObjectId(id)) } }).lean()
  const courses = await Course.find({ _id: { $in: [...new Set(attempts.map((attempt) => String(attempt.courseId)))] } }).lean()
  const courseMap = new Map(courses.map((course) => [String(course._id), course]))
  const quizMap = new Map(quizzes.map((quiz) => [String(quiz._id), quiz]))

  return attempts.map((attempt) => {
    const quiz = quizMap.get(String(attempt.quizId))
    const course = courseMap.get(String(attempt.courseId))
    return {
      id: String(attempt._id),
      quizId: String(attempt.quizId),
      quizTitle: quiz?.title || 'Quiz',
      courseId: String(attempt.courseId),
      courseSlug: course?.slug || null,
      courseTitle: course?.title || '',
      attemptNumber: Number(attempt.attemptNumber || 1),
      earnedMarks: attempt.earnedMarks !== null && attempt.earnedMarks !== undefined ? Number(attempt.earnedMarks) : null,
      totalMarks: Number(attempt.totalMarks || quiz?.totalMarks || 0),
      percentage: attempt.percentage !== null && attempt.percentage !== undefined ? Number(attempt.percentage) : null,
      passed: attempt.passed !== null && attempt.passed !== undefined ? Boolean(attempt.passed) : null,
      status: attempt.status,
      submittedAt: attempt.submittedAt ? new Date(attempt.submittedAt).toISOString() : null,
      resultLabel: attempt.passed === true ? 'Passed' : attempt.passed === false ? 'Not Passed' : 'Expired',
      canViewResult: true
    }
  })
}

export default {
  startQuizAttempt,
  getQuizAttemptForStudent,
  saveQuizAnswer,
  submitQuizAttempt,
  getQuizResultForStudent,
  getStudentQuizHistory
}
