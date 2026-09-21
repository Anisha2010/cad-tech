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

const normalizeQuestionSnapshot = (question = {}, order = 0) => ({
  questionId: question._id ? new mongoose.Types.ObjectId(String(question._id)) : new mongoose.Types.ObjectId(),
  type: question.type || 'multiple_choice',
  prompt: String(question.prompt || '').trim(),
  options: Array.isArray(question.options) ? question.options.map((option, optionIndex) => ({
    optionId: option?._id ? new mongoose.Types.ObjectId(String(option._id)) : new mongoose.Types.ObjectId(),
    text: String(option?.text || '').trim()
  })) : [],
  correctOptionId: question.correctOptionId ? new mongoose.Types.ObjectId(String(question.correctOptionId)) : null,
  explanation: question.explanation ?? null,
  marks: Number(question.marks ?? 0),
  order: Number(order ?? 0)
})

const toSafeQuestion = (question) => ({
  id: String(question.questionId || question._id || ''),
  type: question.type,
  prompt: question.prompt,
  options: Array.isArray(question.options) ? question.options.map((option) => ({
    id: String(option.optionId || option.id || ''),
    text: option.text || ''
  })) : [],
  marks: Number(question.marks ?? 0),
  order: Number(question.order ?? 0)
})

const getAnswerMap = (answers = []) => {
  const map = new Map()
  for (const entry of answers || []) {
    if (!entry || !entry.questionId) continue
    map.set(String(entry.questionId), {
      questionId: String(entry.questionId),
      selectedOptionId: entry.selectedOptionId ? String(entry.selectedOptionId) : null,
      savedAt: entry.savedAt ? new Date(entry.savedAt).toISOString() : null
    })
  }
  return map
}

const buildReviewMessage = () => 'Correct answers will be available after you pass or use all attempts.'

const computeAttemptGrade = ({ quiz, snapshotQuestions, answersMap }) => {
  const totalMarks = Number(quiz?.totalMarks ?? snapshotQuestions.reduce((sum, question) => sum + Number(question.marks || 0), 0))
  let earnedMarks = 0

  for (const question of snapshotQuestions) {
    const selectedOptionId = answersMap.get(String(question.questionId))?.selectedOptionId || null
    if (selectedOptionId && String(selectedOptionId) === String(question.correctOptionId)) {
      earnedMarks += Number(question.marks || 0)
    }
  }

  const percentage = totalMarks > 0 ? Number(((earnedMarks / totalMarks) * 100).toFixed(2)) : 0
  const passed = percentage >= Number(quiz?.passingPercentage ?? 0)

  return { earnedMarks, totalMarks, percentage, passed }
}

const getActiveEnrollmentForStudent = async ({ studentId, courseId }) => {
  if (!toObjectId(studentId) || !toObjectId(courseId)) return null
  return Enrollment.findOne({ userId: new mongoose.Types.ObjectId(String(studentId)), courseId: new mongoose.Types.ObjectId(String(courseId)), status: { $in: ['active', 'completed'] } }).lean()
}

const ensureAttemptBelongsToStudent = async ({ studentId, attemptId }) => {
  if (!toObjectId(studentId) || !toObjectId(attemptId)) {
    throw new AppError('Invalid attempt reference.', 400)
  }

  const attempt = await QuizAttempt.findOne({ _id: attemptId, studentId: new mongoose.Types.ObjectId(String(studentId)) }).lean()
  if (!attempt) {
    throw new AppError('Attempt not found.', 404)
  }

  return attempt
}

