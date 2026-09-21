import asyncHandler from '../utils/asyncHandler.js'
import { sendError, sendSuccess } from '../utils/response.js'
import * as studentQuizService from '../services/studentQuizService.js'

export const startQuizAttempt = asyncHandler(async (req, res) => {
  const result = await studentQuizService.startQuizAttempt({ studentId: req.user.id, quizId: req.params.quizId })
  return sendSuccess(res, result, 'Quiz attempt started successfully.')
})

export const getQuizAttempt = asyncHandler(async (req, res) => {
  const result = await studentQuizService.getQuizAttemptForStudent({ studentId: req.user.id, attemptId: req.params.attemptId })
  return sendSuccess(res, result, 'Quiz attempt loaded successfully.')
})

export const saveQuizAnswer = asyncHandler(async (req, res) => {
  const result = await studentQuizService.saveQuizAnswer({
    studentId: req.user.id,
    attemptId: req.params.attemptId,
    questionId: req.body?.questionId,
    selectedOptionId: req.body?.selectedOptionId
  })
  return sendSuccess(res, result, 'Answer saved successfully.')
})

export const submitQuizAttempt = asyncHandler(async (req, res) => {
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
