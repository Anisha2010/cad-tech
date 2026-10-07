import asyncHandler from '../utils/asyncHandler.js'
import { sendError, sendSuccess } from '../utils/response.js'
import * as studentQuizService from '../services/studentQuizService.js'

const rejectUnexpectedBodyFields = (req, res, allowedFields = []) => {
  const body = req.body ?? {}
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return sendError(res, 'Invalid request body.', 400)
  }
  const invalid = Object.keys(body).some((key) => !allowedFields.includes(key) || key.startsWith('$') || key.includes('.'))
  if (invalid) return sendError(res, 'Request contains unsupported fields.', 400)
  return null
}

export const startQuizAttempt = asyncHandler(async (req, res) => {
  if (rejectUnexpectedBodyFields(req, res)) return
  const result = await studentQuizService.startQuizAttempt({ studentId: req.user.id, quizId: req.params.quizId })
  return sendSuccess(res, result, 'Quiz attempt started successfully.')
})

export const getQuizAttempt = asyncHandler(async (req, res) => {
  const result = await studentQuizService.getQuizAttemptForStudent({ studentId: req.user.id, attemptId: req.params.attemptId, expectedQuizId: req.params.quizId })
  return sendSuccess(res, result, 'Quiz attempt loaded successfully.')
})

export const saveQuizAnswer = asyncHandler(async (req, res) => {
  if (rejectUnexpectedBodyFields(req, res, ['questionId', 'selectedOptionId', 'textAnswer'])) return
  if (!Object.prototype.hasOwnProperty.call(req.body || {}, 'questionId') || (!Object.prototype.hasOwnProperty.call(req.body || {}, 'selectedOptionId') && !Object.prototype.hasOwnProperty.call(req.body || {}, 'textAnswer'))) {
    return sendError(res, 'Question and answer are required.', 400)
  }
  if (req.body.questionId && typeof req.body.questionId !== 'string') return sendError(res, 'Invalid question reference.', 400)
  if (req.body.selectedOptionId !== null && typeof req.body.selectedOptionId !== 'string') return sendError(res, 'Invalid option reference.', 400)
  if (req.body.textAnswer !== null && req.body.textAnswer !== undefined && typeof req.body.textAnswer !== 'string') return sendError(res, 'Invalid text answer.', 400)
  const result = await studentQuizService.saveQuizAnswer({
    studentId: req.user.id,
    attemptId: req.params.attemptId,
    questionId: req.body?.questionId,
    selectedOptionId: req.body?.selectedOptionId,
    textAnswer: req.body?.textAnswer
  })
  return sendSuccess(res, result, 'Answer saved successfully.')
})

export const submitQuizAttempt = asyncHandler(async (req, res) => {
  if (rejectUnexpectedBodyFields(req, res)) return
  const result = await studentQuizService.submitQuizAttempt({ studentId: req.user.id, attemptId: req.params.attemptId })
  return sendSuccess(res, result, 'Quiz submitted successfully.')
})

export const getQuizResult = asyncHandler(async (req, res) => {
  const result = await studentQuizService.getQuizResultForStudent({
    studentId: req.user.id,
    quizId: req.params.quizId,
    attemptId: req.params.attemptId
  })
  return sendSuccess(res, result, 'Quiz result retrieved successfully.')
})

export const getQuizHistory = asyncHandler(async (req, res) => {
  if (req.query?.courseId !== undefined && typeof req.query.courseId !== 'string') return sendError(res, 'Invalid course reference.', 400)
  const courseId = typeof req.query?.courseId === 'string' && req.query.courseId.trim() ? req.query.courseId.trim() : null
  const result = await studentQuizService.getStudentQuizHistory({ studentId: req.user.id, courseId })
  return sendSuccess(res, { attempts: result }, 'Quiz history retrieved successfully.')
})

export default {
  startQuizAttempt,
  getQuizAttempt,
  saveQuizAnswer,
  submitQuizAttempt,
  getQuizResult,
  getQuizHistory
}