const finalizeExpiredAttempt = async ({ attempt, quiz }) => {
  if (!attempt || String(attempt.status) === 'submitted' || String(attempt.status) === 'expired') return attempt

  const answersMap = getAnswerMap(attempt.answers || [])
  const snapshotQuestions = Array.isArray(attempt.questionSnapshot) ? attempt.questionSnapshot : []
  const grade = computeAttemptGrade({ quiz, snapshotQuestions, answersMap })

  const finalized = await QuizAttempt.findByIdAndUpdate(
    attempt._id,
    {
      $set: {
        status: 'expired',
        submittedAt: new Date(),
        earnedMarks: grade.earnedMarks,
        totalMarks: grade.totalMarks,
        percentage: grade.percentage,
        passed: grade.passed,
        updatedAt: new Date()
      }
    },
    { new: true }
  ).lean()

  return finalized || attempt
}

const buildAttemptSummary = (attempt, quiz, includeCorrectAnswers = false) => {
  const snapshot = Array.isArray(attempt.questionSnapshot) ? attempt.questionSnapshot : []
  const answersMap = getAnswerMap(attempt.answers || [])

  const questions = snapshot.map((question) => ({
    ...toSafeQuestion(question),
    answered: Boolean(answersMap.get(String(question.questionId))?.selectedOptionId),
    selectedOptionId: answersMap.get(String(question.questionId))?.selectedOptionId || null,
    ...(includeCorrectAnswers ? {
      correctOptionId: question.correctOptionId ? String(question.correctOptionId) : null,
      explanation: question.explanation ?? null,
      isCorrect: (() => {
        const selected = answersMap.get(String(question.questionId))?.selectedOptionId
        return Boolean(selected && String(selected) === String(question.correctOptionId))
      })()
    } : {})
  }))

  return {
    id: String(attempt._id || attempt.id),
    attemptNumber: Number(attempt.attemptNumber || 1),
    status: attempt.status,
    quizId: String(attempt.quizId || ''),
    quizTitle: quiz?.title || '',
    courseId: String(attempt.courseId || ''),
    enrollmentId: String(attempt.enrollmentId || ''),
    startedAt: attempt.startedAt ? new Date(attempt.startedAt).toISOString() : null,
    expiresAt: attempt.expiresAt ? new Date(attempt.expiresAt).toISOString() : null,
    submittedAt: attempt.submittedAt ? new Date(attempt.submittedAt).toISOString() : null,
    totalMarks: Number(attempt.totalMarks || quiz?.totalMarks || 0),
    earnedMarks: attempt.earnedMarks !== null && attempt.earnedMarks !== undefined ? Number(attempt.earnedMarks) : null,
    percentage: attempt.percentage !== null && attempt.percentage !== undefined ? Number(attempt.percentage) : null,
    passed: attempt.passed !== null && attempt.passed !== undefined ? Boolean(attempt.passed) : null,
    remainingAttempts: attempt.remainingAttempts ?? null,
    questions,
    savedAnswers: Array.isArray(attempt.answers) ? attempt.answers.map((entry) => ({
      questionId: String(entry.questionId),
      selectedOptionId: entry.selectedOptionId ? String(entry.selectedOptionId) : null,
      savedAt: entry.savedAt ? new Date(entry.savedAt).toISOString() : null
    })) : []
  }
}

export const startQuizAttempt = async ({ studentId, quizId }) => {
  if (!toObjectId(studentId) || !toObjectId(quizId)) {
    throw new AppError('Invalid quiz reference.', 400)
  }

  const quiz = await Quiz.findById(quizId).lean()
  if (!quiz) throw new AppError('Quiz not found.', 404)
  if (quiz.publicationStatus !== 'published') throw new AppError('This quiz is not available for students.', 403)

  const course = await Course.findById(quiz.courseId).lean()
  if (!course) throw new AppError('Parent course not found.', 404)
  if (course.status !== 'published') throw new AppError('This course is not currently open for student access.', 403)

  const enrollment = await getActiveEnrollmentForStudent({ studentId, courseId: course._id })
  if (!enrollment) throw new AppError('Active enrollment is required to attempt this quiz.', 403)

  const previousSubmitted = await QuizAttempt.countDocuments({
    studentId: new mongoose.Types.ObjectId(String(studentId)),
    quizId: new mongoose.Types.ObjectId(String(quizId)),
    status: { $in: ['submitted', 'expired'] }
  })

  if (previousSubmitted >= Number(quiz.maximumAttempts || 1)) {
    throw new AppError('You have used all attempts for this quiz.', 403)
  }

  const activeAttempt = await QuizAttempt.findOne({
    studentId: new mongoose.Types.ObjectId(String(studentId)),
    quizId: new mongoose.Types.ObjectId(String(quizId)),
    status: 'in_progress',
    expiresAt: { $gt: new Date() }
  }).sort({ startedAt: -1 }).lean()

  if (activeAttempt) {
    const safeAttempt = buildAttemptSummary(activeAttempt, quiz)
    return { ...safeAttempt, resume: true, remainingAttempts: Math.max(Number(quiz.maximumAttempts || 1) - previousSubmitted, 0) }
  }

  const baseQuestions = Array.isArray(quiz.questions) ? [...quiz.questions] : []
  const orderedQuestions = quiz.shuffleQuestions ? shuffleList(baseQuestions) : baseQuestions
  const snapshot = orderedQuestions.map((question, index) => normalizeQuestionSnapshot(question, index))

  const startedAt = new Date()
  const expiresAt = quiz.timeLimitMinutes ? new Date(startedAt.getTime() + Number(quiz.timeLimitMinutes) * 60 * 1000) : null

  const attempt = await QuizAttempt.create({
    studentId: new mongoose.Types.ObjectId(String(studentId)),
    quizId: new mongoose.Types.ObjectId(String(quizId)),
    courseId: new mongoose.Types.ObjectId(String(course._id)),
    enrollmentId: new mongoose.Types.ObjectId(String(enrollment._id)),
    attemptNumber: previousSubmitted + 1,
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

  const safeAttempt = buildAttemptSummary(attempt.toObject ? attempt.toObject() : attempt, quiz)
  return {
    ...safeAttempt,
    resume: false,
    remainingAttempts: Math.max(Number(quiz.maximumAttempts || 1) - previousSubmitted, 0)
  }
}

export const getQuizAttemptForStudent = async ({ studentId, attemptId }) => {
  const attempt = await ensureAttemptBelongsToStudent({ studentId, attemptId })
  const quiz = await Quiz.findById(attempt.quizId).lean()
  if (!quiz) throw new AppError('Quiz not found.', 404)

  const course = await Course.findById(attempt.courseId).lean()
  if (!course) throw new AppError('Parent course not found.', 404)
  const enrollment = await getActiveEnrollmentForStudent({ studentId, courseId: course._id })
  if (!enrollment) throw new AppError('Active enrollment is required to access this attempt.', 403)

  if (attempt.status === 'in_progress' && attempt.expiresAt && new Date() > new Date(attempt.expiresAt)) {
    const finalized = await finalizeExpiredAttempt({ attempt, quiz })
    return buildAttemptSummary(finalized, quiz)
  }

  return buildAttemptSummary(attempt, quiz)
}

export const saveQuizAnswer = async ({ studentId, attemptId, questionId, selectedOptionId }) => {
  const attempt = await ensureAttemptBelongsToStudent({ studentId, attemptId })
  if (String(attempt.status) !== 'in_progress') throw new AppError('This attempt is no longer active.', 409)

  const quiz = await Quiz.findById(attempt.quizId).lean()
  if (!quiz) throw new AppError('Quiz not found.', 404)
  if (attempt.expiresAt && new Date() > new Date(attempt.expiresAt)) {
    await finalizeExpiredAttempt({ attempt, quiz })
    throw new AppError('This attempt expired before submission.', 410)
  }

  const question = (attempt.questionSnapshot || []).find((entry) => String(entry.questionId) === String(questionId))
  if (!question) throw new AppError('Question not found in this attempt.', 404)
  if (selectedOptionId !== null && selectedOptionId !== undefined && !question.options.some((option) => String(option.optionId) === String(selectedOptionId))) {
    throw new AppError('Selected option is invalid for this question.', 400)
  }

  const sanitizedSelectedOption = selectedOptionId !== null && selectedOptionId !== undefined ? new mongoose.Types.ObjectId(String(selectedOptionId)) : null
  const updated = await QuizAttempt.findByIdAndUpdate(
    attempt._id,
    {
      $set: {
        answers: [
          ...(Array.isArray(attempt.answers) ? attempt.answers.filter((entry) => String(entry.questionId) !== String(questionId)) : []),
          {
            questionId: new mongoose.Types.ObjectId(String(questionId)),
            selectedOptionId: sanitizedSelectedOption,
            savedAt: new Date()
          }
        ],
        updatedAt: new Date()
      }
    },
    { new: true }
  ).lean()

  return {
    questionId: String(questionId),
    selectedOptionId: sanitizedSelectedOption ? String(sanitizedSelectedOption) : null,
    savedAt: new Date().toISOString()
  }
}

export const submitQuizAttempt = async ({ studentId, attemptId }) => {
  const attempt = await ensureAttemptBelongsToStudent({ studentId, attemptId })
  const quiz = await Quiz.findById(attempt.quizId).lean()
  if (!quiz) throw new AppError('Quiz not found.', 404)

  if (String(attempt.status) === 'submitted') {
    return buildSubmissionResult(attempt, quiz)
  }

  if (String(attempt.status) === 'expired') {
    const finalized = await QuizAttempt.findById(attempt._id).lean()
    return buildSubmissionResult(finalized, quiz)
  }

  if (attempt.expiresAt && new Date() > new Date(attempt.expiresAt)) {
    const finalized = await finalizeExpiredAttempt({ attempt, quiz })
    return buildSubmissionResult(finalized, quiz)
  }

  const answersMap = getAnswerMap(attempt.answers || [])
  const grade = computeAttemptGrade({ quiz, snapshotQuestions: attempt.questionSnapshot || [], answersMap })

  const updated = await QuizAttempt.findByIdAndUpdate(
    attempt._id,
    {
      $set: {
        status: 'submitted',
        submittedAt: new Date(),
        earnedMarks: grade.earnedMarks,
        totalMarks: grade.totalMarks,
        percentage: grade.percentage,
        passed: grade.passed,
        updatedAt: new Date()
      }
    },
    { new: true }
  ).lean()

  return buildSubmissionResult(updated, quiz)
}

const buildSubmissionResult = (attempt, quiz) => {
  const reviewAllowed = Boolean(attempt?.passed || attempt?.status === 'expired')
  const rawQuestions = Array.isArray(attempt?.questionSnapshot) ? attempt.questionSnapshot : []
  const answersMap = getAnswerMap(attempt?.answers || [])
  const remainingAttempts = Math.max(Number(quiz?.maximumAttempts || 1) - Number((quiz && quiz.maximumAttempts) ? 0 : 0), 0)

  const questions = rawQuestions.map((question) => {
    const answerValue = answersMap.get(String(question.questionId))?.selectedOptionId || null
    const isCorrect = Boolean(answerValue && String(answerValue) === String(question.correctOptionId))
    const reviewQuestion = reviewAllowed ? {
      correctOptionId: question.correctOptionId ? String(question.correctOptionId) : null,
      explanation: question.explanation ?? null,
      isCorrect,
      selectedOptionId: answerValue ? String(answerValue) : null,
      answered: Boolean(answerValue)
    } : {
      selectedOptionId: answerValue ? String(answerValue) : null,
      answered: Boolean(answerValue),
      correctOptionId: null,
      explanation: null,
      isCorrect: null,
      message: buildReviewMessage()
    }

    return {
      ...toSafeQuestion(question),
      ...reviewQuestion
    }
  })

  return {
    id: String(attempt?._id || ''),
    attemptNumber: Number(attempt?.attemptNumber || 1),
    quizId: String(attempt?.quizId || quiz?._id || ''),
    quizTitle: quiz?.title || '',
    status: attempt?.status || 'submitted',
    earnedMarks: Number(attempt?.earnedMarks ?? 0),
    totalMarks: Number(attempt?.totalMarks ?? quiz?.totalMarks ?? 0),
    percentage: Number(attempt?.percentage ?? 0),
    passingPercentage: Number(quiz?.passingPercentage ?? 0),
    passed: Boolean(attempt?.passed),
    submittedAt: attempt?.submittedAt ? new Date(attempt.submittedAt).toISOString() : null,
    reviewAllowed,
    reviewMessage: reviewAllowed ? null : buildReviewMessage(),
    questions,
    remainingAttempts
  }
}

export const getQuizResultForStudent = async ({ studentId, quizId, attemptId }) => {
  if (!toObjectId(studentId) || !toObjectId(quizId) || !toObjectId(attemptId)) {
    throw new AppError('Invalid request.', 400)
  }

  const attempt = await QuizAttempt.findOne({ _id: attemptId, quizId: new mongoose.Types.ObjectId(String(quizId)), studentId: new mongoose.Types.ObjectId(String(studentId)) }).lean()
  if (!attempt) throw new AppError('Result not found.', 404)

  const quiz = await Quiz.findById(quizId).lean()
  if (!quiz) throw new AppError('Quiz not found.', 404)

  const enrollment = await getActiveEnrollmentForStudent({ studentId, courseId: quiz.courseId })
  if (!enrollment) throw new AppError('Active enrollment is required to view this result.', 403)

  if (attempt.status === 'in_progress' && attempt.expiresAt && new Date() > new Date(attempt.expiresAt)) {
    const finalized = await finalizeExpiredAttempt({ attempt, quiz })
    return buildSubmissionResult(finalized, quiz)
  }

  return buildSubmissionResult(attempt, quiz)
}

export const getStudentQuizHistory = async ({ studentId, courseId = null }) => {
  const filter = { studentId: new mongoose.Types.ObjectId(String(studentId)) }
  if (courseId && toObjectId(courseId)) filter.courseId = new mongoose.Types.ObjectId(String(courseId))

  const attempts = await QuizAttempt.find(filter).sort({ submittedAt: -1, createdAt: -1 }).lean()
  const quizIds = [...new Set(attempts.map((attempt) => String(attempt.quizId)))]
  const quizzes = await Quiz.find({ _id: { $in: quizIds.map((id) => new mongoose.Types.ObjectId(id)) } }).lean()
  const quizMap = new Map(quizzes.map((quiz) => [String(quiz._id), quiz]))

  return attempts.map((attempt) => {
    const quiz = quizMap.get(String(attempt.quizId))
    return {
      id: String(attempt._id),
      quizId: String(attempt.quizId),
      quizTitle: quiz?.title || 'Quiz',
      courseId: String(attempt.courseId),
      courseTitle: quiz ? '' : '',
      attemptNumber: Number(attempt.attemptNumber || 1),
      earnedMarks: attempt.earnedMarks !== null && attempt.earnedMarks !== undefined ? Number(attempt.earnedMarks) : null,
      totalMarks: Number(attempt.totalMarks || quiz?.totalMarks || 0),
      percentage: attempt.percentage !== null && attempt.percentage !== undefined ? Number(attempt.percentage) : null,
      passed: attempt.passed !== null && attempt.passed !== undefined ? Boolean(attempt.passed) : null,
      status: attempt.status,
      submittedAt: attempt.submittedAt ? new Date(attempt.submittedAt).toISOString() : null,
      resultLabel: attempt.passed === true ? 'Passed' : attempt.passed === false ? 'Not Passed' : 'In Progress'
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
